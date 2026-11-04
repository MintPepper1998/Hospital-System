"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { rangeFromStrings } from "@/lib/pharmacy-finance/dates"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"
import { hospitalAccountWhere } from "@/lib/finance-scope"

export async function getHospitalCashAccounts() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return { success: false as const, message: auth.error, data: [] }

  const accounts = await prisma.financialAccount.findMany({
    where: hospitalAccountWhere({ type: "CASH", isActive: true }),
    select: {
      id: true,
      name: true,
      type: true,
      currentBalance: true,
      openingBalance: true,
    },
    orderBy: { name: "asc" },
  })

  return { success: true as const, data: accounts }
}

export async function getHospitalDayCloseDraft(dateStr: string, accountId: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) throw new Error(auth.error)

  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
  })
  if (!account || account.scope !== "HOSPITAL") {
    throw new Error("Hospital account not found")
  }

  // Check if already closed
  const existingClose = await prisma.hospitalDayClose.findUnique({
    where: { businessDate_accountId: { businessDate: dateStr, accountId } },
  })
  if (existingClose) {
    return { isClosed: true, closeRecord: existingClose }
  }

  const dayRange = rangeFromStrings(dateStr, dateStr)

  // Determine closing balance as of the end of this date
  const afterDayTxns = await prisma.transaction.groupBy({
    by: ["type"],
    where: { accountId, date: { gte: dayRange.to } },
    _sum: { amount: true },
  })
  const afterIn = afterDayTxns.find((t) => t.type === "INCOME")?._sum.amount || 0
  const afterOut = afterDayTxns.find((t) => t.type === "EXPENSE")?._sum.amount || 0
  const afterNet = afterIn - afterOut

  const closingByLedger = account.currentBalance - afterNet

  // Transactions within this business date
  const withinDayTxnsRaw = await prisma.transaction.findMany({
    where: { accountId, date: { gte: dayRange.from, lt: dayRange.to } },
    orderBy: { date: "asc" },
  })

  let withinIn = 0
  let withinOut = 0
  let cashIn = 0
  let cashOut = 0
  let transfersIn = 0
  let transfersOut = 0

  const categories: Record<string, { in: number; out: number }> = {}

  withinDayTxnsRaw.forEach((t) => {
    const isTransfer = t.category.toUpperCase().includes("TRANSFER")
    if (t.type === "INCOME") {
      withinIn += t.amount
      if (isTransfer) transfersIn += t.amount
      else cashIn += t.amount
    } else {
      withinOut += t.amount
      if (isTransfer) transfersOut += t.amount
      else cashOut += t.amount
    }

    const catKey = t.category || "General"
    if (!categories[catKey]) categories[catKey] = { in: 0, out: 0 }
    if (t.type === "INCOME") categories[catKey].in += t.amount
    else categories[catKey].out += t.amount
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
    transactions: withinDayTxnsRaw.map((t) => ({
      id: t.id,
      date: t.date,
      category: t.category,
      description: t.description || "-",
      in: t.type === "INCOME" ? t.amount : 0,
      out: t.type === "EXPENSE" ? t.amount : 0,
    })),
  }
}

export async function closeHospitalDay(data: {
  dateStr: string
  accountId: string
  countedCash: number
  denominations?: any
  notes?: string
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  if (data.dateStr > todayStr) {
    return { success: false, message: "Cannot close a future date" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findUnique({
        where: { id: data.accountId },
      })
      if (!account || account.scope !== "HOSPITAL") {
        throw new Error("Hospital cash account not found")
      }

      // Check unique constraint manually
      const existing = await tx.hospitalDayClose.findUnique({
        where: { businessDate_accountId: { businessDate: data.dateStr, accountId: data.accountId } },
      })
      if (existing) throw new Error("This day has already been closed for this account")

      // Recompute the draft values inside transaction for consistency
      const dayRange = rangeFromStrings(data.dateStr, data.dateStr)
      const afterDayTxns = await tx.transaction.groupBy({
        by: ["type"],
        where: { accountId: data.accountId, date: { gte: dayRange.to } },
        _sum: { amount: true },
      })
      const afterIn = afterDayTxns.find((t) => t.type === "INCOME")?._sum.amount || 0
      const afterOut = afterDayTxns.find((t) => t.type === "EXPENSE")?._sum.amount || 0
      const afterNet = afterIn - afterOut

      const closingByLedger = account.currentBalance - afterNet

      const withinDayTxns = await tx.transaction.groupBy({
        by: ["type", "category"],
        where: { accountId: data.accountId, date: { gte: dayRange.from, lt: dayRange.to } },
        _sum: { amount: true },
      })

      let withinIn = 0
      let withinOut = 0
      let cashIn = 0
      let cashOut = 0
      let transfersIn = 0
      let transfersOut = 0

      withinDayTxns.forEach((t) => {
        const amt = t._sum.amount || 0
        const isTransfer = t.category.toUpperCase().includes("TRANSFER")
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

      let varianceTxnId: string | null = null

      if (Math.abs(variance) >= 0.01) {
        const varDate = new Date(dayRange.to.getTime() - 1)

        if (variance > 0) {
          // Cash surplus -> INCOME
          await tx.financialAccount.update({
            where: { id: account.id },
            data: { currentBalance: { increment: variance } },
          })
          const txn = await tx.transaction.create({
            data: {
              accountId: account.id,
              type: "INCOME",
              amount: variance,
              category: "CASH_VARIANCE",
              accountGroupCode: "4000",
              paymentMethod: "CASH",
              scope: "HOSPITAL",
              description: `Cash variance (surplus) during hospital day close for ${data.dateStr}`,
              date: varDate,
            },
          })
          varianceTxnId = txn.id
        } else {
          // Cash shortage -> EXPENSE
          const absVar = Math.abs(variance)
          await tx.financialAccount.update({
            where: { id: account.id },
            data: { currentBalance: { decrement: absVar } },
          })
          const txn = await tx.transaction.create({
            data: {
              accountId: account.id,
              type: "EXPENSE",
              amount: absVar,
              category: "CASH_VARIANCE",
              accountGroupCode: "5000",
              paymentMethod: "CASH",
              scope: "HOSPITAL",
              description: `Cash variance (shortage) during hospital day close for ${data.dateStr}`,
              date: varDate,
            },
          })
          varianceTxnId = txn.id
        }
      }

      await tx.hospitalDayClose.create({
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
          closedBy: auth.session.userId,
        },
      })

      writeAuditLog({
        userId: auth.session.userId,
        action: "CREATE",
        module: "HospitalDayClose",
        changes: {
          businessDate: data.dateStr,
          accountId: account.id,
          expectedCash,
          countedCash: counted,
          variance,
        },
      })
    })

    revalidatePath("/dashboard/master-finance/day-close")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/cash-bank/cash-book")

    return { success: true, message: "Hospital Day closed successfully" }
  } catch (err: any) {
    if (err.code === "P2002") {
      return { success: false, message: "This day has already been closed" }
    }
    return { success: false, message: err.message || "Failed to close day" }
  }
}

export async function getRecentHospitalCloses(accountId?: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return []

  const whereClause: any = {}
  if (accountId) whereClause.accountId = accountId

  return prisma.hospitalDayClose.findMany({
    where: whereClause,
    include: {
      account: { select: { id: true, name: true, type: true } },
    },
    orderBy: { businessDate: "desc" },
    take: 30,
  })
}

