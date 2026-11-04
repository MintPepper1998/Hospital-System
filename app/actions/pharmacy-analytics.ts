"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"

export async function getTopSellingMedicines(limit: number = 5) {
  try {
    const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
    if (!authResult.ok) return { success: false, message: "Unauthorized" }

    // Aggregate billing items in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const topItems = await prisma.billingItem.groupBy({
      by: ['description'],
      where: {
        billing: {
          type: "PHARMACY",
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        serviceCategory: "PHARMACY"
      },
      _sum: {
        quantity: true,
        totalAmount: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: limit * 5  // Fetch more initially since batches will be merged by medicine name
    })

    // Clean up descriptions (remove batch info) and format
    const formattedData = topItems.map(item => {
      let name = item.description
      const match = name.match(/^(.*?)\s*\(Batch:/i)
      if (match) {
        name = match[1]
      }
      return {
        name,
        quantity: item._sum.quantity || 0,
        revenue: item._sum.totalAmount || 0
      }
    })

    // Group by name again since multiple batches might have the same medicine name
    const grouped = formattedData.reduce((acc: any, curr: any) => {
      if (acc[curr.name]) {
        acc[curr.name].quantity += curr.quantity
        acc[curr.name].revenue += curr.revenue
      } else {
        acc[curr.name] = { ...curr }
      }
      return acc
    }, {})

    let finalData = Object.values(grouped).sort((a: any, b: any) => b.quantity - a.quantity)
    
    return { success: true, data: finalData.slice(0, limit) }
  } catch (error: any) {
    console.error("[getTopSellingMedicines] Error:", error)
    return { success: false, message: "Failed to fetch top selling medicines" }
  }
}
