"use server"

import { prisma } from "@/lib/prisma"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { resolveAccountGroupCode, resolveBillingTypeTag } from "@/lib/account-group-resolver"
import { BillingType, BillingStatus } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { sendBillNotification } from "@/lib/whatsapp"
import { requireBillingCounterAccessSafe, BILLING_COUNTER_PERMISSIONS } from "@/lib/billing-counter-access"
import { validateBillingCounterInput } from "@/lib/billing-counter-policy"

// ============================================
// TYPES
// ============================================

export interface BillLineItem {
  description: string
  quantity: number
  unitPrice: number
  serviceCategory?: string
}

export interface CreateBillInput {
  patientId: string
  billingType: string // "OPD" | "CASUALTY" | "EMERGENCY" | "OT" | "CUSTOM" etc
  linkedEntityId?: string // appointmentId / casualtyVisitId / emergencyVisitId / surgeryId
  linkedAppointmentId?: string // optional appointment link for casualty bills with OPD consultation
  items: BillLineItem[]
  discountAmount: number
  discountPercent: number
  paymentMethod: string
  splitPayments?: { cash?: number; upi?: number; card?: number }
  transactionId?: string
  notes?: string
}

// ============================================
// BILL NUMBER GENERATION
// ============================================

const BILL_PREFIX_MAP: Record<string, string> = {
  OPD: "OPD",
  CASUALTY: "CAS",
  EMERGENCY: "ER",
  OT: "OT",
  IPD: "IPD",
  LABORATORY: "LAB",
  AMBULANCE: "AMB",
  CANTEEN: "CAN",
  CUSTOM: "CUS",
}

async function generateBillNumber(billingType: string): Promise<string> {
  const prefix = BILL_PREFIX_MAP[billingType] || "HOSP"
  const year = new Date().getFullYear()
  const pattern = `${prefix}-${year}-`

  const existingBills = await prisma.billing.findMany({
    where: { billNumber: { startsWith: pattern } },
    select: { billNumber: true },
  })

  let maxSeq = 0
  const existingSet = new Set<string>()

  for (const b of existingBills) {
    existingSet.add(b.billNumber)
    const parts = b.billNumber.split("-")
    const seqStr = parts[parts.length - 1]
    const seq = parseInt(seqStr, 10)
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq
    }
  }

  let candidateSeq = maxSeq + 1
  let candidate = `${prefix}-${year}-${String(candidateSeq).padStart(4, "0")}`

  while (existingSet.has(candidate)) {
    candidateSeq++
    candidate = `${prefix}-${year}-${String(candidateSeq).padStart(4, "0")}`
  }

  let dbCheck = await prisma.billing.findUnique({
    where: { billNumber: candidate },
    select: { id: true },
  })

  while (dbCheck) {
    candidateSeq++
    candidate = `${prefix}-${year}-${String(candidateSeq).padStart(4, "0")}`
    dbCheck = await prisma.billing.findUnique({
      where: { billNumber: candidate },
      select: { id: true },
    })
  }

  return candidate
}

// ============================================
// ENTITY LINK FIELD MAPPING
// ============================================

function getEntityLinkField(billingType: string, entityId: string): Record<string, string> {
  switch (billingType) {
    case "OPD":
      return { appointmentId: entityId }
    case "CASUALTY":
      return { casualtyVisitId: entityId }
    case "EMERGENCY":
      return { emergencyVisitId: entityId }
    case "IPD":
      return { ipdAdmissionId: entityId }
    default:
      return {}
  }
}

// ============================================
// UNIFIED CREATE BILL
// ============================================

