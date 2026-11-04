"use server"

import { prisma } from "@/lib/prisma"
import { EXPENSE_HEADS } from "@/lib/pharmacy-finance/constants"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { DateRange, istDayStart } from "@/lib/pharmacy-finance/dates"
import { assertDayOpen } from "./_guards"

export async function recordPharmacyExpense(data: {
  head: string
  amount: number
  accountId: string
  paymentMethod: string
  date: string
  payee?: string
  reference?: string
  notes?: string
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    if (!EXPENSE_HEADS[data.head]) return { success: false, message: "Invalid expense head" }
    if (!data.amount || data.amount <= 0) return { success: false, message: "Amount must be > 0" }
    
    // Check if the given date is in the future
    const providedDate = new Date(data.date)
    const now = new Date()
    if (providedDate > now) return { success: false, message: "Expense date cannot be in the future" }

    await prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findUnique({ where: { id: data.accountId } })
      if (!account) throw new Error("Account not found")
      if (!account.isActive) throw new Error("Account is inactive")
      if (account.scope !== "PHARMACY") throw new Error("Must use a PHARMACY account")
      if (auth.session.role === "PHARMACIST" && account.scope !== "PHARMACY") {
        throw new Error("Pharmacist can only use PHARMACY accounts")
      }

      // Check for closed day if CASH
      await assertDayOpen(tx, account.id, providedDate)

      // Guarded decrement
      const updatedAccount = await tx.financialAccount.update({
        where: { id: account.id, currentBalance: { gte: data.amount } },
        data: { currentBalance: { decrement: data.amount } }
      })
      if (!updatedAccount) throw new Error("Insufficient balance")

      const isToday = providedDate.toDateString() === now.toDateString()
      const finalDate = isToday ? now : istDayStart(data.date)

      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "EXPENSE",
          amount: data.amount,
          category: "PHARMACY_EXPENSE",
          subCategory: data.head,
          accountGroupCode: EXPENSE_HEADS[data.head].accountGroupCode,
          paymentMethod: data.paymentMethod,
          scope: "PHARMACY",
          description: `${EXPENSE_HEADS[data.head].label} — ${data.payee || "No Payee"} — ${data.notes || ""}`.trim().replace(/ — $/, ""),
          referenceId: data.reference || null,
          date: finalDate,
        }
      })
    })

    return { success: true, message: "Expense recorded successfully" }
  } catch (err: any) {
    if (err.message?.includes("Record to update not found")) {
      return { success: false, message: "Insufficient balance for this transaction" }
    }
    return { success: false, message: err.message }
  }
}

export async function voidPharmacyExpense(transactionId: string, reason: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.findUnique({ where: { id: transactionId }, include: { account: true } })
      if (!txn) throw new Error("Transaction not found")
      if (txn.category !== "PHARMACY_EXPENSE") throw new Error("Can only void pharmacy expenses")
      if (txn.type !== "EXPENSE") throw new Error("Transaction is not an expense")

      // Check if already voided
      const existingVoid = await tx.transaction.findFirst({
        where: { referenceId: txn.id, category: "PHARMACY_EXPENSE_VOID" }
      })
      if (existingVoid) throw new Error("Expense is already voided")

      // Check closed day for CASH
      await assertDayOpen(tx, txn.accountId, txn.date)

      await tx.financialAccount.update({
        where: { id: txn.accountId },
        data: { currentBalance: { increment: txn.amount } }
      })

      await tx.transaction.create({
        data: {
          accountId: txn.accountId,
          type: "INCOME",
          amount: txn.amount,
          category: "PHARMACY_EXPENSE_VOID",
          subCategory: txn.subCategory,
          accountGroupCode: txn.accountGroupCode,
          paymentMethod: txn.paymentMethod,
          scope: "PHARMACY",
          referenceId: txn.id,
          description: `VOID: ${txn.description} - Reason: ${reason}`,
          date: new Date(),
        }
      })
    })

    return { success: true, message: "Expense voided successfully" }
  } catch (err: any) {
    return { success: false, message: err.message }
  }
}

export async function getPharmacyExpenses(params: { range: DateRange; head?: string; accountId?: string; page?: number }) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const where: any = {
    category: "PHARMACY_EXPENSE",
    date: { gte: params.range.from, lt: params.range.to },
    scope: "PHARMACY"
  }

  if (params.head && params.head !== "ALL") where.subCategory = params.head
  if (params.accountId && params.accountId !== "ALL") where.accountId = params.accountId

  const page = params.page || 1
  const PAGE_SIZE = 50

  const totalRows = await prisma.transaction.count({ where })
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)

  const rows = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    include: { account: { select: { name: true } } }
  })

  // To check void status, get the voids for these rows
  const rowIds = rows.map(r => r.id)
  const voids = await prisma.transaction.findMany({
    where: { category: "PHARMACY_EXPENSE_VOID", referenceId: { in: rowIds } },
    select: { referenceId: true }
  })
  const voidedIds = new Set(voids.map(v => v.referenceId))

  const finalRows = rows.map(r => ({
    id: r.id,
    date: r.date,
    head: r.subCategory || "Unknown",
    payee: r.description?.split(" — ")[1] || "-",
    accountName: r.account.name,
    method: r.paymentMethod,
    amount: r.amount,
    reference: r.referenceId || "-",
    notes: r.description?.split(" — ")[2] || "-",
    isVoided: voidedIds.has(r.id)
  }))

  // Get totals by head for donut chart
  const groupStats = await prisma.transaction.groupBy({
    by: ["subCategory"],
    where: { ...where, id: { notIn: Array.from(voidedIds) } },
    _sum: { amount: true }
  })

  const totalsByHead = groupStats.map(g => ({
    head: g.subCategory || "Unknown",
    label: g.subCategory ? EXPENSE_HEADS[g.subCategory]?.label || g.subCategory : "Unknown",
    amount: g._sum.amount || 0
  })).sort((a, b) => b.amount - a.amount)

  // Get MoM for 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const momStats = await prisma.transaction.groupBy({
    by: ["date"],
    where: { 
      category: "PHARMACY_EXPENSE", 
      scope: "PHARMACY",
      date: { gte: sixMonthsAgo }
      // We'd ideally exclude voided, but it's hard in groupBy without a join. 
      // Approximating or we can fetch all and group in memory since expenses per month are relatively low.
    },
    _sum: { amount: true }
  })

  // Let's fetch the actual rows to accurately exclude voided and group by month correctly in IST
  const allMomRows = await prisma.transaction.findMany({
    where: { 
      category: "PHARMACY_EXPENSE", 
      scope: "PHARMACY",
      date: { gte: sixMonthsAgo } 
    },
    select: { id: true, date: true, amount: true }
  })
  
  const allMomVoids = await prisma.transaction.findMany({
    where: { 
      category: "PHARMACY_EXPENSE_VOID", 
      scope: "PHARMACY",
      date: { gte: sixMonthsAgo } 
    },
    select: { referenceId: true }
  })
  const momVoidSet = new Set(allMomVoids.map(v => v.referenceId))

  const momMap = new Map<string, number>()
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) // e.g. Oct 26
    momMap.set(key, 0)
  }

  allMomRows.forEach(r => {
    if (momVoidSet.has(r.id)) return
    const key = r.date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    if (momMap.has(key)) {
      momMap.set(key, momMap.get(key)! + r.amount)
    }
  })

  // Reversing so it goes from oldest to newest
  const momTrend = Array.from(momMap.entries()).reverse().map(([month, amount]) => ({ month, amount }))

  return {
    rows: finalRows,
    totalsByHead,
    momTrend,
    page,
    totalPages,
    totalRows
  }
}
