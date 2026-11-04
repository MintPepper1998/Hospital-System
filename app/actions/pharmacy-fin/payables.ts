"use server"

import { prisma } from "@/lib/prisma"
import { AGING_BUCKETS } from "@/lib/pharmacy-finance/constants"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { supplierAllowedFor, supplierScopeFilter } from "@/lib/supplier-scope"

export async function getSupplierPayables(params: { search?: string; onlyOutstanding?: boolean } = {}) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const suppliers = await prisma.supplier.findMany({
    where: {
      ...supplierScopeFilter("PHARMACY"),
      ...(params.search ? {
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { gstNumber: { contains: params.search, mode: "insensitive" } }
      ]
      } : {})
    },
    select: { id: true, name: true, gstNumber: true, openingBalance: true, creditDays: true, scope: true }
  })

  const pharmacySuppliers = suppliers

  if (pharmacySuppliers.length === 0) return { rows: [], aging: [], totalOutstanding: 0, totalOverdue: 0 }

  const supplierIds = pharmacySuppliers.map(s => s.id)

  const [invoices, payments, returns, refunds] = await Promise.all([
    prisma.purchaseInvoice.groupBy({
      by: ["supplierId"],
      where: { supplierId: { in: supplierIds } },
      _sum: { grandTotal: true, amountPaid: true } // amountPaid is tracked on invoice usually, but we compute outstanding via payments.
    }),
    prisma.supplierPayment.groupBy({
      by: ["supplierId"],
      where: { supplierId: { in: supplierIds } },
      _sum: { amount: true }
    }),
    prisma.purchaseReturn.groupBy({
      by: ["supplierId"],
      where: { supplierId: { in: supplierIds } },
      _sum: { totalAmount: true }
    }),
    prisma.transaction.groupBy({
      by: ["referenceId"],
      where: { category: "SUPPLIER_REFUND", referenceId: { in: supplierIds } },
      _sum: { amount: true }
    })
  ])

  // Get all open invoices for aging
  const openInvoices = await prisma.purchaseInvoice.findMany({
    where: { 
      supplierId: { in: supplierIds },
      status: { not: "PAID" }
    },
    select: { supplierId: true, date: true, grandTotal: true, amountPaid: true, id: true }
  })

  // Group returns by invoice (if purchase return tracks invoiceId). Wait, purchase return might not have invoiceId?
  // Let's check PurchaseReturn schema if it has invoiceId. If not, we just subtract total returns from total due.
  
  const now = new Date()
  let totalOutstanding = 0
  let totalOverdue = 0
  const agingCounts = AGING_BUCKETS.map(b => ({ ...b, amount: 0 }))
  let notDueAmount = 0

  const rows = pharmacySuppliers.map(s => {
    const inv = invoices.find(i => i.supplierId === s.id)?._sum.grandTotal || 0
    const pay = payments.find(p => p.supplierId === s.id)?._sum.amount || 0
    const ret = returns.find(r => r.supplierId === s.id)?._sum.totalAmount || 0
    const ref = refunds.find(r => r.referenceId === s.id)?._sum.amount || 0

    // Refund given back to us reduces what they owe us (which is a negative outstanding), so it adds to outstanding
    const outstanding = (s.openingBalance || 0) + inv - pay - ret + ref
    
    // Calculate overdue from open invoices
    const sInvs = openInvoices.filter(i => i.supplierId === s.id)
    let sOverdue = 0
    let oldestDueDate: Date | null = null

    sInvs.forEach(i => {
      // Due date = invoice date + creditDays
      const dueDate = new Date(i.date.getTime() + (s.creditDays ?? 30) * 24 * 60 * 60 * 1000)
      const dueAmount = i.grandTotal - (i.amountPaid || 0) // rough invoice due
      if (dueAmount > 0) {
        if (!oldestDueDate || dueDate < oldestDueDate) oldestDueDate = dueDate
        
        const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysPastDue > 0) {
          sOverdue += dueAmount
          // Aging
          for (const bucket of agingCounts) {
            if (daysPastDue >= bucket.min && daysPastDue <= bucket.max) {
              bucket.amount += dueAmount
              break
            }
          }
        } else {
          notDueAmount += dueAmount
        }
      }
    })

    return {
      id: s.id,
      name: s.name,
      gstin: s.gstNumber,
      invoices: inv,
      paid: pay,
      returns: ret,
      refunds: ref,
      outstanding,
      overdueAmount: sOverdue,
      oldestDueDate
    }
  })

  const filteredRows = params.onlyOutstanding ? rows.filter(r => Math.abs(r.outstanding) > 0.01) : rows

  filteredRows.forEach(r => {
    totalOutstanding += r.outstanding
    totalOverdue += r.overdueAmount
  })

  return {
    rows: filteredRows,
    aging: agingCounts,
    notDueAmount,
    totalOutstanding,
    totalOverdue
  }
}

