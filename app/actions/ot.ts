"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { startOfDay } from "date-fns"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

const VALID_DOC_TYPES = ["consent", "anaesthesia", "op_note"] as const
type OTDocType = (typeof VALID_DOC_TYPES)[number]

const DOC_TYPE_TO_FIELD: Record<OTDocType, string> = {
  consent: "consentFormUrl",
  anaesthesia: "anaesthesiaRecordUrl",
  op_note: "operationNoteUrl",
}

/**
 * Save the S3 URL of a scanned signed OT document to the Surgery record.
 */
export async function uploadOTDocument(
  surgeryId: string,
  docType: string,
  fileUrl: string
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!surgeryId || !docType || !fileUrl) {
      return { success: false, message: "Surgery ID, document type, and file URL are required" }
    }

    if (!VALID_DOC_TYPES.includes(docType as OTDocType)) {
      return { success: false, message: `Invalid document type: ${docType}` }
    }

    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      select: { id: true },
    })

    if (!surgery) {
      return { success: false, message: "Surgery not found" }
    }

    const field = DOC_TYPE_TO_FIELD[docType as OTDocType]

    await prisma.surgery.update({
      where: { id: surgeryId },
      data: { [field]: fileUrl },
    })

    revalidatePath("/dashboard/clinical/ot")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "OTDocument", recordId: surgeryId, changes: { docType, surgeryId } })

    return { success: true, message: "Document uploaded successfully" }
  } catch (error: any) {
    console.error("[ERROR] uploadOTDocument:", error)
    return { success: false, message: error.message || "Failed to save document" }
  }
}

/**
 * Fetch document upload status for a surgery (which forms have been uploaded).
 */
export async function getSurgeryDocStatus(surgeryId: string) {
  await requireAuth()

  const surgery = await prisma.surgery.findUnique({
    where: { id: surgeryId },
    select: {
      consentFormUrl: true,
      anaesthesiaRecordUrl: true,
      operationNoteUrl: true,
    },
  })

  if (!surgery) return null

  return {
    consent: !!surgery.consentFormUrl,
    anaesthesia: !!surgery.anaesthesiaRecordUrl,
    op_note: !!surgery.operationNoteUrl,
    consentFormUrl: surgery.consentFormUrl,
    anaesthesiaRecordUrl: surgery.anaesthesiaRecordUrl,
    operationNoteUrl: surgery.operationNoteUrl,
  }
}

/**
 * Fetch media (images and video) for a surgery.
 */
export async function getSurgeryMedia(surgeryId: string) {
  await requireAuth()

  const surgery = await prisma.surgery.findUnique({
    where: { id: surgeryId },
    select: {
      operationImages: true,
      operationVideo: true,
    },
  })

  if (!surgery) return null

  // Ensure operationImages is treated as an array of strings
  const rawImages = surgery.operationImages
  let operationImages: string[] = []
  if (Array.isArray(rawImages)) {
      operationImages = rawImages.map(String)
  } else if (typeof rawImages === 'string') {
      try {
          const parsed = JSON.parse(rawImages)
          if (Array.isArray(parsed)) operationImages = parsed.map(String)
      } catch (e) {
          operationImages = []
      }
  }

  return {
    operationImages,
    operationVideo: surgery.operationVideo,
  }
}

/**
 * Update media (images array and video) for a surgery.
 */
export async function uploadOTMedia(
  surgeryId: string,
  media: {
    images?: string[],
    video?: string | null
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!surgeryId) {
      return { success: false, message: "Surgery ID is required" }
    }

    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      select: { id: true, operationImages: true, operationVideo: true },
    })

    if (!surgery) {
      return { success: false, message: "Surgery not found" }
    }

    const dataToUpdate: any = {}
    
    if (media.images !== undefined) {
       dataToUpdate.operationImages = media.images
    }
    if (media.video !== undefined) {
       dataToUpdate.operationVideo = media.video
    }

    await prisma.surgery.update({
      where: { id: surgeryId },
      data: dataToUpdate,
    })

    revalidatePath("/dashboard/clinical/ot")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "OTMedia", recordId: surgeryId, changes: { surgeryId } })

    return { success: true, message: "Media updated successfully" }
  } catch (error: any) {
    console.error("[ERROR] uploadOTMedia:", error)
    return { success: false, message: error.message || "Failed to update media" }
  }
}

