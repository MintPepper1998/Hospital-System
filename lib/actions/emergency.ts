"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function clockInERDoctor(doctorId: string) {
  try {
    // Check if already clocked in
    const existing = await prisma.eRDoctorShift.findFirst({
      where: { doctorId, status: "ON_DUTY" }
    })
    
    if (existing) {
      return { success: false, message: "Doctor is already on duty in the ER." }
    }
    
    await prisma.eRDoctorShift.create({
      data: {
        doctorId,
        status: "ON_DUTY",
      }
    })
    
    revalidatePath("/dashboard/clinical/emergency")
    return { success: true, message: "Doctor successfully clocked in to ER." }
  } catch (error: any) {
    console.error("Error clocking in ER doctor:", error)
    return { success: false, message: error.message || "Failed to clock in doctor" }
  }
}

export async function clockOutERDoctor(shiftId: string) {
  try {
    await prisma.eRDoctorShift.update({
      where: { id: shiftId },
      data: {
        clockOut: new Date(),
        status: "COMPLETED"
      }
    })
    
    revalidatePath("/dashboard/clinical/emergency")
    return { success: true, message: "Doctor successfully clocked out." }
  } catch (error: any) {
    console.error("Error clocking out ER doctor:", error)
    return { success: false, message: error.message || "Failed to clock out doctor" }
  }
}
