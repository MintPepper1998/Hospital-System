"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { hospitalAccountWhere, hospitalTransactionWhere } from "@/lib/finance-scope"
import type { Prisma } from "@prisma/client"

// ═══════════════════════════════════════════════════════════════════
// FISCAL YEAR
// ═══════════════════════════════════════════════════════════════════

export async function getFiscalYears() {
  return prisma.fiscalYear.findMany({
    orderBy: { startDate: "desc" },
  })
}

export async function getActiveFiscalYear() {
  return prisma.fiscalYear.findFirst({
    where: { isActive: true },
    orderBy: { startDate: "desc" },
  })
}

export async function createFiscalYear(data: {
  name: string
  startDate: string
  endDate: string
}) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

  // Deactivate all others
  await prisma.fiscalYear.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  })

  const fy = await prisma.fiscalYear.create({
    data: {
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: true,
    },
  })

  revalidatePath("/dashboard/master-finance/cash-bank/accounts")
  revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
  revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
  revalidatePath("/dashboard/master-finance/settings/opening-balances")
  revalidatePath("/dashboard/master-finance/general-ledger")
  revalidatePath("/dashboard/master-finance/vouchers")
  revalidatePath("/dashboard/master-finance/day-book")
  revalidatePath("/dashboard/master-finance/statements/balance-sheet")
  revalidatePath("/dashboard/master-finance")
  revalidatePath("/dashboard/finance")
  revalidatePath("/dashboard/finance/accounts")
  return fy
}

export async function closeFiscalYear(id: string) {
  await requireAuth(["SUPER_ADMIN"])

  await prisma.fiscalYear.update({
    where: { id },
    data: { isClosed: true, isActive: false },
  })

  revalidatePath("/dashboard/master-finance/cash-bank/accounts")
  revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
  revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
  revalidatePath("/dashboard/master-finance/settings/opening-balances")
  revalidatePath("/dashboard/master-finance/general-ledger")
  revalidatePath("/dashboard/master-finance/vouchers")
  revalidatePath("/dashboard/master-finance/day-book")
  revalidatePath("/dashboard/master-finance/statements/balance-sheet")
  revalidatePath("/dashboard/master-finance")
  revalidatePath("/dashboard/finance")
  revalidatePath("/dashboard/finance/accounts")
}

// ═══════════════════════════════════════════════════════════════════
// VOUCHER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export interface VoucherEntryInput {
  accountGroupCode: string
  financialAccountId?: string
  debitAmount: number
  creditAmount: number
  narration?: string
}

export async function getHospitalBankAccounts() {
  const session = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!session.ok) return { success: false as const, message: session.error, data: [] }

  const accounts = await prisma.financialAccount.findMany({
    where: hospitalAccountWhere({ isActive: true }),
    select: {
      id: true,
      name: true,
      type: true,
      bankName: true,
      accountNumber: true,
      currentBalance: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })

  return { success: true as const, data: accounts }
}

async function getNextVoucherNumber(type: string): Promise<string> {
  const prefix = type === "JOURNAL" ? "JV" : type === "RECEIPT" ? "RV" : type === "PAYMENT" ? "PV" : "CV"
  const count = await prisma.voucher.count({
    where: { voucherType: type, voucherNumber: { startsWith: `${prefix}-` } },
  })
  return `${prefix}-${String(count + 1).padStart(5, "0")}`
}

