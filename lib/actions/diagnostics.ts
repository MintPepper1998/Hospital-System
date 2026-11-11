"use server"

import { prisma } from "@/lib/prisma"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { revalidatePath } from "next/cache"
import { BillingType, BillingStatus } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit"
import {
  requireBillingCounterAccess,
  requireBillingCounterAccessSafe,
  BILLING_COUNTER_PERMISSIONS,
} from "@/lib/billing-counter-access"
import { requireAuthSafe } from "@/lib/auth-guard"

/**
 * Fetch all active pathology and radiology tests from the admin catalog
 */
export async function getDiagnosticCatalogTests() {
  await requireBillingCounterAccess(BILLING_COUNTER_PERMISSIONS.diagnostics)
  try {
    const tests = await prisma.labTestCatalog.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ type: "asc" }, { category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        price: true,
        category: true,
        type: true,
        unit: true,
        normalRange: true,
        description: true,
      },
    })

    return {
      success: true,
      data: tests,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getDiagnosticCatalogTests:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch diagnostic tests",
      data: [],
    }
  }
}

/**
 * Get active casualty patients for quick selection in Diagnostics Billing
 */
export async function getActiveCasualtyPatientsForDiagnostics() {
  await requireBillingCounterAccess(BILLING_COUNTER_PERMISSIONS.diagnostics)
  try {
    const visits = await prisma.casualtyVisit.findMany({
      where: {
        status: { in: ["ADMITTED", "TREATING", "REFERRED_TO_OPD"] },
      },
      include: {
        patient: {
          include: {
            user: true,
            labRequests: {
              where: {
                status: "PENDING_PAYMENT",
              },
            },
          },
        },
        assignedDoctor: {
          include: {
            user: true,
          },
        },
        procedures: true,
      },
      orderBy: { arrivalTime: "desc" },
      take: 50,
    })

    return {
      success: true,
      data: visits.map((v) => {
        const dob = v.patient.dateOfBirth
        let age: number | null = null
        if (dob) {
          age = Math.floor(
            (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          )
        }

        return {
          casualtyVisitId: v.id,
          patientId: v.patient.id,
          uhid: v.patient.patientId,
          name: v.patient.user.name || "Unknown",
          phone: v.patient.phone,
          gender: v.patient.gender,
          age,
          chiefComplaint: v.chiefComplaint,
          doctorName: v.assignedDoctor?.user.name || "Unassigned",
          arrivalTime: v.arrivalTime.toISOString(),
          procedureCount: v.procedures.length,
          pendingTestCount: v.patient.labRequests.length,
          status: v.status,
        }
      }),
    }
  } catch (error: unknown) {
    console.error("[ERROR] getActiveCasualtyPatientsForDiagnostics:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch casualty patients",
      data: [],
    }
  }
}

/**
 * Get ALL patients with pending diagnostic tests (for the queue display)
 */
export async function getAllPatientsWithPendingDiagnostics() {
  await requireBillingCounterAccess(BILLING_COUNTER_PERMISSIONS.diagnostics)
  try {
    // Find all lab requests with PENDING_PAYMENT status
    const pendingRequests = await prisma.labRequest.findMany({
      where: {
        status: "PENDING_PAYMENT",
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Group by patient
    const patientMap = new Map<
      string,
      {
        id: string
        patientId: string
        name: string
        phone: string | null
        gender?: string | null
        pendingTestCount: number
        latestOrderTime: Date
      }
    >()

    for (const req of pendingRequests) {
      const existing = patientMap.get(req.patientId)
      if (existing) {
        existing.pendingTestCount++
        if (req.createdAt > existing.latestOrderTime) {
          existing.latestOrderTime = req.createdAt
        }
      } else {
        patientMap.set(req.patientId, {
          id: req.patient.id,
          patientId: req.patient.patientId,
          name: req.patient.user.name || "Unknown",
          phone: req.patient.phone,
          gender: req.patient.gender,
          pendingTestCount: 1,
          latestOrderTime: req.createdAt,
        })
      }
    }

    // Sort by latest order time (most recent first)
    const patients = Array.from(patientMap.values()).sort(
      (a, b) => b.latestOrderTime.getTime() - a.latestOrderTime.getTime()
    )

    return {
      success: true,
      data: patients,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getAllPatientsWithPendingDiagnostics:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch patients",
      data: [],
    }
  }
}

/**
 * Get pending diagnostic tests for a patient
 */
export async function getPendingDiagnostics(patientId: string) {
  await requireBillingCounterAccess(BILLING_COUNTER_PERMISSIONS.diagnostics)
  try {
    const pendingTests = await prisma.labRequest.findMany({
      where: {
        patientId,
        status: "PENDING_PAYMENT",
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        appointment: {
          include: {
            doctor: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return {
      success: true,
      data: pendingTests,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getPendingDiagnostics:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch pending diagnostics",
    }
  }
}

/**
 * Search patients by name or phone (includes active casualty visit status)
 */
export async function searchPatientsForDiagnostics(searchTerm: string) {
  await requireBillingCounterAccess(BILLING_COUNTER_PERMISSIONS.diagnostics)
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return { success: true, data: [] }
    }

    // First, search all matching patients
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { user: { name: { contains: searchTerm, mode: "insensitive" } } },
          { phone: { contains: searchTerm } },
          { patientId: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      include: {
        user: true,
        labRequests: {
          where: {
            status: "PENDING_PAYMENT",
          },
        },
      },
      take: 20,
    })

    if (patients.length === 0) {
      return { success: true, data: [] }
    }

    // Check if any of these patients are currently active in Casualty
    const patientIds = patients.map((p) => p.id)
    const activeCasualtyVisits = await prisma.casualtyVisit.findMany({
      where: {
        patientId: { in: patientIds },
        status: { in: ["ADMITTED", "TREATING", "REFERRED_TO_OPD"] },
      },
      select: {
        id: true,
        patientId: true,
        status: true,
        arrivalTime: true,
        chiefComplaint: true,
      },
      orderBy: { arrivalTime: "desc" },
    })

    const casualtyMap = new Map<string, (typeof activeCasualtyVisits)[0]>()
    for (const cv of activeCasualtyVisits) {
      if (!casualtyMap.has(cv.patientId)) {
        casualtyMap.set(cv.patientId, cv)
      }
    }

    // Sort: patients with casualty or pending tests first
    const sorted = [...patients].sort((a, b) => {
      const aScore = (casualtyMap.has(a.id) ? 10 : 0) + a.labRequests.length
      const bScore = (casualtyMap.has(b.id) ? 10 : 0) + b.labRequests.length
      return bScore - aScore
    })

    return {
      success: true,
      data: sorted.map((p) => {
        const cv = casualtyMap.get(p.id) || null
        const dob = p.dateOfBirth
        let age: number | null = null
        if (dob) {
          age = Math.floor(
            (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          )
        }

        return {
          id: p.id,
          patientId: p.patientId,
          name: p.user.name || "Unknown",
          phone: p.phone,
          gender: p.gender,
          age,
          pendingTestCount: p.labRequests.length,
          activeCasualtyVisit: cv
            ? {
                id: cv.id,
                status: cv.status,
                arrivalTime: cv.arrivalTime.toISOString(),
                chiefComplaint: cv.chiefComplaint,
              }
            : null,
        }
      }),
    }
  } catch (error: unknown) {
    console.error("[ERROR] searchPatientsForDiagnostics:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to search patients",
    }
  }
}

/**
 * Diagnostic line item input
 */
export interface DiagnosticItemInput {
  catalogId?: string
  name: string
  code?: string
  type: "PATHOLOGY" | "RADIOLOGY"
  category?: string
  unitPrice: number
  quantity: number
}

/**
 * Input for creating a diagnostic bill
 */
export interface CreateDiagnosticBillInput {
  patientId: string
  casualtyVisitId?: string
  tests: DiagnosticItemInput[]
  existingLabRequestIds?: string[]
  paymentMethod: string // CASH, UPI, CARD, BANK_TRANSFER, INSURANCE, BSKY, CREDIT, SPLIT
  transactionId?: string
  splitPayment?: {
    cashAmount?: number
    upiAmount?: number
    cardAmount?: number
  }
  discountAmount?: number
  discountPercent?: number
  notes?: string
  addToCasualtyBillOnly?: boolean // When true, attaches to casualty visit to be settled at casualty counter/discharge
}

/**
 * Create a diagnostic bill (Pathology / Radiology) and populate lab queues
 */
export async function createDiagnosticBill(data: CreateDiagnosticBillInput) {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.diagnostics)
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.patientId) {
      return { success: false, message: "Patient ID is required" }
    }
    if (!data.tests || data.tests.length === 0) {
      return { success: false, message: "At least one diagnostic test is required" }
    }

    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      include: { user: true },
    })
    if (!patient) return { success: false, message: "Patient not found" }

    // Case 1: Add to Casualty Bill Only (deferred to Casualty billing counter / discharge)
    if (data.addToCasualtyBillOnly && data.casualtyVisitId) {
      const visit = await prisma.casualtyVisit.findUnique({
        where: { id: data.casualtyVisitId },
      })
      if (!visit) {
        return { success: false, message: "Casualty visit not found" }
      }

      await prisma.$transaction(async (tx) => {
        for (const test of data.tests) {
          // 1. Add as casualty procedure
          await tx.casualtyProcedure.create({
            data: {
              casualtyVisitId: visit.id,
              name: test.name,
              category: test.type,
              description: test.category || `${test.type} Test`,
              quantity: test.quantity || 1,
              unitPrice: test.unitPrice,
              performedBy: authResult.session.user.name || "Diagnostics Desk",
            },
          })

          // 2. Create pending LabRequest so test is tracked
          await tx.labRequest.create({
            data: {
              patientId: patient.id,
              orderedBy: authResult.session.user.name || "Casualty Desk",
              testCatalogId: test.catalogId || "CUSTOM",
              testName: test.name,
              testPrice: test.unitPrice,
              testType: test.type,
              status: "PENDING_PAYMENT",
              priority: "ROUTINE",
              notes: `Casualty Visit ${visit.id} • Added from Diagnostics Counter (Deferred to Casualty Bill)`,
            },
          })
        }
      })

      revalidatePath("/dashboard/billing-counter/casualty")
      revalidatePath("/dashboard/casualty")
      revalidatePath("/dashboard/billing-counter/diagnostics")
      revalidatePath("/dashboard/billing/diagnostics")

      return {
        success: true,
        message: `${data.tests.length} diagnostic test(s) added to Casualty Bill for ${patient.user.name}`,
        casualtyVisitId: visit.id,
      }
    }

    // Case 2: Standard Billing (Immediate payment or Credit)
    const subtotal = data.tests.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const discountAmount =
      (data.discountAmount || 0) > 0
        ? data.discountAmount || 0
        : (subtotal * (data.discountPercent || 0)) / 100
    const netAmount = Math.max(0, subtotal - discountAmount)

    const isCredit = data.paymentMethod === "CREDIT"
    const isSplit = data.paymentMethod === "SPLIT"

    // Check if patient is currently under active BSKY admission
    const activeBskyAdmission = await prisma.iPDAdmission.findFirst({
      where: {
        patientId: data.patientId,
        status: "ADMITTED",
        isBskyAdmission: true,
      },
    })
    const isBsky = !isCredit && (data.paymentMethod === "BSKY" || !!activeBskyAdmission)

    // Generate DIAG bill number
    const currentYear = new Date().getFullYear()
    const prefix = "DIAG"
    const pattern = `${prefix}-${currentYear}-`
    const lastBill = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: pattern } },
      orderBy: { billNumber: "desc" },
    })

    const lastSequence = lastBill?.billNumber
      ? parseInt(lastBill.billNumber.split("-")[2], 10)
      : 0
    const billNumber = `${prefix}-${currentYear}-${String((isNaN(lastSequence) ? 0 : lastSequence) + 1).padStart(4, "0")}`

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create billing record
      const billing = await tx.billing.create({
        data: {
          billNumber,
          patientId: data.patientId,
          casualtyVisitId: data.casualtyVisitId || null,
          type: BillingType.LABORATORY,
          billDate: new Date(),
          totalAmount: subtotal,
          discountAmount,
          taxAmount: 0,
          netAmount,
          paidAmount: isCredit || isBsky ? 0 : netAmount,
          balanceAmount: isCredit || isBsky ? netAmount : 0,
          status: isCredit
            ? BillingStatus.PENDING
            : isBsky
            ? "PENDING_GOVERNMENT_PAYMENT"
            : BillingStatus.PAID,
          paymentMethod: isBsky ? "BSKY" : data.paymentMethod,
          transactionId: data.transactionId,
          splitCashAmount: isSplit ? data.splitPayment?.cashAmount : null,
          splitUpiAmount: isSplit ? data.splitPayment?.upiAmount : null,
          splitCardAmount: isSplit ? data.splitPayment?.cardAmount : null,
          notes:
            data.notes ||
            (data.casualtyVisitId
              ? "Diagnostic Tests (Casualty Patient)"
              : isBsky
              ? "Diagnostic Tests — BSKY Cashless"
              : "Diagnostic Tests Bill"),
        },
      })

      // 2. Financial Accounts and Double-Entry Ledger
      if (!isCredit && !isBsky && netAmount > 0) {
        if (isSplit && data.splitPayment) {
          const splits = [
            { method: "CASH", amount: data.splitPayment.cashAmount || 0 },
            { method: "UPI", amount: data.splitPayment.upiAmount || 0 },
            { method: "CARD", amount: data.splitPayment.cardAmount || 0 },
          ].filter((s) => s.amount > 0)

          for (const s of splits) {
            const accountId = await resolveFinancialAccount(tx, s.method)
            if (accountId) {
              await tx.transaction.create({
                data: {
                  accountId,
                  type: "INCOME",
                  amount: s.amount,
                  category: "LABORATORY_BILLING",
                  paymentMethod: s.method,
                  referenceId: billing.id,
                  description: `Diagnostics billing (split ${s.method}) - ${billNumber}`,
                  billingType: "LAB",
                },
              })
              await tx.financialAccount.update({
                where: { id: accountId },
                data: { currentBalance: { increment: s.amount } },
              })
            }
          }
        } else {
          const accountId = await resolveFinancialAccount(tx, data.paymentMethod)
          if (accountId) {
            await tx.transaction.create({
              data: {
                accountId,
                type: "INCOME",
                amount: netAmount,
                category: "LABORATORY_BILLING",
                paymentMethod: data.paymentMethod,
                referenceId: billing.id,
                description: `Diagnostics billing - ${billNumber}`,
                billingType: "LAB",
              },
            })
            await tx.financialAccount.update({
              where: { id: accountId },
              data: { currentBalance: { increment: netAmount } },
            })
          }
        }
      }

      // 3. Record credit entry if credit payment
      if (isCredit) {
        await tx.creditEntry.create({
          data: {
            type: "RECEIVABLE",
            partyName: patient.user.name || "Patient",
            partyType: "PATIENT",
            partyId: data.patientId,
            referenceId: billing.id,
            referenceType: "BILLING",
            totalAmount: netAmount,
            paidAmount: 0,
            balanceAmount: netAmount,
            status: "OPEN",
            notes: `Diagnostics billing credit – ${billing.billNumber}`,
          },
        })
      }

      // 4. Create BillingItem records
      for (const test of data.tests) {
        const itemTotal = test.quantity * test.unitPrice
        await tx.billingItem.create({
          data: {
            billingId: billing.id,
            description: `${test.type === "RADIOLOGY" ? "🔬 Radiology: " : "🧪 Pathology: "}${test.name}`,
            quantity: test.quantity,
            unitPrice: test.unitPrice,
            amount: itemTotal,
            gstRate: 0,
            gstAmount: 0,
            totalAmount: itemTotal,
            serviceCategory: test.type,
          },
        })
      }

      // 5. Update any existing LabRequests to PAID_PENDING_SAMPLE
      if (data.existingLabRequestIds && data.existingLabRequestIds.length > 0) {
        await tx.labRequest.updateMany({
          where: {
            id: { in: data.existingLabRequestIds },
            patientId: data.patientId,
          },
          data: {
            status: "PAID_PENDING_SAMPLE",
            billingId: billing.id,
          },
        })
      }

      // 6. Create new LabRequest records for tests not in existingLabRequestIds
      const existingReqIds = new Set(data.existingLabRequestIds || [])
      const createdLabRequestIds: string[] = []

      for (const test of data.tests) {
        // If it's a new test without existing lab request, create one
        const isFromExisting =
          test.catalogId && existingReqIds.has(test.catalogId)

        if (!isFromExisting) {
          const lr = await tx.labRequest.create({
            data: {
              patientId: data.patientId,
              orderedBy: authResult.session.user.name || "Diagnostics Billing Counter",
              testCatalogId: test.catalogId || "CUSTOM",
              testName: test.name,
              testPrice: test.unitPrice,
              testType: test.type || "PATHOLOGY",
              status: "PAID_PENDING_SAMPLE",
              billingId: billing.id,
              priority: "ROUTINE",
              notes: data.casualtyVisitId
                ? `Casualty Visit: ${data.casualtyVisitId}`
                : undefined,
            },
          })
          createdLabRequestIds.push(lr.id)
        }
      }

      // 7. If patient has active casualty visit, log tests as procedures for clinical documentation
      if (data.casualtyVisitId) {
        for (const test of data.tests) {
          await tx.casualtyProcedure.create({
            data: {
              casualtyVisitId: data.casualtyVisitId,
              name: test.name,
              category: test.type,
              description: `Billed in Bill #${billing.billNumber}`,
              quantity: test.quantity,
              unitPrice: test.unitPrice,
              performedBy: authResult.session.user.name || "Diagnostics Desk",
            },
          })
        }
      }

      return {
        billing,
        createdLabRequestIds,
      }
    })

    // Revalidate paths
    revalidatePath("/dashboard/billing-counter/diagnostics")
    revalidatePath("/dashboard/billing/diagnostics")
    revalidatePath("/dashboard/billing-counter/casualty")
    revalidatePath("/dashboard/casualty")
    revalidatePath("/dashboard/lab/queue")
    revalidatePath("/dashboard/lab/pathology/queue")
    revalidatePath("/dashboard/lab/radiology/queue")
    revalidatePath("/dashboard/radiology/queue")
    revalidatePath("/dashboard/laboratory")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/finance")

    writeAuditLog({
      userId: authResult.session.user.id,
      action: "PROCESS",
      module: "DiagnosticPayment",
      recordId: result.billing.id,
      changes: {
        patientId: data.patientId,
        billNumber: result.billing.billNumber,
        netAmount,
        testsCount: data.tests.length,
      },
    })

    return {
      success: true,
      message: `Bill ${result.billing.billNumber} created successfully!`,
      billNumber: result.billing.billNumber,
      billingId: result.billing.id,
      labRequestId:
        result.createdLabRequestIds[0] ||
        data.existingLabRequestIds?.[0] ||
        null,
    }
  } catch (error: unknown) {
    console.error("[ERROR] createDiagnosticBill:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create diagnostic bill",
    }
  }
}

