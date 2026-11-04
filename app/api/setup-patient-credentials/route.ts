import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { auth } from "@/auth"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.role || !["SUPER_ADMIN", "RECEPTIONIST"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { patientId } = await request.json()

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { user: { select: { id: true, password: true, email: true } } },
  })

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  }

  if (patient.user.password) {
    return NextResponse.json({ message: "Patient already has login credentials", email: patient.user.email })
  }

  const phone = patient.phone || patient.patientId
  const hashedPassword = await hash(phone, 10)

  await prisma.user.update({
    where: { id: patient.user.id },
    data: { password: hashedPassword },
  })

  return NextResponse.json({
    success: true,
    message: "Patient credentials created",
    email: patient.user.email,
    defaultPassword: phone,
  })
}
