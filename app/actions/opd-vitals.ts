"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"

/**
 * Save OPD vitals for an appointment (typically done by nurse).
 * Updates the appointment status from PENDING → VITALS_DONE.
 */
export async function saveOPDVitals(data: {
  appointmentId: string
  pulse: string
  temperature: string
  weight: string
  height: string
  bloodPressure: string
  spo2: string
  takenByName: string
}) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
    })

    if (!appointment) {
      return { success: false, message: "Appointment not found" }
    }

    // Only allow vitals on PENDING, SCHEDULED, CONFIRMED, WAITING statuses
    const allowedStatuses = ["PENDING", "SCHEDULED", "CONFIRMED", "WAITING"]
    if (!allowedStatuses.includes(appointment.status)) {
      return {
        success: false,
        message: `Cannot record vitals for appointment in ${appointment.status} status`,
      }
    }

    await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: {
        pulse: data.pulse || null,
        temperature: data.temperature || null,
        weight: data.weight || null,
        height: data.height || null,
        bloodPressure: data.bloodPressure || null,
        spo2: data.spo2 || null,
        vitalsTakenBy: data.takenByName,
        vitalsTakenAt: new Date(),
        status: "VITALS_DONE",
      },
    })

    writeAuditLog({ userId: "system", action: "CREATE", module: "OPDVitals", recordId: data.appointmentId, changes: { takenBy: data.takenByName, pulse: data.pulse, bp: data.bloodPressure, weight: data.weight } })

    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard")

    return { success: true, message: "Vitals recorded successfully" }
  } catch (error) {
    console.error("[OPD_VITALS] Save error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save vitals",
    }
  }
}

/**
 * Get today's OPD appointments that need vitals (for nurse dashboard).
 */
export async function getOPDVitalsQueue() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: today, lt: tomorrow },
        status: { in: ["PENDING", "WAITING"] },
      },
      include: {
        patient: {
          include: { user: { select: { name: true } } },
        },
        doctor: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: [
        { appointmentTime: "asc" },
        { createdAt: "asc" },
      ],
    })

    // Also get recently vitals-done for reference
    const vitalsCompleted = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: today, lt: tomorrow },
        status: "VITALS_DONE",
      },
      include: {
        patient: {
          include: { user: { select: { name: true } } },
        },
        doctor: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { vitalsTakenAt: "desc" },
      take: 10,
    })

    return {
      success: true,
      pending: appointments,
      completed: vitalsCompleted,
    }
  } catch (error) {
    console.error("[OPD_VITALS] Queue fetch error:", error)
    return { success: false, pending: [], completed: [] }
  }
}
