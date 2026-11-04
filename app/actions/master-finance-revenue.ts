"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { hospitalBillingWhere } from "@/lib/finance-scope"

// ═══════════════════════════════════════════════════════════════════
// 3A. BILLING DASHBOARD — Unified billing overview
// ═══════════════════════════════════════════════════════════════════

export async function getBillingDashboard() {
  // Summary stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  // Today's billing
  const todayBills = await prisma.billing.aggregate({
    where: hospitalBillingWhere({ billDate: { gte: today, lt: tomorrow } }),
    _sum: { netAmount: true, paidAmount: true },
    _count: true,
  })

  // Month's billing
  const monthBills = await prisma.billing.aggregate({
    where: hospitalBillingWhere({ billDate: { gte: startOfMonth, lt: tomorrow } }),
    _sum: { netAmount: true, paidAmount: true },
    _count: true,
  })

  // Bills by status
  const statusCounts = await prisma.billing.groupBy({
    by: ["status"],
    _count: true,
    _sum: { netAmount: true },
  })

  // Bills by type (OPD, IPD, etc.)
  const typeCounts = await prisma.billing.groupBy({
    by: ["type"],
    where: hospitalBillingWhere({ billDate: { gte: startOfMonth } }),
    _count: true,
    _sum: { netAmount: true, paidAmount: true },
  })

  // Outstanding (PENDING + PARTIALLY_PAID)
  const outstanding = await prisma.billing.aggregate({
    where: hospitalBillingWhere({ status: { in: ["PENDING", "PARTIALLY_PAID"] } }),
    _sum: { balanceAmount: true },
    _count: true,
  })

  return {
    today: {
      count: todayBills._count,
      totalAmount: todayBills._sum.netAmount || 0,
      collected: todayBills._sum.paidAmount || 0,
    },
    month: {
      count: monthBills._count,
      totalAmount: monthBills._sum.netAmount || 0,
      collected: monthBills._sum.paidAmount || 0,
    },
    statusCounts: statusCounts.map((s) => ({
      status: s.status,
      count: s._count,
      amount: s._sum.netAmount || 0,
    })),
    typeCounts: typeCounts.map((t) => ({
      type: t.type,
      count: t._count,
      amount: t._sum.netAmount || 0,
      collected: t._sum.paidAmount || 0,
    })),
    outstanding: {
      count: outstanding._count,
      amount: outstanding._sum.balanceAmount || 0,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3B. INVOICE SEARCH — Unified invoice registry
// ═══════════════════════════════════════════════════════════════════

export async function searchInvoices(params: {
  from?: string
  to?: string
  type?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const page = params.page || 1
  const limit = params.limit || 25
  const skip = (page - 1) * limit

  const where: any = hospitalBillingWhere()

  if (params.from) where.billDate = { ...(where.billDate || {}), gte: new Date(params.from) }
  if (params.to) {
    const toDate = new Date(params.to)
    toDate.setHours(23, 59, 59, 999)
    where.billDate = { ...(where.billDate || {}), lte: toDate }
  }
  if (params.type && params.type !== "PHARMACY") where.type = params.type
  if (params.status) where.status = params.status
  if (params.search) {
    where.OR = [
      { billNumber: { contains: params.search, mode: "insensitive" } },
      { patient: { user: { name: { contains: params.search, mode: "insensitive" } } } },
      { patient: { phone: { contains: params.search } } },
    ]
  }

  const [invoices, total] = await Promise.all([
    prisma.billing.findMany({
      where,
      include: {
        patient: { select: { id: true, patientId: true, phone: true, user: { select: { name: true } } } },
        payments: { select: { id: true, amount: true, method: true, paymentDate: true } },
      },
      orderBy: { billDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.billing.count({ where }),
  ])

  const formattedInvoices = invoices.map(inv => ({
    ...inv,
    patient: {
      id: inv.patient.id,
      name: inv.patient.user?.name || "Unknown",
      phone: inv.patient.phone,
      uhid: inv.patient.patientId,
    }
  }))

  return { invoices: formattedInvoices, total, page, totalPages: Math.ceil(total / limit) }
}

// ═══════════════════════════════════════════════════════════════════
// 3C. PAYMENT COLLECTION — Record payment against a bill
// ═══════════════════════════════════════════════════════════════════

export async function recordPayment(data: {
  billingId: string
  amount: number
  method: string
  reference?: string
  notes?: string
}) {
  const session = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!session.ok) throw new Error(session.error)

  const billing = await prisma.billing.findUnique({ where: { id: data.billingId } })
  if (!billing) throw new Error("Bill not found")
  if (billing.type === "PHARMACY") throw new Error("Pharmacy bills must be collected in Pharmacy Finance")
  if (billing.status === "CANCELLED" || billing.status === "REFUNDED") {
    throw new Error("Cannot collect payment on a cancelled/refunded bill")
  }

  const newPaid = billing.paidAmount + data.amount
  const newBalance = billing.netAmount - newPaid
  const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIALLY_PAID"

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        billingId: data.billingId,
        amount: data.amount,
        method: data.method as any,
        reference: data.reference,
        notes: data.notes,
        recordedBy: session.session.email || "system",
      },
    }),
    prisma.billing.update({
      where: { id: data.billingId },
      data: {
        paidAmount: newPaid,
        balanceAmount: Math.max(0, newBalance),
        status: newStatus,
      },
    }),
  ])

  return { success: true, newBalance: Math.max(0, newBalance), newStatus }
}

// ═══════════════════════════════════════════════════════════════════
// 3D. REFUNDS
// ═══════════════════════════════════════════════════════════════════

export async function processRefund(data: {
  billingId: string
  amount: number
  reason: string
  method: string
}) {
  const session = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!session.ok) throw new Error(session.error)

  const billing = await prisma.billing.findUnique({ where: { id: data.billingId } })
  if (!billing) throw new Error("Bill not found")
  if (billing.type === "PHARMACY") throw new Error("Pharmacy bills must be refunded in Pharmacy Finance")
  if (data.amount > billing.paidAmount) throw new Error("Refund cannot exceed paid amount")

  const newPaid = billing.paidAmount - data.amount
  const newBalance = billing.netAmount - newPaid

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        billingId: data.billingId,
        amount: -data.amount, // negative = refund
        method: data.method as any,
        notes: `REFUND: ${data.reason}`,
        recordedBy: session.session.email || "system",
      },
    }),
    prisma.billing.update({
      where: { id: data.billingId },
      data: {
        paidAmount: newPaid,
        balanceAmount: newBalance,
        status: newPaid <= 0 ? "REFUNDED" : "PARTIALLY_PAID",
      },
    }),
  ])

  return { success: true }
}

