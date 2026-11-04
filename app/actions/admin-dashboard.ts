"use server"

import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays, startOfMonth, format } from "date-fns"
import { requireAuth } from "@/lib/auth-guard"

// ============================================
// TYPES
// ============================================

export interface AdminStats {
  financials: {
    todayRevenue: number
    monthRevenue: number
    pendingBills: number
    pendingCount: number
  }
  occupancy: {
    totalBeds: number
    occupiedBeds: number
    occupancyRate: number
    availableBeds: number
    maintenanceBeds: number
  }
  flow: {
    todayAdmissions: number
    todayDischarges: number
    yesterdayAdmissions: number
    yesterdayDischarges: number
  }
  revenueChart: {
    date: string    // "Mon", "Tue", etc.
    fullDate: string // "07 Feb"
    revenue: number
  }[]
}

// ============================================
// GET ADMIN STATS
// ============================================

export async function getAdminStats(): Promise<AdminStats> {
  await requireAuth(["SUPER_ADMIN"])

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)

  const yesterdayStart = startOfDay(subDays(now, 1))
  const yesterdayEnd = endOfDay(subDays(now, 1))

  // ── Run all queries in parallel ──
  const [
    todayRevenueAgg,
    monthRevenueAgg,
    pendingBillsAgg,
    pendingBillsCount,
    totalBeds,
    occupiedBeds,
    maintenanceBeds,
    todayAdmissions,
    todayDischarges,
    yesterdayAdmissions,
    yesterdayDischarges,
  ] = await prisma.$transaction([
    // Today's revenue (sum of paidAmount for bills created today)
    prisma.billing.aggregate({
      where: {
        billDate: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { paidAmount: true },
    }),

    // This month's revenue
    prisma.billing.aggregate({
      where: {
        billDate: { gte: monthStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { paidAmount: true },
    }),

    // Pending bills (total outstanding balance)
    prisma.billing.aggregate({
      where: {
        balanceAmount: { gt: 0 },
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
      },
      _sum: { balanceAmount: true },
    }),

    // Pending bills count
    prisma.billing.count({
      where: {
        balanceAmount: { gt: 0 },
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
      },
    }),

    // Total beds
    prisma.bed.count(),

    // Occupied beds
    prisma.bed.count({
      where: { status: "OCCUPIED" },
    }),

    // Maintenance beds
    prisma.bed.count({
      where: { status: { in: ["MAINTENANCE", "CLEANING"] } },
    }),

    // Today's admissions
    prisma.iPDAdmission.count({
      where: {
        admissionDate: { gte: todayStart, lte: todayEnd },
      },
    }),

    // Today's discharges
    prisma.iPDAdmission.count({
      where: {
        dischargeDate: { gte: todayStart, lte: todayEnd },
      },
    }),

    // Yesterday's admissions (for comparison)
    prisma.iPDAdmission.count({
      where: {
        admissionDate: { gte: yesterdayStart, lte: yesterdayEnd },
      },
    }),

    // Yesterday's discharges (for comparison)
    prisma.iPDAdmission.count({
      where: {
        dischargeDate: { gte: yesterdayStart, lte: yesterdayEnd },
      },
    }),
  ])

  // ── Revenue Chart: Last 7 Days ──
  const revenueChart = await Promise.all(
    Array.from({ length: 7 }).map(async (_, i) => {
      const day = subDays(now, 6 - i)
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)

      const agg = await prisma.billing.aggregate({
        where: {
          billDate: { gte: dayStart, lte: dayEnd },
          status: { not: "CANCELLED" },
        },
        _sum: { paidAmount: true },
      })

      return {
        date: format(day, "EEE"),      // "Mon", "Tue"
        fullDate: format(day, "dd MMM"), // "07 Feb"
        revenue: agg._sum.paidAmount || 0,
      }
    })
  )

  // ── Build result ──
  const totalBedsCount = totalBeds || 1 // avoid div by zero
  const occupancyRate = Math.round((occupiedBeds / totalBedsCount) * 100)

  return {
    financials: {
      todayRevenue: todayRevenueAgg._sum.paidAmount || 0,
      monthRevenue: monthRevenueAgg._sum.paidAmount || 0,
      pendingBills: pendingBillsAgg._sum.balanceAmount || 0,
      pendingCount: pendingBillsCount,
    },
    occupancy: {
      totalBeds,
      occupiedBeds,
      occupancyRate,
      availableBeds: totalBeds - occupiedBeds - maintenanceBeds,
      maintenanceBeds,
    },
    flow: {
      todayAdmissions,
      todayDischarges,
      yesterdayAdmissions,
      yesterdayDischarges,
    },
    revenueChart,
  }
}
