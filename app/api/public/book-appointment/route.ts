import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createMultiRoleNotification } from "@/lib/create-notification"
import { sendBookingReceivedNotification } from "@/lib/send-booking-notification"
import { format } from "date-fns"

/**
 * POST /api/public/book-appointment
 * Public (unauthenticated) endpoint for online appointment booking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      patientName,
      phone,
      email,
      age,
      gender,
      department,
      preferredDoctorId,
      preferredDate,
      preferredTime,
      reason,
    } = body

    // ── VALIDATION ──
    if (!patientName || !phone || !department || !preferredDate || !preferredTime) {
      return NextResponse.json(
        { success: false, message: "Name, phone, department, date, and time are required" },
        { status: 400 }
      )
    }

    // Phone format validation (Indian 10-digit)
    const cleanPhone = phone.replace(/\D/g, "")
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid 10-digit phone number" },
        { status: 400 }
      )
    }

    // Date validation
    const parsedDate = new Date(preferredDate)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date format" },
        { status: 400 }
      )
    }

    // No past dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (parsedDate < today) {
      return NextResponse.json(
        { success: false, message: "Cannot book appointments for past dates" },
        { status: 400 }
      )
    }

    // ── RATE LIMITING ──
    // Max 3 pending bookings per phone number
    const pendingCount = await prisma.onlineBooking.count({
      where: {
        phone: cleanPhone,
        status: "PENDING",
      },
    })

    if (pendingCount >= 3) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have 3 pending booking requests. Please wait for them to be processed.",
        },
        { status: 429 }
      )
    }

    // ── GENERATE BOOKING TOKEN ──
    const year = new Date().getFullYear()
    const bookingCount = await prisma.onlineBooking.count()
    const bookingToken = `BK-${year}-${String(bookingCount + 1).padStart(4, "0")}`

    // Get IP address for tracking
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown"

    // ── FIND OR CREATE PATIENT RECORD ──
    // Ensures the patient can log in to the portal to check booking status
    let patientRecord = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: `+91 ${cleanPhone}` },
        ],
      },
    })

    if (!patientRecord) {
      // Create User + Patient so they can log in with phone number
      const patientCount = await prisma.patient.count()
      const patientIdStr = `PAT-${year}-${String(patientCount + 1).padStart(4, "0")}`

      const newUser = await prisma.user.create({
        data: {
          name: patientName.trim(),
          email: `patient_${Date.now()}_${cleanPhone}@placeholder.local`,
          role: "PATIENT",
          isActive: true,
        },
      })

      patientRecord = await prisma.patient.create({
        data: {
          userId: newUser.id,
          patientId: patientIdStr,
          phone: cleanPhone,
          gender: gender as "MALE" | "FEMALE" | "OTHER" | undefined,
        },
      })
    }

    // ── CREATE BOOKING ──
    const booking = await prisma.onlineBooking.create({
      data: {
        patientName: patientName.trim(),
        phone: cleanPhone,
        email: email?.trim() || null,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        department,
        preferredDoctorId: preferredDoctorId || null,
        preferredDate: parsedDate,
        preferredTime,
        reason: reason?.trim() || null,
        bookingToken,
        ipAddress,
        patientId: patientRecord.id,
      },
    })

    // ── NOTIFY RECEPTION ──
    await createMultiRoleNotification({
      title: "🔔 New Online Booking",
      message: `${patientName} has requested a ${department} appointment on ${format(parsedDate, "MMM dd, yyyy")} at ${preferredTime}. Phone: ${cleanPhone}`,
      type: "INFO",
      module: "CLINICAL",
      link: "/dashboard/reception",
      referenceId: booking.id,
      targetRoles: ["RECEPTIONIST", "SUPER_ADMIN"],
    })

    // ── SEND WHATSAPP CONFIRMATION TO BOOKER ──
    await sendBookingReceivedNotification({
      phone: cleanPhone,
      patientName,
      bookingToken,
      department,
      preferredDate: format(parsedDate, "MMM dd, yyyy"),
      preferredTime,
    })

    return NextResponse.json({
      success: true,
      message: "Appointment request submitted successfully",
      bookingToken,
      bookingId: booking.id,
    })
  } catch (error) {
    console.error("[PUBLIC_BOOKING] Error:", error)
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
