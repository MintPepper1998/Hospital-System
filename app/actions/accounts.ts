"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { actionError, getErrorMessage } from "@/lib/action-result"
import { hospitalAccountWhere, hospitalTransactionWhere } from "@/lib/finance-scope"

// ============================================
// TYPES
// ============================================

export interface AccountDetail {
  id: string
  name: string
  type: string
  accountNumber: string | null
  bankName: string | null
  ifscCode: string | null
  isActive: boolean
  description: string | null
  openingBalance: number
  currentBalance: number
  createdAt: string
  transactionCount: number
}

export interface ChannelBreakdownItem {
  channel: string
  label: string
  inflow: number
  outflow: number
  net: number
  count: number
}

export interface AccountsDashboardData {
  accounts: AccountDetail[]
  totalCash: number
  totalBank: number
  totalUPI: number
  totalCard: number
  grandTotal: number
  channelBalances: {
    paymentMethod: string
    label: string
    balance: number
  }[]
  bankBreakdown: ChannelBreakdownItem[]
  cashBreakdown: ChannelBreakdownItem[]
  recentTransactions: {
    id: string
    date: string
    accountId: string
    accountName: string
    type: string
    amount: number
    category: string
    paymentMethod: string
    description: string | null
  }[]
}

// ============================================
// GET ACCOUNTS DASHBOARD
// ============================================

