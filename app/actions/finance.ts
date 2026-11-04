"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { startOfMonth, endOfMonth } from "date-fns"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { actionError, getErrorMessage } from "@/lib/action-result"
import { resolveAccountGroupCode, resolveBillingTypeTag } from "@/lib/account-group-resolver"
import { hospitalAccountWhere, hospitalBillingWhere, hospitalTransactionWhere } from "@/lib/finance-scope"

// ============================================
// TYPES
// ============================================

export interface FinancialAccountData {
  id: string
  name: string
  type: string
  openingBalance: number
  currentBalance: number
}

export interface TransactionData {
  id: string
  date: string
  accountId: string
  accountName: string
  type: string
  amount: number
  category: string
  paymentMethod: string
  referenceId: string | null
  description: string | null
}

export interface FinanceDashboardStats {
  totalBalance: number
  monthIncome: number
  monthExpense: number
  accounts: FinancialAccountData[]
  recentTransactions: TransactionData[]
}

export interface BskyClaimRow {
  id: string
  billNumber: string
  billDate: string
  patientId: string
  patientDbId: string
  patientName: string
  totalBilledAmount: number
  pendingAmount: number
  status: "PENDING" | "PAID"
  claimStatusLabel: string
}

export interface BskyClaimStats {
  totalPendingClaims: number
  totalSettledClaims: number
  pendingClaimCount: number
  settledClaimCount: number
}

export interface BskyClaimsDashboardData {
  stats: BskyClaimStats
  claims: BskyClaimRow[]
  bankAccounts: FinancialAccountData[]
}

// ============================================
// GET ALL FINANCIAL ACCOUNTS
// ============================================

export async function getFinancialAccounts(): Promise<FinancialAccountData[]> {
  await requireAuth()

  const accounts = await prisma.financialAccount.findMany({
    where: hospitalAccountWhere({ isActive: true }),
    orderBy: { createdAt: "asc" },
  })

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    openingBalance: a.openingBalance,
    currentBalance: a.currentBalance,
  }))
}

// ============================================
// SETUP DEFAULT ACCOUNTS (idempotent)
// ============================================

export async function setupDefaultAccounts(): Promise<void> {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

  const count = await prisma.financialAccount.count({ where: { scope: "HOSPITAL" } })
  if (count > 0) return

  await prisma.financialAccount.createMany({
    data: [
      {
        name: "Main Cash Drawer",
        type: "CASH",
        openingBalance: 0,
        currentBalance: 0,
      },
      {
        name: "Main Bank Account",
        type: "BANK",
        openingBalance: 0,
        currentBalance: 0,
      },
    ],
  })
}

// ============================================
// ADD TRANSACTION (atomic with balance update)
// ============================================

export async function addTransaction(data: {
  accountId: string
  type: "INCOME" | "EXPENSE"
  amount: number
  category: string
  paymentMethod: string
  referenceId?: string
  description?: string
  date?: string
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.accountId || !data.type || !data.amount || !data.category || !data.paymentMethod) {
      return { success: false, message: "All fields are required" }
    }
    if (data.amount <= 0) {
      return { success: false, message: "Amount must be greater than 0" }
    }

    const balanceChange = data.type === "INCOME" ? data.amount : -data.amount

    // Auto-classify for P&L reporting
    const accountGroupCode = resolveAccountGroupCode(data.type, data.category)
    const billingTypeTag = resolveBillingTypeTag(null, data.category)

    await prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findUnique({ where: { id: data.accountId } })
      if (!account) throw new Error("Financial account not found")
      if (account.scope !== "HOSPITAL") throw new Error("Hospital Finance can only use HOSPITAL accounts")

      await tx.transaction.create({
        data: {
          accountId: data.accountId,
          type: data.type,
          amount: data.amount,
          category: data.category,
          paymentMethod: data.paymentMethod,
          referenceId: data.referenceId || null,
          description: data.description?.trim() || null,
          date: data.date ? new Date(data.date) : undefined,
          accountGroupCode,
          billingType: billingTypeTag,
          scope: account.scope,
        },
      })
      await tx.financialAccount.update({
        where: { id: data.accountId },
        data: {
          currentBalance: { increment: balanceChange },
        },
      })
    })

    revalidatePath("/dashboard/finance")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Transaction", changes: { accountId: data.accountId, type: data.type, amount: data.amount, category: data.category } })

    return { success: true, message: `${data.type === "INCOME" ? "Income" : "Expense"} of ₹${data.amount.toLocaleString("en-IN")} recorded` }
  } catch (error) {
    console.error("[ERROR] addTransaction:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// FINANCE DASHBOARD STATS
// ============================================

export async function getFinanceDashboardStats(): Promise<FinanceDashboardStats> {
  await requireAuth()

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [accounts, monthIncomeAgg, monthExpenseAgg, recentTxns] = await Promise.all([
    prisma.financialAccount.findMany({ where: hospitalAccountWhere(), orderBy: { createdAt: "asc" } }),

    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      }),
      _sum: { amount: true },
    }),

    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      }),
      _sum: { amount: true },
    }),

    prisma.transaction.findMany({
      where: hospitalTransactionWhere(),
      include: {
        account: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ])

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0)

  return {
    totalBalance,
    monthIncome: monthIncomeAgg._sum.amount || 0,
    monthExpense: monthExpenseAgg._sum.amount || 0,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: a.openingBalance,
      currentBalance: a.currentBalance,
    })),
    recentTransactions: recentTxns.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      accountId: t.accountId,
      accountName: t.account.name,
      type: t.type,
      amount: t.amount,
      category: t.category,
      paymentMethod: t.paymentMethod,
      referenceId: t.referenceId,
      description: t.description,
    })),
  }
}

