import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { LabRequest, Appointment } from "@prisma/client"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patientId")

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 })
  }

  console.log("🔥 DEBUG API: Fetching pending orders for patient:", patientId)

  try {
    // Fetch pending lab requests (PENDING_PAYMENT status)
    const labRequests = await prisma.labRequest.findMany({
      where: {
        patientId: patientId,
        status: 'PENDING_PAYMENT',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log("🔥 DEBUG API: Found lab requests:", labRequests.length)

    // Fetch unbilled prescriptions from today's OPD
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const prescriptions = await prisma.appointment.findMany({
      where: {
        patientId: patientId,
        status: 'COMPLETED',
        prescription: {
          not: null,
        },
        billings: { none: {} }, // Not yet billed
        appointmentDate: {
          gte: today,
        },
      },
      orderBy: {
        appointmentDate: 'desc',
      },
    })

    console.log("🔥 DEBUG API: Found prescriptions:", prescriptions.length)

    return NextResponse.json({
      labRequests: labRequests.map((req: LabRequest) => ({
        id: req.id,
        testName: req.testName,
        testPrice: req.testPrice,
        status: req.status,
        createdAt: req.createdAt,
      })),
      prescriptions: prescriptions.map((appt: Appointment) => ({
        id: appt.id,
        prescription: appt.prescription,
        appointmentDate: appt.appointmentDate,
      })),
    })
  } catch (error: unknown) {
    console.error("🔥 DEBUG API ERROR:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to fetch pending orders", message },
      { status: 500 }
    )
  }
}
