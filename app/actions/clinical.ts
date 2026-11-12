"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

/**
 * Add a clinical note (daily progress note) for an IPD admission.
 * Called by doctors/nurses during rounds.
 */
export async function addClinicalNote(data: {
  admissionId?: string
  emergencyVisitId?: string
  authorId: string
  authorName: string
  note: string
  bp?: string
  pulse?: string
  temperature?: string
  spO2?: string
  respiratoryRate?: string
}) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR", "NURSE"])

  if (!data.admissionId && !data.emergencyVisitId) {
    throw new Error("Admission ID or Emergency Visit ID is required")
  }

  if (!data.note.trim()) {
    throw new Error("Note content is required")
  }

  if (data.admissionId) {
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: data.admissionId },
    })

    if (!admission) throw new Error("Admission not found")
    if (admission.status !== "ADMITTED") {
      throw new Error("Cannot add notes to a discharged/inactive admission")
    }
  }

  if (data.emergencyVisitId) {
    const visit = await prisma.emergencyVisit.findUnique({
      where: { id: data.emergencyVisitId },
    })

    if (!visit) throw new Error("Emergency visit not found")
    if (visit.status === "DISCHARGED") {
      throw new Error("Cannot add notes to a discharged emergency visit")
    }
  }

  const clinicalNote = await prisma.clinicalNote.create({
    data: {
      admissionId: data.admissionId || null,
      emergencyVisitId: data.emergencyVisitId || null,
      authorId: data.authorId,
      authorName: data.authorName,
      note: data.note.trim(),
      bp: data.bp || null,
      pulse: data.pulse || null,
      temperature: data.temperature || null,
      spO2: data.spO2 || null,
      respiratoryRate: data.respiratoryRate || null,
    },
  })

  if (data.admissionId) {
    revalidatePath(`/dashboard/ipd/patient/${data.admissionId}`)
  }
  if (data.emergencyVisitId) {
    revalidatePath(`/dashboard/clinical/emergency/patient/${data.emergencyVisitId}`)
  }

  writeAuditLog({ userId: data.authorId, action: "CREATE", module: "ClinicalNote", recordId: clinicalNote.id, changes: { type: data.admissionId ? "IPD" : "ER" } })

  return {
    success: true,
    noteId: clinicalNote.id,
  }
}

export async function getClinicalNotes(params: { admissionId?: string, emergencyVisitId?: string }) {
  await requireAuth()

  if (!params.admissionId && !params.emergencyVisitId) {
    throw new Error("Admission ID or Emergency Visit ID required")
  }

  return prisma.clinicalNote.findMany({
    where: {
      ...(params.admissionId ? { admissionId: params.admissionId } : {}),
      ...(params.emergencyVisitId ? { emergencyVisitId: params.emergencyVisitId } : {}),
    },
    orderBy: { date: "desc" },
  })
}

/**
 * Mark a patient as arrived for their confirmed appointment.
 * This updates the appointment status to PENDING, moving them to the Vitals queue.
 */
export async function markPatientArrived(appointmentId: string) {
  await requireAuth(["SUPER_ADMIN", "RECEPTIONIST"])

  if (!appointmentId) {
    throw new Error("Appointment ID is required")
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  if (appointment.status !== "CONFIRMED") {
    throw new Error(`Cannot mark arrived for status: ${appointment.status}`)
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "PENDING" },
  })

  revalidatePath("/dashboard/clinical/opd")
  
  writeAuditLog({ userId: "system", action: "UPDATE", module: "Appointment", recordId: appointmentId, changes: { status: "PENDING" } })
  return { success: true }
}

/**
 * Skip vitals for a patient and send them directly to the doctor queue.
 * Updates status from PENDING to VITALS_DONE.
 */
