"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { rangeFromStrings } from "@/lib/pharmacy-finance/dates"

export async function getDayCloseDraft(dateStr: string, accountId: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) throw new Error(auth.error)

  const account = await prisma.financialAccount.findUnique({ where: { id: accountId } })
  if (!account) throw new Error("Account not found")

  // Check if already closed
  const existingClose = await prisma.pharmacyDayClose.findUnique({
    where: { businessDate_accountId: { businessDate: dateStr, accountId } }
  })
  if (existingClose) return { isClosed: true, closeRecord: existingClose }

  const dayRange = rangeFromStrings(dateStr, dateStr)

  // We need to figure out opening cash for this day
  // closingByLedger = currentBalance - sum(transactions after dayRange.to)
  const afterDayTxns = await prisma.transaction.groupBy({
    by: ["type"],
    where: { accountId, date: { gte: dayRange.to } },
    _sum: { amount: true }
  })
  const afterIn = afterDayTxns.find(t => t.type === "INCOME")?._sum.amount || 0
  const afterOut = afterDayTxns.find(t => t.type === "EXPENSE")?._sum.amount || 0
  const afterNet = afterIn - afterOut

  const closingByLedger = account.currentBalance - afterNet

  // withinDay
  const withinDayTxnsRaw = await prisma.transaction.findMany({
    where: { accountId, date: { gte: dayRange.from, lt: dayRange.to } },
    orderBy: { date: "asc" }
  })

  let withinIn = 0
  let withinOut = 0
  let cashIn = 0
  let cashOut = 0
  let transfersIn = 0
  let transfersOut = 0

  const categories: Record<string, { in: number, out: number }> = {}

  withinDayTxnsRaw.forEach(t => {
    const isTransfer = t.category.includes("TRANSFER")
    if (t.type === "INCOME") {
      withinIn += t.amount
      if (isTransfer) transfersIn += t.amount
      else cashIn += t.amount
    } else {
      withinOut += t.amount
      if (isTransfer) transfersOut += t.amount
      else cashOut += t.amount
    }
    
    if (!categories[t.category]) categories[t.category] = { in: 0, out: 0 }
    if (t.type === "INCOME") categories[t.category].in += t.amount
    else categories[t.category].out += t.amount
  })

  const openingCash = closingByLedger - (withinIn - withinOut)
  const expectedCash = closingByLedger

  return {
    isClosed: false,
    openingCash,
    cashIn,
    cashOut,
    transfersIn,
    transfersOut,
    expectedCash,
    categories,
    transactions: withinDayTxnsRaw.map(t => ({
      id: t.id,
      date: t.date,
      category: t.category,
      description: t.description || "-",
      in: t.type === "INCOME" ? t.amount : 0,
      out: t.type === "EXPENSE" ? t.amount : 0,
    }))
  }
}

export async function closeDay(data: {
  dateStr: string
  accountId: string
  countedCash: number
  denominations?: any
  notes?: string
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error }

  // Must not be future
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  if (data.dateStr > todayStr) return { success: false, message: "Cannot close a future date" }

  try {
    await prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findUnique({ where: { id: data.accountId } })
      if (!account) throw new Error("Account not found")
      if (account.type !== "CASH") throw new Error("Can only day-close CASH accounts")

      // Check unique constraint manually
      const existing = await tx.pharmacyDayClose.findUnique({
        where: { businessDate_accountId: { businessDate: data.dateStr, accountId: data.accountId } }
      })
      if (existing) throw new Error("Day already closed")

      // Recompute the draft
      const dayRange = rangeFromStrings(data.dateStr, data.dateStr)
      const afterDayTxns = await tx.transaction.groupBy({
        by: ["type"],
        where: { accountId: data.accountId, date: { gte: dayRange.to } },
        _sum: { amount: true }
      })
      const afterIn = afterDayTxns.find(t => t.type === "INCOME")?._sum.amount || 0
      const afterOut = afterDayTxns.find(t => t.type === "EXPENSE")?._sum.amount || 0
      const afterNet = afterIn - afterOut

      const closingByLedger = account.currentBalance - afterNet

      const withinDayTxns = await tx.transaction.groupBy({
        by: ["type", "category"],
        where: { accountId: data.accountId, date: { gte: dayRange.from, lt: dayRange.to } },
        _sum: { amount: true }
      })

      let withinIn = 0
      let withinOut = 0
      let cashIn = 0
      let cashOut = 0
      let transfersIn = 0
      let transfersOut = 0

      withinDayTxns.forEach(t => {
        const amt = t._sum.amount || 0
        const isTransfer = t.category.includes("TRANSFER")
        if (t.type === "INCOME") {
          withinIn += amt
          if (isTransfer) transfersIn += amt
          else cashIn += amt
        } else {
          withinOut += amt
          if (isTransfer) transfersOut += amt
          else cashOut += amt
        }
      })

      const openingCash = closingByLedger - (withinIn - withinOut)
      const expectedCash = closingByLedger
      const counted = data.countedCash
      const variance = Math.round((counted - expectedCash) * 100) / 100

      let varianceTxnId = null

      if (Math.abs(variance) >= 0.01) {
        // Create variance transaction at the very end of the day: dayRange.to - 1ms
        const varDate = new Date(dayRange.to.getTime() - 1)
        
        if (variance > 0) {
          // Found extra money -> INCOME
          await tx.financialAccount.update({
            where: { id: account.id },
            data: { currentBalance: { increment: variance } }
          })
          const txn = await tx.transaction.create({
            data: {
              accountId: account.id,
              type: "INCOME",
              amount: variance,
              category: "CASH_VARIANCE",
              accountGroupCode: "4240",
              paymentMethod: "CASH",
              scope: "PHARMACY",
              description: `Cash variance (positive) during day close for ${data.dateStr}`,
              date: varDate
            }
          })
          varianceTxnId = txn.id
        } else {
          // Missing money -> EXPENSE
          const absVar = Math.abs(variance)
          const updated = await tx.financialAccount.update({
            where: { id: account.id, currentBalance: { gte: absVar } },
            data: { currentBalance: { decrement: absVar } }
          })
          if (!updated) throw new Error("Insufficient balance to record negative cash variance")
          const txn = await tx.transaction.create({
            data: {
              accountId: account.id,
              type: "EXPENSE",
              amount: absVar,
              category: "CASH_VARIANCE",
              accountGroupCode: "5270",
              paymentMethod: "CASH",
              scope: "PHARMACY",
              description: `Cash variance (shortage) during day close for ${data.dateStr}`,
              date: varDate
            }
          })
          varianceTxnId = txn.id
        }
      }

      await tx.pharmacyDayClose.create({
        data: {
          businessDate: data.dateStr,
          accountId: account.id,
          openingCash,
          cashIn,
          cashOut,
          transfersIn,
          transfersOut,
          expectedCash,
          countedCash: counted,
          variance,
          denominations: data.denominations || null,
          notes: data.notes || null,
          varianceTxnId,
          closedBy: auth.session.userId
        }
      })
    })

    return { success: true, message: "Day closed successfully" }
  } catch (err: any) {
    if (err.code === "P2002") return { success: false, message: "Day already closed" }
    return { success: false, message: err.message }
  }
}

export async function getRecentCloses(accountId: string) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  return prisma.pharmacyDayClose.findMany({
    where: { accountId },
    orderBy: { businessDate: "desc" },
    take: 30
  })
}
