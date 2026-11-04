"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { DateRange } from "@/lib/pharmacy-finance/dates"
import { pharmacySalesWhere } from "@/lib/pharmacy-finance/scope"

export type ReturnsRegisterParams = {
  range: DateRange
  status?: string
  page?: number
}

const PAGE_SIZE = 50

export async function getReturnsRegister(params: ReturnsRegisterParams) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const where: any = {
    createdAt: { gte: params.range.from, lt: params.range.to }
  }
  
  if (params.status) {
    where.refundStatus = params.status
  }

  const totalRows = await prisma.salesReturn.count({ where })
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const page = params.page || 1

  const rows = await prisma.salesReturn.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    include: {
      originalBill: {
        select: {
          billNumber: true,
          patient: { select: { user: { select: { name: true } } } },
          pharmacyCustomer: { select: { name: true } }
        }
      },
      items: { select: { id: true } }
    }
  })

  // KPIs
  const agg = await prisma.salesReturn.aggregate({
    where: { createdAt: { gte: params.range.from, lt: params.range.to } },
    _sum: { refundAmount: true },
    _count: { id: true }
  })
  
  const pendingAgg = await prisma.salesReturn.aggregate({
    where: { createdAt: { gte: params.range.from, lt: params.range.to }, refundStatus: "PENDING" },
    _sum: { refundAmount: true },
    _count: { id: true }
  })

  // Gross sales for return rate
  const grossSales = await prisma.billing.aggregate({
    where: pharmacySalesWhere(params.range),
    _sum: { totalAmount: true }
  })

  const mappedRows = rows.map(r => ({
    id: r.id,
    date: r.createdAt,
    returnNumber: r.returnNumber,
    billNumber: r.originalBill.billNumber,
    patientName: r.originalBill.pharmacyCustomer?.name || r.originalBill.patient?.user?.name || "Walk-in",
    itemsCount: r.items.length,
    refundAmount: r.refundAmount,
    refundMode: "N/A", // refundMethod is not tracked natively on SalesReturn without transaction link
    status: r.refundStatus,
    approvedBy: r.approvedBy || "-"
  }))

  return {
    rows: mappedRows,
    kpis: {
      totalReturns: agg._count.id || 0,
      totalAmount: agg._sum.refundAmount || 0,
      pendingCount: pendingAgg._count.id || 0,
      pendingAmount: pendingAgg._sum.refundAmount || 0,
      returnRate: grossSales._sum.totalAmount ? ((agg._sum.refundAmount || 0) / grossSales._sum.totalAmount) * 100 : 0
    },
    page,
    totalPages,
    totalRows
  }
}
