"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function fetchSchedulingData() {
  try {
    const procedures = await prisma.surgeryProcedure.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    })

    const theaters = await prisma.operationTheater.findMany({
      where: { isOperational: true },
      orderBy: { name: "asc" }
    })

    const staff = await prisma.staff.findMany({
      where: { user: { isActive: true } },
      include: { user: true },
      orderBy: { user: { name: "asc" } }
    })

    const doctors = staff.filter(s => s.user.role === "DOCTOR")
    const nurses = staff.filter(s => s.user.role === "NURSE")
    // Note: Assuming Anesthetist could be a DOCTOR with specialized type, or just any doctor for now
    const anesthetists = doctors

    return { success: true, procedures, theaters, doctors, nurses, anesthetists }
  } catch (error: any) {
    console.error("Error fetching scheduling data:", error)
    return { success: false, error: "Failed to load scheduling data" }
  }
}

export async function getPatientForOT(patientId: string) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: true,
        ipdAdmissions: {
          where: { status: "ADMITTED" },
          orderBy: { admissionDate: "desc" },
          take: 1
        }
      }
    })
    return { success: true, patient }
  } catch (error: any) {
    return { success: false, error: "Failed to load patient" }
  }
}

export async function getSurgeryDetails(surgeryId: string) {
  try {
    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      include: {
        patient: { include: { user: true } },
        leadSurgeon: { include: { user: true } },
        theater: true,
      }
    })
    return { success: true, surgery }
  } catch (error: any) {
    return { success: false, error: "Failed to load surgery details" }
  }
}

export async function scheduleSurgery(data: any) {
  try {
    // Look up procedure template to get charge + breakdown + medicines
    let surgeryCharge = 0
    let chargeBreakdown: any = undefined
    let procedureTemplateId: string | null = null
    let requiredMedicines: any[] = []

    if (data.procedureName) {
      const template = await prisma.surgeryProcedure.findFirst({
        where: { name: data.procedureName },
        include: {
          chargeComponents: { orderBy: { sortOrder: "asc" } },
          medicines: {
            orderBy: { sortOrder: "asc" },
            include: { medicine: { select: { unitPrice: true, strength: true, type: true } } }
          }
        }
      })
      if (template) {
        surgeryCharge = template.totalCharge || 0
        procedureTemplateId = template.id
        if (template.chargeComponents.length > 0) {
          chargeBreakdown = template.chargeComponents.map(c => ({
            chargeLabel: c.chargeLabel,
            chargeType: c.chargeType,
            amount: c.amount,
            isOptional: c.isOptional,
          }))
        }
        if (template.medicines.length > 0) {
          requiredMedicines = template.medicines.map(m => ({
            medicineId: m.medicineId,
            medicineName: m.medicineName,
            quantity: m.quantity,
            dosage: m.dosage,
            notes: m.notes,
            unitPrice: m.medicine.unitPrice,
            strength: m.medicine.strength,
            type: m.medicine.type,
          }))
        }
      }
    }

    // Merge OT medicines into consumables JSON
    const consumablesData = data.consumables || {}
    if (requiredMedicines.length > 0) {
      consumablesData.otPharmacy = requiredMedicines
    }

    const surgery = await prisma.surgery.create({
      data: {
        patientId: data.patientId,
        leadSurgeonId: data.leadSurgeonId,
        assistantSurgeons: data.assistantSurgeons,
        anesthetistId: data.anesthetistId,
        anesthetistName: data.anesthetistName,
        theaterId: data.theaterId,
        procedureName: data.procedureName,
        procedureCode: data.procedureCode,
        scheduledDate: new Date(data.scheduledDate),
        durationMinutes: parseInt(data.durationMinutes) || 60,
        consumables: Object.keys(consumablesData).length > 0 ? consumablesData : undefined,
        status: "SCHEDULED",
        pacStatus: "PENDING",
        diagnosis: data.diagnosis,
        surgeryCharge,
        estimatedCost: surgeryCharge,
        procedureTemplateId,
        chargeBreakdown: chargeBreakdown || undefined,
      }
    })

    const theater = await prisma.operationTheater.findUnique({ where: { id: data.theaterId } })
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      include: { user: { select: { name: true } } }
    })
    const activeAdmission = await prisma.iPDAdmission.findFirst({
      where: { patientId: data.patientId, status: "ADMITTED" }
    })

    if (activeAdmission) {
      await prisma.patientTimelineEvent.create({
        data: {
          admissionId: activeAdmission.id,
          title: "Operation Scheduled",
          description: `${data.procedureName} scheduled in ${theater?.name || "OT"} — ₹${surgeryCharge.toLocaleString("en-IN")}`,
          type: "GENERAL"
        }
      })
    }

    // Create pharmacy notification if medicines are required
    if (requiredMedicines.length > 0) {
      const scheduledDate = new Date(data.scheduledDate)
      const medicineList = requiredMedicines.map(m => `• ${m.medicineName} (${m.strength || ""}) × ${m.quantity}`).join("\n")
      
      await prisma.notification.create({
        data: {
          title: `OT Pharmacy Alert — ${data.procedureName}`,
          message: `Prepare medicines for ${patient?.user?.name || "Patient"}\nSurgery: ${data.procedureName}\nDate: ${scheduledDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at ${scheduledDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}\nTheater: ${theater?.name || "OT"}\n\nRequired Medicines:\n${medicineList}`,
          type: "WARNING",
          module: "OT_PHARMACY",
          targetRole: "PHARMACIST",
          scheduledFor: scheduledDate,
          link: `/dashboard/clinical/ot/profile/${surgery.id}`,
        }
      })
    }
    
    revalidatePath("/dashboard/ot/schedule")
    return { success: true, surgeryId: surgery.id }
  } catch (error: any) {
    console.error("Schedule error:", error)
    return { success: false, error: "Failed to schedule operation" }
  }
}

export async function updateSurgeryDetails(surgeryId: string, data: any) {
  try {
    await prisma.surgery.update({
      where: { id: surgeryId },
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      }
    })
    revalidatePath("/dashboard/ot/schedule")
    return { success: true }
  } catch (error: any) {
    console.error("Update error:", error)
    return { success: false, error: "Failed to update operation" }
  }
}

export async function cancelSurgery(surgeryId: string, reason: string) {
  try {
    const surgery = await prisma.surgery.update({
      where: { id: surgeryId },
      data: {
        status: "CANCELLED",
        cancellationReason: reason
      }
    })

    const activeAdmission = await prisma.iPDAdmission.findFirst({
      where: { patientId: surgery.patientId, status: "ADMITTED" }
    })

    if (activeAdmission) {
      await prisma.patientTimelineEvent.create({
        data: {
          admissionId: activeAdmission.id,
          title: "Operation Cancelled",
          description: `${surgery.procedureName} cancelled. Reason: ${reason}`,
          type: "GENERAL"
        }
      })
    }

    revalidatePath("/dashboard/ot/schedule")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: "Failed to cancel operation" }
  }
}
