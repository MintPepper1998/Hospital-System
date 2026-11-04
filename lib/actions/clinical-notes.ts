"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TimelineEventType } from "@prisma/client"

export async function addClinicalNote({
  admissionId,
  doctorId,
  note,
  medications,
  labTests,
  vitals,
}: {
  admissionId: string
  doctorId: string
  note: string
  medications?: string
  labTests?: string
  vitals?: {
    bp?: string
    pulse?: string
    temperature?: string
    spO2?: string
    respiratoryRate?: string
  }
}) {
  try {
    const doctor = await prisma.staff.findUnique({
      where: { id: doctorId },
      include: { user: true },
    })

    if (!doctor) {
      return { success: false, error: "Doctor not found" }
    }

    const clinicalNote = await prisma.clinicalNote.create({
      data: {
        admissionId,
        authorId: doctorId,
        authorName: doctor.user.name,
        note,
        medications,
        labTests,
        bp: vitals?.bp,
        pulse: vitals?.pulse,
        temperature: vitals?.temperature,
        spO2: vitals?.spO2,
        respiratoryRate: vitals?.respiratoryRate,
      },
    })

    await prisma.patientTimelineEvent.create({
      data: {
        admissionId,
        title: "Clinical Note Added",
        description: `Dr. ${doctor.user.name} checked on the patient and added a clinical note.`,
        type: TimelineEventType.GENERAL,
      },
    })

    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    return { success: true, data: clinicalNote }
  } catch (error) {
    console.error("Error adding clinical note:", error)
    return { success: false, error: "Failed to save clinical note" }
  }
}
