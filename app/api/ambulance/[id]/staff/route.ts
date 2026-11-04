import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/ambulance/[id]/staff — List staff assignments for an ambulance
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const assignments = await prisma.ambulanceStaffAssignment.findMany({
      where: { ambulanceId: id, isActive: true },
      include: {
        staff: {
          include: { user: { select: { name: true, email: true, phone: true } } },
        },
        shift: true,
      },
      orderBy: [{ assignmentDate: "desc" }, { role: "asc" }],
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Failed to fetch staff assignments:", error)
    return NextResponse.json({ error: "Failed to fetch staff assignments" }, { status: 500 })
  }
}

// POST /api/ambulance/[id]/staff — Assign staff to ambulance
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const assignment = await prisma.ambulanceStaffAssignment.create({
      data: {
        ambulanceId: id,
        staffId: body.staffId,
        shiftId: body.shiftId,
        role: body.role || "DRIVER",
        assignmentDate: new Date(body.assignmentDate),
        notes: body.notes,
      },
      include: {
        staff: { include: { user: { select: { name: true } } } },
        shift: true,
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error: unknown) {
    console.error("Failed to assign staff:", error)
    const message = error instanceof Error && error.message.includes("Unique constraint")
      ? "This staff member is already assigned to this ambulance on this date"
      : "Failed to assign staff"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
