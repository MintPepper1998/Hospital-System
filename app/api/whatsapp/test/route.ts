import { NextRequest, NextResponse } from "next/server"
import { sendWhatsAppTemplate } from "@/lib/whatsapp"
import { auth } from "@/auth"

/**
 * POST /api/whatsapp/test
 * Send a test WhatsApp message to verify configuration.
 * Only accessible by authenticated SUPER_ADMIN users.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      )
    }

    const { phone } = await request.json()
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid 10-digit phone number" },
        { status: 400 }
      )
    }

    const result = await sendWhatsAppTemplate({
      phone: phone.replace(/\D/g, "").slice(-10),
      templateName: "booking_received",
      params: {
        patientName: "Test Patient",
        department: "General Medicine",
        date: new Date().toLocaleDateString("en-IN"),
        time: "10:00 AM",
        bookingId: "TEST-0000",
      },
      category: "BOOKING",
      referenceId: "test-message",
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[WHATSAPP_TEST] Error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to send test message" },
      { status: 500 }
    )
  }
}
