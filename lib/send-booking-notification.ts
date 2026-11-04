"use server"

import { sendWhatsAppTemplate } from "@/lib/whatsapp"

/**
 * Send booking notification via WhatsApp Business API.
 *
 * These functions are called by:
 * - app/api/public/book-appointment/route.ts (booking received)
 * - app/actions/online-booking.ts (confirmed / rejected)
 *
 * They delegate to the centralized WhatsApp service in lib/whatsapp.ts
 * which handles Meta Cloud API calls, audit logging, and graceful degradation.
 *
 * TEMPLATES TO REGISTER WITH META (via WhatsApp Manager):
 * Register each in 3 languages: English (en), Hindi (hi), Odia (or)
 *
 * ┌─────────────────────┬─────────────────────────────────────────────────────────────────────────┐
 * │ booking_received    │ Hello {{1}}, your appointment request for {{2}} on {{3}} at {{4}}      │
 * │                     │ has been received. Our reception team will confirm shortly.             │
 * │                     │ Booking ID: {{5}}                                                      │
 * ├─────────────────────┼─────────────────────────────────────────────────────────────────────────┤
 * │ booking_confirmed   │ Hello {{1}}, your appointment is confirmed for {{2}} at {{3}}          │
 * │                     │ with Dr. {{4}}. Booking ID: {{5}}. Please arrive 15 minutes early.     │
 * ├─────────────────────┼─────────────────────────────────────────────────────────────────────────┤
 * │ booking_rejected    │ Hello {{1}}, we regret that your appointment request for {{2}}         │
 * │                     │ could not be confirmed. Reason: {{3}}.                                 │
 * │                     │ Please call us at 1066 for assistance or try a different date.          │
 * └─────────────────────┴─────────────────────────────────────────────────────────────────────────┘
 */

interface BookingNotificationData {
  phone: string
  patientName: string
  bookingToken: string
  department: string
  preferredDate: string
  preferredTime: string
  doctorName?: string
  rejectionReason?: string
}

/**
 * Notify the visitor that their booking request has been received
 */
export async function sendBookingReceivedNotification(data: BookingNotificationData) {
  return sendWhatsAppTemplate({
    phone: data.phone,
    templateName: "booking_received",
    params: {
      patientName: data.patientName,
      department: data.department,
      date: data.preferredDate,
      time: data.preferredTime,
      bookingId: data.bookingToken,
    },
    category: "BOOKING",
    referenceId: data.bookingToken,
  })
}

/**
 * Notify the visitor that their booking has been confirmed
 */
export async function sendBookingConfirmedNotification(data: BookingNotificationData) {
  return sendWhatsAppTemplate({
    phone: data.phone,
    templateName: "booking_confirmed",
    params: {
      patientName: data.patientName,
      date: data.preferredDate,
      time: data.preferredTime,
      doctorName: data.doctorName || "Assigned Doctor",
      bookingId: data.bookingToken,
    },
    category: "BOOKING",
    referenceId: data.bookingToken,
  })
}

/**
 * Notify the visitor that their booking has been rejected
 */
export async function sendBookingRejectedNotification(data: BookingNotificationData) {
  return sendWhatsAppTemplate({
    phone: data.phone,
    templateName: "booking_rejected",
    params: {
      patientName: data.patientName,
      date: data.preferredDate,
      reason: data.rejectionReason || "The requested slot is not available",
    },
    category: "BOOKING",
    referenceId: data.bookingToken,
  })
}
