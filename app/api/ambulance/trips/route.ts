import { prisma } from "@/lib/prisma"
import { NextResponse, type NextRequest } from "next/server"

// GET /api/ambulance/trips — List trips with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const ambulanceId = searchParams.get("ambulanceId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (ambulanceId) where.ambulanceId = ambulanceId
    if (dateFrom || dateTo) {
      where.requestedAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      }
    }

    const trips = await prisma.ambulanceTrip.findMany({
      where,
      include: {
        ambulance: { select: { vehicleNumber: true, type: true } },
        patient: { select: { patientId: true } },
        billing: true,
      },
      orderBy: { requestedAt: "desc" },
      take: limit,
    })

    return NextResponse.json(trips)
  } catch (error) {
    console.error("Failed to fetch trips:", error)
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 })
  }
}

// Helper: generate sequential trip number
async function generateTripNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const lastTrip = await prisma.ambulanceTrip.findFirst({
    where: { tripNumber: { startsWith: `AMB-${year}` } },
    orderBy: { tripNumber: "desc" },
  })

  let nextSeq = 1
  if (lastTrip?.tripNumber) {
    const parts = lastTrip.tripNumber.split("-")
    nextSeq = parseInt(parts[parts.length - 1]) + 1
  }
  return `AMB-${year}-${String(nextSeq).padStart(4, "0")}`
}

// Helper: auto-calculate billing from config
async function calculateBilling(
  ambulanceType: string,
  distanceKm: number,
  requestedAt: Date
) {
  // Fetch or create billing config
  let config = await prisma.ambulanceBillingConfig.findUnique({ where: { id: 1 } })
  if (!config) {
    config = await prisma.ambulanceBillingConfig.create({ data: { id: 1 } })
  }

  const bookingFee = config.defaultBookingFee
  const perKmRate = config.defaultPerKmRate
  const distanceCharge = perKmRate * distanceKm

  // Night surcharge check
  const hour = requestedAt.getHours()
  const isNight = hour >= config.nightStartHour || hour < config.nightEndHour
  const nightSurcharge = isNight ? config.nightSurchargeRate : 0

  // Ambulance type extra charges
  let equipmentCharge = 0
  if (ambulanceType === "ADVANCED_LIFE_SUPPORT") equipmentCharge = config.alsExtraCharge
  if (ambulanceType === "NEONATAL") equipmentCharge = config.neonatalExtraCharge

  const totalAmount = bookingFee + distanceCharge + nightSurcharge + equipmentCharge

  return {
    bookingFee,
    perKmRate,
    distanceKm,
    distanceCharge,
    equipmentCharge,
    nightSurcharge,
    waitingCharge: 0,
    totalAmount,
  }
}

// POST /api/ambulance/trips — Create a new trip + auto-generate billing
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const tripNumber = await generateTripNumber()

    // Fetch ambulance details for billing calculation
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: body.ambulanceId },
    })
    if (!ambulance) {
      return NextResponse.json({ error: "Ambulance not found" }, { status: 404 })
    }

    const requestedAt = body.requestedAt ? new Date(body.requestedAt) : new Date()
    const distanceKm = body.distanceKm ? parseFloat(body.distanceKm) : 0

    // Calculate billing
    const billingCalc = await calculateBilling(ambulance.type, distanceKm, requestedAt)

    // Create trip + billing in a transaction
    const trip = await prisma.$transaction(async (tx) => {
      // Mark ambulance as ON_TRIP
      await tx.ambulance.update({
        where: { id: body.ambulanceId },
        data: { status: "ON_TRIP" },
      })

      // Create trip
      const newTrip = await tx.ambulanceTrip.create({
        data: {
          tripNumber,
          ambulanceId: body.ambulanceId,
          patientId: body.patientId || undefined,
          admissionId: body.admissionId || undefined,
          patientName: body.patientName,
          patientPhone: body.patientPhone || undefined,
          patientAge: body.patientAge ? parseInt(body.patientAge) : undefined,
          patientGender: body.patientGender || undefined,
          pickupLocation: body.pickupLocation,
          dropLocation: body.dropLocation || "Hospital",
          distanceKm,
          status: "DISPATCHED",
          driverName: body.driverName || undefined,
          driverPhone: body.driverPhone || undefined,
          paramedicName: body.paramedicName || undefined,
          requestedAt,
          dispatchedAt: new Date(),
          chiefComplaint: body.chiefComplaint || undefined,
          notes: body.notes || undefined,
        },
        include: { ambulance: true },
      })

      // Auto-create ambulance billing record
      await tx.ambulanceBilling.create({
        data: {
          tripId: newTrip.id,
          ...billingCalc,
        },
      })

      return newTrip
    })

    // Fetch with billing included
    const tripWithBilling = await prisma.ambulanceTrip.findUnique({
      where: { id: trip.id },
      include: {
        ambulance: { select: { vehicleNumber: true, type: true } },
        billing: true,
      },
    })

    return NextResponse.json(tripWithBilling, { status: 201 })
  } catch (error) {
    console.error("Failed to create trip:", error)
    return NextResponse.json({ error: "Failed to create trip" }, { status: 400 })
  }
}
