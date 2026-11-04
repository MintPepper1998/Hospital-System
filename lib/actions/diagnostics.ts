"use server"

import { prisma } from "@/lib/prisma"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { revalidatePath } from "next/cache"
import { BillingType, BillingStatus } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit"
import { requireBillingCounterAccess, requireBillingCounterAccessSafe, BILLING_COUNTER_PERMISSIONS } from "@/lib/billing-counter-access"

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
    const patientMap = new Map<string, {
      id: string
      patientId: string
      name: string
      phone: string | null
      pendingTestCount: number
      latestOrderTime: Date
    }>()

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
 * Search patients by name or phone (includes patients WITHOUT pending tests for flexibility)
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
      take: 15,
    })

    // Sort: patients with pending tests first
    const sorted = patients.sort((a, b) => b.labRequests.length - a.labRequests.length)

    return {
      success: true,
      data: sorted.map((p) => ({
        id: p.id,
        patientId: p.patientId,
        name: p.user.name,
        phone: p.phone,
        pendingTestCount: p.labRequests.length,
      })),
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
 * Confirm diagnostic payment - creates billing and updates lab request status
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
    console.log("[INFO] Confirming diagnostic payment:", data)

    if (!data.patientId || !data.labRequestIds || data.labRequestIds.length === 0) {
      return {
        success: false,
        message: "Patient ID and lab request IDs are required",
      }
    }

    // Fetch the lab requests to get totals
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

    // Calculate totals
    const subtotal = labRequests.reduce((sum, req) => sum + req.testPrice, 0)
    const discount = data.discount || 0
    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
      return { success: false, message: "Discount cannot exceed the diagnostic subtotal" }
    }
    const netAmount = subtotal - discount

    // Generate bill number
    const currentYear = new Date().getFullYear()
    const lastBill = await prisma.billing.findFirst({
      where: {
        billNumber: {
          startsWith: `DIAG-${currentYear}-`,
        },
      },
      orderBy: { billNumber: "desc" },
    })

    const lastSequence = lastBill?.billNumber
      ? parseInt(lastBill.billNumber.split("-")[2])
      : 0
    const billNumber = `DIAG-${currentYear}-${String(lastSequence + 1).padStart(4, "0")}`

    // Check if this patient is currently admitted under BSKY (cashless)
    const activeBskyAdmission = await prisma.iPDAdmission.findFirst({
      where: {
        patientId: data.patientId,
        status: "ADMITTED",
        isBskyAdmission: true,
      },
    })
    const isBskyIpd = !!activeBskyAdmission

    // Process in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create billing record
      const billing = await tx.billing.create({
        data: {
          billNumber,
          patientId: data.patientId,
          type: BillingType.LABORATORY,
          billDate: new Date(),
          totalAmount: subtotal,
          discountAmount: discount,
          taxAmount: 0,
          netAmount,
          paidAmount: isBskyIpd ? 0 : netAmount,
          balanceAmount: isBskyIpd ? netAmount : 0,
          status: isBskyIpd ? "PENDING_GOVERNMENT_PAYMENT" : BillingStatus.PAID,
          paymentMethod: isBskyIpd ? "INSURANCE" : data.paymentMethod,
          transactionId: data.transactionId,
          notes: isBskyIpd
            ? "Diagnostic Tests — BSKY Cashless (Govt. Claim)"
            : "Diagnostic Tests Payment",
        },
      })

      if (!isBskyIpd && netAmount > 0) {
        const accountId = await resolveFinancialAccount(tx, data.paymentMethod)

        if (accountId) {
          const pathologyAmount = labRequests
            .filter((req) => req.testType !== "RADIOLOGY")
            .reduce((sum, req) => sum + req.testPrice, 0)
          const radiologyAmount = labRequests
            .filter((req) => req.testType === "RADIOLOGY")
            .reduce((sum, req) => sum + req.testPrice, 0)

          if (pathologyAmount > 0) {
            await tx.transaction.create({
              data: {
                accountId,
                type: "INCOME",
                amount: pathologyAmount,
                category: "PATHOLOGY_BILL",
                paymentMethod: data.paymentMethod,
                referenceId: billing.id,
                description: `Pathology billing payment - ${billNumber}`,
              },
            })
          }

          if (radiologyAmount > 0) {
            await tx.transaction.create({
              data: {
                accountId,
                type: "INCOME",
                amount: radiologyAmount,
                category: "RADIOLOGY_BILL",
                paymentMethod: data.paymentMethod,
                referenceId: billing.id,
                description: `Radiology billing payment - ${billNumber}`,
              },
            })
          }

          await tx.financialAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: pathologyAmount + radiologyAmount } },
          })
        }
      }

      // 2. Create billing items
      for (const req of labRequests) {
        await tx.billingItem.create({
          data: {
            billingId: billing.id,
            description: `${req.testType === "RADIOLOGY" ? "🔬 Radiology: " : "🧪 Pathology: "}${req.testName}`,
            quantity: 1,
            unitPrice: req.testPrice,
            amount: req.testPrice,
            gstRate: 0,
            gstAmount: 0,
            totalAmount: req.testPrice,
          },
        })
      }

      // 3. Update lab requests status to PAID_PENDING_SAMPLE
      await tx.labRequest.updateMany({
        where: {
          id: { in: data.labRequestIds },
        },
        data: {
          status: "PAID_PENDING_SAMPLE",
          billingId: billing.id,
        },
      })

      return billing
    })

    console.log("[SUCCESS] Diagnostic payment confirmed:", result.billNumber)

    // Revalidate pages
    revalidatePath("/dashboard/billing/diagnostics")
    revalidatePath("/dashboard/laboratory")
    revalidatePath("/dashboard/lab/pathology/queue")
    revalidatePath("/dashboard/lab/radiology/queue")
    revalidatePath("/dashboard/radiology/queue") // User's expected path
    revalidatePath("/dashboard/finance/billing")

    writeAuditLog({ userId: authResult.session.user.id, action: "PROCESS", module: "DiagnosticPayment", recordId: result.id, changes: { patientId: data.patientId } })

    return {
      success: true,
      message: `Payment confirmed! Bill Number: ${result.billNumber}`,
      billNumber: result.billNumber,
      billingId: result.id,
    }
  } catch (error: unknown) {
    console.error("[ERROR] confirmDiagnosticPayment:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process payment",
    }
  }
}
