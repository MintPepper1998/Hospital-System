"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { DateRange } from "@/lib/pharmacy-finance/dates"
import { pharmacySalesWhere, saleChannel } from "@/lib/pharmacy-finance/scope"
import { Prisma } from "@prisma/client"

export type SalesRegisterParams = {
  range: DateRange
  channel?: string
  paymentMethod?: string
  status?: string
  search?: string
  page?: number
}

const PAGE_SIZE = 50

function buildWhere(p: SalesRegisterParams): Prisma.BillingWhereInput {
  const where: Prisma.BillingWhereInput = pharmacySalesWhere(p.range)
  
  if (p.paymentMethod) {
    if (p.paymentMethod === "SPLIT") {
      where.paymentMethod = "SPLIT"
    } else {
      where.paymentMethod = p.paymentMethod as any
    }
  }

  if (p.status) {
    where.status = p.status as any
  }

  if (p.search) {
    where.OR = [
      { billNumber: { contains: p.search, mode: "insensitive" } },
      { pharmacyCustomer: { name: { contains: p.search, mode: "insensitive" } } },
      { pharmacyCustomer: { phone: { contains: p.search, mode: "insensitive" } } },
      { patient: { user: { name: { contains: p.search, mode: "insensitive" } } } },
      { patient: { patientId: { contains: p.search, mode: "insensitive" } } },
      { patient: { phone: { contains: p.search, mode: "insensitive" } } },
    ]
  }

  if (p.channel) {
    switch (p.channel) {
      case "IPD":
        where.ipdAdmissionId = { not: null }
        break
      case "EMERGENCY":
        where.ipdAdmissionId = null
        where.emergencyVisitId = { not: null }
        break
      case "CASUALTY":
        where.ipdAdmissionId = null
        where.emergencyVisitId = null
        where.casualtyVisitId = { not: null }
        break
      case "CREDIT":
        // This checks if the paymentMethod is CREDIT.
        // For a more accurate check as per scope.ts, we'd need to check if a CreditEntry exists.
        where.paymentMethod = "CREDIT"
        break
      case "OPD":
        where.ipdAdmissionId = null
        where.emergencyVisitId = null
        where.casualtyVisitId = null
        where.appointmentId = { not: null }
        break
      case "OTC":
        where.ipdAdmissionId = null
        where.emergencyVisitId = null
        where.casualtyVisitId = null
        where.appointmentId = null
        where.paymentMethod = { not: "CREDIT" }
        break
    }
  }

  return where
}

export async function getSalesRegister(params: SalesRegisterParams) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const where = buildWhere(params)
  
  const totalRows = await prisma.billing.count({ where })
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const page = params.page || 1

  const rows = await prisma.billing.findMany({
    where,
    orderBy: { billDate: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    include: {
      patient: { select: { user: { select: { name: true } } } },
      pharmacyCustomer: { select: { name: true, phone: true } },
      items: { select: { quantity: true, unitCost: true, costAmount: true, description: true, unitPrice: true, gstAmount: true, totalAmount: true } }
    }
  })

  // To get total cost for the filter, we need to join items.
  const costAgg = await prisma.billingItem.aggregate({
    where: { billing: where },
    _sum: { costAmount: true }
  })

  // Totals for the whole filter
  const agg = await prisma.billing.aggregate({
    where,
    _sum: { netAmount: true, taxAmount: true, discountAmount: true, totalAmount: true }
  })

  const billIds = rows.map(r => r.id)
  const creditEntries = await prisma.creditEntry.findMany({
    where: { referenceType: "BILLING", referenceId: { in: billIds } },
    select: { referenceId: true }
  })
  const creditSet = new Set(creditEntries.map(c => c.referenceId))

  const mappedRows = rows.map(r => {
    let cost = 0
    r.items.forEach(i => cost += (i.costAmount || 0))
    const isCredit = creditSet.has(r.id) || r.paymentMethod === "CREDIT"
    const channel = saleChannel({
      ipdAdmissionId: r.ipdAdmissionId,
      emergencyVisitId: r.emergencyVisitId,
      casualtyVisitId: r.casualtyVisitId,
      appointmentId: r.appointmentId,
      isCredit
    })

    return {
      id: r.id,
      billDate: r.billDate,
      billNumber: r.billNumber,
      patientName: r.pharmacyCustomer?.name || r.patient?.user?.name || "Walk-in",
      channel,
      itemsCount: r.items.length,
      gross: r.totalAmount,
      discount: r.discountAmount,
      gst: r.taxAmount,
      net: r.netAmount,
      cost,
      profit: (r.netAmount - r.taxAmount) - cost,
      marginPct: r.netAmount > 0 ? (((r.netAmount - r.taxAmount) - cost) / r.netAmount) * 100 : 0,
      paymentMethod: r.paymentMethod,
      status: r.status,
      settlementStatus: r.settlementStatus,
      items: r.items
    }
  })

  return {
    rows: mappedRows,
    totals: {
      gross: agg._sum.totalAmount || 0,
      discount: agg._sum.discountAmount || 0,
      gst: agg._sum.taxAmount || 0,
      net: agg._sum.netAmount || 0,
      cost: costAgg._sum.costAmount || 0,
      profit: (agg._sum.netAmount || 0) - (agg._sum.taxAmount || 0) - (costAgg._sum.costAmount || 0)
    },
    page,
    totalPages,
    totalRows
  }
}

export async function exportSalesRegister(params: Omit<SalesRegisterParams, "page">) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const where = buildWhere(params)
  const rows = await prisma.billing.findMany({
    where,
    orderBy: { billDate: "desc" },
    take: 20000,
    include: {
      patient: { select: { user: { select: { name: true } } } },
      pharmacyCustomer: { select: { name: true } },
      items: { select: { costAmount: true } }
    }
  })

  return {
    success: true,
    data: rows.map(r => {
      let cost = 0
      r.items.forEach(i => cost += (i.costAmount || 0))
      return {
        "Bill Date": r.billDate.toISOString(),
        "Bill No": r.billNumber,
        "Patient": r.pharmacyCustomer?.name || r.patient?.user?.name || "Walk-in",
        "Net Amount": r.netAmount,
        "Cost": cost,
        "Profit": (r.netAmount - r.taxAmount) - cost,
        "Status": r.status
      }
    })
  }
}
