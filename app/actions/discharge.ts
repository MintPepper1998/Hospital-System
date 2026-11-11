"use server"

import { prisma } from "@/lib/prisma"
import { DischargeType } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { createMultiRoleNotification } from "@/lib/create-notification"
import { sendDischargeNotification } from "@/lib/whatsapp"
import { getIPDPharmacyCharges } from "@/lib/ipd-pharmacy-charges"
import { format } from "date-fns"

// ============================================
// TYPES
// ============================================

type DischargeResult = {
  success: boolean
  message: string
  data?: {
    dischargeId: string
    admissionId: string
    billingId?: string
    billNumber?: string
    insuranceCovered?: boolean
  }
}
import { calculateFinalBill } from "@/app/actions/billing"

// ============================================
// GET ADMITTED PATIENTS WITH BILL STATUS
// ============================================

/**
 * Fetch all currently-admitted patients together with a snapshot of their
 * financial position (bill total, amount paid, balance, insurance status).
 * Uses calculateFinalBill() as the single source of truth — same as IPD Billing.
 */
export async function getAdmittedPatientsWithBillStatus() {
  await requireAuth()

  try {
    const admissions = await prisma.iPDAdmission.findMany({
      where: { status: "ADMITTED" },
      include: {
        patient: {
          include: {
            user: true,
            insurancePolicies: {
              where: { isActive: true },
              include: {
                claims: {
                  where: {
                    status: {
                      in: ["SUBMITTED", "UNDER_REVIEW", "IN_PROCESS", "APPROVED"],
                    },
                  },
                },
              },
            },
          },
        },
        bed: {
          include: { ward: true },
        },
        primaryDoctor: {
          include: { user: true },
        },
      },
      orderBy: { admissionDate: "desc" },
    })

    // Enrich each admission with live financial data from the unified bill calculator
    const enriched = await Promise.all(
      admissions.map(async (admission) => {
        const admissionDate = new Date(admission.admissionDate)
        const today = new Date()
        const daysAdmitted = Math.max(
          1,
          Math.ceil(
            (today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        )

        // Use the same calculateFinalBill function as IPD Billing page
        const billResult = await calculateFinalBill(admission.id)
        const billData = billResult.data

        const totalBillAmount = billData?.totalBillAmount || 0
        const amountPaid = billData?.amountPaid || 0
        const balanceDue = billData?.balanceDue || 0

        // Check insurance coverage
        const hasApprovedClaim = admission.patient.insurancePolicies.some(
          (policy) =>
            policy.claims.some((claim) => claim.status === "APPROVED")
        )
        const hasActiveClaim = admission.patient.insurancePolicies.some(
          (policy) =>
            policy.claims.some((claim) =>
              ["SUBMITTED", "UNDER_REVIEW", "IN_PROCESS"].includes(claim.status)
            )
        )

        return {
          id: admission.id,
          patientId: admission.patient.id,
          patientName: admission.patient.user.name || "N/A",
          patientCode: admission.patient.patientId,
          bedNumber: admission.bed.bedNumber,
          wardName: admission.bed.ward.name,
          doctorName: admission.primaryDoctor.user.name || "N/A",
          admissionDate: admission.admissionDate,
          daysAdmitted,
          reason: admission.reason,
          diagnosis: admission.diagnosis,
          // Financial — now from the unified bill calculator
          totalBedCharges: billData?.roomRent || 0,
          totalLabCharges: billData?.labTotal || 0,
          totalPharmacyCharges: billData?.pharmacyTotal || 0,
          totalBillAmount,
          amountPaid,
          balanceDue,
          // Insurance
          hasApprovedClaim,
          hasActiveClaim,
          // BSKY
          isBsky: admission.patient.isBsky === true,
          // Bill status for UI
          billStatus: admission.patient.isBsky
            ? ("BSKY_CASHLESS" as const)
            : balanceDue <= 0
              ? ("CLEAR" as const)
              : hasApprovedClaim || hasActiveClaim
                ? ("INSURANCE_PENDING" as const)
                : ("PENDING" as const),
        }
      })
    )

    return { success: true, data: enriched }
  } catch (error: unknown) {
    console.error("[ERROR] getAdmittedPatientsWithBillStatus:", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch admitted patients"
    return { success: false, message, data: [] }
  }
}

// ============================================
// PROCESS DISCHARGE  (Core Workflow)
// ============================================

/**
 * processDischarge — The financial-gatekept discharge action.
 *
 * Validation:
 *  1. Admission must exist and be in ADMITTED status.
 *  2. If the linked Invoice (computed on-the-fly) has a balance > 0:
 *     a. If an active InsuranceClaim is APPROVED (or pending),
 *        allow discharge (insurance will settle later).
 *     b. Otherwise THROW: "Cannot discharge. Outstanding balance of ₹X".
 *  3. On success:
 *     - Update Admission status → DISCHARGED.
 *     - Record a Discharge entry (new model).
 *     - Mark the assigned Bed as AVAILABLE.
 */
export async function processDischarge(
  admissionId: string,
  options?: {
    dischargeType?: "NORMAL" | "DAMA" | "LAMA" | "TRANSFER" | "REFERRED" | "DEATH" | "ABSCONDED"
    dischargeDate?: string | Date
    summary?: string
    preparedBy?: string
    paymentMode?: string
    additionalDiscount?: number
    doctorFeePerDay?: number
  }
): Promise<DischargeResult> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!admissionId) {
      return { success: false, message: "Admission ID is required" }
    }

    const dischargeType = options?.dischargeType || "NORMAL"
    const summary = options?.summary || ""
    const preparedBy = options?.preparedBy || ""
    const paymentMode = options?.paymentMode || "CASH"
    const additionalDiscount = options?.additionalDiscount || 0
    const DOCTOR_FEE_PER_DAY = options?.doctorFeePerDay ?? 500

    // ── Step 1: Fetch admission with all relations ──
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      include: {
        patient: {
          include: {
            user: true,
            insurancePolicies: {
              where: { isActive: true },
              include: {
                claims: true,
              },
            },
          },
        },
        bed: {
          include: { ward: true },
        },
        primaryDoctor: {
          include: { user: true },
        },
      },
    })

    if (!admission) {
      return { success: false, message: "Admission record not found" }
    }

    if (admission.status !== "ADMITTED") {
      return {
        success: false,
        message: "Patient is not currently admitted. Current status: " + admission.status,
      }
    }

    // ── Block discharge while discharge medicines are PENDING ──
    const pendingDMs = await prisma.dischargeMedicine.count({
      where: { admissionId, pharmacyStatus: "PENDING" },
    })
    if (pendingDMs > 0) {
      return {
        success: false,
        message: `${pendingDMs} discharge medicine(s) are still pending in the pharmacy. Dispense or cancel them before discharging.`,
      }
    }

    const now = new Date()
    const admissionDate = new Date(admission.admissionDate)
    const effectiveDischargeDate = options?.dischargeDate ? new Date(options.dischargeDate) : now

    if (isNaN(effectiveDischargeDate.getTime())) {
      return { success: false, message: "Invalid discharge date provided." }
    }

    if (effectiveDischargeDate < admissionDate) {
      return {
        success: false,
        message: `Discharge date (${format(effectiveDischargeDate, "dd MMM yyyy, hh:mm a")}) cannot be earlier than admission date (${format(admissionDate, "dd MMM yyyy, hh:mm a")}).`,
      }
    }

    const daysAdmitted = Math.max(
      1,
      Math.ceil((effectiveDischargeDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24))
    )

    // ── Auto-close/return any active equipment usages for this admission ──
    const activeEquipments = await prisma.iPDEquipmentUsage.findMany({
      where: { admissionId, status: "ACTIVE" },
      include: { equipment: true },
    })
    for (const eq of activeEquipments) {
      await prisma.iPDEquipmentUsage.update({
        where: { id: eq.id },
        data: {
          endTime: effectiveDischargeDate,
          status: "RETURNED",
        },
      })
    }

    const ipdLabs = await prisma.iPDLabRequest.findMany({
      where: { admissionId: admission.id, status: { not: "CANCELLED" } },
      include: { testCatalog: true },
    })

    // ── Step 2: Calculate current financial position ──
    const billResult = await calculateFinalBill(admission.id, { asOfDate: effectiveDischargeDate })
    if (!billResult.success || !billResult.data) {
      return { success: false, message: billResult.message || "Failed to calculate bill" }
    }
    const billData = billResult.data
    const totalBedCharges = billData.roomRent
    const totalLabCharges = billData.labTotal
    const totalPharmacyCharges = billData.pharmacyTotal
    const pharmacyTax = 0
    const doctorFees = billData.doctorFees
    const subtotal = billData.subtotal + (billData.discountAmount || 0)
    const totalBillAmount = Math.max(0, billData.totalBillAmount - additionalDiscount)
    const amountPaid = billData.amountPaid
    const balanceDue = Math.max(0, (billData.patientLiability ?? billData.totalBillAmount) - amountPaid - additionalDiscount)

    // ── Step 3: FINANCIAL GATEKEEPING ──
    let insuranceCovered = false
    let collectPaymentAtDischarge = false
    const isBskyPatient = admission.patient.isBsky === true

    if (isBskyPatient) {
      // BSKY beneficiary — cashless discharge; bill goes to Government Receivables
      console.log(
        `[BSKY CASHLESS] Discharging ${admission.patient.patientId} under BSKY. ` +
          `Balance ₹${balanceDue.toFixed(2)} forwarded to Government Claims.`
      )
    } else if (balanceDue > 0) {
      const allClaims = admission.patient.insurancePolicies.flatMap(
        (p) => p.claims
      )

      const hasApprovedClaim = allClaims.some(
        (c) => c.status === "APPROVED"
      )
      const hasActivePendingClaim = allClaims.some((c) =>
        ["SUBMITTED", "UNDER_REVIEW", "IN_PROCESS"].includes(c.status)
      )

      if (hasApprovedClaim || hasActivePendingClaim) {
        insuranceCovered = true
        console.log(
          `[INSURANCE EXCEPTION] Discharging ${admission.patient.patientId} with balance ₹${balanceDue.toFixed(2)}. ` +
            `Insurance claim is ${hasApprovedClaim ? "APPROVED" : "PENDING"}.`
        )
      } else if (paymentMode && paymentMode !== "INSURANCE") {
        collectPaymentAtDischarge = true
        console.log(
          `[SETTLE & DISCHARGE] Collecting ₹${balanceDue.toFixed(2)} via ${paymentMode} for ${admission.patient.patientId}`
        )
      } else {
        return {
          success: false,
          message: `Cannot discharge. Outstanding balance of ₹${balanceDue.toFixed(2)}. Please clear dues or submit an insurance claim before proceeding.`,
        }
      }
    }

    // ── Step 4: Execute discharge in a transaction ──
    const result = await prisma.$transaction(async (tx) => {
      // 4a. Update Admission → DISCHARGED
      const settledAmountPaid = isBskyPatient
        ? amountPaid             // BSKY: only the deposit was actually collected
        : collectPaymentAtDischarge
          ? totalBillAmount
          : amountPaid
      const settledBalanceDue = isBskyPatient
        ? Math.max(0, balanceDue) // BSKY: balance stays, forwarded to govt
        : collectPaymentAtDischarge
          ? 0
          : Math.max(0, balanceDue)

      await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          status: "DISCHARGED",
          dischargeDate: effectiveDischargeDate,
          dischargeType: dischargeType as DischargeType,
          dischargeSummary: summary || null,
          totalBedCharges,
          totalLabCharges,
          totalPharmacyCharges,
          totalOtherCharges: (billData.surgeryTotal || 0) + (billData.nursingTotal || 0) + (billData.equipmentTotal || 0) + (billData.canteenTotal || 0) + (billData.customChargesTotal || 0) + (billData.otherCharges || 0) + doctorFees,
          totalBillAmount,
          amountPaid: settledAmountPaid,
          balanceDue: settledBalanceDue,
        },
      })

      // 4b. Create the Discharge record
      const discharge = await tx.discharge.create({
        data: {
          admissionId,
          dischargeDate: effectiveDischargeDate,
          createdAt: effectiveDischargeDate,
          type: dischargeType as DischargeType,
          summary: summary || null,
          preparedBy: preparedBy || null,
          totalBillAmount,
          amountPaid: settledAmountPaid,
          balanceDue: settledBalanceDue,
          insuranceCovered,
        },
      })

      // 4c. Release the bed → AVAILABLE
      await tx.bed.update({
        where: { id: admission.bedId },
        data: {
          status: "AVAILABLE",
          lastCleaned: null,
        },
      })

      // 4d. Create IPD discharge invoice
      const billNumber = `IPD-${Date.now()}`
      const finalPaidAmount = isBskyPatient
        ? amountPaid
        : collectPaymentAtDischarge
          ? totalBillAmount
          : balanceDue <= 0
            ? totalBillAmount
            : amountPaid
      const finalBalanceAmount = isBskyPatient
        ? Math.max(0, balanceDue)
        : collectPaymentAtDischarge
          ? 0
          : Math.max(0, balanceDue)
      const billStatus = isBskyPatient
        ? "PENDING_GOVERNMENT_PAYMENT"
        : (collectPaymentAtDischarge || balanceDue <= 0)
          ? "PAID"
          : insuranceCovered
            ? "PENDING"
            : "PENDING"

      // 4d-pre. Lookup PreAuthorization for insurance budget
      const preAuth = await tx.preAuthorization.findFirst({
        where: {
          patientId: admission.patientId,
          status: { in: ["APPROVED", "APPROVED_WITH_MODIFICATION", "ENHANCEMENT_APPROVED", "DISCHARGE_APPROVED"] },
        },
        orderBy: { createdAt: "desc" },
      })

      let insuranceApprovedAmount = 0
      let insuranceCoveredAmount = 0
      if (preAuth && preAuth.approvedAmount) {
        insuranceApprovedAmount = preAuth.approvedAmount
        insuranceCoveredAmount = subtotal <= insuranceApprovedAmount ? subtotal : insuranceApprovedAmount
      } else if (insuranceCovered) {
        // Fallback: no PreAuth but patient has active claims — use claim or policy amounts
        const allClaims = admission.patient.insurancePolicies.flatMap(p => p.claims || [])
        const approvedClaim = allClaims.find(c => c.status === "APPROVED" && c.approvedAmount)
        
        if (approvedClaim && approvedClaim.approvedAmount) {
          insuranceApprovedAmount = approvedClaim.approvedAmount
        } else {
          const activePolicies = admission.patient.insurancePolicies.filter(p => p.isActive)
          const bestPolicy = activePolicies.reduce((best, p) =>
            (p.coverageAmount || 0) > (best?.coverageAmount || 0) ? p : best,
            activePolicies[0]
          )
          insuranceApprovedAmount = bestPolicy?.coverageAmount || 0
        }
        
        if (insuranceApprovedAmount > 0) {
          insuranceCoveredAmount = subtotal <= insuranceApprovedAmount ? subtotal : insuranceApprovedAmount
        }
      }

      // Build notes with insurance info
      let billNotes = isBskyPatient
        ? `BSKY Cashless Discharge. Type: ${dischargeType}. Claim forwarded to Government.`
        : `Discharge Type: ${dischargeType}`
      if (insuranceCovered && insuranceApprovedAmount > 0) {
        billNotes += ` | Insurance Approved: ₹${insuranceApprovedAmount.toFixed(2)} | Covered: ₹${insuranceCoveredAmount.toFixed(2)}`
      }

      const dischargeBill = await tx.billing.create({
        data: {
          billNumber,
          patientId: admission.patientId,
          type: "IPD",
          billDate: effectiveDischargeDate,
          createdAt: effectiveDischargeDate,
          totalAmount: subtotal,
          discountAmount: additionalDiscount,
          taxAmount: 0,
          netAmount: totalBillAmount,
          paidAmount: finalPaidAmount,
          balanceAmount: finalBalanceAmount,
          status: billStatus,
          paymentMethod: isBskyPatient ? "INSURANCE" : paymentMode,
          notes: billNotes,
        },
      })

      // 4e. Financial ledger entry
      if (isBskyPatient && totalBillAmount > 0) {
        // BSKY: create an Account Receivable entry against Government Claims
        const govAccount = await tx.financialAccount.upsert({
          where: { id: "govt-claims-account" },
          create: {
            id: "govt-claims-account",
            name: "Government Claims",
            type: "BANK",
            openingBalance: 0,
            currentBalance: 0,
          },
          update: {},
        })

        await tx.transaction.create({
          data: {
            accountId: govAccount.id,
            type: "INCOME",
            amount: totalBillAmount,
            category: "BSKY_GOVERNMENT_CLAIM",
            paymentMethod: "INSURANCE",
            referenceId: dischargeBill.id,
            description: `BSKY Government Receivable — Bill #${billNumber} — ${admission.patient.user.name || "Patient"}`,
            date: effectiveDischargeDate,
            createdAt: effectiveDischargeDate,
          },
        })

        await tx.financialAccount.update({
          where: { id: govAccount.id },
          data: { currentBalance: { increment: totalBillAmount } },
        })
      } else if (collectPaymentAtDischarge && balanceDue > 0) {
        const { resolveFinancialAccount } = await import("@/lib/payment-routing")
        const accountId = await resolveFinancialAccount(tx, paymentMode)

        if (accountId) {
          await tx.transaction.create({
            data: {
              accountId,
              type: "INCOME",
              amount: balanceDue,
              category: "PATIENT_BILL",
              paymentMethod: paymentMode,
              referenceId: dischargeBill.id,
              description: `IPD settlement — Bill #${billNumber} — ${admission.patient.user.name || "Patient"}`,
              date: effectiveDischargeDate,
              createdAt: effectiveDischargeDate,
            },
          })

          await tx.financialAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: balanceDue } },
          })
        }
      }

      // Create ITEMIZED line items
      const lineItems = []

      // 1. Room / Bed Charges
      if (billData.bedCharges && billData.bedCharges.length > 0) {
        for (const bed of billData.bedCharges) {
          lineItems.push(
            tx.billingItem.create({
              data: {
                billingId: dischargeBill.id,
                description: `Room/Bed: ${bed.name || `${admission.bed.ward.name} (${admission.bed.bedNumber})`}`,
                quantity: bed.days || 1,
                unitPrice: bed.ratePerDay || bed.total,
                amount: bed.total,
                gstRate: 0,
                gstAmount: 0,
                totalAmount: bed.total,
                serviceCategory: "ROOM_RENT",
                serviceDate: bed.date ? new Date(bed.date) : effectiveDischargeDate,
              },
            })
          )
        }
      } else if (totalBedCharges > 0) {
        lineItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: `Room Rent - ${admission.bed.ward.name} (${admission.bed.bedNumber})`,
              quantity: 1,
              unitPrice: totalBedCharges,
              amount: totalBedCharges,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: totalBedCharges,
              serviceCategory: "ROOM_RENT",
              serviceDate: effectiveDischargeDate,
            },
          })
        )
      }

      // 2. Doctor Visit Charges
      if (billData.doctorVisits && billData.doctorVisits.length > 0) {
        for (const doc of billData.doctorVisits) {
          lineItems.push(
            tx.billingItem.create({
              data: {
                billingId: dischargeBill.id,
                description: `Doctor Visit: ${doc.doctorName || `Dr. ${admission.primaryDoctor.user.name || "Doctor"}`}`,
                quantity: doc.visits || 1,
                unitPrice: doc.rate || doc.fee,
                amount: doc.fee,
                gstRate: 0,
                gstAmount: 0,
                totalAmount: doc.fee,
                serviceCategory: "CONSULTATION",
                serviceDate: doc.date ? new Date(doc.date) : effectiveDischargeDate,
                performedBy: doc.doctorName || `Dr. ${admission.primaryDoctor.user.name || "Doctor"}`,
              },
            })
          )
        }
      } else if (doctorFees > 0) {
        lineItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: `Doctor Visit Charges - Dr. ${admission.primaryDoctor.user.name || "Doctor"}`,
              quantity: 1,
              unitPrice: doctorFees,
              amount: doctorFees,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: doctorFees,
              serviceCategory: "CONSULTATION",
              performedBy: `Dr. ${admission.primaryDoctor.user.name || "Doctor"}`,
              serviceDate: effectiveDischargeDate,
            },
          })
        )
      }

      // 3. Nursing Charges
      if (billData.nurseAssignments && billData.nurseAssignments.length > 0) {
        for (const na of billData.nurseAssignments) {
          lineItems.push(
            tx.billingItem.create({
              data: {
                billingId: dischargeBill.id,
                description: `Nursing: ${na.nurseName || "Nurse"} (${na.shift || "General"})`,
                quantity: na.days || 1,
                unitPrice: na.cost || na.totalCost,
                amount: na.totalCost,
                gstRate: 0,
                gstAmount: 0,
                totalAmount: na.totalCost,
                serviceCategory: "NURSING",
                serviceDate: na.date ? new Date(na.date) : effectiveDischargeDate,
              },
            })
          )
        }
      }

      // 4. Equipment Charges
      if (billData.equipments && billData.equipments.length > 0) {
        for (const eq of billData.equipments) {
          lineItems.push(
            tx.billingItem.create({
              data: {
                billingId: dischargeBill.id,
                description: `Equipment: ${eq.name}`,
                quantity: eq.quantity || 1,
                unitPrice: eq.ratePerUnit || eq.totalCharge,
                amount: eq.totalCharge,
                gstRate: 0,
                gstAmount: 0,
                totalAmount: eq.totalCharge,
                serviceCategory: "EQUIPMENT",
                serviceDate: eq.date ? new Date(eq.date) : effectiveDischargeDate,
              },
            })
          )
        }
      }

      // 5. Addon / Custom Charges
      if (billData.customCharges && billData.customCharges.length > 0) {
        for (const c of billData.customCharges) {
          lineItems.push(
            tx.billingItem.create({
              data: {
                billingId: dischargeBill.id,
                description: `Addon: ${c.name}`,
                quantity: c.quantity || 1,
                unitPrice: c.amount || c.totalAmount,
                amount: c.totalAmount,
                gstRate: 0,
                gstAmount: 0,
                totalAmount: c.totalAmount,
                serviceCategory: "OTHER",
                serviceDate: c.date ? new Date(c.date) : effectiveDischargeDate,
              },
            })
          )
        }
      }

      // 6. Surgery Charges
      if (billData.surgeries && billData.surgeries.length > 0) {
        for (const surg of billData.surgeries) {
          lineItems.push(
            tx.billingItem.create({
              data: {
                billingId: dischargeBill.id,
                description: `Surgery: ${surg.procedureName}`,
                quantity: 1,
                unitPrice: surg.charge,
                amount: surg.charge,
                gstRate: 0,
                gstAmount: 0,
                totalAmount: surg.charge,
                serviceCategory: "SURGERY",
                serviceDate: surg.date ? new Date(surg.date) : effectiveDischargeDate,
                performedBy: surg.surgeonName,
              },
            })
          )
        }
      }

      // 7. ITEMIZED Lab Tests — catalog requests + manual
      for (const labReq of ipdLabs) {
        const testPrice = labReq.testCatalog?.price || 0
        if (testPrice > 0) {
          lineItems.push(
            tx.billingItem.create({
              data: {
                billingId: dischargeBill.id,
                description: `Lab: ${labReq.testName}`,
                quantity: 1,
                unitPrice: testPrice,
                amount: testPrice,
                gstRate: 0,
                gstAmount: 0,
                totalAmount: testPrice,
                serviceCategory: "LABORATORY",
                serviceDate: labReq.completedAt || labReq.createdAt,
                performedBy: labReq.orderedByName || undefined,
                referenceId: labReq.id,
              },
            })
          )
        }
      }
      const manualLabs = billData.labTests?.filter(t => t.isManual) || []
      for (const lab of manualLabs) {
        lineItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: `Lab: ${lab.name}`,
              quantity: 1,
              unitPrice: lab.price,
              amount: lab.price,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: lab.price,
              serviceCategory: "LABORATORY",
              serviceDate: (lab as any).date ? new Date((lab as any).date) : effectiveDischargeDate,
            },
          })
        )
      }

      // 8. ITEMIZED Medicines — dispensed prescriptions + manual
      const ipdRxs = await tx.iPDPrescription.findMany({
        where: { admissionId: admission.id, pharmacyStatus: "DISPENSED" },
      })
      for (const rx of ipdRxs) {
        const drug = await tx.medicine.findFirst({
          where: { name: { contains: rx.medicineName, mode: "insensitive" } },
          include: { inventoryBatches: { take: 1 } },
        })
        if (drug) {
          const taxPercent = drug.inventoryBatches?.[0]?.taxPercent ?? 12
          const dailyDose = parseDailyDose(rx.frequency)
          const days = parseInt(rx.duration) || 1
          const totalQty = dailyDose * days
          const totalAmount = totalQty * drug.unitPrice // MRP includes tax
          const gstAmount = totalAmount - (totalAmount / (1 + taxPercent / 100))
          const baseAmount = totalAmount - gstAmount

          if (totalAmount > 0) {
            lineItems.push(
              tx.billingItem.create({
                data: {
                  billingId: dischargeBill.id,
                  description: `Medicine: ${rx.medicineName} (${rx.dosage}, ${rx.frequency} × ${rx.duration})`,
                  quantity: totalQty,
                  unitPrice: drug.unitPrice,
                  amount: baseAmount,
                  gstRate: taxPercent,
                  gstAmount: gstAmount,
                  totalAmount: totalAmount,
                  serviceCategory: "PHARMACY",
                  serviceDate: rx.dispensedAt || rx.createdAt,
                  performedBy: rx.prescribedByName || undefined,
                },
              })
            )
          }
        }
      }
      const manualMeds = billData.medicines?.filter(m => m.isManual) || []
      for (const med of manualMeds) {
        lineItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: `Pharmacy: ${med.name}`,
              quantity: med.quantity,
              unitPrice: med.unitPrice,
              amount: med.totalPrice,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: med.totalPrice,
              serviceCategory: "PHARMACY",
              serviceDate: (med as any).date ? new Date((med as any).date) : effectiveDischargeDate,
            },
          })
        )
      }

      // 6. Insurance coverage line (informational, zero-amount deduction marker)
      if (insuranceCovered && insuranceApprovedAmount > 0) {
        lineItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: `Insurance Coverage (Pre-Auth: ₹${insuranceApprovedAmount.toLocaleString("en-IN")})`,
              quantity: 1,
              unitPrice: 0,
              amount: 0,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: 0,
              serviceCategory: "INSURANCE",
            },
          })
        )
      }

      await Promise.all(lineItems)

      return { discharge, dischargeBill }
    }, {
      maxWait: 10000,
      timeout: 20000,
    })

    const bskyNote = isBskyPatient ? " [BSKY Cashless — Claim forwarded to Government]" : ""
    console.log(
      `[SUCCESS] Patient ${admission.patient.patientId} discharged. ` +
        `Bed ${admission.bed.bedNumber} released. Bill: ${result.dischargeBill.billNumber}. ` +
        `Payment: ${isBskyPatient ? "BSKY_GOVERNMENT" : paymentMode}${bskyNote}`
    )

    revalidatePath("/dashboard/ipd")
    revalidatePath("/dashboard/ipd/discharge")
    revalidatePath(`/dashboard/ipd/discharge/${admissionId}`)
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/billing-counter/ipd")
    revalidatePath("/dashboard/ipd/billing")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/reports/day-book")
    revalidatePath("/dashboard/ipd/print/bill")

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "Discharge", recordId: result.discharge.id, changes: { admissionId, patientCode: admission.patient.patientId, dischargeType, billNumber: result.dischargeBill.billNumber, isBsky: isBskyPatient } })

    // Notify relevant staff about discharge
    await createMultiRoleNotification({
      title: "Patient Discharged",
      message: `${admission.patient.user.name || "Patient"} (${admission.patient.patientId}) has been discharged from Bed ${admission.bed.bedNumber}. Type: ${dischargeType}. ${isBskyPatient ? "BSKY Cashless" : `Balance: \u20b9${balanceDue.toFixed(0)}`}.`,
      type: "SUCCESS",
      module: "IPD",
      link: `/dashboard/ipd/discharge/${admissionId}`,
      referenceId: admissionId,
      targetRoles: ["NURSE", "ACCOUNTANT", "RECEPTIONIST", "SUPER_ADMIN"],
    })

    // ── WhatsApp Discharge Notification (fire-and-forget) ──
    const patientPhone = admission.patient.phone
    if (patientPhone) {
      sendDischargeNotification({
        phone: patientPhone,
        patientName: admission.patient.user.name || "Patient",
        dischargeDate: format(effectiveDischargeDate, "dd MMM yyyy"),
        diagnosis: admission.diagnosis || summary || "As discussed with doctor",
        followUpDate: "As advised by doctor",
        medications: "As per discharge prescription",
        referenceId: admissionId,
      }).catch((err) => console.error("[WHATSAPP] Discharge notification failed:", err))
    }

    const successMsg = isBskyPatient
      ? `BSKY Cashless Discharge complete. Bed ${admission.bed.bedNumber} is now available. Bill forwarded to Government Claims.`
      : `Patient discharged successfully. Bed ${admission.bed.bedNumber} is now available.`

    return {
      success: true,
      message: successMsg,
      data: {
        dischargeId: result.discharge.id,
        admissionId,
        billingId: result.dischargeBill.id,
        billNumber: result.dischargeBill.billNumber,
        insuranceCovered: insuranceCovered || isBskyPatient,
      },
    }
  } catch (error: unknown) {
    console.error("[CRITICAL ERROR] processDischarge failed:", error)
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process discharge. Please contact support."
    return { success: false, message }
  }
}

