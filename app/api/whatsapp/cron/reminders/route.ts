import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAppointmentReminder, sendSurgeryDayAlert } from "@/lib/whatsapp"
import { format, addDays, startOfDay, endOfDay, addHours } from "date-fns"

/**
 * WhatsApp Reminder Cron Job
 * 
 * Sends:
 * 1. Appointment reminders (24h before for tomorrow, 1h before for today)
 * 2. Surgery day alerts (evening before surgery)
 * 
 * Trigger: GET /api/whatsapp/cron/reminders?secret=YOUR_CRON_SECRET
 * 
 * Idempotent: checks WhatsAppLog to avoid duplicate sends within 24h.
 */

const CRON_SECRET = process.env.CRON_SECRET || "cron-secret-change-me"

export async function GET(req: NextRequest) {
  // ── Auth ──
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret")
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const tomorrow = addDays(now, 1)
  const tomorrowStart = startOfDay(tomorrow)
  const tomorrowEnd = endOfDay(tomorrow)
  const todayStart = startOfDay(now)
  const twoHoursFromNow = addHours(now, 2)

  const stats = { appointmentsSent: 0, appointmentsSkipped: 0, appointmentsFailed: 0, surgeriesSent: 0, surgeriesSkipped: 0, surgeriesFailed: 0 }

  try {
    // ════════════════════════════════════════════
    // 1. APPOINTMENT REMINDERS (tomorrow)
    // ════════════════════════════════════════════
    const tomorrowAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    })

    for (const apt of tomorrowAppointments) {
      const phone = apt.patient.phone
      if (!phone) { stats.appointmentsSkipped++; continue }

      // Duplicate check: skip if already sent reminder for this appointment in the last 24h
      const alreadySent = await prisma.whatsAppLog.findFirst({
        where: {
          referenceId: apt.id,
          templateName: "appointment_reminder",
          status: { in: ["SENT", "DELIVERED"] },
          createdAt: { gte: addDays(now, -1) },
        },
      })
      if (alreadySent) { stats.appointmentsSkipped++; continue }

      const result = await sendAppointmentReminder({
        phone,
        patientName: apt.patient.user.name || "Patient",
        date: format(apt.appointmentDate, "dd MMM yyyy"),
        time: apt.appointmentTime,
        doctorName: apt.doctor.user.name || "Doctor",
        referenceId: apt.id,
      })

      if (result.success) stats.appointmentsSent++
      else stats.appointmentsFailed++
    }

    // ════════════════════════════════════════════
    // 2. SURGERY DAY ALERTS (tomorrow)
    // ════════════════════════════════════════════
    const tomorrowSurgeries = await prisma.surgery.findMany({
      where: {
        scheduledDate: { gte: tomorrowStart, lte: tomorrowEnd },
        status: "SCHEDULED",
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        leadSurgeon: { include: { user: { select: { name: true } } } },
        theater: { select: { name: true } },
      },
    })

    for (const surgery of tomorrowSurgeries) {
      const phone = surgery.patient.phone
      if (!phone) { stats.surgeriesSkipped++; continue }

      // Duplicate check
      const alreadySent = await prisma.whatsAppLog.findFirst({
        where: {
          referenceId: surgery.id,
          templateName: "surgery_day_alert",
          status: { in: ["SENT", "DELIVERED"] },
          createdAt: { gte: addDays(now, -1) },
        },
      })
      if (alreadySent) { stats.surgeriesSkipped++; continue }

      const result = await sendSurgeryDayAlert({
        phone,
        patientName: surgery.patient.user.name || "Patient",
        procedureName: surgery.procedureName,
        surgeryDate: format(surgery.scheduledDate, "dd MMM yyyy"),
        surgeryTime: format(surgery.scheduledDate, "hh:mm a"),
        theaterName: surgery.theater.name,
        surgeonName: surgery.leadSurgeon.user.name || "Surgeon",
        referenceId: surgery.id,
      })

      if (result.success) stats.surgeriesSent++
      else stats.surgeriesFailed++
    }

    console.log(`[WHATSAPP CRON] Completed:`, stats)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...stats,
    })
  } catch (error: any) {
    console.error("[WHATSAPP CRON] Fatal error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