export async function getRefunds(params: { from?: string; to?: string; limit?: number }) {
  const where: any = { amount: { lt: 0 }, billing: hospitalBillingWhere() } // negative amounts = refunds
  if (params.from) where.paymentDate = { ...(where.paymentDate || {}), gte: new Date(params.from) }
  if (params.to) {
    const toDate = new Date(params.to)
    toDate.setHours(23, 59, 59, 999)
    where.paymentDate = { ...(where.paymentDate || {}), lte: toDate }
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      billing: {
        select: { billNumber: true, type: true, patient: { select: { patientId: true, user: { select: { name: true } } } } },
      },
    },
    orderBy: { paymentDate: "desc" },
    take: params.limit || 50,
  })

  return payments.map(p => ({
    ...p,
    billing: p.billing ? {
      billNumber: p.billing.billNumber,
      type: p.billing.type,
      patient: {
        name: p.billing.patient?.user?.name || "Unknown",
        uhid: p.billing.patient?.patientId || "",
      },
    } : null,
  }))
}

// ═══════════════════════════════════════════════════════════════════
// 3E. REVENUE ANALYSIS
// ═══════════════════════════════════════════════════════════════════

export async function getRevenueAnalysis(params: { from: string; to: string }) {
  const startDate = new Date(params.from)
  const endDate = new Date(params.to)
  endDate.setHours(23, 59, 59, 999)

  // By department/type
  const byType = await prisma.billing.groupBy({
    by: ["type"],
    where: hospitalBillingWhere({ billDate: { gte: startDate, lte: endDate }, status: { not: "CANCELLED" } }),
    _sum: { netAmount: true, paidAmount: true, discountAmount: true },
    _count: true,
  })

  // By payment method
  const byPaymentMethod = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      paymentDate: { gte: startDate, lte: endDate },
      amount: { gt: 0 },
      billing: hospitalBillingWhere(),
    },
    _sum: { amount: true },
    _count: true,
  })

  // Daily revenue trend
  const dailyBills = await prisma.billing.findMany({
    where: hospitalBillingWhere({ billDate: { gte: startDate, lte: endDate }, status: { not: "CANCELLED" } }),
    select: { billDate: true, netAmount: true, type: true },
    orderBy: { billDate: "asc" },
  })

  // Build daily aggregation
  const dailyMap = new Map<string, { date: string; amount: number; count: number }>()
  for (const bill of dailyBills) {
    const key = bill.billDate.toISOString().split("T")[0]
    const existing = dailyMap.get(key) || { date: key, amount: 0, count: 0 }
    existing.amount += bill.netAmount
    existing.count++
    dailyMap.set(key, existing)
  }

  return {
    byType: byType.map((t) => ({
      type: t.type,
      count: t._count,
      revenue: t._sum.netAmount || 0,
      collected: t._sum.paidAmount || 0,
      discount: t._sum.discountAmount || 0,
    })),
    byPaymentMethod: byPaymentMethod.map((p) => ({
      method: p.method,
      count: p._count,
      amount: p._sum.amount || 0,
    })),
    dailyTrend: Array.from(dailyMap.values()),
    totalRevenue: byType.reduce((s, t) => s + (t._sum.netAmount || 0), 0),
    totalCollected: byType.reduce((s, t) => s + (t._sum.paidAmount || 0), 0),
    totalDiscount: byType.reduce((s, t) => s + (t._sum.discountAmount || 0), 0),
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4A. PATIENT DUES
// ═══════════════════════════════════════════════════════════════════

export async function getPatientDues(params: { search?: string; limit?: number }) {
  const where: any = hospitalBillingWhere({
    status: { in: ["PENDING", "PARTIALLY_PAID"] },
    balanceAmount: { gt: 0 },
  })

  if (params.search) {
    where.OR = [
      { patient: { user: { name: { contains: params.search, mode: "insensitive" } } } },
      { patient: { phone: { contains: params.search } } },
      { billNumber: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const bills = await prisma.billing.findMany({
    where,
    include: {
      patient: { select: { id: true, patientId: true, phone: true, user: { select: { name: true } } } },
    },
    orderBy: { billDate: "asc" },
    take: params.limit || 100,
  })

  // Aggregate by patient
  const patientMap = new Map<string, {
    patientId: string
    patientName: string
    uhid: string
    phone: string | null
    totalDue: number
    billCount: number
    oldestBillDate: Date
    bills: any[]
  }>()

  for (const bill of bills) {
    const pid = bill.patientId
    const existing = patientMap.get(pid) || {
      patientId: pid,
      patientName: bill.patient.user?.name || "Unknown",
      uhid: bill.patient.patientId || "",
      phone: bill.patient.phone,
      totalDue: 0,
      billCount: 0,
      oldestBillDate: bill.billDate,
      bills: [],
    }
    existing.totalDue += bill.balanceAmount
    existing.billCount++
    if (bill.billDate < existing.oldestBillDate) existing.oldestBillDate = bill.billDate
    existing.bills.push(bill)
    patientMap.set(pid, existing)
  }

  const patients = Array.from(patientMap.values()).sort((a, b) => b.totalDue - a.totalDue)
  const totalOutstanding = patients.reduce((s, p) => s + p.totalDue, 0)

  return { patients, totalOutstanding, totalPatients: patients.length }
}

// ═══════════════════════════════════════════════════════════════════
// 4B. INSURANCE RECEIVABLES
// ═══════════════════════════════════════════════════════════════════

export async function getInsuranceReceivables(params: { status?: string; schemeType?: string }) {
  const where: any = {}
  if (params.status) where.status = params.status
  if (params.schemeType) where.policy = { schemeType: params.schemeType }

  const rawClaims = await prisma.insuranceClaim.findMany({
    where: { ...where, billing: hospitalBillingWhere() },
    include: {
      policy: {
        select: {
          schemeType: true,
          providerName: true,
          tpaName: true,
          patient: { select: { patientId: true, phone: true, user: { select: { name: true } } } },
        },
      },
      billing: { select: { billNumber: true, netAmount: true, type: true } },
    },
    orderBy: { claimDate: "desc" },
    take: 100,
  })

  const claims = rawClaims.map(c => ({
    ...c,
    policy: {
      ...c.policy,
      patient: {
        name: c.policy.patient?.user?.name || "Unknown",
        uhid: c.policy.patient?.patientId || "",
      },
    },
  }))

  // Summary
  const summary = await prisma.insuranceClaim.groupBy({
    by: ["status"],
    _sum: { claimAmount: true, approvedAmount: true, settledAmount: true },
    _count: true,
  })

  const totalPending = summary
    .filter((s) => !["SETTLED", "REJECTED"].includes(s.status))
    .reduce((sum, s) => sum + (s._sum.claimAmount || 0), 0)

  return { claims, summary, totalPending }
}

// ═══════════════════════════════════════════════════════════════════
// 4C. GOVERNMENT CLAIMS (BSKY + PMJAY)
// ═══════════════════════════════════════════════════════════════════

export async function getGovtClaims(params: { scheme?: string; status?: string }) {
  const where: any = {
    policy: { schemeType: { in: ["BSKY", "PMJAY"] } },
  }
  if (params.scheme) where.policy = { schemeType: params.scheme }
  if (params.status) where.status = params.status

  const rawClaims = await prisma.insuranceClaim.findMany({
    where: { ...where, billing: hospitalBillingWhere() },
    include: {
      policy: {
        select: {
          schemeType: true,
          providerName: true,
          patient: { select: { patientId: true, phone: true, user: { select: { name: true } } } },
        },
      },
      billing: { select: { billNumber: true, netAmount: true, type: true } },
    },
    orderBy: { claimDate: "desc" },
    take: 100,
  })

  const claims = rawClaims.map(c => ({
    ...c,
    policy: {
      ...c.policy,
      patient: {
        name: c.policy.patient?.user?.name || "Unknown",
        uhid: c.policy.patient?.patientId || "",
        phone: c.policy.patient?.phone || null,
      },
    },
  }))

  // Summary by scheme
  const summary = await prisma.insuranceClaim.groupBy({
    by: ["status"],
    where: { policy: { schemeType: { in: (params.scheme ? [params.scheme] : ["BSKY", "PMJAY"]) as any } }, billing: hospitalBillingWhere() },
    _sum: { claimAmount: true, settledAmount: true },
    _count: true,
  })

  return { claims, summary }
}

// ═══════════════════════════════════════════════════════════════════
// 4D. AR AGING REPORT
// ═══════════════════════════════════════════════════════════════════

export async function getARAgingReport() {
  const now = new Date()
  const bills = await prisma.billing.findMany({
    where: hospitalBillingWhere({
      status: { in: ["PENDING", "PARTIALLY_PAID"] },
      balanceAmount: { gt: 0 },
    }),
    include: {
      patient: { select: { patientId: true, user: { select: { name: true } } } },
    },
    orderBy: { billDate: "asc" },
  })

  const buckets = {
    current: { count: 0, amount: 0, bills: [] as any[] },   // 0-30
    days31_60: { count: 0, amount: 0, bills: [] as any[] },
    days61_90: { count: 0, amount: 0, bills: [] as any[] },
    over90: { count: 0, amount: 0, bills: [] as any[] },
  }

  for (const bill of bills) {
    const daysPastDue = Math.floor((now.getTime() - bill.billDate.getTime()) / (1000 * 60 * 60 * 24))
    const entry = {
      id: bill.id,
      billNumber: bill.billNumber,
      patientName: bill.patient.user?.name || "Unknown",
      uhid: bill.patient.patientId,
      type: bill.type,
      billDate: bill.billDate,
      netAmount: bill.netAmount,
      balance: bill.balanceAmount,
      daysPastDue,
    }

    if (daysPastDue <= 30) {
      buckets.current.count++
      buckets.current.amount += bill.balanceAmount
      buckets.current.bills.push(entry)
    } else if (daysPastDue <= 60) {
      buckets.days31_60.count++
      buckets.days31_60.amount += bill.balanceAmount
      buckets.days31_60.bills.push(entry)
    } else if (daysPastDue <= 90) {
      buckets.days61_90.count++
      buckets.days61_90.amount += bill.balanceAmount
      buckets.days61_90.bills.push(entry)
    } else {
      buckets.over90.count++
      buckets.over90.amount += bill.balanceAmount
      buckets.over90.bills.push(entry)
    }
  }

  const totalOutstanding = Object.values(buckets).reduce((s, b) => s + b.amount, 0)
  const totalBills = Object.values(buckets).reduce((s, b) => s + b.count, 0)

  return { buckets, totalOutstanding, totalBills }
}
