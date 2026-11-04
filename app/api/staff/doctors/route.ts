import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query") || ""

    const where: any = {
      user: {
        role: 'DOCTOR',
        isActive: true
      }
    }

    if (query.trim()) {
      where.OR = [
        {
          user: {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          }
        },
        {
          employeeId: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          specialization: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    }

    const doctors = await prisma.staff.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      take: 10,
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    })

    return NextResponse.json({ success: true, doctors })
  } catch (error: any) {
    console.error("[ERROR] Doctor search failed:", error.message)
    return NextResponse.json(
      { success: false, message: "Failed to search doctors" },
      { status: 500 }
    )
  }
}
