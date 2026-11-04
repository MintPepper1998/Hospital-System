import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// PATCH /api/ambulance/trips/[tripId] — Update trip status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const body = await request.json()

    const trip = await prisma.ambulanceTrip.findUnique({
      where: { id: tripId },
      include: { ambulance: true },
    })
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    // Status transitions with timestamp tracking
    if (body.status) {
      updateData.status = body.status
      const now = new Date()

      switch (body.status) {
        case "DISPATCHED":
          updateData.dispatchedAt = now
          break
        case "EN_ROUTE":
          break
        case "ARRIVED":
          updateData.arrivedAt = now
          break
        case "PATIENT_LOADED":
          updateData.patientLoadedAt = now
          break
        case "RETURNING":
          break
        case "COMPLETED":
          updateData.completedAt = now
          // Set ambulance back to AVAILABLE
          await prisma.ambulance.update({
            where: { id: trip.ambulanceId },
            data: { status: "AVAILABLE" },
          })
          break
        case "CANCELLED":
          updateData.cancelledAt = now
          updateData.cancelReason = body.cancelReason || "Cancelled"
          // Set ambulance back to AVAILABLE
          await prisma.ambulance.update({
            where: { id: trip.ambulanceId },
            data: { status: "AVAILABLE" },
          })
          break
      }
    }

    // Optional field updates
    if (body.distanceKm !== undefined) {
      updateData.distanceKm = parseFloat(body.distanceKm)

      // Recalculate billing if distance changes
      let config = await prisma.ambulanceBillingConfig.findUnique({ where: { id: 1 } })
      if (!config) {
        config = await prisma.ambulanceBillingConfig.create({ data: { id: 1 } })
      }

      const newDistance = parseFloat(body.distanceKm)
      const distanceCharge = config.defaultPerKmRate * newDistance
      const hour = trip.requestedAt.getHours()
      const isNight = hour >= config.nightStartHour || hour < config.nightEndHour
      const nightSurcharge = isNight ? config.nightSurchargeRate : 0

      let equipmentCharge = 0
      if (trip.ambulance.type === "ADVANCED_LIFE_SUPPORT") equipmentCharge = config.alsExtraCharge
      if (trip.ambulance.type === "NEONATAL") equipmentCharge = config.neonatalExtraCharge

      const totalAmount = config.defaultBookingFee + distanceCharge + nightSurcharge + equipmentCharge

      await prisma.ambulanceBilling.updateMany({
        where: { tripId },
        data: {
          distanceKm: newDistance,
          distanceCharge,
          totalAmount,
        },
      })
    }

    if (body.vitalsDuringTransport !== undefined) updateData.vitalsDuringTransport = body.vitalsDuringTransport
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.admissionId !== undefined) updateData.admissionId = body.admissionId
    if (body.patientId !== undefined) updateData.patientId = body.patientId

    const updated = await prisma.ambulanceTrip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        ambulance: { select: { vehicleNumber: true, type: true } },
        billing: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update trip:", error)
    return NextResponse.json({ error: "Failed to update trip" }, { status: 400 })
  }
}

// GET /api/ambulance/trips/[tripId] — Get single trip details
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params

    const trip = await prisma.ambulanceTrip.findUnique({
      where: { id: tripId },
      include: {
        ambulance: {
          include: {
            equipment: true,
            _count: { select: { equipment: true } },
          },
        },
        patient: { select: { patientId: true, phone: true } },
        admission: { select: { id: true, status: true } },
        billing: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    return NextResponse.json(trip)
  } catch (error) {
    console.error("Failed to fetch trip:", error)
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 })
  }
}
