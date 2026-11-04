"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createMultiRoleNotification, createRoleNotification } from "@/lib/create-notification"
import {
  sendBookingConfirmedNotification,
  sendBookingRejectedNotification,
} from "@/lib/send-booking-notification"
import { format } from "date-fns"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// ONLINE BOOKING SERVER ACTIONS
// ============================================

/**
 * Fetch online bookings with optional filters (for reception dashboard)
 */
export async function getOnlineBookings(filters?: {
  status?: string
  date?: string
}) {
  try {
    const where: Record<string, unknown> = {}

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status
    }

    if (filters?.date) {
      const dateStart = new Date(filters.date)
      dateStart.setHours(0, 0, 0, 0)
      const dateEnd = new Date(filters.date)
      dateEnd.setHours(23, 59, 59, 999)
      where.preferredDate = { gte: dateStart, lte: dateEnd }
    }

    const bookings = await prisma.onlineBooking.findMany({
      where,
      include: {
        preferredDoctor: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return { success: true, data: bookings }
  } catch (error) {
    console.error("[ONLINE_BOOKING] Failed to fetch bookings:", error)
    return { success: false, data: [], error: "Failed to fetch bookings" }
  }
}

/**
 * Confirm an online booking — creates a real Appointment + Patient record
 */
export async function confirmOnlineBooking(data: {
  bookingId: string
  doctorId: string
  appointmentDate: string
  appointmentTime: string
  confirmedByName: string
  confirmedById: string
}) {
  try {
    // 1. Fetch the booking
    const booking = await prisma.onlineBooking.findUnique({
      where: { id: data.bookingId },
    })

    if (!booking) {
      return { success: false, message: "Booking not found" }
    }

    if (booking.status !== "PENDING") {
      return { success: false, message: `Booking is already ${booking.status}` }
    }

    // 2. Verify the doctor
    const doctor = await prisma.staff.findUnique({
      where: { id: data.doctorId },
      include: { user: true },
    })

    if (!doctor || doctor.user.role !== "DOCTOR") {
      return { success: false, message: "Invalid doctor selected" }
    }

    if (doctor.isOnLeave) {
      return { success: false, message: `Dr. ${doctor.user.name} is currently on leave` }
    }

    // 3. Check doctor's appointment count for the day
    const appointmentDate = new Date(data.appointmentDate)
    const dayStart = new Date(appointmentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(appointmentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const existingCount = await prisma.appointment.count({
      where: {
        doctorId: data.doctorId,
        appointmentDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    })

    // Check doctor schedule for max patients
    const dayOfWeek = appointmentDate.getDay()
    const schedule = await prisma.doctorSchedule.findFirst({
      where: {
        doctorId: data.doctorId,
        dayOfWeek,
        isActive: true,
      },
    })

    const maxPatients = schedule?.maxPatients || 30
    if (existingCount >= maxPatients) {
      return {
        success: false,
        message: `Dr. ${doctor.user.name} already has ${existingCount} appointments on ${format(appointmentDate, "MMM dd")}. Max allowed: ${maxPatients}`,
      }
    }

    // 4. Find or create patient by phone number
    let patientRecord = await prisma.patient.findFirst({
      where: { phone: booking.phone },
      include: { user: true },
    })

    if (!patientRecord) {
      // Create a new User + Patient record
      const year = new Date().getFullYear()
      const patientCount = await prisma.patient.count()
      const patientIdStr = `PAT-${year}-${String(patientCount + 1).padStart(4, "0")}`

      const newUser = await prisma.user.create({
        data: {
          name: booking.patientName,
          email: `patient_${Date.now()}@placeholder.local`,
          role: "PATIENT",
          isActive: true,
        },
      })

      patientRecord = await prisma.patient.create({
        data: {
          userId: newUser.id,
          patientId: patientIdStr,
          phone: booking.phone,
          gender: booking.gender as "MALE" | "FEMALE" | "OTHER" | undefined,
        },
        include: { user: true },
      })
    }

    // 5. Create the actual Appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientRecord.id,
        doctorId: data.doctorId,
        appointmentDate,
        appointmentTime: data.appointmentTime,
        reason: booking.reason || "Online Booking",
        status: "CONFIRMED",
      },
    })

    // 6. Update the OnlineBooking
    await prisma.onlineBooking.update({
      where: { id: data.bookingId },
      data: {
        status: "CONFIRMED",
        appointmentId: appointment.id,
        patientId: patientRecord.id,
        confirmedById: data.confirmedById,
        confirmedByName: data.confirmedByName,
        confirmedAt: new Date(),
      },
    })

    // 7. Notify the doctor
    await createRoleNotification({
      title: "New Confirmed Appointment",
      message: `Online booking confirmed: ${booking.patientName} on ${format(appointmentDate, "MMM dd, yyyy")} at ${data.appointmentTime}`,
      type: "INFO",
      module: "CLINICAL",
      link: `/dashboard/clinical/opd`,
      referenceId: appointment.id,
      targetRole: "DOCTOR",
    })

    // 8. Send WhatsApp notification to booker
    await sendBookingConfirmedNotification({
      phone: booking.phone,
      patientName: booking.patientName,
      bookingToken: booking.bookingToken,
      department: booking.department,
      preferredDate: format(appointmentDate, "MMM dd, yyyy"),
      preferredTime: data.appointmentTime,
      doctorName: doctor.user.name || "Doctor",
    })

    revalidatePath("/dashboard/reception")
    revalidatePath("/dashboard/clinical/opd")

    writeAuditLog({ userId: data.confirmedById, action: "PROCESS", module: "OnlineBooking", recordId: data.bookingId, changes: { patientName: booking.patientName, doctorId: data.doctorId, appointmentDate: data.appointmentDate } })

    return {
      success: true,
      message: `Booking confirmed for ${booking.patientName} with Dr. ${doctor.user.name}`,
      appointmentId: appointment.id,
    }
  } catch (error) {
    console.error("[ONLINE_BOOKING] Confirm error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to confirm booking",
    }
  }
}

/**
 * Reject an online booking
 */
export async function rejectOnlineBooking(data: {
  bookingId: string
  reason: string
  rejectedByName: string
  rejectedById: string
}) {
  try {
    const booking = await prisma.onlineBooking.findUnique({
      where: { id: data.bookingId },
    })

    if (!booking) {
      return { success: false, message: "Booking not found" }
    }

    if (booking.status !== "PENDING") {
      return { success: false, message: `Booking is already ${booking.status}` }
    }

    await prisma.onlineBooking.update({
      where: { id: data.bookingId },
      data: {
        status: "REJECTED",
        rejectionReason: data.reason,
        confirmedById: data.rejectedById,
        confirmedByName: data.rejectedByName,
        confirmedAt: new Date(),
      },
    })

    // Send WhatsApp notification
    await sendBookingRejectedNotification({
      phone: booking.phone,
      patientName: booking.patientName,
      bookingToken: booking.bookingToken,
      department: booking.department,
      preferredDate: format(booking.preferredDate, "MMM dd, yyyy"),
      preferredTime: booking.preferredTime,
      rejectionReason: data.reason,
    })

    revalidatePath("/dashboard/reception")

    writeAuditLog({ userId: "system", action: "DELETE", module: "OnlineBooking", recordId: data.bookingId, changes: { patientName: booking.patientName, reason: data.reason } })

    return {
      success: true,
      message: `Booking for ${booking.patientName} has been rejected`,
    }
  } catch (error) {
    console.error("[ONLINE_BOOKING] Reject error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to reject booking",
    }
  }
}

/**
 * Get available doctors for a department (public API — no auth)
 */
export async function getAvailableDoctors(department?: string) {
  try {
    const where: Record<string, unknown> = {
      user: { role: "DOCTOR", isActive: true },
      isOnLeave: false,
    }

    if (department && department !== "ALL") {
      where.department = department
    }

    const doctors = await prisma.staff.findMany({
      where,
      select: {
        id: true,
        department: true,
        specialization: true,
        consultationFee: true,
        user: {
          select: { name: true },
        },
        doctorSchedules: {
          where: { isActive: true },
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            slotDuration: true,
            maxPatients: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    })

    return { success: true, data: doctors }
  } catch (error) {
    console.error("[ONLINE_BOOKING] Failed to fetch doctors:", error)
    return { success: false, data: [] }
  }
}

/**
 * Get unique departments from active doctors
 */
export async function getDepartments() {
  try {
    const departments = await prisma.staff.findMany({
      where: {
        user: { role: "DOCTOR", isActive: true },
        department: { not: null },
      },
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" },
    })

    return {
      success: true,
      data: departments.map((d) => d.department).filter(Boolean) as string[],
    }
  } catch (error) {
    console.error("[ONLINE_BOOKING] Failed to fetch departments:", error)
    return { success: false, data: [] }
  }
}

/**
 * Check booking status by token + phone
 */
export async function checkBookingStatus(token: string, phone: string) {
  try {
    const booking = await prisma.onlineBooking.findFirst({
      where: {
        bookingToken: token,
        phone,
      },
      include: {
        preferredDoctor: {
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (!booking) {
      return { success: false, message: "No booking found with that token and phone number" }
    }

    return { success: true, data: booking }
  } catch (error) {
    console.error("[ONLINE_BOOKING] Status check error:", error)
    return { success: false, message: "Failed to check booking status" }
  }
}
