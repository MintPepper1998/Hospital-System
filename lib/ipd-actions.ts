"use server"

import { prisma } from "@/lib/prisma"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { revalidatePath } from "next/cache"
import { BedStatus, BillingStatus, BillingType } from "@prisma/client"
import { createMultiRoleNotification } from "@/lib/create-notification"

// ============================================
// IPD (IN-PATIENT DEPARTMENT) MANAGEMENT
// ============================================

/**
 * Generate a sequential IP number in the format IPD/001/2026
 * The middle number auto-increments per year and resets each new year.
 */
async function generateIpNumber(tx?: any): Promise<string> {
  const db = tx || prisma
  const year = new Date().getFullYear()
  const prefix = `IPD/`
  const suffix = `/${year}`

  // Find the last admission with an ipNumber for this year
  const lastAdmission = await db.iPDAdmission.findFirst({
    where: {
      ipNumber: { startsWith: prefix, endsWith: suffix },
    },
    orderBy: { ipNumber: "desc" },
    select: { ipNumber: true },
  })

  let nextSeq = 1
  if (lastAdmission?.ipNumber) {
    // Extract the middle number: "IPD/003/2026" → "003" → 3
    const parts = lastAdmission.ipNumber.split("/")
    if (parts.length === 3) {
      nextSeq = parseInt(parts[1], 10) + 1
    }
  }

  return `IPD/${String(nextSeq).padStart(3, "0")}/${year}`
}

/**
 * Create a new bed in a ward
 */
export async function createBed(formData: FormData) {
  try {
    const wardId = formData.get("wardId") as string
    const bedNumber = formData.get("bedNumber") as string
    const pricePerDayRaw = formData.get("pricePerDay") as string
    const features = formData.get("features") as string

    if (!wardId || !bedNumber || !pricePerDayRaw) {
      return {
        success: false,
        error: true,
        message: "Ward, bed number, and price are required",
      }
    }

    const pricePerDay = parseFloat(pricePerDayRaw)

    if (isNaN(pricePerDay) || pricePerDay < 0) {
      return {
        success: false,
        error: true,
        message: "Invalid price per day",
      }
    }

    // Check if bed number already exists in this ward
    const existingBed = await prisma.bed.findFirst({
      where: {
        wardId,
        bedNumber,
      },
    })

    if (existingBed) {
      return {
        success: false,
        error: true,
        message: `Bed ${bedNumber} already exists in this ward`,
      }
    }

    const bed = await prisma.bed.create({
      data: {
        wardId,
        bedNumber,
        pricePerDay,
        features: features || null,
      },
    })

    // Update ward capacity
    const wardBedCount = await prisma.bed.count({
      where: { wardId },
    })

    await prisma.ward.update({
      where: { id: wardId },
      data: { capacity: wardBedCount },
    })

    revalidatePath("/dashboard/admin/beds")
    revalidatePath("/dashboard/ipd")

    return {
      success: true,
      error: false,
      message: "Bed created successfully",
      bedId: bed.id,
    }
  } catch (error: unknown) {
    console.error("❌ CREATE BED ERROR:", error)
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to create bed",
    }
  }
}

/**
 * Update an existing bed's details (Bed Number, Price, Features)
 */
export async function updateBed(formData: FormData) {
  try {
    const bedId = formData.get("bedId") as string
    const bedNumber = formData.get("bedNumber") as string
    const pricePerDayRaw = formData.get("pricePerDay") as string
    const features = formData.get("features") as string

    if (!bedId || !bedNumber || !pricePerDayRaw) {
      return {
        success: false,
        error: true,
        message: "Bed ID, number, and price are required",
      }
    }

    const pricePerDay = parseFloat(pricePerDayRaw)
    if (isNaN(pricePerDay) || pricePerDay < 0) {
      return {
        success: false,
        error: true,
        message: "Invalid price per day",
      }
    }

    // Check for duplicate bed number *other than this bed* in the same ward
    const currentBed = await prisma.bed.findUnique({ where: { id: bedId } })
    if (!currentBed) {
      return { success: false, error: true, message: "Bed not found" }
    }

    const existingBed = await prisma.bed.findFirst({
      where: {
        wardId: currentBed.wardId,
        bedNumber,
        id: { not: bedId },
      },
    })

    if (existingBed) {
      return {
        success: false,
        error: true,
        message: `Bed ${bedNumber} already exists in this ward`,
      }
    }

    await prisma.bed.update({
      where: { id: bedId },
      data: {
        bedNumber,
        pricePerDay,
        features: features || null,
      },
    })

    revalidatePath("/dashboard/admin/beds")
    revalidatePath("/dashboard/ipd")

    return {
      success: true,
      error: false,
      message: "Bed updated successfully",
    }
  } catch (error: unknown) {
    console.error("❌ UPDATE BED ERROR:", error)
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to update bed",
    }
  }
}

