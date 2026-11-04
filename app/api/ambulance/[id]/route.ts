import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/ambulance/[id] — Single ambulance with full details
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: {
        equipment: { orderBy: { category: "asc" } },
        staffAssignments: {
          where: { isActive: true },
          include: { staff: { include: { user: { select: { name: true, email: true } } } }, shift: true },
          orderBy: { assignmentDate: "desc" },
        },
        trips: {
          orderBy: { requestedAt: "desc" },
          take: 10,
          include: { billing: true },
        },
        _count: {
          select: { equipment: true, staffAssignments: true, trips: true },
        },
      },
    })

    if (!ambulance) {
      return NextResponse.json({ error: "Ambulance not found" }, { status: 404 })
    }

    return NextResponse.json(ambulance)
  } catch (error) {
    console.error("Failed to fetch ambulance:", error)
    return NextResponse.json({ error: "Failed to fetch ambulance" }, { status: 500 })
  }
}

// PATCH /api/ambulance/[id] — Update ambulance
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.vehicleNumber !== undefined) updateData.vehicleNumber = body.vehicleNumber
    if (body.type !== undefined) updateData.type = body.type
    if (body.status !== undefined) updateData.status = body.status
    if (body.model !== undefined) updateData.model = body.model
    if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer
    if (body.yearOfManufacture !== undefined) updateData.yearOfManufacture = parseInt(body.yearOfManufacture)
    if (body.registrationExpiry !== undefined) updateData.registrationExpiry = body.registrationExpiry ? new Date(body.registrationExpiry) : null
    if (body.insuranceExpiry !== undefined) updateData.insuranceExpiry = body.insuranceExpiry ? new Date(body.insuranceExpiry) : null
    if (body.insurancePolicyNo !== undefined) updateData.insurancePolicyNo = body.insurancePolicyNo
    if (body.lastServiceDate !== undefined) updateData.lastServiceDate = body.lastServiceDate ? new Date(body.lastServiceDate) : null
    if (body.nextServiceDue !== undefined) updateData.nextServiceDue = body.nextServiceDue ? new Date(body.nextServiceDue) : null
    if (body.mileage !== undefined) updateData.mileage = parseFloat(body.mileage)
    if (body.fuelType !== undefined) updateData.fuelType = body.fuelType
    if (body.capacity !== undefined) updateData.capacity = parseInt(body.capacity)
    if (body.contactNumber !== undefined) updateData.contactNumber = body.contactNumber
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const ambulance = await prisma.ambulance.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(ambulance)
  } catch (error) {
    console.error("Failed to update ambulance:", error)
    return NextResponse.json({ error: "Failed to update ambulance" }, { status: 400 })
  }
}

// DELETE /api/ambulance/[id] — Soft delete
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.ambulance.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete ambulance:", error)
    return NextResponse.json({ error: "Failed to delete ambulance" }, { status: 400 })
  }
}
