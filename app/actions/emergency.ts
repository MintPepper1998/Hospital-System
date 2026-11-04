"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import { TriageLevel, EmergencyStatus } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit"

/**
 * Register a new Emergency Patient.
 * If the patient is unknown, a temporary profile will be created.
 */
export async function registerEmergencyPatient(data: {
  patientId?: string // If existing patient
  unknownName?: string
  gender?: "MALE" | "FEMALE" | "OTHER"
  ageStr?: string
  triageLevel: TriageLevel
  chiefComplaint?: string
  vitalsRecorded?: string
  bedId?: string
  assignedDoctorId?: string
}) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"])

  let finalPatientId = data.patientId

  // Create temporary patient if unknown
  if (!finalPatientId) {
    const timestamp = Date.now().toString().slice(-6)
    const tempName = data.unknownName || `Unknown Patient (ER-${timestamp})`

    // Generate a temporary user
    const tempUser = await prisma.user.create({
      data: {
        email: `er.temp.${timestamp}@hospital.local`,
        name: tempName,
        role: "PATIENT",
        isActive: true,
      },
    })

    // Generate a PAT-ID
    const count = await prisma.patient.count()
    const generatedPatId = `PAT-ER-${new Date().getFullYear()}-${(count + 1)
      .toString()
      .padStart(4, "0")}-${timestamp}`

    const newPatient = await prisma.patient.create({
      data: {
        userId: tempUser.id,
        patientId: generatedPatId,
        gender: data.gender,
        dateOfBirth: data.ageStr ? new Date(new Date().setFullYear(new Date().getFullYear() - parseInt(data.ageStr))) : null,
      },
    })

    finalPatientId = newPatient.id
  }

  // Create Emergency Visit
  const visit = await prisma.emergencyVisit.create({
    data: {
      patientId: finalPatientId,
      triageLevel: data.triageLevel,
      chiefComplaint: data.chiefComplaint,
      vitalsRecorded: data.vitalsRecorded,
      bedId: data.bedId,
      assignedDoctorId: data.assignedDoctorId,
      status: "TRIAGING",
    },
  })

  // If a bed was assigned, mark it as occupied
  if (data.bedId) {
    await prisma.bed.update({
      where: { id: data.bedId },
      data: { status: "OCCUPIED" },
    })
  }

  revalidatePath("/dashboard/clinical/emergency")
  writeAuditLog({ userId: "system", action: "CREATE", module: "EmergencyVisit", recordId: visit.id, changes: { patientId: finalPatientId, triageLevel: data.triageLevel } })
  return { success: true, visitId: visit.id, patientId: finalPatientId }
}

/**
 * Update the status of an emergency visit.
 */
export async function updateEmergencyStatus(visitId: string, status: EmergencyStatus, assignedDoctorId?: string) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR", "NURSE"])

  const updateData: any = { status }
  if (assignedDoctorId) {
    updateData.assignedDoctorId = assignedDoctorId
  }

  const visit = await prisma.emergencyVisit.update({
    where: { id: visitId },
    data: updateData,
  })

  revalidatePath("/dashboard/clinical/emergency")
  writeAuditLog({ userId: "system", action: "UPDATE", module: "EmergencyVisit", recordId: visitId, changes: { status } })
  return { success: true, visit }
}

/**
 * Discharge a patient from the Emergency Department.
 * Frees the ER bed and generates an EMERGENCY billing folio.
 */
export async function dischargeFromER(visitId: string, erBaseFee: number) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR", "ADMIN"])

  // Find the visit
  const visit = await prisma.emergencyVisit.findUnique({
    where: { id: visitId },
    include: { bed: true, patient: true },
  })

  if (!visit) throw new Error("Emergency visit not found")
  if (!visit.patientId) throw new Error("Cannot discharge a patient without a linked patient profile")

  // Mark ER bed as available
  if (visit.bedId) {
    await prisma.bed.update({
      where: { id: visit.bedId },
      data: { status: "CLEANING" }, // Need cleaning after ER
    })
  }

  // Mark visit as DISCHARGED
  await prisma.emergencyVisit.update({
    where: { id: visitId },
    data: {
      status: "DISCHARGED",
      dischargeTime: new Date(),
    },
  })

  // Generate Emergency Bill
  const lastBill = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: `INV-ER-${new Date().getFullYear()}-` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[3]) || 0 : 0
    const billNumber = `INV-ER-${new Date().getFullYear()}-${String(lastSeq + 1).padStart(5, "0")}`

  await prisma.billing.create({
    data: {
      billNumber,
      patientId: visit.patientId,
      emergencyVisitId: visitId,
      type: "EMERGENCY",
      status: "PENDING",
      totalAmount: erBaseFee,
      netAmount: erBaseFee,
      balanceAmount: erBaseFee,
      items: {
        create: {
          description: "ER Triage & Consultation Fee",
          quantity: 1,
          unitPrice: erBaseFee,
          amount: erBaseFee,
          totalAmount: erBaseFee,
          serviceCategory: "EMERGENCY",
        }
      }
    }
  })

  revalidatePath("/dashboard/clinical/emergency")
  writeAuditLog({ userId: "system", action: "PROCESS", module: "ERDischarge", recordId: visitId, changes: { erBaseFee } })
  return { success: true }
}

/**
 * Convert an ER Visit into an IPD Admission.
 * Moves the patient from the ER Bed to an IPD Bed.
 */
export async function admitToIPDFromER(data: {
  visitId: string
  ipdBedId: string
  primaryDoctorId: string
  initialDeposit: number
  reason: string
}) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR", "ADMIN", "RECEPTIONIST"])

  const visit = await prisma.emergencyVisit.findUnique({
    where: { id: data.visitId },
    include: { bed: true, patient: true },
  })

  if (!visit) throw new Error("Emergency visit not found")
  if (!visit.patientId) throw new Error("Patient must be fully registered before IPD Admission")

  // Verify the new IPD bed is available
  const newBed = await prisma.bed.findUnique({ where: { id: data.ipdBedId } })
  if (!newBed || newBed.status !== "AVAILABLE") {
    throw new Error("Selected IPD bed is not available")
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Free the ER Bed
    if (visit.bedId) {
      await tx.bed.update({
        where: { id: visit.bedId },
        data: { status: "CLEANING" },
      })
    }

    // 2. Mark ER Visit as ADMITTED_TO_IPD
    await tx.emergencyVisit.update({
      where: { id: data.visitId },
      data: {
        status: "ADMITTED_TO_IPD",
        dischargeTime: new Date(),
      },
    })

    // 3. Occupy the new IPD Bed
    await tx.bed.update({
      where: { id: data.ipdBedId },
      data: { status: "OCCUPIED" },
    })

    // 4. Generate sequential IP number (IPD/001/2026)
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

    // 5. Create the IPD Admission linked to the ER Visit
    const admission = await tx.iPDAdmission.create({
      data: {
        patientId: visit.patientId!,
        bedId: data.ipdBedId,
        primaryDoctorId: data.primaryDoctorId,
        sourceEmergencyVisitId: visit.id,
        initialDeposit: data.initialDeposit,
        reason: data.reason,
        ipNumber,
        // Transfer a base ER fee into the IPD bill
        totalCharges: 1500, // ER Base Fee
        totalOtherCharges: 1500,
      },
    })

    writeAuditLog({ userId: "system", action: "PROCESS", module: "ERToIPDTransfer", recordId: admission.id, changes: { visitId: data.visitId } })
    return { success: true, admissionId: admission.id }
  })
}