/**
 * Fetch clinical details (medicines and tests) for a patient.
 */
export async function getSurgeryClinicalDetails(patientId: string) {
  await requireAuth()

  try {
    const [prescriptions, labRequests] = await Promise.all([
      prisma.iPDPrescription.findMany({
        where: { admission: { patientId } },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.iPDLabRequest.findMany({
        where: { admission: { patientId } },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ])

    return {
      success: true,
      data: {
        prescriptions,
        labRequests
      }
    }
  } catch (error: any) {
    console.error("[ERROR] getSurgeryClinicalDetails:", error)
    return { success: false, message: error.message || "Failed to fetch clinical details", data: { prescriptions: [], labRequests: [] } }
  }
}

// ============================================
// SCHEDULE A NEW OPERATION
// ============================================

/**
 * @deprecated Use `scheduleSurgery` from `lib/actions.ts` instead.
 * This legacy action is disabled because it bypasses the payment gate.
 * All OT scheduling must go through the Surgery model with financial clearance.
 */
export async function scheduleOperation(_data: {
  patientId: string
  doctorId: string
  procedureName: string
  surgeonName: string
  anesthetist?: string
  date: string
}) {
  return {
    success: false,
    message:
      "This scheduling method is disabled. Please use the Operation Theatre page (Clinical → Operation Theatre) which requires payment clearance before scheduling.",
  }
}

// ============================================
// GET SINGLE OPERATION (with Patient & Doctor)
// ============================================

export async function getOperation(id: string) {
  await requireAuth()

  try {
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        doctor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    })

    if (!operation) {
      return { success: false, message: "Operation not found", data: null }
    }

    return {
      success: true,
      data: {
        id: operation.id,
        procedureName: operation.procedureName,
        surgeonName: operation.surgeonName,
        anesthetist: operation.anesthetist,
        date: operation.date.toISOString(),
        status: operation.status,
        opNote: operation.opNote,
        photos: operation.photos,
        createdAt: operation.createdAt.toISOString(),
        updatedAt: operation.updatedAt.toISOString(),
        patient: {
          id: operation.patient.id,
          patientId: operation.patient.patientId,
          name: operation.patient.user.name,
          gender: operation.patient.gender,
          dateOfBirth: operation.patient.dateOfBirth?.toISOString() || null,
          phone: operation.patient.phone,
          bloodGroup: operation.patient.bloodGroup,
        },
        doctor: {
          id: operation.doctor.id,
          name: operation.doctor.name,
          email: operation.doctor.email,
        },
      },
    }
  } catch (error: any) {
    console.error("[ERROR] getOperation:", error)
    return { success: false, message: error.message || "Failed to fetch operation", data: null }
  }
}

// ============================================
// UPDATE OP NOTE & PHOTOS (Mark as COMPLETED)
// ============================================

export async function updateOpNote(
  id: string,
  note: string,
  photos: string[] = []
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!id) {
      return { success: false, message: "Operation ID is required" }
    }

    // Validate photo limit
    if (photos.length > 10) {
      return { success: false, message: "Maximum 10 photos allowed" }
    }

    const operation = await prisma.operation.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!operation) {
      return { success: false, message: "Operation not found" }
    }

    if (operation.status === "CANCELLED") {
      return { success: false, message: "Cannot update a cancelled operation" }
    }

    await prisma.operation.update({
      where: { id },
      data: {
        opNote: note.trim(),
        photos,
        status: "COMPLETED",
      },
    })

    revalidatePath("/dashboard/clinical/ot")
    revalidatePath(`/dashboard/clinical/ot/${id}`)
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "OperationNote", recordId: id, changes: { status: "COMPLETED" } })

    return { success: true, message: "Operation note saved and marked as completed" }
  } catch (error: any) {
    console.error("[ERROR] updateOpNote:", error)
    return { success: false, message: error.message || "Failed to update operation note" }
  }
}