export async function skipPatientVitals(appointmentId: string) {
  await requireAuth(["SUPER_ADMIN", "RECEPTIONIST", "NURSE"])

  if (!appointmentId) {
    throw new Error("Appointment ID is required")
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  if (appointment.status !== "PENDING") {
    throw new Error(`Cannot skip vitals for status: ${appointment.status}`)
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "VITALS_DONE" },
  })

  revalidatePath("/dashboard/clinical/opd")
  
  writeAuditLog({ userId: "system", action: "UPDATE", module: "Appointment", recordId: appointmentId, changes: { status: "VITALS_DONE" } })
  return { success: true }
}

/**
 * Complete an OPD consultation when the patient was treated on physical OPD paper.
 * Allows attaching a scanned copy of the prescription/notes, sets status to COMPLETED,
 * marks isPaperConsultation = true, and creates/updates the clinical medical record.
 */
export async function completePaperConsultation(data: {
  appointmentId: string
  scannedPaperUrl?: string | null
  notes?: string | null
  diagnosis?: string | null
}) {
  const session = await requireAuth(["SUPER_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"])

  if (!data.appointmentId) {
    throw new Error("Appointment ID is required")
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointmentId },
    include: {
      patient: true,
      doctor: {
        include: { user: true },
      },
    },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  if (appointment.status === "CANCELLED") {
    throw new Error("Cannot complete a cancelled appointment")
  }

  const finalDiagnosis = data.diagnosis?.trim() || appointment.diagnosis || "Treated on Physical OPD Paper"
  const finalNotes = data.notes?.trim()
    ? (appointment.notes ? `${appointment.notes}\n[Paper OPD]: ${data.notes.trim()}` : data.notes.trim())
    : (appointment.notes || "Treated on physical OPD paper")
  const paperUrl = data.scannedPaperUrl || appointment.scannedPaperUrl || null

  const updatedAppointment = await prisma.$transaction(async (tx) => {
    // 1. Update appointment
    const updated = await tx.appointment.update({
      where: { id: data.appointmentId },
      data: {
        status: "COMPLETED",
        isPaperConsultation: true,
        scannedPaperUrl: paperUrl,
        diagnosis: finalDiagnosis,
        notes: finalNotes,
        prescription: appointment.prescription || "Prescription recorded on physical OPD paper (see attached scan).",
      },
    })

    // 2. Create or update medical record
    const existingRecord = await tx.medicalRecord.findFirst({
      where: { appointmentId: data.appointmentId },
    })

    if (existingRecord) {
      await tx.medicalRecord.update({
        where: { id: existingRecord.id },
        data: {
          isPaperConsultation: true,
          scannedPaperUrl: paperUrl,
          diagnosis: finalDiagnosis,
          examination: existingRecord.examination || "Physical OPD examination on paper",
          treatment: existingRecord.treatment || "Prescription recorded on physical paper",
        },
      })
    } else {
      await tx.medicalRecord.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          diagnosis: finalDiagnosis,
          chiefComplaint: appointment.chiefComplaint || appointment.reason || "OPD Consultation",
          examination: "Physical OPD examination on paper",
          treatment: "Prescription recorded on physical paper",
          isPaperConsultation: true,
          scannedPaperUrl: paperUrl,
        },
      })
    }

    return updated
  })

  revalidatePath("/dashboard/clinical/opd")
  revalidatePath("/dashboard/clinical/emr")
  revalidatePath("/dashboard/doctor")
  revalidatePath(`/dashboard/clinical/patient/${appointment.patientId}`)
  revalidatePath(`/dashboard/clinical/emr/${data.appointmentId}`)
  revalidatePath(`/dashboard/clinical/opd/${data.appointmentId}`)

  writeAuditLog({
    userId: session.userId || "system",
    action: "UPDATE",
    module: "Appointment",
    recordId: data.appointmentId,
    changes: {
      status: "COMPLETED",
      isPaperConsultation: true,
      scannedPaperUrl: paperUrl,
      diagnosis: finalDiagnosis,
    },
  })

  return {
    success: true,
    message: "Consultation marked as completed on OPD paper",
    appointment: updatedAppointment,
  }
}
