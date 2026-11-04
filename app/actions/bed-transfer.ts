"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/**
 * Transfer a patient from one bed to another during their IPD stay.
 * This action:
 * 1. Creates a BedTransferHistory record
 * 2. Updates the admission's bedId to the new bed
 * 3. Marks the old bed as AVAILABLE
 * 4. Marks the new bed as OCCUPIED
 */
export async function transferBed({
  admissionId,
  newBedId,
  reason,
  authorizedBy,
  notes,
}: {
  admissionId: string
  newBedId: string
  reason?: string
  authorizedBy?: string
  notes?: string
}) {
  try {
    // Get the current admission with bed info
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      select: { id: true, bedId: true, status: true, patientId: true },
    })

    if (!admission) {
      return { success: false, error: "Admission not found" }
    }

    if (admission.status !== "ADMITTED") {
      return { success: false, error: "Patient is not currently admitted" }
    }

    if (admission.bedId === newBedId) {
      return { success: false, error: "Patient is already in this bed" }
    }

    // Check the new bed is available
    const newBed = await prisma.bed.findUnique({
      where: { id: newBedId },
      select: { id: true, status: true, bedNumber: true, ward: { select: { name: true } } },
    })

    if (!newBed) {
      return { success: false, error: "Target bed not found" }
    }

    if (newBed.status !== "AVAILABLE") {
      return { success: false, error: `Bed ${newBed.bedNumber} in ${newBed.ward.name} is not available (status: ${newBed.status})` }
    }

    // Perform the transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the transfer history record
      const transfer = await tx.bedTransferHistory.create({
        data: {
          admissionId,
          patientId: admission.patientId,
          fromBedId: admission.bedId,
          toBedId: newBedId,
          reason: reason || null,
          authorizedBy: authorizedBy || null,
          notes: notes || null,
        },
      })

      // 2. Update the admission's bed
      await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: { bedId: newBedId },
      })

      // 3. Mark old bed as AVAILABLE
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: "AVAILABLE" },
      })

      // 4. Mark new bed as OCCUPIED
      await tx.bed.update({
        where: { id: newBedId },
        data: { status: "OCCUPIED" },
      })

      return transfer
    })

    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    revalidatePath("/dashboard/ipd")

    return { success: true, transferId: result.id }
  } catch (error: any) {
    console.error("Bed transfer error:", error)
    return { success: false, error: error.message || "Failed to transfer bed" }
  }
}

/**
 * Get bed transfer history for an admission
 */
export async function getBedTransferHistory(admissionId: string) {
  try {
    const transfers = await prisma.bedTransferHistory.findMany({
      where: { admissionId },
      include: {
        fromBed: {
          select: {
            bedNumber: true,
            pricePerDay: true,
            ward: { select: { name: true, type: true, floor: true } },
          },
        },
        toBed: {
          select: {
            bedNumber: true,
            pricePerDay: true,
            ward: { select: { name: true, type: true, floor: true } },
          },
        },
      },
      orderBy: { transferDate: "desc" },
    })

    return transfers.map((t) => ({
      ...t,
      transferDate: t.transferDate.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))
  } catch (error: any) {
    console.error("Error fetching bed transfers:", error)
    return []
  }
}

/**
 * Get available beds for transfer (excluding current bed)
 */
export async function getAvailableBeds(excludeBedId?: string) {
  try {
    const beds = await prisma.bed.findMany({
      where: {
        status: "AVAILABLE",
        ...(excludeBedId ? { id: { not: excludeBedId } } : {}),
      },
      include: {
        ward: { select: { name: true, type: true, floor: true } },
      },
      orderBy: [
        { ward: { name: "asc" } },
        { bedNumber: "asc" },
      ],
    })

    return beds.map((b) => ({
      id: b.id,
      bedNumber: b.bedNumber,
      pricePerDay: b.pricePerDay,
      wardName: b.ward.name,
      wardType: b.ward.type,
      floor: b.ward.floor,
    }))
  } catch (error: any) {
    console.error("Error fetching available beds:", error)
    return []
  }
}