/**
 * Update bed status (AVAILABLE, MAINTENANCE, CLEANING)
 */
export async function updateBedStatus(bedId: string, status: string) {
  "use server"
  try {
    if (!bedId || !status) {
      return {
        success: false,
        error: true,
        message: "Bed ID and status are required",
      }
    }

    await prisma.bed.update({
      where: { id: bedId },
      data: {
        status: status as BedStatus,
        lastCleaned: status === "AVAILABLE" ? new Date() : undefined,
      },
    })

    revalidatePath("/dashboard/admin/beds")
    revalidatePath("/dashboard/ipd")

    return {
      success: true,
      error: false,
      message: "Bed status updated successfully",
    }
  } catch (error: unknown) {
    console.error("❌ UPDATE BED STATUS ERROR:", error)
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to update bed status",
    }
  }
}

/**
 * Admit a patient to IPD
 * Creates IPDAdmission record, updates bed status, and generates deposit receipt
 */
export async function admitPatient(data: {
  patientId: string
  bedId: string
  primaryDoctorId: string
  reason: string
  initialDeposit: number
  paymentMethod: string
  isBskyAdmission?: boolean
  profilePhotoUrl?: string
  aadharNumber?: string
  aadharCardUrl?: string
  bskyNumber?: string
  bskyCardUrl?: string
  pastMedicalHistory?: string
  splitPayments?: { cash?: number; upi?: number; card?: number }
  documents?: { title: string; fileUrl: string; fileType: string }[]
}) {
  "use server"
  try {
    console.log("=== IPD ADMISSION STARTED ===")
    console.log("Patient ID:", data.patientId)
    console.log("Bed ID:", data.bedId)
    console.log("Doctor ID:", data.primaryDoctorId)
    console.log("Initial Deposit:", data.initialDeposit)

    // Validate inputs
    if (!data.patientId || !data.bedId || !data.primaryDoctorId) {
      return {
        success: false,
        error: true,
        message: "Patient, bed, and doctor are required",
      }
    }

    const isBsky = data.isBskyAdmission === true

    // Deposit is optional — insurance patients or emergency cases may not pay upfront
    const depositAmount = data.initialDeposit || 0

    // Verify bed is available
    const bed = await prisma.bed.findUnique({
      where: { id: data.bedId },
      include: { ward: true },
    })

    if (!bed) {
      return {
        success: false,
        error: true,
        message: "Bed not found",
      }
    }

    if (bed.status !== "AVAILABLE") {
      return {
        success: false,
        error: true,
        message: `Bed ${bed.bedNumber} is not available (Status: ${bed.status})`,
      }
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      include: { user: true },
    })

    if (!patient) {
      return {
        success: false,
        error: true,
        message: "Patient not found",
      }
    }

    // ── DUPLICATE ADMISSION GUARD ──
    // Prevent the same patient from being admitted to multiple beds simultaneously
    const existingAdmission = await prisma.iPDAdmission.findFirst({
      where: {
        patientId: data.patientId,
        status: "ADMITTED",
      },
      include: {
        bed: { include: { ward: true } },
      },
    })

    if (existingAdmission) {
      const bedInfo = existingAdmission.bed
        ? `${existingAdmission.bed.ward?.name} - ${existingAdmission.bed.bedNumber}`
        : "unknown bed"
      return {
        success: false,
        error: true,
        message: `Patient "${patient.user.name}" is already admitted in ${bedInfo}. A patient cannot occupy multiple beds simultaneously. Please discharge the patient first before re-admitting.`,
      }
    }

    // Verify doctor exists
    const doctor = await prisma.staff.findUnique({
      where: { id: data.primaryDoctorId },
      include: { user: true },
    })

    if (!doctor || doctor.user.role !== "DOCTOR") {
      return {
        success: false,
        error: true,
        message: "Invalid doctor selected",
      }
    }

    // Generate deposit receipt number
    const year = new Date().getFullYear()
    const lastDeposit = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: `IPD-DEP-${year}-` } },
      orderBy: { billNumber: 'desc' },
    })
    const lastSeq = lastDeposit?.billNumber ? parseInt(lastDeposit.billNumber.split('-')[3]) || 0 : 0
    const receiptNumber = `IPD-DEP-${year}-${String(lastSeq + 1).padStart(4, "0")}`

    // Transaction: Create admission, update bed, create deposit receipt, update patient files
    const result = await prisma.$transaction(async (tx) => {
      // Update patient with identity, file, and BSKY fields
      const patientUpdateData: Record<string, unknown> = {}
      if (data.profilePhotoUrl) patientUpdateData.profilePhotoUrl = data.profilePhotoUrl
      if (data.aadharCardUrl) patientUpdateData.aadharCardUrl = data.aadharCardUrl
      if (data.bskyNumber) patientUpdateData.bskyNumber = data.bskyNumber
      if (data.bskyCardUrl) patientUpdateData.bskyCardUrl = data.bskyCardUrl
      if (data.pastMedicalHistory) patientUpdateData.pastMedicalHistory = data.pastMedicalHistory
      if (data.isBskyAdmission) {
        patientUpdateData.isBsky = true
        if (data.bskyNumber) patientUpdateData.bskyNumber = data.bskyNumber
      }

      // Aadhaar: only set if patient has NO Aadhaar yet.
      // If already stored (e.g. from insurance registration), never re-write it
      // to avoid unique constraint conflicts.
      if (data.aadharNumber && !patient.aadharNumber) {
        const normalizedAadhar = data.aadharNumber.replace(/\D/g, "")
        if (normalizedAadhar.length === 12) {
          patientUpdateData.aadharNumber = normalizedAadhar
        }
      }

      if (Object.keys(patientUpdateData).length > 0) {
        await tx.patient.update({
          where: { id: data.patientId },
          data: patientUpdateData,
        })
      }

      // Save uploaded documents (past reports, etc.)
      if (data.documents && data.documents.length > 0) {
        await tx.patientDocument.createMany({
          data: data.documents.map((doc) => ({
            patientId: data.patientId,
            title: doc.title,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType,
          })),
        })
      }

      // Create IPD admission (flag as BSKY if this is a cashless admission)
      const ipNumber = await generateIpNumber(tx)
      const admission = await tx.iPDAdmission.create({
        data: {
          patientId: data.patientId,
          bedId: data.bedId,
          primaryDoctorId: data.primaryDoctorId,
          reason: data.reason,
          initialDeposit: depositAmount,
          status: "ADMITTED",
          isBskyAdmission: isBsky,
          ipNumber,
        },
      })

      // Update bed status to OCCUPIED
      await tx.bed.update({
        where: { id: data.bedId },
        data: { status: "OCCUPIED" },
      })

      // Create deposit receipt (billing record) — skip for BSKY ₹0 deposits
      let billing = null
      const isSplitPayment = data.paymentMethod === "SPLIT" && data.splitPayments
      if (depositAmount > 0) {
        billing = await tx.billing.create({
          data: {
            billNumber: receiptNumber,
            patientId: data.patientId,
            type: BillingType.IPD,
            billDate: new Date(),
            totalAmount: depositAmount,
            discountAmount: 0,
            taxAmount: 0,
            netAmount: depositAmount,
            paidAmount: depositAmount,
            balanceAmount: 0,
            status: BillingStatus.PAID,
            paymentMethod: isBsky ? "BSKY" : data.paymentMethod,
            notes: `IPD Admission Deposit - Bed: ${bed.bedNumber}, Ward: ${bed.ward.name}`,
            // Store split amounts when payment is split
            ...(isSplitPayment ? {
              splitCashAmount: data.splitPayments!.cash || null,
              splitUpiAmount: data.splitPayments!.upi || null,
              splitCardAmount: data.splitPayments!.card || null,
            } : {}),
            items: {
              create: [
                {
                  description: `IPD Admission Deposit (${bed.ward.name} - ${bed.bedNumber})`,
                  quantity: 1,
                  unitPrice: depositAmount,
                  amount: depositAmount,
                  gstRate: 0,
                  gstAmount: 0,
                  totalAmount: depositAmount,
                },
              ],
            },
          },
        })

        // Route deposit to the correct financial ledger(s)
        if (!isBsky) {
          if (isSplitPayment) {
            // For split payments, create separate ledger entries per method
            const splits: Array<[string, number]> = [
              ["CASH", data.splitPayments!.cash || 0],
              ["UPI", data.splitPayments!.upi || 0],
              ["CARD", data.splitPayments!.card || 0],
            ]
            for (const [method, splitAmount] of splits) {
              if (splitAmount > 0) {
                const accountId = await resolveFinancialAccount(tx, method)
                if (accountId) {
                  await tx.transaction.create({
                    data: {
                      accountId,
                      type: "INCOME",
                      amount: splitAmount,
                      category: "IPD_DEPOSIT",
                      paymentMethod: method,
                      referenceId: billing!.id,
                      description: `IPD Admission Deposit (split ${method}) - ${receiptNumber}`,
                    },
                  })
                  await tx.financialAccount.update({
                    where: { id: accountId },
                    data: { currentBalance: { increment: splitAmount } },
                  })
                }
              }
            }
          } else {
            // Single payment method — original logic
            const accountId = await resolveFinancialAccount(tx, data.paymentMethod)
            if (accountId) {
              await tx.transaction.create({
                data: {
                  accountId,
                  type: "INCOME",
                  amount: depositAmount,
                  category: "IPD_DEPOSIT",
                  paymentMethod: data.paymentMethod,
                  referenceId: billing!.id,
                  description: `IPD Admission Deposit - ${receiptNumber}`,
                },
              })
              await tx.financialAccount.update({
                where: { id: accountId },
                data: { currentBalance: { increment: depositAmount } },
              })
            }
          }
        }
      }

      // ── BSKY TARGETED REFUND ENGINE ──
      // Only LABORATORY (Pathology/Radiology) bills are refunded.
      // OPD consultation fees and Pharmacy bills are explicitly excluded.
      const refundedBillIds: string[] = []
      let totalRefundAmount = 0

      if (isBsky) {
        const eligibleLabBills = await tx.billing.findMany({
          where: {
            patientId: data.patientId,
            status: "PAID",
            type: "LABORATORY",
            ...(billing ? { id: { not: billing.id } } : {}),
          },
        })

        if (eligibleLabBills.length > 0) {
          const cashDrawer = await tx.financialAccount.findFirst({
            where: { name: "Main Cash Drawer" },
          })

          for (const bill of eligibleLabBills) {
            await tx.billing.update({
              where: { id: bill.id },
              data: { status: "REFUNDED" },
            })

            if (cashDrawer) {
              await tx.transaction.create({
                data: {
                  accountId: cashDrawer.id,
                  date: new Date(),
                  type: "EXPENSE",
                  category: "BSKY_REFUND",
                  amount: bill.paidAmount,
                  paymentMethod: bill.paymentMethod || "CASH",
                  referenceId: bill.id,
                  description: `BSKY Lab Refund for IPD Admission (Bill #${bill.billNumber})`,
                },
              })

              await tx.financialAccount.update({
                where: { id: cashDrawer.id },
                data: { currentBalance: { decrement: bill.paidAmount } },
              })
            }

            refundedBillIds.push(bill.id)
            totalRefundAmount += bill.paidAmount
          }

          console.log(
            `[BSKY] Lab refund: ${eligibleLabBills.length} bill(s) totalling ₹${totalRefundAmount.toFixed(2)}`
          )
        }
      }

      return { admission, billing, refundedBillIds, totalRefundAmount }
    })

    console.log("✅ Patient admitted successfully")
    console.log("Admission ID:", result.admission.id)
    if (result.billing) console.log("Deposit Receipt:", result.billing.billNumber)
    if (result.refundedBillIds.length > 0) {
      console.log(`[BSKY] Lab refund: ${result.refundedBillIds.length} bill(s), ₹${result.totalRefundAmount.toFixed(2)}`)
    }

    revalidatePath("/dashboard/ipd")
    revalidatePath("/dashboard/ipd/admission")
    revalidatePath("/dashboard/finance/billing")

    // Notify relevant staff about new admission
    await createMultiRoleNotification({
      title: "New IPD Admission",
      message: `${patient.user.name || "Patient"} has been admitted to ${bed.ward.name} - Bed ${bed.bedNumber}. Doctor: Dr. ${doctor.user.name}. ${isBsky ? "(BSKY Cashless)" : `Deposit: ₹${depositAmount}`}`,
      type: "INFO",
      module: "IPD",
      link: `/dashboard/ipd/patient/${result.admission.id}`,
      referenceId: result.admission.id,
      targetRoles: ["NURSE", "DOCTOR", "ACCOUNTANT", "SUPER_ADMIN"],
    })

    const bskyMsg =
      result.refundedBillIds.length > 0
        ? ` | BSKY: ${result.refundedBillIds.length} lab bill(s) refunded (₹${result.totalRefundAmount.toFixed(2)}).`
        : isBsky
          ? " | BSKY Cashless Admission — no prior lab bills to refund."
          : ""

    return {
      success: true,
      error: false,
      message: `Patient admitted successfully.${bskyMsg}`,
      admissionId: result.admission.id,
      receiptNumber: result.billing?.billNumber || receiptNumber,
      billingId: result.billing?.id || null,
      refundedBillCount: result.refundedBillIds.length,
    }
  } catch (error: unknown) {
    console.error("❌ ADMIT PATIENT ERROR:", error)
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to admit patient",
    }
  }
}

