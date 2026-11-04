import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/ambulance — List all ambulances with counts
export async function GET() {
  try {
    const ambulances = await prisma.ambulance.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            equipment: true,
            staffAssignments: { where: { isActive: true } },
            trips: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(ambulances)
  } catch (error) {
    console.error("Failed to fetch ambulances:", error)
    return NextResponse.json(
      { error: "Failed to fetch ambulances" },
      { status: 500 }
    )
  }
}

// POST /api/ambulance — Register a new ambulance
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const ambulance = await prisma.ambulance.create({
      data: {
        vehicleNumber: body.vehicleNumber,
        type: body.type || "BASIC_LIFE_SUPPORT",
        status: body.status || "AVAILABLE",
        model: body.model,
        manufacturer: body.manufacturer,
        yearOfManufacture: body.yearOfManufacture ? parseInt(body.yearOfManufacture) : undefined,
        registrationExpiry: body.registrationExpiry ? new Date(body.registrationExpiry) : undefined,
        insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
        insurancePolicyNo: body.insurancePolicyNo,
        lastServiceDate: body.lastServiceDate ? new Date(body.lastServiceDate) : undefined,
        nextServiceDue: body.nextServiceDue ? new Date(body.nextServiceDue) : undefined,
        mileage: body.mileage ? parseFloat(body.mileage) : 0,
        fuelType: body.fuelType || "Diesel",
        capacity: body.capacity ? parseInt(body.capacity) : 1,
        contactNumber: body.contactNumber,
        notes: body.notes,
      },
    })

    return NextResponse.json(ambulance, { status: 201 })
  } catch (error: unknown) {
    console.error("Failed to create ambulance:", error)
    const message = error instanceof Error && error.message.includes("Unique constraint")
      ? "An ambulance with this vehicle number already exists"
      : "Failed to create ambulance"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
