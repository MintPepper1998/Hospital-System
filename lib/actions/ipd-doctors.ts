"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { DoctorRole, TimelineEventType } from "@prisma/client"

export async function assignIpdDoctor({
  admissionId,
  doctorId,
  role,
}: {
  admissionId: string
  doctorId: string
  role: DoctorRole
}) {
  try {
    // 1. Assign the doctor
    const assignment = await prisma.iPDAdmissionDoctor.create({
      data: {
        admissionId,
        doctorId,
        role,
      },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
      },
    })
    
    // 3. Log to timeline
    await prisma.patientTimelineEvent.create({
      data: {
        admissionId,
        title: "Doctor Assigned",
        description: `Dr. ${assignment.doctor.user.name} was assigned as a ${role} doctor.`,
        type: TimelineEventType.DOCTOR_ASSIGNED,
      },
    })

    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    return { success: true }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "This doctor is already assigned to this admission." }
    }
    console.error("Error assigning doctor:", error)
    return { success: false, error: "Failed to assign doctor" }
  }
}

export async function removeIpdDoctor(assignmentId: string, admissionId: string) {
  try {
    if (assignmentId === 'primary') {
      const admission = await prisma.iPDAdmission.findUnique({
        where: { id: admissionId },
        include: { primaryDoctor: { include: { user: true } } }
      })

      if (!admission || !admission.primaryDoctor) {
        return { success: false, error: "Primary doctor not found" }
      }

      // Primary doctor is required in the schema and cannot be removed, only reassigned.
      return { success: false, error: "Primary doctor cannot be removed. Reassign a new doctor instead." }



      revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
      return { success: true }
    }

    const assignment = await prisma.iPDAdmissionDoctor.findUnique({
      where: { id: assignmentId },
      include: { doctor: { include: { user: true } } },
    })

    if (!assignment) {
      return { success: false, error: "Assignment not found" }
    }

    await prisma.iPDAdmissionDoctor.delete({
      where: { id: assignmentId },
    })

    // Log to timeline
    await prisma.patientTimelineEvent.create({
      data: {
        admissionId,
        title: "Doctor Removed",
        description: `Dr. ${assignment.doctor.user.name} was removed from the admission.`,
        type: TimelineEventType.DOCTOR_REMOVED,
      },
    })

    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    return { success: true }
  } catch (error) {
    console.error("Error removing doctor:", error)
    return { success: false, error: "Failed to remove doctor" }
  }
}
