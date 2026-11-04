"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { DateRange } from "@/lib/pharmacy-finance/dates"
import { supplierScopeFilter } from "@/lib/supplier-scope"

export type PurchaseRegisterParams = {
  range: DateRange
  supplierId?: string
  status?: string
  page?: number
}

const PAGE_SIZE = 50

export async function getPurchaseRegister(params: PurchaseRegisterParams) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const where: any = {
    date: { gte: params.range.from, lt: params.range.to },
    supplier: supplierScopeFilter("PHARMACY")
  }

  if (params.supplierId && params.supplierId !== "ALL") {
    where.supplierId = params.supplierId
  }

  if (params.status && params.status !== "ALL") {
    // We compute OVERDUE dynamically, but for simple status filtering we can just map it loosely 
    // or fetch more and filter in memory if "OVERDUE" is requested.
    // For now, if "OVERDUE" is asked, we ignore DB status and just get UNPAID/PARTIAL
    if (params.status === "OVERDUE") {
      where.status = { in: ["UNPAID", "PARTIALLY_PAID", "PENDING"] }
    } else {
      where.status = params.status
    }
  }

  const totalRows = await prisma.purchaseInvoice.count({ where })
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const page = params.page || 1

  const invoices = await prisma.purchaseInvoice.findMany({
    where,
    orderBy: { date: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    include: {
      supplier: { select: { name: true, gstNumber: true, creditDays: true } },
      items: true
    }
  })

  // To compute returns per invoice accurately we would need relations, 
  // but if PurchaseReturn lacks invoiceId, we will just say returns=0 here or skip it.
  // Actually, let's see if purchaseReturns has invoiceId. Assuming it does, or we skip it for now 
  // since the master plan focuses on supplier level returns for payables.
  // For the register we might just show amountPaid and Due.

  // Also get aggregate totals for footer & GST
  const aggs = await prisma.purchaseInvoice.aggregate({
    where,
    _sum: {
      subTotal: true,
      discountAmount: true,
      taxTotal: true,
      roundOff: true,
      grandTotal: true,
      amountPaid: true,
    }
  })

  // Group GST by taxPercent for the summary card.
  // We have to query PurchaseItems that belong to these invoices.
  const allItemsForGst = await prisma.purchaseItem.findMany({
    where: { invoice: where },
    select: { taxPercent: true, totalAmount: true, rate: true, quantity: true, discountPercent: true }
  })
  
  const gstSummaryMap = new Map<number, { taxable: number; gst: number }>()
  allItemsForGst.forEach(item => {
    const rate = item.taxPercent || 0
    if (!gstSummaryMap.has(rate)) gstSummaryMap.set(rate, { taxable: 0, gst: 0 })
    const acc = gstSummaryMap.get(rate)!
    const gross = item.quantity * item.rate
    const taxable = gross - (gross * (item.discountPercent / 100))
    const taxAmount = item.totalAmount - taxable
    acc.taxable += taxable || 0
    acc.gst += taxAmount || 0
  })
  const gstSummary = Array.from(gstSummaryMap.entries()).map(([rate, vals]) => ({
    rate, taxable: vals.taxable, gst: vals.gst
  })).sort((a, b) => a.rate - b.rate)

  const now = new Date()

  const rows = invoices.map(i => {
    const dueDate = new Date(i.date.getTime() + (i.supplier.creditDays ?? 30) * 24 * 60 * 60 * 1000)
    const dueAmount = i.grandTotal - (i.amountPaid || 0)
    let computedStatus = i.status as string
    
    if (dueAmount > 0.01) {
      if (now > dueDate) {
        computedStatus = "OVERDUE"
      } else if ((i.amountPaid || 0) > 0.01) {
        computedStatus = "PARTIAL"
      } else {
        computedStatus = "UNPAID"
      }
    } else {
      computedStatus = "PAID"
    }

    // Filter out if status=OVERDUE but it's not overdue
    if (params.status === "OVERDUE" && computedStatus !== "OVERDUE") {
      return null
    }

    return {
      id: i.id,
      date: i.date,
      invoiceNumber: i.invoiceNumber,
      supplierName: i.supplier.name,
      gstin: i.supplier.gstNumber,
      taxable: i.subTotal - (i.discountAmount || 0),
      gst: i.taxTotal,
      roundOff: i.roundOff,
      grandTotal: i.grandTotal,
      paid: i.amountPaid || 0,
      due: dueAmount,
      dueDate,
      status: computedStatus,
      itemsCount: i.items.length,
      items: i.items.map(it => ({
        id: it.id,
        name: it.itemName || "Item",
        batch: it.batchNumber,
        expiry: it.expiryDate,
        qty: it.quantity,
        free: it.freeQuantity,
        rate: it.rate,
        discPct: it.discountPercent,
        gstPct: it.taxPercent,
        total: it.totalAmount
      }))
    }
  }).filter(Boolean)

  return {
    rows,
    totals: {
      taxable: (aggs?._sum?.subTotal || 0) - (aggs?._sum?.discountAmount || 0),
      gst: aggs?._sum?.taxTotal || 0,
      roundOff: aggs?._sum?.roundOff || 0,
      grandTotal: aggs?._sum?.grandTotal || 0,
      paid: aggs?._sum?.amountPaid || 0,
      due: (aggs?._sum?.grandTotal || 0) - (aggs?._sum?.amountPaid || 0),
    },
    gstSummary,
    page,
    totalPages,
    totalRows
  }
}