export async function createBill(data: CreateBillInput) {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.parent)
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const validationError = validateBillingCounterInput(data)
    if (validationError) return { success: false, message: validationError }
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId }, select: { id: true } })
    if (!patient) return { success: false, message: "Patient not found" }
    const candidateBillNumber = await generateBillNumber(data.billingType)

    // Calculate totals
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const discountAmount =
      data.discountAmount > 0
        ? data.discountAmount
        : (subtotal * (data.discountPercent || 0)) / 100
    const netAmount = Math.max(0, subtotal - discountAmount)
    const isCredit = data.paymentMethod === "CREDIT"
    const isSplit = data.paymentMethod === "SPLIT"

    // Map billing type string to enum
    const billingTypeEnum = BillingType[data.billingType as keyof typeof BillingType]
    if (!billingTypeEnum) return { success: false, message: "Unsupported billing type" }

    // Build entity link
    const entityLink = data.linkedEntityId
      ? getEntityLinkField(data.billingType, data.linkedEntityId)
      : {}

    const result = await prisma.$transaction(
      async (tx) => {
        // Re-check linked entities inside the transaction to prevent double billing.
        if (data.billingType === "OT" && data.linkedEntityId) {
          const surgery = await tx.surgery.findFirst({ where: { id: data.linkedEntityId, patientId: data.patientId, billingId: null, status: "COMPLETED" }, select: { id: true } })
          if (!surgery) throw new Error("This surgery is already billed or is not billable")
        }

        let billing

        // If this is a CASUALTY bill and there is an existing PENDING casualty bill (e.g. from discharge),
        // update that bill instead of creating a duplicate.
        if (data.billingType === "CASUALTY" && data.linkedEntityId) {
          const existingPendingBill = await tx.billing.findFirst({
            where: {
              casualtyVisitId: data.linkedEntityId,
              type: BillingType.CASUALTY,
              status: BillingStatus.PENDING,
            },
            include: { items: true },
          })

          if (existingPendingBill) {
            await tx.billingItem.deleteMany({
              where: { billingId: existingPendingBill.id },
            })

            billing = await tx.billing.update({
              where: { id: existingPendingBill.id },
              data: {
                ...(data.linkedAppointmentId ? { appointmentId: data.linkedAppointmentId } : {}),
                totalAmount: subtotal,
                discountAmount,
                netAmount,
                paidAmount: isCredit ? 0 : netAmount,
                balanceAmount: isCredit ? netAmount : 0,
                status: isCredit ? BillingStatus.PENDING : BillingStatus.PAID,
                paymentMethod: isCredit ? "CREDIT" : data.paymentMethod,
                transactionId: data.transactionId || null,
                notes: data.notes || existingPendingBill.notes,
                ...(isSplit
                  ? {
                      splitCashAmount: data.splitPayments?.cash || null,
                      splitUpiAmount: data.splitPayments?.upi || null,
                      splitCardAmount: data.splitPayments?.card || null,
                    }
                  : {}),
                items: {
                  create: data.items.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.quantity * item.unitPrice,
                    gstRate: 0,
                    gstAmount: 0,
                    totalAmount: item.quantity * item.unitPrice,
                    serviceCategory: item.serviceCategory || "OTHER",
                  })),
                },
              },
              include: { items: true, patient: { include: { user: true } }, appointment: true },
            })
          }
        } else if (data.billingType === "OPD" && data.linkedEntityId) {
          // If this is an OPD bill and there is an existing PENDING OPD bill (e.g. from Casualty referral or Pay Later),
          // update that bill instead of creating a duplicate.
          const existingPendingBill = await tx.billing.findFirst({
            where: {
              appointmentId: data.linkedEntityId,
              type: BillingType.OPD,
              status: BillingStatus.PENDING,
            },
            include: { items: true },
          })

          if (existingPendingBill) {
            await tx.billingItem.deleteMany({
              where: { billingId: existingPendingBill.id },
            })

            billing = await tx.billing.update({
              where: { id: existingPendingBill.id },
              data: {
                ...(data.linkedAppointmentId ? { appointmentId: data.linkedAppointmentId } : {}),
                totalAmount: subtotal,
                discountAmount,
                netAmount,
                paidAmount: isCredit ? 0 : netAmount,
                balanceAmount: isCredit ? netAmount : 0,
                status: isCredit ? BillingStatus.PENDING : BillingStatus.PAID,
                paymentMethod: isCredit ? "CREDIT" : data.paymentMethod,
                transactionId: data.transactionId || null,
                notes: data.notes || existingPendingBill.notes,
                ...(isSplit
                  ? {
                      splitCashAmount: data.splitPayments?.cash || null,
                      splitUpiAmount: data.splitPayments?.upi || null,
                      splitCardAmount: data.splitPayments?.card || null,
                    }
                  : {}),
                items: {
                  create: data.items.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.quantity * item.unitPrice,
                    gstRate: 0,
                    gstAmount: 0,
                    totalAmount: item.quantity * item.unitPrice,
                    serviceCategory: item.serviceCategory || "OTHER",
                  })),
                },
              },
              include: { items: true, patient: { include: { user: true } }, appointment: true },
            })
          }
        }

        if (!billing) {
          // 1. Create Billing + BillingItems
          billing = await tx.billing.create({
            data: {
              billNumber: candidateBillNumber,
              patientId: data.patientId,
              ...entityLink,
              ...(data.billingType === "CASUALTY" && data.linkedAppointmentId
                ? { appointmentId: data.linkedAppointmentId }
                : {}),
              type: billingTypeEnum,
              billDate: new Date(),
              totalAmount: subtotal,
              discountAmount,
              taxAmount: 0,
              netAmount,
              paidAmount: isCredit ? 0 : netAmount,
              balanceAmount: isCredit ? netAmount : 0,
              status: isCredit ? BillingStatus.PENDING : BillingStatus.PAID,
              paymentMethod: isCredit ? "CREDIT" : data.paymentMethod,
              transactionId: data.transactionId || null,
              notes: data.notes || null,
              ...(isSplit
                ? {
                    splitCashAmount: data.splitPayments?.cash || null,
                    splitUpiAmount: data.splitPayments?.upi || null,
                    splitCardAmount: data.splitPayments?.card || null,
                  }
                : {}),
              items: {
                create: data.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  amount: item.quantity * item.unitPrice,
                  gstRate: 0,
                  gstAmount: 0,
                  totalAmount: item.quantity * item.unitPrice,
                  serviceCategory: item.serviceCategory || "OTHER",
                })),
              },
            },
            include: { items: true, patient: { include: { user: true } }, appointment: true },
          })
        }

        // 2. Record in financial ledger (if not credit)
        if (!isCredit && netAmount > 0) {
          if (isSplit && data.splitPayments) {
            const splits: Array<[string, number]> = [
              ["CASH", data.splitPayments.cash || 0],
              ["UPI", data.splitPayments.upi || 0],
              ["CARD", data.splitPayments.card || 0],
            ]
            for (const [method, amount] of splits) {
              if (amount > 0) {
                const accountId = await resolveFinancialAccount(tx, method)
                if (!accountId) throw new Error(`No financial account configured for ${method}`)
                if (accountId) {
                  const accountGroupCode = resolveAccountGroupCode("INCOME", `${data.billingType}_BILLING`, data.billingType)
                  const billingTypeTag = resolveBillingTypeTag(data.billingType)
                  await tx.transaction.create({
                    data: {
                      accountId,
                      type: "INCOME",
                      amount,
                      category: `${data.billingType}_BILLING`,
                      paymentMethod: method,
                      referenceId: billing.id,
                      description: `${data.billingType} billing (split ${method}) - ${billing.billNumber}`,
                      accountGroupCode,
                      billingType: billingTypeTag,
                    },
                  })
                  await tx.financialAccount.update({
                    where: { id: accountId },
                    data: { currentBalance: { increment: amount } },
                  })
                }
              }
            }
          } else {
            const accountId = await resolveFinancialAccount(tx, data.paymentMethod)
            if (!accountId) throw new Error(`No financial account configured for ${data.paymentMethod}`)
            if (accountId) {
              const accountGroupCode = resolveAccountGroupCode("INCOME", `${data.billingType}_BILLING`, data.billingType)
              const billingTypeTag = resolveBillingTypeTag(data.billingType)
              await tx.transaction.create({
                data: {
                  accountId,
                  type: "INCOME",
                  amount: netAmount,
                  category: `${data.billingType}_BILLING`,
                  paymentMethod: data.paymentMethod,
                  referenceId: billing.id,
                  description: `${data.billingType} billing - ${billing.billNumber}`,
                  accountGroupCode,
                  billingType: billingTypeTag,
                },
              })
              await tx.financialAccount.update({
                where: { id: accountId },
                data: { currentBalance: { increment: netAmount } },
              })
            }
          }
        }

        // 3. If credit, create CreditEntry
        if (isCredit && netAmount > 0) {
          const patient = await tx.patient.findUnique({
            where: { id: data.patientId },
            include: { user: true },
          })
          await tx.creditEntry.create({
            data: {
              type: "RECEIVABLE",
              partyName:
                patient?.user?.name ||
                (patient?.patientId || "PATIENT") +
                " - " +
                (patient?.phone || data.billingType),
              partyType: "PATIENT",
              partyId: data.patientId,
              referenceId: billing.id,
              referenceType: "BILLING",
              totalAmount: netAmount,
              balanceAmount: netAmount,
              status: "OPEN",
              notes: `${data.billingType} billing credit – ${billing.billNumber}`,
            },
          })
        }

        if (!isCredit && netAmount > 0) {
          const paymentMethods = isSplit
            ? ([
                ["CASH", data.splitPayments?.cash || 0],
                ["UPI", data.splitPayments?.upi || 0],
                ["CARD", data.splitPayments?.card || 0],
              ] as const)
            : ([[data.paymentMethod, netAmount]] as const)
          for (const [method, amount] of paymentMethods) {
            if (amount > 0) {
              await tx.payment.create({
                data: {
                  billingId: billing.id,
                  amount,
                  method: method as "CASH" | "UPI" | "CARD",
                  paymentMethod: method,
                  transactionId: data.transactionId || null,
                  recordedBy: authResult.session.user.id,
                  notes: data.notes || null,
                },
              })
            }
          }
        }

        // Close open credit entry if this was previously a credit/pending bill and is now being paid
        if (!isCredit) {
          await tx.creditEntry.updateMany({
            where: {
              referenceId: billing.id,
              referenceType: "BILLING",
              status: "OPEN",
            },
            data: {
              status: "CLOSED",
              balanceAmount: 0,
              paidAmount: netAmount,
            },
          })
        }

        // 4. Update linked entity payment status (Surgery / OPD / Casualty)
        if (data.billingType === "OT" && data.linkedEntityId) {
          await tx.surgery.update({
            where: { id: data.linkedEntityId },
            data: {
              billingId: billing.id,
              paymentStatus: isCredit ? "PENDING" : "PAID",
              paymentMethod: data.paymentMethod,
            },
          })
        } else if (data.billingType === "OPD" && data.linkedEntityId && !isCredit) {
          const appt = await tx.appointment.findUnique({
            where: { id: data.linkedEntityId },
            select: { status: true },
          })
          if (appt && appt.status === "PENDING") {
            await tx.appointment.update({
              where: { id: data.linkedEntityId },
              data: { status: "CONFIRMED" },
            })
          }
        } else if (data.billingType === "CASUALTY" && data.linkedEntityId) {
          const apptId = data.linkedAppointmentId || billing.appointmentId
          if (apptId && !isCredit) {
            await tx.appointment.update({
              where: { id: apptId },
              data: { status: "CONFIRMED" },
            }).catch(() => {})
          }

          // Settle or absorb any separate PENDING OPD bill that was previously created for this casualty visit or appointment
          const existingPendingOpdBill = await tx.billing.findFirst({
            where: {
              status: BillingStatus.PENDING,
              type: BillingType.OPD,
              OR: [
                { casualtyVisitId: data.linkedEntityId },
                ...(apptId ? [{ appointmentId: apptId }] : []),
              ],
            },
          })

          if (existingPendingOpdBill) {
            await tx.billing.update({
              where: { id: existingPendingOpdBill.id },
              data: {
                status: BillingStatus.PAID,
                paidAmount: existingPendingOpdBill.netAmount,
                balanceAmount: 0,
                notes: `Consolidated and settled in Casualty Bill #${billing.billNumber}`,
              },
            })

            await tx.creditEntry.updateMany({
              where: {
                referenceId: existingPendingOpdBill.id,
                referenceType: "BILLING",
                status: "OPEN",
              },
              data: {
                status: "CLOSED",
                balanceAmount: 0,
                paidAmount: existingPendingOpdBill.netAmount,
              },
            })
          }

          // Settle any pending LabRequests for this patient (e.g. from Casualty diagnostics orders)
          await tx.labRequest.updateMany({
            where: {
              patientId: data.patientId,
              status: "PENDING_PAYMENT",
            },
            data: {
              status: isCredit ? "PENDING_PAYMENT" : "PAID_PENDING_SAMPLE",
              billingId: billing.id,
            },
          })
        }

        return billing
      },
      { maxWait: 10000, timeout: 20000 }
    )

    revalidatePath("/dashboard/billing-counter")
    revalidatePath("/dashboard/billing-counter/opd")
    revalidatePath("/dashboard/billing-counter/casualty")
    revalidatePath("/dashboard/casualty")
    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard/clinical/emr")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/finance")

    writeAuditLog({
      userId: authResult.session.user.id,
      action: "CREATE",
      module: "BillingCounter",
      recordId: result.id,
      changes: {
        billNumber: result.billNumber,
        billingType: data.billingType,
        patientId: data.patientId,
        netAmount,
        paymentMethod: data.paymentMethod,
      },
    })

    return { success: true, data: result, billNumber: result.billNumber }
  } catch (error: any) {
    console.error("[createBill] Error:", error)
    return { success: false, message: error.message || "Failed to create bill" }
  }
}