// ============================================
// LEDGER TRANSACTIONS (FILTERED, UNLIMITED)
// ============================================

export async function getLedgerTransactions(filters?: {
  startDate?: string
  endDate?: string
  category?: string
  type?: "INCOME" | "EXPENSE"
}): Promise<{ success: boolean; data: TransactionData[]; total: number }> {
  await requireAuth()

  const where: any = hospitalTransactionWhere()

  if (filters?.startDate || filters?.endDate) {
    where.date = {}
    if (filters.startDate) where.date.gte = new Date(filters.startDate)
    if (filters.endDate) {
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      where.date.lte = end
    }
  }

  if (filters?.category && filters.category !== "ALL") {
    where.category = filters.category
  }

  if (filters?.type && filters.type !== ("ALL" as any)) {
    where.type = filters.type
  }

  const txns = await prisma.transaction.findMany({
    where,
    include: {
      account: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  })

  return {
    success: true,
    total: txns.length,
    data: txns.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      accountId: t.accountId,
      accountName: t.account.name,
      type: t.type,
      amount: t.amount,
      category: t.category,
      paymentMethod: t.paymentMethod,
      referenceId: t.referenceId,
      description: t.description,
    })),
  }
}

// ============================================
// BSKY CLAIMS DASHBOARD
// ============================================

export async function getBskyClaimsDashboardData(
  filter: "PENDING" | "SETTLED" | "ALL" = "PENDING"
): Promise<BskyClaimsDashboardData> {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])

  const pendingStatuses = ["PENDING_GOVERNMENT_PAYMENT", "PENDING", "PARTIALLY_PAID"] as const
  const settledStatuses = ["PAID"] as const

  const [pendingAgg, settledAgg, pendingPatients, settledPatients, bankAccounts, claimsRaw] = await Promise.all([
    prisma.billing.aggregate({
      where: hospitalBillingWhere({
        status: { in: pendingStatuses as unknown as any },
      }),
      _sum: { balanceAmount: true },
    }),
    prisma.billing.aggregate({
      where: hospitalBillingWhere({
        status: { in: settledStatuses as unknown as any },
      }),
      _sum: { paidAmount: true },
    }),
    prisma.billing.groupBy({
      by: ["patientId"],
      where: hospitalBillingWhere({
        status: { in: pendingStatuses as unknown as any },
      }),
    }),
    prisma.billing.groupBy({
      by: ["patientId"],
      where: hospitalBillingWhere({
        status: { in: settledStatuses as unknown as any },
      }),
    }),
    prisma.financialAccount.findMany({
      where: hospitalAccountWhere({ type: "BANK" }),
      orderBy: { name: "asc" },
    }),
    prisma.billing.findMany({
      where: hospitalBillingWhere({
        paymentMethod: "BSKY",
        ...(filter === "PENDING"
          ? { status: { in: pendingStatuses as unknown as any } }
          : filter === "SETTLED"
            ? { status: { in: settledStatuses as unknown as any } }
            : {}),
      }),
      include: {
        patient: {
          include: { user: true },
        },
      },
      orderBy: [{ billDate: "asc" }, { createdAt: "asc" }],
    }),
  ])

  const claims: BskyClaimRow[] = claimsRaw.map((bill) => {
    const isSettled = bill.status === "PAID"
    const isPending = pendingStatuses.includes(bill.status as (typeof pendingStatuses)[number])
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      billDate: bill.billDate.toISOString(),
      patientId: bill.patient.patientId,
      patientDbId: bill.patientId,
      patientName: bill.patient.user.name || "Unknown",
      totalBilledAmount: bill.netAmount,
      pendingAmount: bill.balanceAmount,
      status: isSettled ? "PAID" : "PENDING",
      claimStatusLabel: isSettled ? "Paid" : isPending ? "Pending" : bill.status.replace(/_/g, " "),
    }
  })

  return {
    stats: {
      totalPendingClaims: pendingAgg._sum.balanceAmount || 0,
      totalSettledClaims: settledAgg._sum.paidAmount || 0,
      pendingClaimCount: pendingPatients.length,
      settledClaimCount: settledPatients.length,
    },
    claims,
    bankAccounts: bankAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: a.openingBalance,
      currentBalance: a.currentBalance,
    })),
  }
}

