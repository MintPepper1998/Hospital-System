"use server"

import { prisma } from "@/lib/prisma"
import { supplierScopeFilter } from "@/lib/supplier-scope"
import { requireAuth } from "@/lib/auth-guard"
import { DateRange } from "@/lib/pharmacy-finance/dates"
import { pharmacySalesWhere, cashMovementWhere } from "@/lib/pharmacy-finance/scope"
import { TRANSFER_CATEGORIES } from "@/lib/pharmacy-finance/constants"
import { getClosingStockTotal } from "@/lib/inventory-valuation"

// Helper to calculate previous range for deltas
function getPreviousRange(r: DateRange): DateRange {
  const duration = r.to.getTime() - r.from.getTime()
  const prevTo = r.from
  const prevFrom = new Date(prevTo.getTime() - duration)
  return {
    from: prevFrom,
    to: prevTo,
    fromStr: prevFrom.toISOString(),
    toStr: prevTo.toISOString()
  }
}

async function fetchMetrics(r: DateRange) {
  // Sales
  const sales = await prisma.billing.findMany({
    where: pharmacySalesWhere(r),
    select: { id: true, netAmount: true, taxAmount: true, items: { select: { costAmount: true } } }
  })
  
  let grossSales = 0
  let grossExGst = 0
  let cogs = 0
  let linesMissingCost = 0

  for (const s of sales) {
    grossSales += s.netAmount
    grossExGst += (s.netAmount - s.taxAmount)
    for (const item of s.items) {
      if (item.costAmount == null) linesMissingCost++
      else cogs += item.costAmount
    }
  }

  // Returns
  const returns = await prisma.salesReturn.findMany({
    where: { 
      refundStatus: "APPROVED", 
      createdAt: { gte: r.from, lt: r.to }
    },
    select: { refundAmount: true, originalBill: { select: { netAmount: true, taxAmount: true } } }
  })

  let returnsAmt = 0
  let returnsExGst = 0
  for (const ret of returns) {
    returnsAmt += ret.refundAmount
    const originalRatio = ret.originalBill.netAmount > 0 ? (ret.originalBill.netAmount - ret.originalBill.taxAmount) / ret.originalBill.netAmount : 0
    returnsExGst += (ret.refundAmount * originalRatio)
  }

  const netSales = grossSales - returnsAmt
  const netExGst = grossExGst - returnsExGst
  const grossProfit = netExGst - cogs

  // Cash Movement
  const cashMovs = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      ...cashMovementWhere(r),
      category: { notIn: TRANSFER_CATEGORIES }
    },
    _sum: { amount: true }
  })

  const cashIn = cashMovs.find(m => m.type === "INCOME")?._sum.amount || 0
  const cashOut = cashMovs.find(m => m.type === "EXPENSE")?._sum.amount || 0

  return { grossSales, returnsAmt, netSales, grossProfit, cashIn, cashOut, linesMissingCost }
}

