"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TimelineEventType } from "@prisma/client"

export async function addVitalRecord({
  admissionId,
  recordedById,
  bp,
  pulse,
  temperature,
  spO2,
  respiratoryRate,
  weight,
  bloodSugar,
  notes,
}: {
  admissionId: string
  recordedById: string
  bp?: string
  pulse?: string
  temperature?: string
  spO2?: string
  respiratoryRate?: string
  weight?: string
  bloodSugar?: string
  notes?: string
}) {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: recordedById },
      include: { user: true },
    })

    if (!staff) {
      return { success: false, error: "Staff not found" }
    }

    const vital = await prisma.patientVital.create({
      data: {
        admissionId,
        recordedById,
        recordedByName: staff.user.name,
        bp,
        pulse,
        temperature,
        spO2,
        respiratoryRate,
        weight,
        bloodSugar,
        notes,
      },
    })

    await prisma.patientTimelineEvent.create({
      data: {
        admissionId,
        title: "Vitals Recorded",
        description: `Vitals recorded by ${staff.user.name}.`,
        type: TimelineEventType.GENERAL,
      },
    })

    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    return { success: true, data: vital }
  } catch (error) {
    console.error("Error adding vital record:", error)
    return { success: false, error: "Failed to save vitals" }
  }
}