// ============================================
// FETCH: UNBILLED ITEMS
// ============================================

/**
 * Get unbilled OPD appointments and appointments with pending OPD bills
 */
export async function getUnbilledAppointments() {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.opd)
  if (!authResult.ok) return { success: false, data: [] }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const appointments = await prisma.appointment.findMany({
      where: {
        casualtyVisitId: null,
        OR: [
          {
            billings: { none: { type: "OPD" } },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            appointmentDate: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
          },
          {
            billings: {
              some: {
                type: "OPD",
                status: "PENDING",
              },
            },
          },
        ],
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        billings: {
          where: { type: "OPD", status: "PENDING" },
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { appointmentDate: "desc" },
      take: 100,
    })

    return {
      success: true,
      data: appointments.map((a) => {
        const pendingBill = a.billings?.[0] || null
        const consultationFee = a.doctor.consultationFee || 0
        const totalAmount = pendingBill ? pendingBill.netAmount : consultationFee

        return {
          id: a.id,
          patientId: a.patientId,
          patientName: a.patient.user.name || "Unknown",
          patientDisplayId: a.patient.patientId,
          patientPhone: a.patient.phone,
          doctorName: a.doctor.user.name || "Unknown",
          doctorId: a.doctorId,
          consultationFee,
          appointmentDate: a.appointmentDate.toISOString(),
          appointmentTime: a.appointmentTime,
          status: a.status,
          hasPendingBill: !!pendingBill,
          pendingBillId: pendingBill?.id || null,
          pendingBillNumber: pendingBill?.billNumber || null,
          pendingBillAmount: pendingBill?.netAmount || null,
          pendingBillItems:
            pendingBill?.items.map((i) => ({
              id: i.id,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              serviceCategory: i.serviceCategory || "CONSULTATION",
            })) || null,
          totalAmount,
        }
      }),
    }
  } catch (error: any) {
    console.error("[getUnbilledAppointments] Error:", error)
    return { success: false, data: [], message: error.message }
  }
}