export async function getPharmacyFinanceOverview(range: DateRange) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const current = await fetchMetrics(range)
  const prev = await fetchMetrics(getPreviousRange(range))

  // Position metrics (not period-based)
  const accounts = await prisma.financialAccount.aggregate({
    where: { scope: "PHARMACY", isActive: true },
    _sum: { currentBalance: true }
  })
  const cashAndBank = accounts._sum.currentBalance || 0

  // Receivable - Customers
  const custRecRaw: any[] = await prisma.$queryRaw`
    SELECT SUM("balanceAmount") as total
    FROM credit_entries
    WHERE type = 'RECEIVABLE' AND status != 'SETTLED' AND "referenceType" = 'BILLING'
      AND "referenceId" IN (SELECT id FROM billings WHERE type = 'PHARMACY')
  `
  const receivableCust = custRecRaw[0]?.total ? Number(custRecRaw[0].total) : 0

  // Receivable - Hospital (IPD)
  const ipdRec = await prisma.billing.aggregate({
    where: { type: "PHARMACY", settlementStatus: "PENDING", ipdAdmissionId: { not: null } },
    _sum: { netAmount: true }
  })
  const receivableIpd = ipdRec._sum.netAmount || 0

  // Payable - Suppliers
  // Outstanding = openingBalance + invoices - payments - returns + refunds
  const suppliers = await prisma.supplier.findMany({
    where: supplierScopeFilter("PHARMACY"),
    select: { id: true, openingBalance: true }
  })
  
  const [invoices, payments, suppReturns, refunds] = await Promise.all([
    prisma.purchaseInvoice.groupBy({ by: ["supplierId"], _sum: { grandTotal: true } }),
    prisma.supplierPayment.groupBy({ by: ["supplierId"], _sum: { amount: true } }),
    prisma.purchaseReturn.groupBy({ by: ["supplierId"], _sum: { totalAmount: true } }),
    prisma.transaction.groupBy({ 
      by: ["referenceId"], 
      where: { category: "SUPPLIER_REFUND", referenceId: { not: null } }, 
      _sum: { amount: true } 
    })
  ])

  let payableSuppliers = 0
  for (const s of suppliers) {
    const inv = invoices.find(i => i.supplierId === s.id)?._sum.grandTotal || 0
    const pay = payments.find(p => p.supplierId === s.id)?._sum.amount || 0
    const ret = suppReturns.find(r => r.supplierId === s.id)?._sum.totalAmount || 0
    const ref = refunds.find(r => r.referenceId === s.id)?._sum.amount || 0
    // SUPPLIER_REFUND adds to outstanding because it's cash given back to us, reducing overpayment
    const out = (s.openingBalance || 0) + inv - pay - ret + ref
    if (out > 0) payableSuppliers += out
  }

  // Stock
  const stockValue = await getClosingStockTotal()
  
  const ninetyDaysFromNow = new Date()
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90)
  
  const expiringBatches = await prisma.inventoryBatch.findMany({
    where: { isActive: true, quantity: { gt: 0 }, expiryDate: { lt: ninetyDaysFromNow } },
    select: { quantity: true, purchasePrice: true }
  })
  const expiringStockValue = expiringBatches.reduce((sum, b) => sum + (b.quantity * (b.purchasePrice || 0)), 0)

  // Charts
  // 1. Daily Sales vs Cash Collected
  const dailyData: { day: string, sales: number, cash: number }[] = await prisma.$queryRaw`
    WITH days AS (
      SELECT generate_series(
        ((${range.from}::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date,
        ((${range.to}::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date - 1,
        '1 day'::interval
      )::date AS day
    ),
    sales AS (
      SELECT (("billDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date AS day,
             SUM("netAmount") as sales
      FROM billings
      WHERE type = 'PHARMACY' 
        AND "billDate" >= ${range.from} 
        AND "billDate" < ${range.to}
      GROUP BY 1
    ),
    cash AS (
      SELECT ((date AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date AS day,
             SUM(amount) as cash
      FROM transactions
      WHERE scope = 'PHARMACY'
        AND date >= ${range.from}
        AND date < ${range.to}
        AND type = 'INCOME'
        AND category NOT IN ('INTERNAL_TRANSFER_IN', 'INTERNAL_TRANSFER_OUT', 'INTER_DEPT_TRANSFER_IN', 'INTER_DEPT_TRANSFER_OUT',
                             'STOCK_WRITE_OFF', 'STOCK_ADJUSTMENT_GAIN', 'PURCHASE_RETURN', 'NONCASH_REVERSAL')
      GROUP BY 1
    )
    SELECT d.day::text, 
           COALESCE(s.sales, 0)::float as sales,
           COALESCE(c.cash, 0)::float as cash
    FROM days d
    LEFT JOIN sales s ON d.day = s.day
    LEFT JOIN cash c ON d.day = c.day
    ORDER BY d.day
  `

  // 2 & 3 & 4 will need memory or DB queries
  // 4. Top 10 Medicines
  const topMedicines: any[] = await prisma.$queryRaw`
    SELECT COALESCE(m.name, bi.description) as name, 
           SUM(bi.amount) as revenue,
           SUM(bi.amount - COALESCE(bi."costAmount", 0)) as profit
    FROM billing_items bi
    JOIN billings b ON bi."billingId" = b.id
    LEFT JOIN inventory_batches ib ON bi."referenceId" = ib.id AND bi."serviceCategory" IN ('PHARMACY', 'PHARMACY_IPD', 'PHARMACY_DISCHARGE')
    LEFT JOIN medicines m ON ib."medicineId" = m.id
    WHERE b.type = 'PHARMACY' AND b."billDate" >= ${range.from} AND b."billDate" < ${range.to}
    GROUP BY 1
    ORDER BY profit DESC
    LIMIT 10
  `

  return {
    metrics: current,
    prevMetrics: prev,
    positions: { cashAndBank, receivableCust, receivableIpd, payableSuppliers, stockValue, expiringStockValue },
    charts: {
      daily: dailyData,
      topMedicines: topMedicines.map(t => ({ ...t, revenue: Number(t.revenue), profit: Number(t.profit) }))
    }
  }
}
