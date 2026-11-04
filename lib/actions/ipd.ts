"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

/**
 * Get complete bed status for all wards
 */
export async function getBedStatus() {
  await requireAuth()
  try {
    const wards = await prisma.ward.findMany({
      where: { isActive: true },
      include: {
        beds: {
          orderBy: { bedNumber: "asc" },
          include: {
            admissions: {
              where: { status: "ADMITTED" },
              include: {
                patient: {
                  include: {
                    user: true,
                  },
                },
                primaryDoctor: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return {
      success: true,
      data: wards,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getBedStatus:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch bed status",
    }
  }
}

/**
 * Get IPD statistics
 */
export async function getIPDStats() {
  await requireAuth()
  try {
    const totalBeds = await prisma.bed.count()
    const availableBeds = await prisma.bed.count({ where: { status: "AVAILABLE" } })
    const occupiedBeds = await prisma.bed.count({ where: { status: "OCCUPIED" } })
    const maintenanceBeds = await prisma.bed.count({ where: { status: "MAINTENANCE" } })
    const cleaningBeds = await prisma.bed.count({ where: { status: "CLEANING" } })
    const admittedPatients = await prisma.iPDAdmission.count({ where: { status: "ADMITTED" } })

    return {
      success: true,
      data: {
        totalBeds,
        availableBeds,
        occupiedBeds,
        maintenanceBeds,
        cleaningBeds,
        admittedPatients,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] getIPDStats:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch IPD stats",
    }
  }
}

/**
 * Get available beds for admission
 */
export async function getAvailableBeds() {
  await requireAuth()
  try {
    const beds = await prisma.bed.findMany({
      where: { status: "AVAILABLE" },
      include: {
        ward: true,
      },
      orderBy: [
        { ward: { name: "asc" } },
        { bedNumber: "asc" },
      ],
    })

    return {
      success: true,
      data: beds,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getAvailableBeds:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch available beds",
    }
  }
}

/**
 * Get bed details by ID
 */
export async function getBedById(bedId: string) {
  await requireAuth()
  try {
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: {
        ward: true,
        admissions: {
          where: { status: "ADMITTED" },
          include: {
            patient: {
              include: { user: true },
            },
            primaryDoctor: {
              include: { user: true },
            },
          },
        },
      },
    })

    if (!bed) {
      return {
        success: false,
        message: "Bed not found",
      }
    }

    return {
      success: true,
      data: bed,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getBedById:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch bed details",
    }
  }
}

/**
 * Update bed status
 */
export async function updateBedStatus(bedId: string, status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "CLEANING") {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    await prisma.bed.update({
      where: { id: bedId },
      data: { status },
    })

    revalidatePath("/dashboard/ipd")
    revalidatePath("/dashboard/admin/beds")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Bed", recordId: bedId, changes: { status } })

    return {
      success: true,
      message: `Bed status updated to ${status}`,
    }
  } catch (error: unknown) {
    console.error("[ERROR] updateBedStatus:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update bed status",
    }
  }
}

/**
 * Admit patient to a bed
 */
export async function admitPatient(data: {
  patientId: string
  bedId: string
  primaryDoctorId: string
  reason?: string
  diagnosis?: string
  initialDeposit: number
  isBskyAdmission?: boolean
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const bed = await prisma.bed.findUnique({
      where: { id: data.bedId },
    })

    if (!bed) {
      return { success: false, message: "Bed not found" }
    }

    if (bed.status !== "AVAILABLE") {
      return { success: false, message: "Bed is not available" }
    }

    const existingAdmission = await prisma.iPDAdmission.findFirst({
      where: {
        patientId: data.patientId,
        status: "ADMITTED",
      },
    })

    if (existingAdmission) {
      return { success: false, message: "Patient is already admitted" }
    }

    const isBsky = data.isBskyAdmission === true

    const admission = await prisma.$transaction(async (tx) => {
      if (isBsky) {
        await tx.patient.update({
          where: { id: data.patientId },
          data: { isBsky: true },
        })
      }

      // Generate sequential IP number (IPD/001/2026)
      const year = new Date().getFullYear()
      const lastAdm = await tx.iPDAdmission.findFirst({
        where: { ipNumber: { startsWith: "IPD/", endsWith: `/${year}` } },
        orderBy: { ipNumber: "desc" },
        select: { ipNumber: true },
      })
      let seq = 1
      if (lastAdm?.ipNumber) {
        const parts = lastAdm.ipNumber.split("/")
        if (parts.length === 3) seq = parseInt(parts[1], 10) + 1
      }
      const ipNumber = `IPD/${String(seq).padStart(3, "0")}/${year}`

      const newAdmission = await tx.iPDAdmission.create({
        data: {
          patientId: data.patientId,
          bedId: data.bedId,
          primaryDoctorId: data.primaryDoctorId,
          reason: data.reason,
          diagnosis: data.diagnosis,
          initialDeposit: data.initialDeposit,
          status: "ADMITTED",
          isBskyAdmission: isBsky,
          ipNumber,
        },
      })

      await tx.bed.update({
        where: { id: data.bedId },
        data: { status: "OCCUPIED" },
      })

      return newAdmission
    })

    revalidatePath("/dashboard/ipd")
    revalidatePath("/dashboard/admin/beds")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "IPDAdmission", recordId: admission.id, changes: { patientId: data.patientId, bedId: data.bedId, doctorId: data.primaryDoctorId } })

    return {
      success: true,
      message: "Patient admitted successfully",
      admissionId: admission.id,
    }
  } catch (error: unknown) {
    console.error("[ERROR] admitPatient:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to admit patient",
    }
  }
}

/**
 * @deprecated Use `processDischarge` from `@/app/actions/discharge` instead.
 * That version includes full financial gatekeeping, insurance exception logic,
 * and creates a formal Discharge record in the new `Discharge` model.
 */
export async function dischargePatient_DEPRECATED(data: {
  admissionId: string
  dischargeSummary?: string
  dischargeType: "NORMAL" | "LAMA" | "ABSCONDED" | "DEATH" | "REFERRED"
  finalDiagnosis?: string
  adviceOnDischarge?: string
  followUpDate?: Date
}) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR", "NURSE"])
  throw new Error(
    "dischargePatient is deprecated. Use processDischarge from @/app/actions/discharge instead."
  )
}

/**
 * Mark bed as ready (after cleaning)
 */
export async function markBedReady(bedId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
    })

    if (!bed) {
      return { success: false, message: "Bed not found" }
    }

    if (bed.status !== "CLEANING" && bed.status !== "MAINTENANCE") {
      return { success: false, message: "Bed is not in cleaning or maintenance status" }
    }

    await prisma.bed.update({
      where: { id: bedId },
      data: {
        status: "AVAILABLE",
        lastCleaned: new Date(),
      },
    })

    revalidatePath("/dashboard/ipd")
    revalidatePath("/dashboard/admin/beds")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Bed", recordId: bedId, changes: { status: "AVAILABLE" } })

    return {
      success: true,
      message: "Bed marked as available",
    }
  } catch (error: unknown) {
    console.error("[ERROR] markBedReady:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update bed status",
    }
  }
}

/**
 * Get admission details
 */
export async function getAdmissionDetails(admissionId: string) {
  await requireAuth()
  try {
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      include: {
        patient: {
          include: { user: true },
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
      return {
        success: false,
        message: "Admission not found",
      }
    }

    return {
      success: true,
      data: admission,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getAdmissionDetails:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch admission details",
    }
  }
}

/**
 * Get active admissions list
 */
export async function getActiveAdmissions() {
  await requireAuth()
  try {
    const admissions = await prisma.iPDAdmission.findMany({
      where: { status: "ADMITTED" },
      include: {
        patient: {
          include: { user: true },
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

    return {
      success: true,
      data: admissions,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getActiveAdmissions:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch active admissions",
    }
  }
}
