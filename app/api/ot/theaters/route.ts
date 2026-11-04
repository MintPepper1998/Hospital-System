import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const theaters = await prisma.operationTheater.findMany({
      where: {
        isOperational: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ success: true, theaters })
  } catch (error: any) {
    console.error("[ERROR] Failed to fetch theaters:", error.message)
    return NextResponse.json(
      { success: false, message: "Failed to fetch theaters" },
      { status: 500 }
    )
  }
}
