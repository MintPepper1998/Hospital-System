import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"

export async function GET() {
  try {
    // Delete any existing admin so we always get a fresh, known-good account
    await prisma.user.deleteMany({
      where: { role: "SUPER_ADMIN" },
    })

    const plainPassword = "Admin@123"
    const hashedPassword = await hash(plainPassword, 12)

    const user = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: "admin@shreekamal.com",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    })

    // Verify the stored hash matches by re-reading from DB
    const verify = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, password: true, role: true },
    })

    return NextResponse.json({
      success: true,
      message: "Super Admin created (old one deleted if existed)",
      credentials: {
        email: "admin@shreekamal.com",
        password: plainPassword,
      },
      userId: user.id,
      debug: {
        storedHashLength: verify?.password?.length,
        storedHashPrefix: verify?.password?.substring(0, 7),
        role: verify?.role,
      },
    })
  } catch (error) {
    console.error("Setup admin error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to create admin" },
      { status: 500 }
    )
  }
}
