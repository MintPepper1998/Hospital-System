import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query") || ""

    const where: any = {}
    
    if (query.trim()) {
      where.OR = [
        {
          patientId: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          user: {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          }
        },
        {
          phone: {
            contains: query
          }
        }
      ]
    }

    const patients = await prisma.patient.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ success: true, patients })
  } catch (error: any) {
    console.error("[ERROR] Patient search failed:", error.message)
    return NextResponse.json(
      { success: false, message: "Failed to search patients" },
      { status: 500 }
    )
  }
}