export async function getAccountsDashboard(): Promise<AccountsDashboardData> {
  await requireAuth()

  const accounts = await prisma.financialAccount.findMany({
    where: hospitalAccountWhere({ isActive: true }),
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { transactions: true } },
    },
  })

  const bankAccount = accounts.find((a) => a.type === "BANK")
  const cashAccount = accounts.find((a) => a.type === "CASH" || a.type === "PETTY_CASH")

  const totalCash = accounts.filter((a) => a.type === "CASH" || a.type === "PETTY_CASH").reduce((s, a) => s + a.currentBalance, 0)
  const totalBank = accounts.filter((a) => a.type === "BANK" || a.type === "UPI" || a.type === "CARD").reduce((s, a) => s + a.currentBalance, 0)
  const totalUPI = accounts.filter((a) => a.type === "UPI").reduce((s, a) => s + a.currentBalance, 0)
  const totalCard = accounts.filter((a) => a.type === "CARD").reduce((s, a) => s + a.currentBalance, 0)

  const [recentTxns, channelTransactions, bankChannelTxns, cashChannelTxns] = await Promise.all([
    prisma.transaction.findMany({
      where: hospitalTransactionWhere(),
      take: 15,
      orderBy: { date: "desc" },
      include: { account: { select: { name: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["paymentMethod", "type"],
      where: hospitalTransactionWhere(),
      _sum: { amount: true },
    }),
    bankAccount
      ? prisma.transaction.groupBy({
          by: ["paymentMethod", "type"],
          where: { accountId: bankAccount.id },
          _sum: { amount: true },
          _count: true,
        })
      : [],
    cashAccount
      ? prisma.transaction.groupBy({
          by: ["paymentMethod", "type"],
          where: { accountId: cashAccount.id },
          _sum: { amount: true },
          _count: true,
        })
      : [],
  ])

  // Build Bank Breakdown (UPI, Card, Bank Transfer, Direct/Other)
  const bankMap = new Map<string, { inflow: number; outflow: number; count: number }>()
  for (const row of bankChannelTxns) {
    const method = row.paymentMethod || "OTHER"
    const entry = bankMap.get(method) || { inflow: 0, outflow: 0, count: 0 }
    const amt = row._sum.amount || 0
    if (row.type === "INCOME" || row.type === "RECEIPT" || row.type === "IN") {
      entry.inflow += amt
    } else {
      entry.outflow += amt
    }
    entry.count += row._count
    bankMap.set(method, entry)
  }

  const bankLabels: Record<string, string> = {
    UPI: "UPI (QR Code / PhonePe / GPay)",
    CARD: "Card Swipe (POS Terminal)",
    BANK_TRANSFER: "Bank Transfer (NEFT / RTGS / IMPS)",
    CHEQUE: "Cheques & Drafts",
    VOUCHER: "Direct Bank Vouchers / Journal",
    OTHER: "Other Bank Postings",
  }

  const bankBreakdown: ChannelBreakdownItem[] = Object.entries(bankLabels)
    .filter(([method]) => bankMap.has(method))
    .map(([channel, label]) => {
      const data = bankMap.get(channel)!
      return {
        channel,
        label,
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.inflow - data.outflow,
        count: data.count,
      }
    })

  // Also include UPI and Card if they had 0 direct txns on this account, to always display the channels
  if (!bankBreakdown.some((b) => b.channel === "UPI")) {
    const upiData = bankMap.get("UPI") || { inflow: 0, outflow: 0, count: 0 }
    bankBreakdown.unshift({
      channel: "UPI",
      label: bankLabels.UPI,
      inflow: upiData.inflow,
      outflow: upiData.outflow,
      net: upiData.inflow - upiData.outflow,
      count: upiData.count,
    })
  }
  if (!bankBreakdown.some((b) => b.channel === "CARD")) {
    const cardData = bankMap.get("CARD") || { inflow: 0, outflow: 0, count: 0 }
    bankBreakdown.splice(1, 0, {
      channel: "CARD",
      label: bankLabels.CARD,
      inflow: cardData.inflow,
      outflow: cardData.outflow,
      net: cardData.inflow - cardData.outflow,
      count: cardData.count,
    })
  }

  if (bankAccount) {
    const bankChannelSum = bankBreakdown.reduce((sum, item) => sum + item.net, 0)
    const bankReserveDelta = bankAccount.currentBalance - bankChannelSum
    if (Math.abs(bankReserveDelta) > 0.01) {
      bankBreakdown.push({
        channel: "RESERVES",
        label: "Bank Base Balance & Direct Deposits",
        inflow: bankReserveDelta > 0 ? bankReserveDelta : 0,
        outflow: bankReserveDelta < 0 ? Math.abs(bankReserveDelta) : 0,
        net: bankReserveDelta,
        count: 0,
      })
    }
  }

  // Build Cash Breakdown
  const cashMap = new Map<string, { inflow: number; outflow: number; count: number }>()
  for (const row of cashChannelTxns) {
    const method = row.paymentMethod || "OTHER"
    const entry = cashMap.get(method) || { inflow: 0, outflow: 0, count: 0 }
    const amt = row._sum.amount || 0
    if (row.type === "INCOME" || row.type === "RECEIPT" || row.type === "IN") {
      entry.inflow += amt
    } else {
      entry.outflow += amt
    }
    entry.count += row._count
    cashMap.set(method, entry)
  }

  const cashLabels: Record<string, string> = {
    CASH: "Counter Cash Collections (OPD / IPD)",
    CREDIT: "Credit Dues Collected in Cash",
    VOUCHER: "Cash Expense Vouchers & Petty Cash",
    UPI: "UPI Counter Clearing",
    OTHER: "Other Cash Activity",
  }

  const cashBreakdown: ChannelBreakdownItem[] = Object.entries(cashLabels)
    .filter(([method]) => cashMap.has(method))
    .map(([channel, label]) => {
      const data = cashMap.get(channel)!
      return {
        channel,
        label,
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.inflow - data.outflow,
        count: data.count,
      }
    })

  if (cashAccount) {
    const cashChannelSum = cashBreakdown.reduce((sum, item) => sum + item.net, 0)
    const cashReserveDelta = cashAccount.currentBalance - cashChannelSum
    if (Math.abs(cashReserveDelta) > 0.01) {
      cashBreakdown.push({
        channel: "RESERVES",
        label: "Consolidated Vault Float & Cash Drawers",
        inflow: cashReserveDelta > 0 ? cashReserveDelta : 0,
        outflow: cashReserveDelta < 0 ? Math.abs(cashReserveDelta) : 0,
        net: cashReserveDelta,
        count: 0,
      })
    }
  }

  const channelLabels: Record<string, string> = {
    CASH: "Cash",
    UPI: "UPI",
    CARD: "Card",
    BANK_TRANSFER: "Bank Transfer",
    VOUCHER: "Voucher",
    INSURANCE: "Insurance",
    BSKY: "BSKY",
  }
  const channelMap = new Map<string, number>()
  for (const row of channelTransactions) {
    const sign = row.type === "INCOME" || row.type === "RECEIPT" || row.type === "IN" ? 1 : -1
    channelMap.set(row.paymentMethod, (channelMap.get(row.paymentMethod) || 0) + sign * (row._sum.amount || 0))
  }
  const channelBalances = Object.entries(channelLabels)
    .filter(([method]) => channelMap.has(method))
    .map(([paymentMethod, label]) => ({ paymentMethod, label, balance: channelMap.get(paymentMethod) || 0 }))

  return {
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      accountNumber: a.accountNumber,
      bankName: a.bankName,
      ifscCode: a.ifscCode,
      isActive: a.isActive,
      description: a.description,
      openingBalance: a.openingBalance,
      currentBalance: a.currentBalance,
      createdAt: a.createdAt.toISOString(),
      transactionCount: a._count.transactions,
    })),
    totalCash,
    totalBank,
    totalUPI,
    totalCard,
    grandTotal: totalCash + totalBank,
    channelBalances,
    bankBreakdown,
    cashBreakdown,
    recentTransactions: recentTxns.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      accountId: t.accountId,
      accountName: t.account.name,
      type: t.type,
      amount: t.amount,
      category: t.category,
      paymentMethod: t.paymentMethod,
      description: t.description,
    })),
  }
}

