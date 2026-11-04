"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function assignNurse(formData: FormData) {
  try {
    const admissionId = formData.get("admissionId") as string
    const nurseId = formData.get("nurseId") as string
    const shift = formData.get("shift") as string
    const cost = parseFloat(formData.get("cost") as string)

    if (!admissionId || !nurseId) {
      return { success: false, message: "Missing required fields" }
    }

    const assignment = await prisma.iPDNurseAssignment.create({
      data: {
        admissionId,
        nurseId,
        shift,
        cost,
      },
    })

    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    return { success: true, data: assignment }
  } catch (error: any) {
    console.error("Error assigning nurse:", error)
    return { success: false, message: error.message }
  }
}

export async function removeNurse(assignmentId: string) {
  try {
    const assignment = await prisma.iPDNurseAssignment.delete({
      where: { id: assignmentId },
    })

    revalidatePath(`/dashboard/ipd/patient/${assignment.admissionId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Error removing nurse:", error)
    return { success: false, message: error.message }
  }
}