/**
 * @deprecated Use `processDischarge` from `@/app/actions/discharge` instead.
 * That version includes full financial gatekeeping, insurance exception logic,
 * and creates a formal Discharge record in the new `Discharge` model.
 */
export async function dischargePatient_DEPRECATED(_admissionId: string) {
  "use server"
  throw new Error(
    "dischargePatient is deprecated. Use processDischarge from @/app/actions/discharge instead."
  )
}

// ============================================
// UPDATE WARD
// ============================================

export async function updateWard(wardId: string, data: {
  name: string
  type: string
  floor?: string
  description?: string
}) {
  "use server"
  try {
    if (!wardId || !data.name?.trim() || !data.type?.trim()) {
      return { success: false, error: true, message: "Ward ID, name, and type are required" }
    }

    await prisma.ward.update({
      where: { id: wardId },
      data: {
        name: data.name.trim(),
        type: data.type.trim(),
        floor: data.floor?.trim() || null,
        description: data.description?.trim() || null,
      },
    })

    revalidatePath("/dashboard/admin/beds")
    revalidatePath("/dashboard/ipd")
    return { success: true, error: false, message: "Ward updated successfully" }
  } catch (error: unknown) {
    console.error("❌ UPDATE WARD ERROR:", error)
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to update ward",
    }
  }
}

