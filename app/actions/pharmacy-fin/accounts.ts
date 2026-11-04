"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { DateRange } from "@/lib/pharmacy-finance/dates"
import { assertDayOpen } from "./_guards"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"

export async function internalTransfer(data: {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  reference?: string
  notes?: string
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error }

  if (data.fromAccountId === data.toAccountId) {
    return { success: false, message: "Cannot transfer to the same account" }
  }
  const amount = Math.round(Number(data.amount) * 100) / 100
  if (!amount || amount <= 0) {
    return { success: false, message: "Transfer amount must be greater than zero" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const fromAcc = await tx.financialAccount.findUnique({ where: { id: data.fromAccountId } })
      const toAcc = await tx.financialAccount.findUnique({ where: { id: data.toAccountId } })
      
      if (!fromAcc || !toAcc) throw new Error("Account not found")
      if (!fromAcc.isActive || !toAcc.isActive) throw new Error("Account is inactive")
      if (fromAcc.scope !== "PHARMACY" || toAcc.scope !== "PHARMACY") {
        throw new Error("Internal transfer requires both accounts to belong to PHARMACY")
      }

      if (fromAcc.currentBalance < amount) {
        throw new Error(
          `Insufficient balance in "${fromAcc.name}" (Available: ₹${fromAcc.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Requested: ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        )
      }

      // Check closed day for cash accounts (defensive rule against closing date edits)
      await assertDayOpen(tx, fromAcc.id, data.date)
      await assertDayOpen(tx, toAcc.id, data.date)

      // Guarded decrement on source account
      const debit = await tx.financialAccount.updateMany({
        where: { id: fromAcc.id, currentBalance: { gte: amount } },
        data: { currentBalance: { decrement: amount } }
      })
      if (debit.count !== 1) {
        throw new Error(`Insufficient balance in "${fromAcc.name}"`)
      }

      // Increment on destination account
      await tx.financialAccount.update({
        where: { id: toAcc.id },
        data: { currentBalance: { increment: amount } }
      })

      const refId = crypto.randomUUID()
      const d = data.date ? new Date(data.date + "T12:00:00+05:30") : new Date()

      await tx.transaction.create({
        data: {
          accountId: fromAcc.id,
          type: "EXPENSE",
          amount,
          category: "INTERNAL_TRANSFER_OUT",
          paymentMethod: toAcc.type,
          scope: "PHARMACY",
          referenceId: refId,
          description: `Transfer to ${toAcc.name} ${data.notes ? `(${data.notes})` : ""}`.trim(),
          date: d,
        }
      })

      await tx.transaction.create({
        data: {
          accountId: toAcc.id,
          type: "INCOME",
          amount,
          category: "INTERNAL_TRANSFER_IN",
          paymentMethod: fromAcc.type,
          scope: "PHARMACY",
          referenceId: refId,
          description: `Transfer from ${fromAcc.name} ${data.notes ? `(${data.notes})` : ""}`.trim(),
          date: d,
        }
      })
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "CREATE",
      module: "InternalTransfer",
      changes: {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount,
        date: data.date,
      },
    })

    revalidatePath("/dashboard/pharmacy-finance/accounts")
    revalidatePath("/dashboard/pharmacy-finance")
    revalidatePath("/dashboard/finance/accounts")

    return { success: true, message: `Successfully transferred ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
  } catch (err: any) {
    console.error("[ERROR] internalTransfer:", err)
    if (err.message?.includes("Record to update not found")) {
      return { success: false, message: "Insufficient balance for this transfer" }
    }
    return { success: false, message: err.message || "Failed to process internal transfer" }
  }
}

export async function getPharmacyAccountsOverview() {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const accounts = await prisma.financialAccount.findMany({
    where: { scope: "PHARMACY", isActive: true },
    orderBy: { name: "asc" }
  })

  // Get today's IST bounds
  const now = new Date()
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  const startOfToday = new Date(todayStr + "T00:00:00+05:30")
  const endOfToday = new Date(todayStr + "T23:59:59.999+05:30")

  // For each account, get today's income/expense
  const accIds = accounts.map(a => a.id)
  
  const todayTxns = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: {
      accountId: { in: accIds },
      date: { gte: startOfToday, lte: endOfToday }
    },
    _sum: { amount: true }
  })

  const lastTxn = await prisma.transaction.groupBy({
    by: ["accountId"],
    where: { accountId: { in: accIds } },
    _max: { date: true }
  })

  return accounts.map(acc => {
    const todayIn = todayTxns.find(t => t.accountId === acc.id && t.type === "INCOME")?._sum.amount || 0
    const todayOut = todayTxns.find(t => t.accountId === acc.id && t.type === "EXPENSE")?._sum.amount || 0
    const lastDate = lastTxn.find(t => t.accountId === acc.id)?._max.date

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      bankDetails: [acc.bankName, acc.accountNumber].filter(Boolean).join(" - "),
      balance: Math.round(acc.currentBalance * 100) / 100,
      todayIn: Math.round(todayIn * 100) / 100,
      todayOut: Math.round(todayOut * 100) / 100,
      lastDate
    }
  })
}

export async function getAccountLedger(accountId: string, range: DateRange, page: number) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const account = await prisma.financialAccount.findUnique({ where: { id: accountId } })
  if (!account) throw new Error("Account not found")

  // Opening balance calculation:
  // account.openingBalance + sum of all txns before range.from
  const pastTxns = await prisma.transaction.groupBy({
    by: ["type"],
    where: { accountId, date: { lt: range.from } },
    _sum: { amount: true }
  })
  const pastIn = pastTxns.find(t => t.type === "INCOME")?._sum.amount || 0
  const pastOut = pastTxns.find(t => t.type === "EXPENSE")?._sum.amount || 0
  const openingBalance = Math.round((account.openingBalance + pastIn - pastOut) * 100) / 100

  const PAGE_SIZE = 50
  
  const allRows = await prisma.transaction.findMany({
    where: { accountId, date: { gte: range.from, lt: range.to } },
    orderBy: { date: "asc" }
  })

  let currentBal = openingBalance
  const enrichedRows = allRows.map(r => {
    const isIncome = r.type === "INCOME"
    currentBal = Math.round((currentBal + (isIncome ? r.amount : -r.amount)) * 100) / 100
    return {
      id: r.id,
      date: r.date,
      category: r.category,
      subCategory: r.subCategory,
      description: r.description || "-",
      referenceId: r.referenceId,
      in: isIncome ? r.amount : 0,
      out: !isIncome ? r.amount : 0,
      balance: currentBal,
      method: r.paymentMethod
    }
  })

  const totalRows = enrichedRows.length
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const paginatedRows = enrichedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return {
    account: { id: account.id, name: account.name, type: account.type },
    openingBalance,
    closingBalance: currentBal,
    rows: paginatedRows,
    page,
    totalPages,
    totalRows
  }
}