export async function settleBskyClaim(data: {
  billId: string
  accountId: string
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.billId || !data.accountId) {
      return { success: false, message: "Bill and settlement account are required" }
    }

    await prisma.$transaction(async (tx) => {
      const [bill, account] = await Promise.all([
        tx.billing.findUnique({
          where: { id: data.billId },
          include: { patient: { include: { user: true } } },
        }),
        tx.financialAccount.findUnique({
          where: { id: data.accountId },
        }),
      ])

      if (!bill) {
        throw new Error("BSKY bill not found")
      }
      if (bill.paymentMethod !== "BSKY") {
        throw new Error("Selected bill is not tagged as BSKY")
      }
      if (!account) {
        throw new Error("Settlement ledger account not found")
      }
      if (account.type !== "BANK" && account.type !== "CASH") {
        throw new Error("Settlement must be posted to a valid cash/bank ledger")
      }
      if (bill.status === "PAID") {
        throw new Error("Claim is already settled")
      }
      if (bill.status === "CANCELLED") {
        throw new Error("Cancelled bill cannot be settled")
      }

      const settlementAmount = bill.balanceAmount > 0 ? bill.balanceAmount : bill.netAmount
      if (settlementAmount <= 0) {
        throw new Error("This claim has no pending amount to settle")
      }

      await tx.billing.update({
        where: { id: bill.id },
        data: {
          status: "PAID",
          paidAmount: bill.paidAmount + settlementAmount,
          balanceAmount: Math.max(0, bill.balanceAmount - settlementAmount),
          paymentMethod: "BSKY",
        },
      })

      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "INCOME",
          amount: settlementAmount,
          category: "BSKY_CLAIM_SETTLEMENT",
          paymentMethod: "BSKY",
          referenceId: bill.id,
          description: `BSKY Payout for Patient ${bill.patient.user.name || bill.patient.patientId} (${bill.billNumber})`,
        },
      })

      await tx.financialAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: { increment: settlementAmount },
        },
      })
    })

    revalidatePath("/dashboard/finance/bsky-claims")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/finance/billing")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "BSKYClaimSettlement",
      changes: { billId: data.billId, accountId: data.accountId },
    })

    return { success: true, message: "BSKY claim settled and ledger updated successfully" }
  } catch (error) {
    console.error("[ERROR] settleBskyClaim:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// UPDATE TRANSACTION
// ============================================

export async function updateTransaction(id: string, data: {
  accountId: string
  type: "INCOME" | "EXPENSE"
  amount: number
  category: string
  paymentMethod: string
  description?: string
  date?: string
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.amount || data.amount <= 0) return { success: false, message: "Amount must be greater than 0" }

    // Fetch original transaction to reverse its balance effect
    const original = await prisma.transaction.findUnique({ where: { id } })
    if (!original) return { success: false, message: "Transaction not found" }
    if (original.scope !== "HOSPITAL") return { success: false, message: "Pharmacy transactions must be managed in Pharmacy Finance" }

    const originalBalanceChange = original.type === "INCOME" ? -original.amount : original.amount
    const newBalanceChange = data.type === "INCOME" ? data.amount : -data.amount

    await prisma.$transaction(async (tx) => {
      const targetAccount = await tx.financialAccount.findUnique({ where: { id: data.accountId } })
      if (!targetAccount) throw new Error("Financial account not found")
      if (targetAccount.scope !== "HOSPITAL") throw new Error("Hospital Finance can only use HOSPITAL accounts")

      // Reverse old balance effect on original account
      await tx.financialAccount.update({
        where: { id: original.accountId },
        data: { currentBalance: { increment: originalBalanceChange } },
      })

      // Apply new balance effect on new (or same) account
      await tx.financialAccount.update({
        where: { id: data.accountId },
        data: { currentBalance: { increment: newBalanceChange } },
      })

      // Update the transaction itself
      await tx.transaction.update({
        where: { id },
        data: {
          accountId: data.accountId,
          type: data.type,
          amount: data.amount,
          category: data.category,
          paymentMethod: data.paymentMethod,
          description: data.description?.trim() || null,
          date: data.date ? new Date(data.date) : undefined,
          scope: targetAccount.scope,
        },
      })
    })

    revalidatePath("/dashboard/finance")
    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "Transaction",
      changes: { id, ...data },
    })

    return { success: true, message: "Transaction updated successfully" }
  } catch (error) {
    console.error("[ERROR] updateTransaction:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// DELETE TRANSACTION
// ============================================

export async function deleteTransaction(id: string): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const txn = await prisma.transaction.findUnique({ where: { id } })
    if (!txn) return { success: false, message: "Transaction not found" }
    if (txn.scope !== "HOSPITAL") return { success: false, message: "Pharmacy transactions must be managed in Pharmacy Finance" }

    // Reverse balance change
    const balanceReversal = txn.type === "INCOME" ? -txn.amount : txn.amount

    await prisma.$transaction([
      prisma.transaction.delete({ where: { id } }),
      prisma.financialAccount.update({
        where: { id: txn.accountId },
        data: { currentBalance: { increment: balanceReversal } },
      }),
    ])

    revalidatePath("/dashboard/finance")
    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "Transaction",
      changes: { id, amount: txn.amount, type: txn.type },
    })

    return { success: true, message: "Transaction deleted and balance reversed" }
  } catch (error) {
    console.error("[ERROR] deleteTransaction:", error)
    return actionError(getErrorMessage(error))
  }
}