/**
 * Get unbilled casualty visits and visits with pending casualty bills
 */
export async function getUnbilledCasualtyVisits() {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.casualty)
  if (!authResult.ok) return { success: false, data: [] }

  try {
    const visits = await prisma.casualtyVisit.findMany({
      where: {
        OR: [
          {
            status: { in: ["ADMITTED", "TREATING", "REFERRED_TO_OPD"] },
            billings: { none: { type: "CASUALTY" } },
          },
          {
            billings: {
              some: {
                type: "CASUALTY",
                status: "PENDING",
              },
            },
          },
        ],
      },
      include: {
        patient: {
          include: {
            user: true,
            labRequests: {
              where: { status: "PENDING_PAYMENT" },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        assignedDoctor: { include: { user: true } },
        procedures: true,
        appointments: {
          include: {
            doctor: { include: { user: true } },
            billings: {
              where: { status: "PENDING" },
              include: { items: true },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        billings: {
          where: { status: "PENDING" },
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { arrivalTime: "desc" },
      take: 50,
    })

    return {
      success: true,
      data: visits.map((v) => {
        const pendingCasualtyBill = v.billings?.find((b) => b.type === "CASUALTY") || null
        const linkedAppointment = v.appointments?.[0] || null
        const pendingOpdBill =
          v.billings?.find((b) => b.type === "OPD") ||
          linkedAppointment?.billings?.[0] ||
          null

        const opdDoctorName = linkedAppointment?.doctor?.user?.name || v.assignedDoctor?.user?.name || null
        const opdConsultationFee = linkedAppointment?.doctor?.consultationFee || 500

        let opdItems: Array<{
          id?: string
          description: string
          quantity: number
          unitPrice: number
          serviceCategory: string
        }> = []

        if (pendingOpdBill && pendingOpdBill.items.length > 0) {
          opdItems = pendingOpdBill.items.map((i) => ({
            id: i.id,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            serviceCategory: i.serviceCategory || "CONSULTATION",
          }))
        } else if (linkedAppointment) {
          opdItems = [
            {
              description: `Consultation Fee - Dr. ${opdDoctorName || "Doctor"}`,
              quantity: 1,
              unitPrice: opdConsultationFee,
              serviceCategory: "CONSULTATION",
            },
          ]
        }

        const opdTotal = opdItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
        const procedureTotal = v.procedures.reduce(
          (sum, p) => sum + p.unitPrice * p.quantity,
          0
        )

        const pendingLabRequests = v.patient.labRequests || []
        const diagnosticItems = pendingLabRequests
          .filter(
            (lr) =>
              !v.procedures.some(
                (p) =>
                  p.name.toLowerCase() === lr.testName.toLowerCase() ||
                  lr.testName.toLowerCase().includes(p.name.toLowerCase())
              )
          )
          .map((lr) => ({
            id: lr.id,
            description: `${lr.testType === "RADIOLOGY" ? "🔬 Radiology: " : "🧪 Pathology: "}${lr.testName}`,
            quantity: 1,
            unitPrice: lr.testPrice,
            serviceCategory: lr.testType,
          }))

        const diagnosticTotal = diagnosticItems.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        )

        const casualtyBillHasConsultation = pendingCasualtyBill?.items.some((i) => i.serviceCategory === "CONSULTATION")
        const totalAmount = pendingCasualtyBill
          ? pendingCasualtyBill.netAmount + (!casualtyBillHasConsultation ? opdTotal : 0)
          : procedureTotal + opdTotal + diagnosticTotal

        return {
          id: v.id,
          patientId: v.patientId,
          patientName: v.patient.user.name || "Unknown",
          patientDisplayId: v.patient.patientId,
          patientPhone: v.patient.phone,
          chiefComplaint: v.chiefComplaint,
          doctorName: opdDoctorName || v.assignedDoctor?.user.name || "Unassigned",
          arrivalTime: v.arrivalTime.toISOString(),
          status: v.status,
          hasPendingBill: !!pendingCasualtyBill,
          pendingBillNumber: pendingCasualtyBill?.billNumber || null,
          pendingBillAmount: pendingCasualtyBill?.netAmount || null,
          pendingBillItems:
            pendingCasualtyBill?.items.map((i) => ({
              id: i.id,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              serviceCategory: i.serviceCategory,
            })) || null,
          linkedPendingOpdBill: pendingOpdBill
            ? {
                id: pendingOpdBill.id,
                billNumber: pendingOpdBill.billNumber,
                amount: pendingOpdBill.netAmount,
                appointmentId: pendingOpdBill.appointmentId,
              }
            : null,
          appointmentId: linkedAppointment?.id || pendingOpdBill?.appointmentId || null,
          hasOpdConsultation: opdItems.length > 0,
          opdDoctorName,
          opdItems,
          opdTotal,
          diagnosticItems,
          diagnosticTotal,
          hasDiagnostics: diagnosticItems.length > 0,
          procedures: v.procedures.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })),
          procedureTotal,
          totalAmount,
        }
      }),
    }
  } catch (error: any) {
    console.error("[getUnbilledCasualtyVisits] Error:", error)
    return { success: false, data: [], message: error.message }
  }
}

/**
 * Get unbilled emergency visits
 */
export async function getUnbilledEmergencyVisits() {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.emergency)
  if (!authResult.ok) return { success: false, data: [] }

  try {
    const visits = await prisma.emergencyVisit.findMany({
      where: {
        billings: { none: {} },
        patientId: { not: null },
        status: { in: ["TRIAGING", "OBSERVATION", "TREATING"] },
      },
      include: {
        patient: {
          include: {
            user: true,
            labRequests: {
              where: { status: "PENDING_PAYMENT" },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        assignedDoctor: { include: { user: true } },
        bed: { include: { ward: true } },
      },
      orderBy: { arrivalTime: "desc" },
      take: 50,
    })

    return {
      success: true,
      data: visits.map((v) => ({
        id: v.id,
        patientId: v.patientId!,
        patientName: v.patient?.user.name || "Unknown",
        patientDisplayId: v.patient?.patientId || "",
        patientPhone: v.patient?.phone || null,
        chiefComplaint: v.chiefComplaint,
        triageLevel: v.triageLevel,
        doctorName: v.assignedDoctor?.user.name || "Unassigned",
        bedInfo: v.bed
          ? `${v.bed.ward.name} - Bed ${v.bed.bedNumber}`
          : null,
        arrivalTime: v.arrivalTime.toISOString(),
        status: v.status,
        treatmentGiven: v.treatmentGiven,
        proceduresDone: v.proceduresDone,
      })),
    }
  } catch (error: any) {
    console.error("[getUnbilledEmergencyVisits] Error:", error)
    return { success: false, data: [], message: error.message }
  }
}

/**
 * Get completed unbilled surgeries
 */
export async function getUnbilledSurgeries() {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.ot)
  if (!authResult.ok) return { success: false, data: [] }

  try {
    const surgeries = await prisma.surgery.findMany({
      where: {
        status: "COMPLETED",
        paymentStatus: "PENDING",
        billingId: null,
      },
      include: {
        patient: { include: { user: true } },
        leadSurgeon: { include: { user: true } },
        theater: true,
      },
      orderBy: { scheduledDate: "desc" },
      take: 50,
    })

    return {
      success: true,
      data: surgeries.map((s) => ({
        id: s.id,
        patientId: s.patientId,
        patientName: s.patient.user.name || "Unknown",
        patientDisplayId: s.patient.patientId,
        patientPhone: s.patient.phone,
        procedureName: s.procedureName,
        surgeonName: s.leadSurgeon.user.name || "Unknown",
        theaterName: s.theater.name,
        scheduledDate: s.scheduledDate.toISOString(),
        estimatedCost: s.estimatedCost || 0,
        actualCost: s.actualCost || 0,
        surgeryCharge: s.surgeryCharge || 0,
        chargeBreakdown: s.chargeBreakdown as any[] || [],
        status: s.status,
      })),
    }
  } catch (error: any) {
    console.error("[getUnbilledSurgeries] Error:", error)
    return { success: false, data: [], message: error.message }
  }
}

// ============================================
// BILLING COUNTER STATS (for landing page)
// ============================================

export async function getBillingCounterStats() {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.parent)
  if (!authResult.ok) return { success: false, data: null }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayBills = await prisma.billing.findMany({
      where: {
        billDate: { gte: today },
        type: { not: BillingType.PHARMACY },
      },
      select: {
        netAmount: true,
        paidAmount: true,
        status: true,
        paymentMethod: true,
      },
    })

    const totalRevenue = todayBills
      .filter((b) => b.status === "PAID" || b.status === "PARTIALLY_PAID")
      .reduce((s, b) => s + b.paidAmount, 0)

    const billCount = todayBills.length

    const pendingCount = todayBills.filter(
      (b) => b.status === "PENDING" || b.status === "PARTIALLY_PAID"
    ).length

    const cashCollected = todayBills
      .filter((b) => b.paymentMethod === "CASH" && b.status === "PAID")
      .reduce((s, b) => s + b.paidAmount, 0)

    // Count unbilled items for badges
    const unbilledAppointments = await prisma.appointment.count({
      where: {
        OR: [
          {
            billings: { none: { type: "OPD" } },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            appointmentDate: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
          },
          {
            billings: {
              some: {
                type: "OPD",
                status: "PENDING",
              },
            },
          },
        ],
      },
    })

    const unbilledCasualty = await prisma.casualtyVisit.count({
      where: {
        OR: [
          {
            status: { in: ["ADMITTED", "TREATING", "REFERRED_TO_OPD"] },
            billings: { none: { type: "CASUALTY" } },
          },
          {
            billings: {
              some: {
                type: "CASUALTY",
                status: "PENDING",
              },
            },
          },
        ],
      },
    })

    const unbilledEmergency = await prisma.emergencyVisit.count({
      where: { billings: { none: {} }, patientId: { not: null } },
    })

    const unbilledSurgeries = await prisma.surgery.count({
      where: { status: "COMPLETED", paymentStatus: "PENDING", billingId: null },
    })

    const unbilledDiagnostics = await prisma.labRequest.count({
      where: {
        status: "PENDING_PAYMENT",
      },
    })

    return {
      success: true,
      data: {
        totalRevenue,
        billCount,
        pendingCount,
        cashCollected,
        unbilledAppointments,
        unbilledCasualty,
        unbilledEmergency,
        unbilledSurgeries,
        unbilledDiagnostics,
      },
    }
  } catch (error: any) {
    console.error("[getBillingCounterStats] Error:", error)
    return { success: false, data: null, message: error.message }
  }
}

// ============================================
// WHATSAPP BILL SENDING
// ============================================

export async function sendBillViaWhatsApp(billingId: string) {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.history)
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const billing = await prisma.billing.findUnique({
      where: { id: billingId },
      include: {
        patient: { include: { user: true } },
      },
    })

    if (!billing) return { success: false, message: "Bill not found" }

    const phone = billing.patient.phone
    if (!phone) return { success: false, message: "Patient has no phone number" }

    const result = await sendBillNotification({
      phone,
      patientName: billing.patient.user.name || "Patient",
      billNumber: billing.billNumber,
      amount: `₹${billing.netAmount.toLocaleString("en-IN")}`,
      date: billing.billDate.toLocaleDateString("en-IN"),
      referenceId: billing.id,
    })

    return { success: true, data: result }
  } catch (error: any) {
    console.error("[sendBillViaWhatsApp] Error:", error)
    return { success: false, message: error.message }
  }
}