/**
 * Order diagnostic tests directly from Casualty dashboard/patient card
 */
export async function orderCasualtyDiagnostics(data: {
  casualtyVisitId: string
  testCatalogIds: string[]
  notes?: string
}) {
  const authResult = await requireAuthSafe([
    "SUPER_ADMIN",
    "ADMIN",
    "DOCTOR",
    "NURSE",
    "BILLING_CLERK",
    "ACCOUNTANT",
  ])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const visit = await prisma.casualtyVisit.findUnique({
      where: { id: data.casualtyVisitId },
      include: { patient: { include: { user: true } } },
    })
    if (!visit) return { success: false, message: "Casualty visit not found" }

    if (!data.testCatalogIds || data.testCatalogIds.length === 0) {
      return { success: false, message: "Please select at least one test" }
    }

    const catalogTests = await prisma.labTestCatalog.findMany({
      where: { id: { in: data.testCatalogIds }, isActive: true },
    })
    if (catalogTests.length === 0) {
      return { success: false, message: "No valid active tests found" }
    }

    await prisma.$transaction(async (tx) => {
      for (const test of catalogTests) {
        // 1. Add procedure to casualty visit
        await tx.casualtyProcedure.create({
          data: {
            casualtyVisitId: visit.id,
            name: test.name,
            category: test.type,
            description: test.category || `${test.type} Investigation`,
            quantity: 1,
            unitPrice: test.price,
            performedBy: authResult.session.name || "Casualty Desk",
          },
        })

        // 2. Create pending LabRequest for patient
        await tx.labRequest.create({
          data: {
            patientId: visit.patientId,
            orderedBy: authResult.session.name || "Casualty Doctor",
            testCatalogId: test.id,
            testName: test.name,
            testPrice: test.price,
            testType: test.type,
            status: "PENDING_PAYMENT",
            priority: "ROUTINE",
            notes: `Casualty Visit ${visit.id}${data.notes ? ` • ${data.notes}` : ""}`,
          },
        })
      }
    })

    revalidatePath("/dashboard/casualty")
    revalidatePath(`/dashboard/casualty/patient/${visit.id}`)
    revalidatePath("/dashboard/billing-counter/casualty")
    revalidatePath("/dashboard/billing-counter/diagnostics")

    return {
      success: true,
      message: `${catalogTests.length} diagnostic test(s) added to Casualty visit for ${visit.patient.user.name}`,
    }
  } catch (error: unknown) {
    console.error("[ERROR] orderCasualtyDiagnostics:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to order diagnostics",
    }
  }
}

/**
 * Confirm diagnostic payment - backward-compatible wrapper
 */
export async function confirmDiagnosticPayment(data: {
  patientId: string
  labRequestIds: string[]
  paymentMethod: string
  transactionId?: string
  discount?: number
}) {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.diagnostics)
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    if (!data.patientId || !data.labRequestIds || data.labRequestIds.length === 0) {
      return {
        success: false,
        message: "Patient ID and lab request IDs are required",
      }
    }

    const labRequests = await prisma.labRequest.findMany({
      where: {
        id: { in: data.labRequestIds },
        patientId: data.patientId,
        status: "PENDING_PAYMENT",
      },
    })

    if (labRequests.length === 0) {
      return {
        success: false,
        message: "No pending lab requests found",
      }
    }

    return createDiagnosticBill({
      patientId: data.patientId,
      existingLabRequestIds: data.labRequestIds,
      tests: labRequests.map((req) => ({
        catalogId: req.id,
        name: req.testName,
        type: req.testType,
        unitPrice: req.testPrice,
        quantity: 1,
      })),
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      discountAmount: data.discount || 0,
    })
  } catch (error: unknown) {
    console.error("[ERROR] confirmDiagnosticPayment:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process payment",
    }
  }
}