// ============================================
// CHECK DISCHARGE ELIGIBILITY (Pre-flight)
// ============================================

/**
 * Pre-check whether a patient can be discharged.
 * Returns the bill status and insurance info so the UI can
 * show the appropriate warning or confirm button.
 */
export async function checkDischargeEligibility(
  admissionId: string,
  options?: { asOfDate?: string | Date }
) {
  await requireAuth()

  try {
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      include: {
        patient: {
          include: {
            user: true,
            insurancePolicies: {
              where: { isActive: true },
              include: { claims: true },
            },
          },
        },
        bed: {
          include: { ward: true },
        },
        primaryDoctor: {
          include: { user: true },
        },
      },
    })

    if (!admission) {
      return { success: false, message: "Admission not found", data: null }
    }

    if (admission.status !== "ADMITTED") {
      return {
        success: false,
        message: "Patient is not currently admitted",
        data: null,
      }
    }

    // Calculate financials using calculateFinalBill
    const billResult = await calculateFinalBill(admission.id, { asOfDate: options?.asOfDate })
    if (!billResult.success || !billResult.data) {
      return { success: false, message: billResult.message || "Failed to calculate bill", data: null }
    }
    const bill = billResult.data
    const totalBedCharges = bill.roomRent
    const totalLabCharges = bill.labTotal
    const totalPharmacyCharges = bill.pharmacyTotal
    const totalBillAmount = bill.totalBillAmount
    const amountPaid = bill.amountPaid
    const balanceDue = bill.balanceDue
    const daysAdmitted = bill.daysAdmitted

    // Insurance check
    const allClaims = admission.patient.insurancePolicies.flatMap(
      (p) => p.claims
    )
    const hasApprovedClaim = allClaims.some((c) => c.status === "APPROVED")
    const hasActiveClaim = allClaims.some((c) =>
      ["SUBMITTED", "UNDER_REVIEW", "IN_PROCESS"].includes(c.status)
    )

    const isBsky = admission.patient.isBsky === true
    const canDischarge =
      isBsky || balanceDue <= 0 || hasApprovedClaim || hasActiveClaim

    return {
      success: true,
      message: canDischarge
        ? isBsky
          ? "BSKY Beneficiary — Cashless discharge permitted"
          : "Patient is eligible for discharge"
        : `Outstanding balance of ₹${balanceDue.toFixed(2)}. Clear dues or submit insurance claim.`,
      data: {
        canDischarge,
        isBsky,
        patientName: admission.patient.user.name || "N/A",
        patientCode: admission.patient.patientId,
        bedNumber: admission.bed.bedNumber,
        wardName: admission.bed.ward.name,
        doctorName: admission.primaryDoctor.user.name || "N/A",
        admissionDate: admission.admissionDate,
        daysAdmitted,
        totalBedCharges,
        totalLabCharges,
        totalPharmacyCharges,
        totalBillAmount,
        amountPaid,
        balanceDue,
        hasApprovedClaim,
        hasActiveClaim,
        billStatus: isBsky
          ? ("BSKY_CASHLESS" as const)
          : balanceDue <= 0
            ? ("CLEAR" as const)
            : hasApprovedClaim || hasActiveClaim
              ? ("INSURANCE_PENDING" as const)
              : ("PENDING" as const),
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] checkDischargeEligibility:", error)
    const message =
      error instanceof Error ? error.message : "Failed to check eligibility"
    return { success: false, message, data: null }
  }
}
/**
 * Helper to parse frequency string into daily dose count
 */
function parseDailyDose(freq: string): number {
  const f = freq.toUpperCase()
  if (f.includes("-")) {
    return f.split("-").reduce((sum, n) => sum + (parseInt(n) || 0), 0)
  }
  if (f === "BD" || f === "BID") return 2
  if (f === "TDS" || f === "TID") return 3
  if (f === "QID") return 4
  if (f === "OD") return 1
  if (f === "STAT" || f === "SOS") return 1
  return 1
}
