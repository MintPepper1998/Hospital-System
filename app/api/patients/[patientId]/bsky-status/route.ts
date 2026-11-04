import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { isBsky: true },
  })

  if (!patient) {
    return NextResponse.json({ isBsky: false })
  }

  // Also check for active BSKY admission
  const activeAdmission = await prisma.iPDAdmission.findFirst({
    where: { patientId, status: "ADMITTED", isBskyAdmission: true },
    select: { id: true },
  })

  return NextResponse.json({
    isBsky: patient.isBsky || !!activeAdmission,
  })
}
