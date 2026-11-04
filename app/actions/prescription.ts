"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import { createMultiRoleNotification, createScheduledRoleNotification } from "@/lib/create-notification"
import { writeAuditLog } from "@/lib/audit"

/**
 * Add a new medication prescription to an IPD admission.
 */
export async function addIPDPrescription(data: {
  admissionId?: string
  emergencyVisitId?: string
  prescribedById: string
  prescribedByName: string
  medicineName: string
  dosage?: string
  frequency?: string
  duration?: string
  instruction?: string
  quantity?: number
}) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR"])

  if ((!data.admissionId && !data.emergencyVisitId) || !data.medicineName.trim()) {
    throw new Error("Admission ID or Emergency Visit ID, and medicine name are required")
  }

  let patientName = "Patient"
  let bedInfo = ""
  let link = ""

  if (data.admissionId) {
    // Verify the admission exists and is active
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: data.admissionId },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        bed: { include: { ward: { select: { name: true } } } },
      },
    })

    if (!admission) throw new Error("Admission not found")
    if (admission.status !== "ADMITTED") {
      throw new Error("Cannot add prescriptions to a discharged/inactive admission")
    }

    patientName = admission.patient?.user?.name || "Patient"
    bedInfo = admission.bed ? `${admission.bed.ward.name} - ${admission.bed.bedNumber}` : ""
    link = `/dashboard/ipd/patient/${data.admissionId}?tab=medications`
  }

  if (data.emergencyVisitId) {
    const visit = await prisma.emergencyVisit.findUnique({
      where: { id: data.emergencyVisitId },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        bed: true,
      },
    })

    if (!visit) throw new Error("Emergency visit not found")
    if (visit.status === "DISCHARGED") {
      throw new Error("Cannot add prescriptions to a discharged emergency visit")
    }

    patientName = visit.patient?.user?.name || "Unknown Patient"
    bedInfo = visit.bed ? `ER - ${visit.bed.bedNumber}` : ""
    link = `/dashboard/clinical/emergency/patient/${data.emergencyVisitId}?tab=medications`
  }

  const prescription = await prisma.iPDPrescription.create({
    data: {
      admissionId: data.admissionId || null,
      emergencyVisitId: data.emergencyVisitId || null,
      prescribedById: data.prescribedById,
      prescribedByName: data.prescribedByName,
      medicineName: data.medicineName.trim(),
      dosage: data.dosage?.trim() || "",
      frequency: data.frequency?.trim() || "",
      duration: data.duration?.trim() || "",
      instruction: data.instruction?.trim() || null,
      requestedQuantity: data.quantity || null,
      status: "ACTIVE",
    },
  })

  if (data.admissionId) revalidatePath(`/dashboard/ipd/patient/${data.admissionId}`)
  if (data.emergencyVisitId) revalidatePath(`/dashboard/clinical/emergency/patient/${data.emergencyVisitId}`)

  await createMultiRoleNotification({
    title: data.emergencyVisitId ? "URGENT: ER Prescription" : "New Prescription",
    message: `Dr. ${data.prescribedByName} prescribed ${data.medicineName} (${data.dosage}, ${data.frequency}) for ${patientName} ${bedInfo ? `(${bedInfo})` : ""}. Duration: ${data.duration}.`,
    type: data.emergencyVisitId ? "WARNING" : "INFO",
    module: data.emergencyVisitId ? "EMERGENCY" : "PHARMACY",
    link,
    referenceId: prescription.id,
    targetRoles: ["PHARMACIST", "NURSE", "SUPER_ADMIN"],
    createdByName: `Dr. ${data.prescribedByName}`,
  })

  await createScheduledRoleNotification({
    title: "⏰ Medication Check Reminder",
    message: `Has ${data.medicineName} (${data.dosage}) been administered to ${patientName} ${bedInfo ? `(${bedInfo})` : ""}? Prescribed 15 min ago by Dr. ${data.prescribedByName}.`,
    type: "WARNING",
    module: data.emergencyVisitId ? "EMERGENCY" : "IPD",
    link,
    referenceId: prescription.id,
    targetRoles: ["NURSE"],
    createdByName: "System Reminder",
    delayMinutes: 15,
  })

  writeAuditLog({ userId: data.prescribedById, action: "CREATE", module: "IPDPrescription", recordId: prescription.id, changes: { medicineName: data.medicineName, dosage: data.dosage, frequency: data.frequency, duration: data.duration, patient: patientName } })

  return {
    success: true,
    prescriptionId: prescription.id,
  }
}

/**
 * Stop (discontinue) a medication.
 */
export async function stopIPDPrescription(data: {
  prescriptionId: string
  stoppedBy: string
}) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR"])

  if (!data.prescriptionId) {
    throw new Error("Prescription ID is required")
  }

  const prescription = await prisma.iPDPrescription.findUnique({
    where: { id: data.prescriptionId },
  })

  if (!prescription) {
    throw new Error("Prescription not found")
  }

  if (prescription.status === "STOPPED") {
    throw new Error("Prescription is already stopped")
  }

  const updated = await prisma.iPDPrescription.update({
    where: { id: data.prescriptionId },
    data: {
      status: "STOPPED",
      stoppedAt: new Date(),
      stoppedBy: data.stoppedBy,
    },
  })

  if (updated.admissionId) {
    revalidatePath(`/dashboard/ipd/patient/${updated.admissionId}`)
  }
  if (updated.emergencyVisitId) {
    revalidatePath(`/dashboard/clinical/emergency/patient/${updated.emergencyVisitId}`)
  }

  writeAuditLog({ userId: data.stoppedBy, action: "UPDATE", module: "IPDPrescription", recordId: data.prescriptionId, changes: { status: "STOPPED", medicineName: prescription.medicineName } })

  return {
    success: true,
  }
}
