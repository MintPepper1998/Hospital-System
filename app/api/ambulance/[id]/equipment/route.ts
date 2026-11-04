import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/ambulance/[id]/equipment — List equipment for an ambulance
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const equipment = await prisma.ambulanceEquipment.findMany({
      where: { ambulanceId: id },
      orderBy: [{ category: "asc" }, { equipmentName: "asc" }],
    })

    return NextResponse.json(equipment)
  } catch (error) {
    console.error("Failed to fetch equipment:", error)
    return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 })
  }
}

// POST /api/ambulance/[id]/equipment — Add equipment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const equipment = await prisma.ambulanceEquipment.create({
      data: {
        ambulanceId: id,
        equipmentName: body.equipmentName,
        category: body.category || "MEDICAL",
        quantity: body.quantity ? parseInt(body.quantity) : 1,
        condition: body.condition || "GOOD",
        lastCheckedAt: body.lastCheckedAt ? new Date(body.lastCheckedAt) : new Date(),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        notes: body.notes,
      },
    })

    return NextResponse.json(equipment, { status: 201 })
  } catch (error) {
    console.error("Failed to add equipment:", error)
    return NextResponse.json({ error: "Failed to add equipment" }, { status: 400 })
  }
}