export async function getSupplierStatement(supplierId: string, range?: { from: Date; to: Date }) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, ...supplierScopeFilter("PHARMACY") },
  })
  if (!supplier) throw new Error("Supplier not found in pharmacy scope")

  const whereDate = range ? { gte: range.from, lt: range.to } : undefined

  const [invoices, payments, returns, refunds] = await Promise.all([
    prisma.purchaseInvoice.findMany({ where: { supplierId, date: whereDate } }),
    prisma.supplierPayment.findMany({ where: { supplierId, date: whereDate } }),
    prisma.purchaseReturn.findMany({ where: { supplierId, date: whereDate } }),
    prisma.transaction.findMany({ where: { category: "SUPPLIER_REFUND", referenceId: supplierId, date: whereDate } })
  ])

  const events: any[] = []

  // If no range, or if range starts from beginning, use opening balance as first row
  if (!range) {
    if (supplier.openingBalance) {
      events.push({
        id: "opening",
        date: new Date(0), // beginning of time
        type: "OPENING",
        description: "Opening Balance",
        debit: supplier.openingBalance > 0 ? supplier.openingBalance : 0,
        credit: supplier.openingBalance < 0 ? -supplier.openingBalance : 0
      })
    }
  }

  invoices.forEach(i => events.push({
    id: i.id, date: i.date, type: "INVOICE", description: `Invoice ${i.invoiceNumber}`,
    debit: i.grandTotal, credit: 0
  }))

  payments.forEach(p => events.push({
    id: p.id, date: p.date, type: "PAYMENT", description: `Payment (${p.paymentMethod})`,
    debit: 0, credit: p.amount
  }))

  returns.forEach(r => events.push({
    id: r.id, date: r.date, type: "RETURN", description: `Return ${r.returnNumber}`,
    debit: 0, credit: r.totalAmount
  }))

  refunds.forEach(r => events.push({
    id: r.id, date: r.date, type: "REFUND", description: "Supplier Refund (Cash back)",
    debit: r.amount, credit: 0
  }))

  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  let balance = 0
  const statement = events.map(e => {
    balance += (e.debit - e.credit)
    return { ...e, runningBalance: balance }
  })

  return statement
}

export async function recordSupplierRefund(data: {
  supplierId: string
  amount: number
  accountId: string
  reference?: string
  notes?: string
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    if (!data.amount || data.amount <= 0) return { success: false, message: "Amount must be > 0" }

    await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true } })
      if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) throw new Error("Supplier is not available for pharmacy refunds")
      const acc = await tx.financialAccount.findUnique({ where: { id: data.accountId } })
      if (!acc) throw new Error("Account not found")
      if (!acc.isActive) throw new Error("Account is inactive")
      if (auth.session.role === "PHARMACIST" && acc.scope !== "PHARMACY") {
        throw new Error("Pharmacist can only use PHARMACY accounts")
      }

      await tx.financialAccount.update({
        where: { id: acc.id },
        data: { currentBalance: { increment: data.amount } }
      })

      await tx.transaction.create({
        data: {
          accountId: acc.id,
          type: "INCOME",
          amount: data.amount,
          category: "SUPPLIER_REFUND",
          paymentMethod: "BANK_TRANSFER", // or cash, but keeping it generic or from input
          scope: acc.scope,
          referenceId: data.supplierId,
          description: data.notes || `Refund from supplier ${data.reference || ""}`,
          billingType: "PHARMACY"
        }
      })
    })

    return { success: true, message: "Supplier refund recorded" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
