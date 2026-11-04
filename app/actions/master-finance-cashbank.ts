"use server"

import { prisma } from "@/lib/prisma"
import { hospitalAccountWhere, hospitalTransactionWhere } from "@/lib/finance-scope"

// ═══════════════════════════════════════════════════════════════════
// 7B. CASH BOOK — Daily cash register
// ═══════════════════════════════════════════════════════════════════

export async function getCashBook(params: { from: string; to: string; accountId?: string }) {
  const fromDate = new Date(params.from)
  const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)

  // Get cash accounts
  const cashAccounts = await prisma.financialAccount.findMany({
    where: hospitalAccountWhere({ type: { in: ["CASH", "PETTY_CASH"] }, isActive: true }),
    select: { id: true, name: true, type: true, openingBalance: true, currentBalance: true },
  })

  const accountIds = params.accountId ? [params.accountId] : cashAccounts.map((a) => a.id)

  const transactions = await prisma.transaction.findMany({
      where: hospitalTransactionWhere({
        accountId: { in: accountIds },
        date: { gte: fromDate, lte: toDate },
      }),
    include: { account: { select: { name: true, type: true } } },
    orderBy: { date: "asc" },
  })

  // Group by date
  const dailyMap = new Map<string, { receipts: number; payments: number; txns: typeof transactions }>()
  for (const txn of transactions) {
    const dateKey = txn.date.toISOString().split("T")[0]
    const entry = dailyMap.get(dateKey) || { receipts: 0, payments: 0, txns: [] }
    if (txn.type === "INCOME" || txn.type === "RECEIPT") entry.receipts += txn.amount
    else entry.payments += txn.amount
    entry.txns.push(txn)
    dailyMap.set(dateKey, entry)
  }

  const dailyEntries = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date, ...data,
  }))

  const totalReceipts = transactions.filter((t) => t.type === "INCOME" || t.type === "RECEIPT").reduce((s, t) => s + t.amount, 0)
  const totalPayments = transactions.filter((t) => t.type !== "INCOME" && t.type !== "RECEIPT").reduce((s, t) => s + t.amount, 0)

  return { cashAccounts, dailyEntries, transactions, totalReceipts, totalPayments }
}

// ═══════════════════════════════════════════════════════════════════
// 7C. BANK BOOK — Per-bank transaction ledger
// ═══════════════════════════════════════════════════════════════════

export async function getBankBook(params: { from: string; to: string; accountId?: string }) {
  const fromDate = new Date(params.from)
  const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)

  const bankAccounts = await prisma.financialAccount.findMany({
    where: hospitalAccountWhere({ type: "BANK", isActive: true }),
    select: { id: true, name: true, bankName: true, accountNumber: true, currentBalance: true, ifscCode: true },
  })

  const accountIds = params.accountId ? [params.accountId] : bankAccounts.map((a) => a.id)

  const transactions = await prisma.transaction.findMany({
      where: hospitalTransactionWhere({
        accountId: { in: accountIds },
        date: { gte: fromDate, lte: toDate },
      }),
    include: { account: { select: { name: true, bankName: true, accountNumber: true } } },
    orderBy: { date: "desc" },
  })

  const totalCredits = transactions.filter((t) => t.type === "INCOME" || t.type === "RECEIPT").reduce((s, t) => s + t.amount, 0)
  const totalDebits = transactions.filter((t) => t.type !== "INCOME" && t.type !== "RECEIPT").reduce((s, t) => s + t.amount, 0)

  return { bankAccounts, transactions, totalCredits, totalDebits }
}

// ═══════════════════════════════════════════════════════════════════
// 7D. BANK RECONCILIATION — Basic statement matching
// ═══════════════════════════════════════════════════════════════════

export async function getBankReconciliationData(params: { accountId: string; month: string }) {
  const [year, monthNum] = params.month.split("-").map(Number)
  const fromDate = new Date(year, monthNum - 1, 1)
  const toDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

  const account = await prisma.financialAccount.findFirst({
    where: hospitalAccountWhere({ id: params.accountId }),
    select: { id: true, name: true, bankName: true, accountNumber: true, currentBalance: true },
  })

  const transactions = await prisma.transaction.findMany({
    where: hospitalTransactionWhere({ accountId: params.accountId, date: { gte: fromDate, lte: toDate } }),
    orderBy: { date: "asc" },
  })

  const totalCredits = transactions.filter((t) => t.type === "INCOME" || t.type === "RECEIPT").reduce((s, t) => s + t.amount, 0)
  const totalDebits = transactions.filter((t) => t.type !== "INCOME" && t.type !== "RECEIPT").reduce((s, t) => s + t.amount, 0)

  return { account, transactions, totalCredits, totalDebits, month: params.month }
}

// ═══════════════════════════════════════════════════════════════════
// 7E. PETTY CASH — Small expenses with imprest system
// ═══════════════════════════════════════════════════════════════════

export async function getPettyCashData(params: { from: string; to: string }) {
  const fromDate = new Date(params.from)
  const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)

  const pettyCashAccounts = await prisma.financialAccount.findMany({
    where: hospitalAccountWhere({ type: "PETTY_CASH", isActive: true }),
    select: { id: true, name: true, currentBalance: true, openingBalance: true },
  })

  const accountIds = pettyCashAccounts.map((a) => a.id)
  if (accountIds.length === 0) {
    // Also check CASH type as fallback
    const cashAccts = await prisma.financialAccount.findMany({
      where: hospitalAccountWhere({ type: "CASH", isActive: true }),
      select: { id: true, name: true, currentBalance: true, openingBalance: true },
    })
    accountIds.push(...cashAccts.map((a) => a.id))
    pettyCashAccounts.push(...cashAccts)
  }

  const transactions = await prisma.transaction.findMany({
      where: hospitalTransactionWhere({
        accountId: { in: accountIds },
        date: { gte: fromDate, lte: toDate },
      }),
    include: { account: { select: { name: true } } },
    orderBy: { date: "desc" },
  })

  // Category breakdown
  const categoryMap = new Map<string, { count: number; amount: number }>()
  for (const txn of transactions) {
    if (txn.type === "INCOME" || txn.type === "RECEIPT") continue
    const cat = txn.category || "Uncategorized"
    const existing = categoryMap.get(cat) || { count: 0, amount: 0 }
    existing.count++; existing.amount += txn.amount
    categoryMap.set(cat, existing)
  }

  const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.amount - a.amount)

  const totalSpent = transactions.filter((t) => t.type !== "INCOME" && t.type !== "RECEIPT").reduce((s, t) => s + t.amount, 0)
  const totalReplenished = transactions.filter((t) => t.type === "INCOME" || t.type === "RECEIPT").reduce((s, t) => s + t.amount, 0)
  const currentBalance = pettyCashAccounts.reduce((s, a) => s + a.currentBalance, 0)

  return { accounts: pettyCashAccounts, transactions, categories, totalSpent, totalReplenished, currentBalance }
}