export async function createVoucher(data: {
  voucherType: string
  date: string
  narration?: string
  entries: VoucherEntryInput[]
}) {
  const session = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!session.ok) throw new Error(session.error)

  // Validate: total debits must equal total credits
  const totalDebit = data.entries.reduce((s, e) => s + e.debitAmount, 0)
  const totalCredit = data.entries.reduce((s, e) => s + e.creditAmount, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Debit (₹${totalDebit.toFixed(2)}) ≠ Credit (₹${totalCredit.toFixed(2)}). Entries must balance.`)
  }

  if (data.entries.length < 2) {
    throw new Error("A voucher must have at least 2 entries (debit + credit)")
  }

  const voucherNumber = await getNextVoucherNumber(data.voucherType)

  const voucher = await prisma.$transaction(async (tx) => {
    const financialAccountIds = data.entries
      .map((entry) => entry.financialAccountId)
      .filter((id): id is string => Boolean(id))

    const financialAccounts = financialAccountIds.length
      ? await tx.financialAccount.findMany({
          where: hospitalAccountWhere({ id: { in: financialAccountIds }, isActive: true }),
          select: { id: true, name: true, currentBalance: true },
        })
      : []

    if (financialAccounts.length !== new Set(financialAccountIds).size) {
      throw new Error("One or more selected bank/cash accounts are unavailable in Hospital Finance")
    }

    const balanceChanges = new Map<string, number>()
    for (const entry of data.entries) {
      if (!entry.financialAccountId) continue
      balanceChanges.set(
        entry.financialAccountId,
        (balanceChanges.get(entry.financialAccountId) || 0) + entry.debitAmount - entry.creditAmount,
      )
    }

    for (const [accountId, balanceChange] of balanceChanges) {
      const account = financialAccounts.find((candidate) => candidate.id === accountId)
      if (!account) throw new Error("Selected bank account not found")

      if (balanceChange < 0 && account.currentBalance < Math.abs(balanceChange)) {
        throw new Error(`Insufficient balance in bank account "${account.name}"`)
      }

      await tx.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: { increment: balanceChange } },
      })
    }

    return tx.voucher.create({
      data: {
        voucherNumber,
        voucherType: data.voucherType,
        date: new Date(`${data.date}T12:00:00+05:30`),
        narration: data.narration,
        totalAmount: totalDebit,
        status: "POSTED",
        createdBy: session.session.name || "System",
        entries: {
          create: data.entries.map((e) => ({
            accountGroupCode: e.accountGroupCode,
            financialAccountId: e.financialAccountId || null,
            debitAmount: e.debitAmount,
            creditAmount: e.creditAmount,
            narration: e.narration,
          })),
        },
      },
      include: { entries: true },
    })
  })

  revalidatePath("/dashboard/master-finance/cash-bank/accounts")
  revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
  revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
  revalidatePath("/dashboard/master-finance/settings/opening-balances")
  revalidatePath("/dashboard/master-finance/general-ledger")
  revalidatePath("/dashboard/master-finance/vouchers")
  revalidatePath("/dashboard/master-finance/day-book")
  revalidatePath("/dashboard/master-finance/statements/balance-sheet")
  revalidatePath("/dashboard/master-finance")
  revalidatePath("/dashboard/finance")
  revalidatePath("/dashboard/finance/accounts")
  return voucher
}

export async function getVouchers(params?: {
  from?: string
  to?: string
  type?: string
  page?: number
  limit?: number
}) {
  const page = params?.page || 1
  const limit = params?.limit || 50
  const skip = (page - 1) * limit

  const where: Prisma.VoucherWhereInput = {
    status: { not: "CANCELLED" },
    voucherNumber: { not: { startsWith: "PH-" } },
  }

  if (params?.from || params?.to) {
    where.date = {}
    if (params.from) where.date.gte = new Date(`${params.from}T00:00:00+05:30`)
    if (params.to) where.date.lte = new Date(`${params.to}T23:59:59.999+05:30`)
  }
  if (params?.type) where.voucherType = params.type

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: {
        entries: {
          include: {
            financialAccount: {
              select: { id: true, name: true, bankName: true, type: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.voucher.count({ where }),
  ])

  return { vouchers, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function cancelVoucher(id: string) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

  await prisma.$transaction(async (tx) => {
    const voucher = await tx.voucher.findUnique({
      where: { id },
      include: { entries: true },
    })
    if (!voucher) throw new Error("Voucher not found")
    if (voucher.status === "CANCELLED") return

    for (const entry of voucher.entries) {
      if (!entry.financialAccountId) continue
      await tx.financialAccount.update({
        where: { id: entry.financialAccountId },
        data: {
          currentBalance: { increment: entry.creditAmount - entry.debitAmount },
        },
      })
    }

    await tx.voucher.update({
      where: { id },
      data: { status: "CANCELLED" },
    })
  })

  revalidatePath("/dashboard/master-finance/cash-bank/accounts")
  revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
  revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
  revalidatePath("/dashboard/master-finance/settings/opening-balances")
  revalidatePath("/dashboard/master-finance/general-ledger")
  revalidatePath("/dashboard/master-finance/vouchers")
  revalidatePath("/dashboard/master-finance/day-book")
  revalidatePath("/dashboard/master-finance/statements/balance-sheet")
  revalidatePath("/dashboard/master-finance")
  revalidatePath("/dashboard/finance")
  revalidatePath("/dashboard/finance/accounts")
}

// ═══════════════════════════════════════════════════════════════════
// GENERAL LEDGER QUERIES
// ═══════════════════════════════════════════════════════════════════

export async function getGeneralLedger(params: {
  from: string
  to: string
  accountGroupCode?: string
  scope?: string
}) {
  const startDate = new Date(`${params.from}T00:00:00+05:30`)
  const endDate = new Date(`${params.to}T23:59:59.999+05:30`)

  // General Ledger in Master Finance is strictly Hospital only
  const where: Prisma.TransactionWhereInput = {
    date: { gte: startDate, lte: endDate },
    scope: "HOSPITAL",
  }
  if (params.accountGroupCode) where.accountGroupCode = params.accountGroupCode

  const transactions = await prisma.transaction.findMany({
    where,
    include: { account: true },
    orderBy: { date: "asc" },
    take: 1000,
  })

  // Master Finance vouchers (Voucher & VoucherEntry) - Hospital scope
  // If accountGroupCode is specified, find vouchers that touch this accountGroupCode
  const voucherWhere: Prisma.VoucherWhereInput = {
    date: { gte: startDate, lte: endDate },
    status: "POSTED",
    voucherNumber: { not: { startsWith: "PH-" } },
  }
  if (params.accountGroupCode) {
    voucherWhere.entries = {
      some: {
        accountGroupCode: params.accountGroupCode,
      },
    }
  }

  const voucherEntries = await prisma.voucherEntry.findMany({
    where: {
      voucher: voucherWhere,
    },
    include: {
      voucher: true,
      financialAccount: {
        select: { id: true, name: true, bankName: true, type: true },
      },
    },
    orderBy: [{ voucher: { date: "asc" } }, { debitAmount: "desc" }],
    take: 2000,
  })

  // Pharmacy Vouchers are completely excluded from Master Finance General Ledger
  const pharmacyVouchers: never[] = []

  // Get account groups for name lookup (Hospital scoped)
  const accountGroups = await prisma.accountGroup.findMany({
    where: { isActive: true, scope: { in: ["HOSPITAL", "BOTH"] } },
  })
  const groupMap = new Map(accountGroups.map((g) => [g.code, g.name]))

  return { transactions, voucherEntries, pharmacyVouchers, groupMap: Object.fromEntries(groupMap) }
}

// ═══════════════════════════════════════════════════════════════════
// DAY BOOK
// ═══════════════════════════════════════════════════════════════════

export async function getDayBook(date: string) {
  const startDate = new Date(`${date}T00:00:00+05:30`)
  const endDate = new Date(`${date}T23:59:59.999+05:30`)

  const [transactions, vouchers] = await Promise.all([
    prisma.transaction.findMany({
      where: hospitalTransactionWhere({ date: { gte: startDate, lte: endDate } }),
      include: { account: true },
      orderBy: { date: "asc" },
    }),
    prisma.voucher.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: "POSTED",
      },
      include: { entries: true },
      orderBy: { date: "asc" },
    }),
  ])

  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

  return { transactions, vouchers, totalIncome, totalExpense, netFlow: totalIncome - totalExpense }
}

// ═══════════════════════════════════════════════════════════════════
// FINANCIAL DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export async function getFinanceDashboardData() {
  const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const startOfDay = new Date(todayIst.getFullYear(), todayIst.getMonth(), todayIst.getDate())
  const startOfMonth = new Date(todayIst.getFullYear(), todayIst.getMonth(), 1)

  // Financial year start (Apr 1)
  const fyStartMonth = todayIst.getMonth() >= 3 ? todayIst.getFullYear() : todayIst.getFullYear() - 1
  const startOfFY = new Date(fyStartMonth, 3, 1) // April 1

  const endOfDay = new Date(startOfDay)
  endOfDay.setHours(23, 59, 59, 999)

  const pharmacyBillingIds = await prisma.billing.findMany({
    where: { type: "PHARMACY" },
    select: { id: true },
  })

  const [
    accounts,
    todayIncome,
    todayExpense,
    monthIncome,
    monthExpense,
    ytdIncome,
    ytdExpense,
    pendingReceivables,
    pendingPayables,
    recentTransactions,
  ] = await Promise.all([
    // Cash position
    prisma.financialAccount.findMany({
      where: hospitalAccountWhere({ isActive: true }),
      orderBy: { name: "asc" },
    }),
    // Today income
    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({ date: { gte: startOfDay, lte: endOfDay }, type: "INCOME" }),
      _sum: { amount: true },
    }),
    // Today expense
    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({ date: { gte: startOfDay, lte: endOfDay }, type: "EXPENSE" }),
      _sum: { amount: true },
    }),
    // Month income
    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({ date: { gte: startOfMonth }, type: "INCOME" }),
      _sum: { amount: true },
    }),
    // Month expense
    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({ date: { gte: startOfMonth }, type: "EXPENSE" }),
      _sum: { amount: true },
    }),
    // YTD income
    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({ date: { gte: startOfFY }, type: "INCOME" }),
      _sum: { amount: true },
    }),
    // YTD expense
    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({ date: { gte: startOfFY }, type: "EXPENSE" }),
      _sum: { amount: true },
    }),
    // Pending receivables (credit entries)
    prisma.creditEntry.aggregate({
      where: {
        status: { not: "PAID" },
        NOT: { referenceType: "BILLING", referenceId: { in: pharmacyBillingIds.map((bill) => bill.id) } },
      },
      _sum: { balanceAmount: true },
      _count: true,
    }),
    // Pending payables (unpaid purchase invoices)
    prisma.purchaseInvoice.findMany({
      where: { status: { in: ["UNPAID", "PARTIAL"] }, items: { none: { medicineId: { not: null } } } },
      select: { grandTotal: true, amountPaid: true },
    }),
    // Recent transactions
    prisma.transaction.findMany({
      where: hospitalTransactionWhere(),
      include: { account: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ])

  const totalCashPosition = accounts.reduce((s, a) => s + a.currentBalance, 0)
  const totalPayableAmount = pendingPayables.reduce((s, p) => s + (p.grandTotal - p.amountPaid), 0)

  // Revenue by department (MTD)
  const deptRevenue = await prisma.transaction.groupBy({
    by: ["billingType"],
    where: hospitalTransactionWhere({
      date: { gte: startOfMonth },
      type: "INCOME",
      billingType: { not: null },
    }),
    _sum: { amount: true },
  })

  return {
    cashPosition: {
      total: totalCashPosition,
      accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: a.currentBalance })),
    },
    today: {
      income: todayIncome._sum.amount || 0,
      expense: todayExpense._sum.amount || 0,
      net: (todayIncome._sum.amount || 0) - (todayExpense._sum.amount || 0),
    },
    month: {
      income: monthIncome._sum.amount || 0,
      expense: monthExpense._sum.amount || 0,
      net: (monthIncome._sum.amount || 0) - (monthExpense._sum.amount || 0),
    },
    ytd: {
      income: ytdIncome._sum.amount || 0,
      expense: ytdExpense._sum.amount || 0,
      net: (ytdIncome._sum.amount || 0) - (ytdExpense._sum.amount || 0),
    },
    receivables: {
      total: pendingReceivables._sum.balanceAmount || 0,
      count: pendingReceivables._count || 0,
    },
    payables: {
      total: totalPayableAmount,
      count: pendingPayables.length,
    },
    departmentRevenue: deptRevenue.map((d) => ({
      department: d.billingType || "OTHER",
      amount: d._sum.amount || 0,
    })),
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      type: t.type,
      amount: t.amount,
      category: t.category,
      accountName: t.account.name,
      description: t.description,
      paymentMethod: t.paymentMethod,
    })),
  }
}

// ═══════════════════════════════════════════════════════════════════
// TRIAL BALANCE
// ═══════════════════════════════════════════════════════════════════

export async function getTrialBalance(params: { from: string; to: string }) {
  const startDate = new Date(`${params.from}T00:00:00+05:30`)
  const endDate = new Date(`${params.to}T23:59:59.999+05:30`)

  // Get all account groups (Hospital scoped)
  const accountGroups = await prisma.accountGroup.findMany({
    where: { isActive: true, scope: { in: ["HOSPITAL", "BOTH"] } },
    orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
  })

  // Aggregate transactions by accountGroupCode
  const aggregation = await prisma.transaction.groupBy({
    by: ["accountGroupCode", "type"],
    where: hospitalTransactionWhere({
      date: { gte: startDate, lte: endDate },
      accountGroupCode: { not: null },
    }),
    _sum: { amount: true },
  })

  // Also aggregate voucher entries
  const voucherAgg = await prisma.voucherEntry.groupBy({
    by: ["accountGroupCode"],
    where: {
      voucher: {
        date: { gte: startDate, lte: endDate },
        status: "POSTED",
      },
    },
    _sum: { debitAmount: true, creditAmount: true },
  })

  // Build trial balance rows
  const rows: Array<{
    code: string
    name: string
    nature: string
    debit: number
    credit: number
  }> = []

  for (const group of accountGroups) {
    let debit = 0
    let credit = 0

    // From transactions
    for (const agg of aggregation) {
      if (agg.accountGroupCode === group.code) {
        const amount = agg._sum.amount || 0
        if (agg.type === "EXPENSE") debit += amount
        else if (agg.type === "INCOME") credit += amount
      }
    }

    // From voucher entries
    for (const v of voucherAgg) {
      if (v.accountGroupCode === group.code) {
        debit += v._sum.debitAmount || 0
        credit += v._sum.creditAmount || 0
      }
    }

    if (debit > 0 || credit > 0) {
      rows.push({
        code: group.code,
        name: group.name,
        nature: group.nature,
        debit: Number(debit.toFixed(2)),
        credit: Number(credit.toFixed(2)),
      })
    }
  }

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const difference = Math.abs(totalDebit - totalCredit)

  return {
    rows,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    isBalanced: difference < 0.01,
    difference: Number(difference.toFixed(2)),
  }
}