// ============================================
// DELETE WARD
// ============================================

export async function deleteWard(wardId: string) {
  "use server"
  try {
    const ward = await prisma.ward.findUnique({
      where: { id: wardId },
      include: {
        beds: { include: { admissions: { where: { status: "ADMITTED" } } } },
      },
    })
    if (!ward) return { success: false, error: true, message: "Ward not found" }

    // Block if any bed is currently occupied
    const occupiedBeds = ward.beds.filter((b) => b.admissions.length > 0)
    if (occupiedBeds.length > 0) {
      return {
        success: false,
        error: true,
        message: `Cannot delete "${ward.name}" — ${occupiedBeds.length} bed(s) are currently occupied by admitted patients.`,
      }
    }

    // Soft-delete: mark ward as inactive (preserves historical data)
    await prisma.ward.update({
      where: { id: wardId },
      data: { isActive: false },
    })

    revalidatePath("/dashboard/admin/beds")
    revalidatePath("/dashboard/ipd")
    return { success: true, error: false, message: `Ward "${ward.name}" removed` }
  } catch (error: unknown) {
    console.error("❌ DELETE WARD ERROR:", error)
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to delete ward",
    }
  }
}

// ============================================
// DELETE BED
// ============================================

export async function deleteBed(bedId: string) {
  "use server"
  try {
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: {
        admissions: { where: { status: "ADMITTED" } },
        ward: { select: { id: true, name: true } },
      },
    })
    if (!bed) return { success: false, error: true, message: "Bed not found" }

    if (bed.admissions.length > 0) {
      return {
        success: false,
        error: true,
        message: `Cannot delete bed ${bed.bedNumber} — it is currently occupied by an admitted patient.`,
      }
    }

    await prisma.bed.delete({ where: { id: bedId } })

    // Update ward capacity
    const remainingBeds = await prisma.bed.count({ where: { wardId: bed.ward.id } })
    await prisma.ward.update({
      where: { id: bed.ward.id },
      data: { capacity: remainingBeds },
    })

    revalidatePath("/dashboard/admin/beds")
    revalidatePath("/dashboard/ipd")
    return { success: true, error: false, message: `Bed ${bed.bedNumber} deleted` }
  } catch (error: unknown) {
    console.error("❌ DELETE BED ERROR:", error)
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : "Failed to delete bed",
    }
  }
}