// ============================================
// GET UPCOMING SURGERIES (date >= today)
// ============================================

export async function getUpcomingSurgeries() {
  await requireAuth()

  try {
    const today = startOfDay(new Date())

    const operations = await prisma.operation.findMany({
      where: {
        date: { gte: today },
        status: { not: "CANCELLED" },
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true } },
          },
        },
        doctor: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: "asc" },
    })

    return {
      success: true,
      data: operations.map((op) => ({
        id: op.id,
        procedureName: op.procedureName,
        surgeonName: op.surgeonName,
        anesthetist: op.anesthetist,
        date: op.date.toISOString(),
        status: op.status,
        patientName: op.patient.user.name,
        patientId: op.patient.patientId,
        patientGender: op.patient.gender,
        patientBloodGroup: op.patient.bloodGroup,
        doctorName: op.doctor.name,
      })),
    }
  } catch (error: any) {
    console.error("[ERROR] getUpcomingSurgeries:", error)
    return { success: false, data: [], message: error.message || "Failed to fetch surgeries" }
  }
}

/**
 * Update consumables and optionally sync them into the Surgery's Billing invoice.
 */
export async function updateOTConsumables(params: {
  surgeryId: string
  consumables: any[]
  generateBill: boolean
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const { surgeryId, consumables, generateBill } = params

    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      include: { patient: true }
    })

    if (!surgery) return { success: false, message: "Surgery not found" }

    // 1. Update the JSON array
    await prisma.surgery.update({
      where: { id: surgeryId },
      data: { consumables: consumables as any }
    })

    // 2. Generate/Update Bill items
    if (generateBill && surgery.billingId) {
      await prisma.$transaction(async (tx) => {
        const billingId = surgery.billingId!
        // Find existing Billing
        const billing = await tx.billing.findUnique({
          where: { id: billingId },
          include: { items: true }
        })

        if (!billing) throw new Error("Billing record not found")

        // First, delete old consumable items (everything except base surgery charge)
        // We know base surgery charge items have 'description' starting with 'Surgery: '
        await tx.billingItem.deleteMany({
          where: {
            billingId: billing.id,
            NOT: {
              description: { startsWith: 'Surgery: ' }
            }
          }
        })

        // Then insert the new items from consumables array
        let additionalCost = 0
        if (consumables.length > 0) {
          const newItems = consumables.map(c => {
            const amount = c.quantity * c.price
            additionalCost += amount
            return {
              billingId: billing.id,
              description: `[${c.type}] ${c.name}`,
              quantity: c.quantity,
              unitPrice: c.price,
              amount: amount,
              totalAmount: amount
            }
          })

          await tx.billingItem.createMany({
            data: newItems
          })
        }

        // Recalculate totals
        // The base charge is surgery.surgeryCharge
        const newTotalAmount = surgery.surgeryCharge + additionalCost
        const paidSoFar = billing.paidAmount
        const newBalance = newTotalAmount - paidSoFar

        await tx.billing.update({
          where: { id: billing.id },
          data: {
            totalAmount: newTotalAmount,
            netAmount: newTotalAmount,
            balanceAmount: newBalance < 0 ? 0 : newBalance
          }
        })

        // Update actual cost on surgery
        await tx.surgery.update({
          where: { id: surgeryId },
          data: { actualCost: newTotalAmount }
        })
      })
    }

    revalidatePath("/dashboard/clinical/ot")
    revalidatePath("/dashboard/finance/billing")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "OTConsumables", recordId: surgeryId, changes: { consumableCount: consumables.length, generateBill } })

    return { 
      success: true, 
      message: generateBill ? "Consumables saved and OT bill updated" : "Consumables draft saved" 
    }
  } catch (error: any) {
    console.error("[ERROR] updateOTConsumables:", error)
    return { success: false, message: error.message || "Failed to update consumables" }
  }
}
