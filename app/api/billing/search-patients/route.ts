import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireBillingCounterAccess } from "@/lib/billing-counter-access"

export async function GET(request: Request) {
  try {
    await requireBillingCounterAccess()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ patients: [] })
  }

  try {
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { patientId: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { user: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { user: { select: { name: true } } },
      take: 10,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      patients: patients.map((p) => ({
        id: p.id,
        patientId: p.patientId,
        name: p.user.name || "Unknown",
        phone: p.phone,
        gender: p.gender,
      })),
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to search patients", patients: [] },
      { status: 500 }
    )
  }
}