// ============================================
// CREATE ACCOUNT
// ============================================

export async function createAccount(data: {
  name: string
  type: string
  accountNumber?: string
  bankName?: string
  ifscCode?: string
  description?: string
  openingBalance?: number
  scope?: string
}): Promise<{ success: boolean; message: string; account?: any }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.name?.trim()) return { success: false, message: "Account name is required" }
    if (!data.type) return { success: false, message: "Account type is required" }

    const balance = Number(data.openingBalance) || 0

    const newAccount = await prisma.financialAccount.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        accountNumber: data.accountNumber?.trim() || null,
        bankName: data.bankName?.trim() || null,
        ifscCode: data.ifscCode?.trim() || null,
        description: data.description?.trim() || null,
        openingBalance: balance,
        currentBalance: balance,
        scope: data.scope || "HOSPITAL",
        isActive: true,
      },
    })

    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
    revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance/cash-bank/petty-cash")
    revalidatePath("/dashboard/master-finance/settings/opening-balances")
    revalidatePath("/dashboard/master-finance/statements/balance-sheet")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/finance/accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "FinancialAccount",
      changes: { id: newAccount.id, name: data.name, type: data.type, openingBalance: balance },
    })

    return { success: true, message: `Account "${data.name}" created successfully`, account: newAccount }
  } catch (error) {
    console.error("[ERROR] createAccount:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// UPDATE ACCOUNT
// ============================================

export async function updateAccount(
  id: string,
  data: {
    name?: string
    type?: string
    accountNumber?: string
    bankName?: string
    ifscCode?: string
    description?: string
    openingBalance?: number
  }
): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const account = await prisma.financialAccount.findFirst({ where: hospitalAccountWhere({ id }) })
    if (!account) return { success: false, message: "Hospital account not found" }

    await prisma.$transaction(async (tx) => {
      const openingBalance = data.openingBalance !== undefined ? Number(data.openingBalance) : account.openingBalance
      const openingDelta = openingBalance - account.openingBalance
      await tx.financialAccount.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber.trim() || null }),
          ...(data.bankName !== undefined && { bankName: data.bankName.trim() || null }),
          ...(data.ifscCode !== undefined && { ifscCode: data.ifscCode.trim() || null }),
          ...(data.description !== undefined && { description: data.description.trim() || null }),
          openingBalance,
          ...(openingDelta !== 0 && { currentBalance: { increment: openingDelta } }),
        },
      })
    })

    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
    revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance/cash-bank/petty-cash")
    revalidatePath("/dashboard/master-finance/settings/opening-balances")
    revalidatePath("/dashboard/master-finance/statements/balance-sheet")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/finance/accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "FinancialAccount",
      changes: { id, ...data },
    })

    return { success: true, message: "Account updated successfully" }
  } catch (error) {
    console.error("[ERROR] updateAccount:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// DEACTIVATE ACCOUNT (soft-delete)
// ============================================

export async function deactivateAccount(
  id: string
): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const account = await prisma.financialAccount.findUnique({ where: { id } })
    if (!account) return { success: false, message: "Account not found" }

    if (Math.abs(account.currentBalance) > 0.01) {
      return {
        success: false,
        message: `Cannot deactivate — balance is ₹${account.currentBalance.toLocaleString("en-IN")}. Transfer or settle remaining funds first.`,
      }
    }

    await prisma.financialAccount.update({
      where: { id },
      data: { isActive: false },
    })

    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
    revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance/cash-bank/petty-cash")
    revalidatePath("/dashboard/master-finance/settings/opening-balances")
    revalidatePath("/dashboard/master-finance/statements/balance-sheet")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/finance/accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "FinancialAccount",
      changes: { id, name: account.name },
    })

    return { success: true, message: `Account "${account.name}" deactivated successfully` }
  } catch (error) {
    console.error("[ERROR] deactivateAccount:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// CONSOLIDATE HOSPITAL CASH/BANK ACCOUNTS
// ============================================

export async function consolidateHospitalAccounts(): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.$transaction(async (tx) => {
      const accounts = await tx.financialAccount.findMany({
        where: hospitalAccountWhere({ isActive: true, type: { in: ["BANK", "CASH", "PETTY_CASH"] } }),
        orderBy: { createdAt: "asc" },
      })

      for (const type of ["BANK", "CASH"] as const) {
        const sourceAccounts = accounts.filter((account) => type === "CASH" ? ["CASH", "PETTY_CASH"].includes(account.type) : account.type === "BANK")
        if (sourceAccounts.length <= 1) continue

        const canonical = sourceAccounts.find((account) => account.name === (type === "BANK" ? "Hospital Bank Account" : "Hospital Cash Account")) || sourceAccounts[0]
        const duplicates = sourceAccounts.filter((account) => account.id !== canonical.id)
        const duplicateIds = duplicates.map((account) => account.id)
        const totalOpening = sourceAccounts.reduce((sum, account) => sum + account.openingBalance, 0)
        const totalCurrent = sourceAccounts.reduce((sum, account) => sum + account.currentBalance, 0)

        await tx.transaction.updateMany({ where: { accountId: { in: duplicateIds } }, data: { accountId: canonical.id } })
        await tx.supplierPayment.updateMany({ where: { accountId: { in: duplicateIds } }, data: { accountId: canonical.id } })
        await tx.voucherEntry.updateMany({ where: { financialAccountId: { in: duplicateIds } }, data: { financialAccountId: canonical.id } })
        await tx.financialAccount.update({
          where: { id: canonical.id },
          data: {
            name: type === "BANK" ? "Hospital Bank Account" : "Hospital Cash Account",
            type,
            openingBalance: totalOpening,
            currentBalance: totalCurrent,
            isActive: true,
          },
        })
        await tx.financialAccount.updateMany({ where: { id: { in: duplicateIds } }, data: { isActive: false, currentBalance: 0 } })
      }
    })

    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
    revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
    revalidatePath("/dashboard/master-finance/vouchers")
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "FinancialAccount", changes: { operation: "CONSOLIDATE_HOSPITAL_CASH_BANK" } })
    return { success: true, message: "Hospital bank and cash accounts consolidated successfully" }
  } catch (error) {
    console.error("[ERROR] consolidateHospitalAccounts:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// TRANSFER BETWEEN ACCOUNTS
// ============================================

export async function transferBetweenAccounts(data: {
  fromAccountId: string
  toAccountId: string
  amount: number
  notes?: string
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (data.fromAccountId === data.toAccountId) {
      return { success: false, message: "Cannot transfer to the same account" }
    }
    if (!data.amount || data.amount <= 0) {
      return { success: false, message: "Amount must be greater than 0" }
    }

    const fromAccount = await prisma.financialAccount.findUnique({ where: { id: data.fromAccountId } })
    const toAccount = await prisma.financialAccount.findUnique({ where: { id: data.toAccountId } })

    if (!fromAccount || !toAccount) {
      return { success: false, message: "One or both accounts not found" }
    }
    if (fromAccount.scope !== "HOSPITAL" || toAccount.scope !== "HOSPITAL") {
      return { success: false, message: "Hospital account transfers cannot use Pharmacy accounts" }
    }
    if (fromAccount.currentBalance < data.amount) {
      return {
        success: false,
        message: `Insufficient balance in "${fromAccount.name}" (₹${fromAccount.currentBalance.toLocaleString("en-IN")})`,
      }
    }

    const desc = data.notes?.trim() || `Transfer: ${fromAccount.name} → ${toAccount.name}`

    await prisma.$transaction([
      // Debit from source
      prisma.transaction.create({
        data: {
          accountId: data.fromAccountId,
          type: "EXPENSE",
          amount: data.amount,
          category: "Transfer Out",
          paymentMethod: "BANK_TRANSFER",
          scope: "HOSPITAL",
          description: desc,
        },
      }),
      prisma.financialAccount.update({
        where: { id: data.fromAccountId },
        data: { currentBalance: { decrement: data.amount } },
      }),
      // Credit to destination
      prisma.transaction.create({
        data: {
          accountId: data.toAccountId,
          type: "INCOME",
          amount: data.amount,
          category: "Transfer In",
          paymentMethod: "BANK_TRANSFER",
          scope: "HOSPITAL",
          description: desc,
        },
      }),
      prisma.financialAccount.update({
        where: { id: data.toAccountId },
        data: { currentBalance: { increment: data.amount } },
      }),
    ])

    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
    revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance/settings/opening-balances")
    revalidatePath("/dashboard/master-finance/statements/balance-sheet")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/finance/accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "AccountTransfer",
      changes: {
        from: fromAccount.name,
        to: toAccount.name,
        amount: data.amount,
      },
    })

    return {
      success: true,
      message: `₹${data.amount.toLocaleString("en-IN")} transferred from "${fromAccount.name}" to "${toAccount.name}"`,
    }
  } catch (error) {
    console.error("[ERROR] transferBetweenAccounts:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// GET ACCOUNT TRANSACTIONS (paginated)
// ============================================

export async function getAccountTransactions(
  accountId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  transactions: {
    id: string
    date: string
    type: string
    amount: number
    category: string
    paymentMethod: string
    description: string | null
  }[]
  total: number
  pages: number
}> {
  await requireAuth()

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: hospitalTransactionWhere({ accountId }),
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where: hospitalTransactionWhere({ accountId }) }),
  ])

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      type: t.type,
      amount: t.amount,
      category: t.category,
      paymentMethod: t.paymentMethod,
      description: t.description,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  }
}
