"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { DateRange } from "@/lib/pharmacy-finance/dates"

export async function getPharmacyPnL(range: DateRange) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])

  // Sales
  const salesAgg = await prisma.billing.aggregate({
    where: { type: "PHARMACY", status: "PAID", createdAt: { gte: range.from, lt: range.to } },
    _sum: { netAmount: true, taxAmount: true }
  })
  
  const grossSales = salesAgg._sum.netAmount || 0
  const outputGst = salesAgg._sum.taxAmount || 0
  const salesExGst = grossSales - outputGst

  // Cost of Goods Sold on sales
  const cogsAgg = await prisma.billingItem.aggregate({
    where: { 
      billing: { type: "PHARMACY", status: "PAID", createdAt: { gte: range.from, lt: range.to } }
    },
    _sum: { costAmount: true }
  })
  const cogsOnSales = cogsAgg._sum.costAmount || 0

  // Returns
  const returnsAgg = await prisma.salesReturn.aggregate({
    where: { type: "PHARMACY", createdAt: { gte: range.from, lt: range.to } },
    _sum: { refundAmount: true }
  })

  let salesReturnsExGst = 0
  let costRecoveredOnReturns = 0

  const totalRefunds = returnsAgg._sum.refundAmount || 0
  if (totalRefunds > 0) {
    const cogsRatio = grossSales > 0 ? (cogsOnSales / grossSales) : 0
    const exGstRatio = grossSales > 0 ? (salesExGst / grossSales) : 1
    
    salesReturnsExGst = totalRefunds * exGstRatio
    costRecoveredOnReturns = totalRefunds * cogsRatio
  }

  const netRevenue = salesExGst - salesReturnsExGst
  const netCogs = cogsOnSales - costRecoveredOnReturns
  const grossProfit = netRevenue - netCogs

  // Operating Expenses
  const opexRaw = await prisma.transaction.groupBy({
    by: ["category"],
    where: { scope: "PHARMACY", type: "EXPENSE", date: { gte: range.from, lt: range.to } },
    _sum: { amount: true }
  })

  const opexCategories: Record<string, number> = {}
  let totalOpex = 0

  opexRaw.forEach(t => {
    if (t.category.includes("TRANSFER") || t.category === "SUPPLIER_PAYMENT" || t.category === "CUSTOMER_REFUND") return
    const amt = t._sum.amount || 0
    opexCategories[t.category] = amt
    totalOpex += amt
  })

  // Also subtract positive cash variance (Income) from Opex, effectively reducing expenses or adding to Other Income
  const otherIncomeRaw = await prisma.transaction.groupBy({
    by: ["category"],
    where: { scope: "PHARMACY", type: "INCOME", date: { gte: range.from, lt: range.to } },
    _sum: { amount: true }
  })

  let otherIncome = 0
  const otherIncomeCategories: Record<string, number> = {}
  otherIncomeRaw.forEach(t => {
    if (t.category === "CASH_VARIANCE" || t.category === "PHARMACY_EXPENSE_VOID") {
      const amt = t._sum.amount || 0
      otherIncomeCategories[t.category] = amt
      otherIncome += amt
    }
  })

  const netProfit = grossProfit - totalOpex + otherIncome

  return {
    revenue: { grossSales, outputGst, salesExGst, salesReturnsExGst, netRevenue },
    cogs: { cogsOnSales, costRecoveredOnReturns, netCogs },
    grossProfit,
    opex: opexCategories,
    totalOpex,
    otherIncome: otherIncomeCategories,
    totalOtherIncome: otherIncome,
    netProfit
  }
}