// ============================================
// HOSPITAL FEES (for auto-populating OPD items)
// ============================================

export async function getActiveHospitalFees(context: "OPD" | "IPD" | "SURGERY" = "OPD") {
  const access = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.parent)
  if (!access.ok) return []
  try {
    const where: Record<string, boolean> = { isActive: true }
    if (context === "OPD") where.applyToOPD = true
    if (context === "IPD") where.applyToIPD = true
    if (context === "SURGERY") where.applyToSurgery = true

    const fees = await prisma.hospitalFee.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    })

    return fees.map((f) => ({
      id: f.id,
      name: f.name,
      amount: f.amount,
      feeType: f.feeType,
    }))
  } catch {
    return []
  }
}

// ============================================
// BILL HISTORY (for history page)
// ============================================

export async function getBillHistory(filters: {
  dateFrom?: string
  dateTo?: string
  billingType?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const authResult = await requireBillingCounterAccessSafe(BILLING_COUNTER_PERMISSIONS.history)
  if (!authResult.ok) return { success: false, data: [], total: 0 }

  try {
    const page = filters.page || 1
    const limit = filters.limit || 50
    const skip = (page - 1) * limit

    const where: any = {
      type: { not: BillingType.PHARMACY },
    }

    if (filters.dateFrom) {
      where.billDate = { ...where.billDate, gte: new Date(filters.dateFrom) }
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo)
      endDate.setHours(23, 59, 59, 999)
      where.billDate = { ...where.billDate, lte: endDate }
    }
    if (filters.billingType && filters.billingType !== "ALL") {
      where.type = BillingType[filters.billingType as keyof typeof BillingType]
    } else {
      // Keep the pharmacy exclusion
      where.type = { not: BillingType.PHARMACY }
    }
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status
    }
    if (filters.search) {
      where.OR = [
        { billNumber: { contains: filters.search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { patientId: { contains: filters.search, mode: "insensitive" } },
              { user: { name: { contains: filters.search, mode: "insensitive" } } },
            ],
          },
        },
      ]
    }

    const [bills, total] = await Promise.all([
      prisma.billing.findMany({
        where,
        include: {
          patient: { include: { user: true } },
          items: true,
          payments: { orderBy: { paymentDate: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.billing.count({ where }),
    ])

    return {
      success: true,
      data: bills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        patientName: b.patient.user.name || "Unknown",
        patientId: b.patient.patientId,
        type: b.type,
        billDate: b.billDate.toISOString(),
        totalAmount: b.totalAmount,
        discountAmount: b.discountAmount,
        netAmount: b.netAmount,
        paidAmount: b.paidAmount,
        balanceAmount: b.balanceAmount,
        status: b.status,
        paymentMethod: b.paymentMethod,
        itemCount: b.items.length,
      })),
      total,
      page,
      limit,
    }
  } catch (error: any) {
    console.error("[getBillHistory] Error:", error)
    return { success: false, data: [], total: 0, message: error.message }
  }
}
