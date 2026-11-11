"use server"

import { prisma } from "@/lib/prisma"
import { hospitalAccountWhere, hospitalBillingWhere, hospitalPurchaseWhere, hospitalTransactionWhere } from "@/lib/finance-scope"
import { requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

// ═══════════════════════════════════════════════════════════════════
// PAYROLL — Salary Processing & Payroll Journal
// ═══════════════════════════════════════════════════════════════════

function parseDisbursementDate(dateInput?: string | Date): Date {
  if (!dateInput) return new Date()
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? new Date() : dateInput

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim()
    const parts = trimmed.split("-")
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10) - 1
      const d = parseInt(parts[2], 10)
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 12, 0, 0)
      }
    }
    const parsed = new Date(trimmed)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }
  return new Date()
}

export async function getPayrollData(params: { month?: string; year?: number }) {
  const now = new Date()
  const year = params.year || now.getFullYear()
  const month = params.month || String(now.getMonth() + 1).padStart(2, "0")

  const [employees, allRecords, accounts] = await Promise.all([
    prisma.employee.findMany({
      include: {
        salaryRecords: {
          where: { year, month },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.salaryRecord.findMany({
      where: { year, month },
      include: { employee: { select: { name: true, department: true, role: true } } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.financialAccount.findMany({
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
    }),
  ])

  // Fetch transaction details for vouchers
  const txIds = allRecords.map((r) => r.transactionId).filter((id): id is string => Boolean(id))
  const txList = txIds.length > 0 ? await prisma.transaction.findMany({
    where: { id: { in: txIds } },
    include: { account: { select: { id: true, name: true, type: true } } },
  }) : []
  const txMap = new Map(txList.map((t) => [t.id, t]))

  const totalBasic = employees.reduce((s, e) => s + e.basicSalary, 0)
  const totalPaid = allRecords.reduce((s, r) => s + r.amountPaid, 0)
  const totalBonus = allRecords.reduce((s, r) => s + r.bonus, 0)
  const totalDeductions = allRecords.reduce((s, r) => s + r.deductions, 0)
  const paidCount = allRecords.length
  const pendingCount = employees.length - paidCount

  // Department breakdown
  const deptMap = new Map<string, { count: number; paid: number; basic: number }>()
  for (const emp of employees) {
    const dept = emp.department || "General"
    const existing = deptMap.get(dept) || { count: 0, paid: 0, basic: 0 }
    existing.count++
    existing.basic += emp.basicSalary
    const record = emp.salaryRecords[0]
    if (record) existing.paid += record.amountPaid
    deptMap.set(dept, existing)
  }

  const departments = Array.from(deptMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.paid - a.paid)

  return {
    employees: employees.map((e) => {
      const rec = e.salaryRecords[0]
      const tx = rec?.transactionId ? txMap.get(rec.transactionId) : null
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        department: e.department,
        basicSalary: e.basicSalary,
        record: rec ? {
          id: rec.id,
          amountPaid: rec.amountPaid,
          bonus: rec.bonus,
          deductions: rec.deductions,
          status: rec.status,
          paymentDate: rec.paymentDate.toISOString(),
          transactionId: rec.transactionId,
          voucherNumber: tx?.referenceId || null,
          accountName: tx?.account?.name || null,
          paymentMethod: tx?.paymentMethod || null,
        } : null,
      }
    }),
    records: allRecords.map((r) => {
      const tx = r.transactionId ? txMap.get(r.transactionId) : null
      return {
        ...r,
        voucherNumber: tx?.referenceId || null,
        accountName: tx?.account?.name || null,
        paymentMethod: tx?.paymentMethod || null,
      }
    }),
    accounts,
    totalBasic,
    totalPaid,
    totalBonus,
    totalDeductions,
    paidCount,
    pendingCount,
    departments,
    year,
    month,
  }
}

export async function processMasterFinanceSalary(params: {
  employeeId: string
  month: string
  year: number
  accountId: string
  basicSalary: number
  bonus?: number
  deductions?: number
  paymentMethod?: string
  paymentDate?: string | Date
  notes?: string
}) {
  const session = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!session.ok) return { success: false, message: session.error }

  const bonus = Number(params.bonus) || 0
  const deductions = Number(params.deductions) || 0
  const basicSalary = Number(params.basicSalary) || 0
  const finalAmount = Math.round((basicSalary + bonus - deductions) * 100) / 100

  if (finalAmount <= 0) {
    return { success: false, message: "Net payable salary must be greater than zero." }
  }

  const disburseDate = parseDisbursementDate(params.paymentDate)
  const disburseDateStr = disburseDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: params.employeeId },
      })
      if (!employee) throw new Error("Employee not found")

      const existing = await tx.salaryRecord.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: params.employeeId,
            month: params.month,
            year: params.year,
          },
        },
      })
      if (existing) {
        throw new Error(`Salary has already been processed for ${employee.name} for ${params.month}/${params.year}.`)
      }

      const account = await tx.financialAccount.findFirst({
        where: hospitalAccountWhere({ id: params.accountId, isActive: true }),
      })
      if (!account) {
        throw new Error("Selected disbursement account not found or inactive")
      }
      if (account.currentBalance < finalAmount) {
        throw new Error(`Insufficient funds in ${account.name}. Available: ₹${account.currentBalance.toLocaleString("en-IN")}, Required: ₹${finalAmount.toLocaleString("en-IN")}`)
      }

      // 1. Generate Next Voucher Number
      const count = await tx.voucher.count({ where: { voucherType: "PAYMENT" } })
      const voucherNumber = `PV-${String(count + 1).padStart(5, "0")}`

      // 2. Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          date: disburseDate,
          type: "EXPENSE",
          amount: finalAmount,
          category: "SALARY",
          paymentMethod: params.paymentMethod || "BANK_TRANSFER",
          scope: "HOSPITAL",
          accountGroupCode: "EXPENSES",
          referenceId: voucherNumber,
          description: `Salary disbursement for ${employee.name} (${params.month}/${params.year}) on ${disburseDateStr}${params.notes ? ` - ${params.notes}` : ""} [Voucher: ${voucherNumber}]`,
        },
      })

      // 3. Deduct from financial account
      await tx.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: { decrement: finalAmount } },
      })

      // 4. Create SalaryRecord with specified payment date
      const salaryRecord = await tx.salaryRecord.create({
        data: {
          employeeId: employee.id,
          month: params.month,
          year: params.year,
          amountPaid: finalAmount,
          bonus,
          deductions,
          paymentDate: disburseDate,
          status: "PAID",
          transactionId: transaction.id,
        },
      })

      // 5. Create Master Finance Voucher with balanced double entries
      await tx.voucher.create({
        data: {
          voucherNumber,
          voucherType: "PAYMENT",
          date: disburseDate,
          narration: `Payroll disbursement to ${employee.name} (${employee.department || "General"} - ${employee.role}) for period ${params.month}/${params.year} on ${disburseDateStr}. Base: ₹${basicSalary.toLocaleString("en-IN")}, Bonus: ₹${bonus.toLocaleString("en-IN")}, Deductions: ₹${deductions.toLocaleString("en-IN")}. Paid via ${account.name}.${params.notes ? ` Notes: ${params.notes}` : ""}`,
          totalAmount: finalAmount,
          status: "POSTED",
          createdBy: session.session.name || "Finance Officer",
          entries: {
            create: [
              {
                accountGroupCode: "EXPENSES",
                narration: `Salary & Wages Expense - ${employee.name} (${params.month}/${params.year})`,
                debitAmount: finalAmount,
                creditAmount: 0,
              },
              {
                accountGroupCode: "ASSETS",
                financialAccountId: account.id,
                narration: `Paid from ${account.name} (${account.type})`,
                debitAmount: 0,
                creditAmount: finalAmount,
              },
            ],
          },
        },
      })

      // Update employee's default basicSalary if changed
      if (basicSalary !== employee.basicSalary) {
        await tx.employee.update({
          where: { id: employee.id },
          data: { basicSalary },
        })
      }

      return {
        employeeName: employee.name,
        voucherNumber,
        salaryRecordId: salaryRecord.id,
        paymentDate: disburseDate.toISOString(),
      }
    })

    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/payroll")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance/day-book")
    revalidatePath("/dashboard/master-finance/statements/balance-sheet")
    revalidatePath("/dashboard/hr/payroll")

    return {
      success: true,
      message: `Salary for ${result.employeeName} successfully disbursed on ${disburseDateStr}. Voucher #${result.voucherNumber} posted to General Ledger & Day Book.`,
      voucherNumber: result.voucherNumber,
      paymentDate: result.paymentDate,
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to process salary" }
  }
}

export async function batchProcessMasterFinanceSalaries(params: {
  month: string
  year: number
  accountId: string
  paymentMethod?: string
  paymentDate?: string | Date
}) {
  const session = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!session.ok) return { success: false, message: session.error }

  const disburseDate = parseDisbursementDate(params.paymentDate)
  const disburseDateStr = disburseDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  try {
    const account = await prisma.financialAccount.findFirst({
      where: hospitalAccountWhere({ id: params.accountId, isActive: true }),
    })
    if (!account) return { success: false, message: "Selected payment account not found" }

    // Find all unpaid employees for this month/year
    const employees = await prisma.employee.findMany({
      where: {
        salaryRecords: {
          none: {
            month: params.month,
            year: params.year,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    if (employees.length === 0) {
      return { success: false, message: `All employees have already been disbursed for ${params.month}/${params.year}.` }
    }

    const eligibleEmployees = employees.filter((e) => e.basicSalary > 0)
    if (eligibleEmployees.length === 0) {
      return { success: false, message: "No salary amounts configured for pending employees." }
    }

    const totalBatchAmount = eligibleEmployees.reduce((sum, e) => sum + e.basicSalary, 0)

    if (account.currentBalance < totalBatchAmount) {
      return {
        success: false,
        message: `Insufficient balance in ${account.name}. Required: ₹${totalBatchAmount.toLocaleString("en-IN")}, Available: ₹${account.currentBalance.toLocaleString("en-IN")}`,
      }
    }

    const processedCount = await prisma.$transaction(async (tx) => {
      let currentVoucherCount = await tx.voucher.count({ where: { voucherType: "PAYMENT" } })

      for (const emp of eligibleEmployees) {
        currentVoucherCount++
        const vNumber = `PV-${String(currentVoucherCount).padStart(5, "0")}`

        const transaction = await tx.transaction.create({
          data: {
            accountId: account.id,
            date: disburseDate,
            type: "EXPENSE",
            amount: emp.basicSalary,
            category: "SALARY",
            paymentMethod: params.paymentMethod || "BANK_TRANSFER",
            scope: "HOSPITAL",
            accountGroupCode: "EXPENSES",
            referenceId: vNumber,
            description: `Batch Salary: ${emp.name} (${params.month}/${params.year}) on ${disburseDateStr} [Voucher: ${vNumber}]`,
          },
        })

        await tx.financialAccount.update({
          where: { id: account.id },
          data: { currentBalance: { decrement: emp.basicSalary } },
        })

        await tx.salaryRecord.create({
          data: {
            employeeId: emp.id,
            month: params.month,
            year: params.year,
            amountPaid: emp.basicSalary,
            bonus: 0,
            deductions: 0,
            paymentDate: disburseDate,
            status: "PAID",
            transactionId: transaction.id,
          },
        })

        await tx.voucher.create({
          data: {
            voucherNumber: vNumber,
            voucherType: "PAYMENT",
            date: disburseDate,
            narration: `Batch payroll disbursement to ${emp.name} (${emp.department || "General"}) for ${params.month}/${params.year} on ${disburseDateStr}. Paid via ${account.name}.`,
            totalAmount: emp.basicSalary,
            status: "POSTED",
            createdBy: session.session.name || "Finance Admin",
            entries: {
              create: [
                {
                  accountGroupCode: "EXPENSES",
                  narration: `Salary & Wages Expense - ${emp.name}`,
                  debitAmount: emp.basicSalary,
                  creditAmount: 0,
                },
                {
                  accountGroupCode: "ASSETS",
                  financialAccountId: account.id,
                  narration: `Disbursed from ${account.name}`,
                  debitAmount: 0,
                  creditAmount: emp.basicSalary,
                },
              ],
            },
          },
        })
      }

      return eligibleEmployees.length
    })

    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/payroll")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance/day-book")
    revalidatePath("/dashboard/master-finance/statements/balance-sheet")

    return {
      success: true,
      message: `Batch payroll processed successfully for ${processedCount} employees on ${disburseDateStr} from ${account.name}.`,
      count: processedCount,
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to process batch payroll" }
  }
}

export async function updateMasterFinanceSalaryDate(params: {
  salaryRecordId: string
  paymentDate: string | Date
}) {
  const session = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!session.ok) return { success: false, message: session.error }

  const newDate = parseDisbursementDate(params.paymentDate)
  const newDateStr = newDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.salaryRecord.findUnique({
        where: { id: params.salaryRecordId },
        include: { employee: true },
      })
      if (!record) throw new Error("Salary record not found")

      await tx.salaryRecord.update({
        where: { id: record.id },
        data: { paymentDate: newDate },
      })

      if (record.transactionId) {
        const txRecord = await tx.transaction.findUnique({
          where: { id: record.transactionId },
        })
        if (txRecord) {
          await tx.transaction.update({
            where: { id: txRecord.id },
            data: { date: newDate },
          })

          if (txRecord.referenceId) {
            await tx.voucher.updateMany({
              where: { voucherNumber: txRecord.referenceId },
              data: { date: newDate },
            })
          }
        }
      }

      return record
    })

    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/payroll")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/master-finance/day-book")

    return {
      success: true,
      message: `Disbursement date updated to ${newDateStr} for ${updated.employee.name}.`,
      paymentDate: newDate.toISOString(),
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update disbursement date" }
  }
}

export async function updateMasterFinanceEmployeeSalary(params: {
  employeeId: string
  basicSalary: number
}) {
  const session = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!session.ok) return { success: false, message: session.error }

  const basicSalary = Number(params.basicSalary)
  if (isNaN(basicSalary) || basicSalary < 0) {
    return { success: false, message: "Valid salary amount is required." }
  }

  await prisma.employee.update({
    where: { id: params.employeeId },
    data: { basicSalary },
  })

  revalidatePath("/dashboard/master-finance/payroll")
  return { success: true, message: `Salary updated to ₹${basicSalary.toLocaleString("en-IN")}` }
}

export async function getPayrollJournal(params: { year: number }) {
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
  const monthlyData = await Promise.all(
    months.map(async (month) => {
      const records = await prisma.salaryRecord.aggregate({
        where: { year: params.year, month },
        _sum: { amountPaid: true, bonus: true, deductions: true },
        _count: true,
      })
      return {
        month,
        count: records._count,
        amountPaid: records._sum.amountPaid || 0,
        bonus: records._sum.bonus || 0,
        deductions: records._sum.deductions || 0,
        gross: (records._sum.amountPaid || 0) + (records._sum.bonus || 0),
      }
    })
  )

  const totalAnnual = monthlyData.reduce((s, m) => s + m.amountPaid, 0)
  return { monthlyData, totalAnnual, year: params.year }
}

// ═══════════════════════════════════════════════════════════════════
// FINANCIAL STATEMENTS — Trial Balance, Balance Sheet, Cash Flow
// ═══════════════════════════════════════════════════════════════════

export async function getTrialBalance(params: { from: string; to: string }) {
  const fromDate = new Date(params.from)
  const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)

  const groups = await prisma.accountGroup.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })

  const txnAggregates = await prisma.transaction.groupBy({
    by: ["accountGroupCode"],
    where: hospitalTransactionWhere({ date: { gte: fromDate, lte: toDate }, accountGroupCode: { not: null } }),
    _sum: { amount: true },
    _count: true,
  })

  const txnMap = new Map(txnAggregates.map((t) => [t.accountGroupCode, { amount: t._sum.amount || 0, count: t._count }]))

  let totalDebit = 0, totalCredit = 0
  const rows = groups.map((g) => {
    const txn = txnMap.get(g.code) || { amount: 0, count: 0 }
    const isDebit = g.nature === "DEBIT"
    if (isDebit) totalDebit += txn.amount
    else totalCredit += txn.amount

    return {
      code: g.code, name: g.name, type: g.type, nature: g.nature,
      debit: isDebit ? txn.amount : 0,
      credit: !isDebit ? txn.amount : 0,
      count: txn.count,
    }
  }).filter((r) => r.debit !== 0 || r.credit !== 0)

  return { rows, totalDebit, totalCredit, difference: totalDebit - totalCredit }
}

export async function getBalanceSheet(params: { asOf: string; scope?: string }) {
  const asOfDate = new Date(`${params.asOf}T23:59:59.999+05:30`)
  const isHospitalOnly = params.scope === "HOSPITAL"
  const isPharmacyOnly = params.scope === "PHARMACY"

  // 1. Bank & Cash Accounts (Current Assets)
  const accountWhere: Prisma.FinancialAccountWhereInput = { isActive: true }
  if (isHospitalOnly) accountWhere.scope = "HOSPITAL"
  if (isPharmacyOnly) accountWhere.scope = "PHARMACY"

  const bankCashAccounts = await prisma.financialAccount.findMany({
    where: accountWhere,
    select: { id: true, name: true, type: true, currentBalance: true, bankName: true, scope: true },
    orderBy: { name: "asc" },
  })

  const cashBankSubItems = bankCashAccounts
    .filter((a) => Math.abs(a.currentBalance || 0) > 0.01)
    .map((a) => ({
      name: `${a.name}${a.bankName ? ` (${a.bankName})` : ""} [${a.type}]`,
      amount: a.currentBalance || 0,
      type: a.type,
    }))
  const cashBankTotal = cashBankSubItems.reduce((s, a) => s + a.amount, 0)

  // 2. Patient Receivables / Outstanding Dues (Current Assets)
  const billingWhere: Prisma.BillingWhereInput = {
    billDate: { lte: asOfDate },
    balanceAmount: { gt: 0 },
    status: { not: "CANCELLED" },
  }
  const billings = await prisma.billing.findMany({
    where: billingWhere,
    select: { balanceAmount: true },
  })
  const receivablesTotal = billings.reduce((sum, b) => sum + (b.balanceAmount || 0), 0)

  // 3. Inventory & Medical Supplies (Current Assets)
  const batches = await prisma.inventoryBatch.findMany({
    where: { purchaseDate: { lte: asOfDate }, quantity: { gt: 0 }, isActive: true },
    select: { quantity: true, purchasePrice: true },
  })
  const inventoryTotal = batches.reduce((sum, b) => sum + b.quantity * b.purchasePrice, 0)

  // 4. Accounts Payable (Current Liabilities)
  const invoices = await prisma.purchaseInvoice.findMany({
    where: { date: { lte: asOfDate }, status: { not: "CANCELLED" } },
    select: { grandTotal: true, amountPaid: true },
  })
  const payablesTotal = invoices.reduce(
    (sum, i) => sum + Math.max(0, (i.grandTotal || 0) - (i.amountPaid || 0)),
    0,
  )

  // 5. Operating Performance for Retained Earnings
  const txnWhere: Prisma.TransactionWhereInput = { date: { lte: asOfDate } }
  if (isHospitalOnly) txnWhere.scope = "HOSPITAL"
  if (isPharmacyOnly) txnWhere.scope = "PHARMACY"

  const [incomeTx, expenseTx] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...txnWhere, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...txnWhere, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ])

  const totalRevenue = incomeTx._sum.amount || 0
  const totalExpenses = expenseTx._sum.amount || 0
  const netOperatingSurplus = totalRevenue - totalExpenses

  // 6. Manual Posted Vouchers (Assets, Liabilities, Equity)
  const voucherEntries = await prisma.voucherEntry.findMany({
    where: {
      voucher: { date: { lte: asOfDate }, status: "POSTED" },
    },
    include: {
      voucher: true,
      financialAccount: { select: { id: true, name: true } },
    },
  })

  // Group manual voucher entries by code
  const voucherAssetsMap = new Map<string, number>()
  const voucherLiabilitiesMap = new Map<string, number>()
  const voucherEquityMap = new Map<string, number>()

  for (const ve of voucherEntries) {
    const code = ve.accountGroupCode
    const net = ve.debitAmount - ve.creditAmount
    if (code.startsWith("1") && code !== "1100" && code !== "1200" && code !== "1300") {
      voucherAssetsMap.set(code, (voucherAssetsMap.get(code) || 0) + net)
    } else if (code.startsWith("2") && code !== "2100") {
      voucherLiabilitiesMap.set(code, (voucherLiabilitiesMap.get(code) || 0) - net)
    } else if (code.startsWith("3")) {
      voucherEquityMap.set(code, (voucherEquityMap.get(code) || 0) - net)
    }
  }

  // Account Groups for lookup
  const accountGroups = await prisma.accountGroup.findMany({ where: { isActive: true } })
  const groupNameMap = new Map(accountGroups.map((g) => [g.code, g.name]))

  // Compile Assets
  const assets: Array<{
    code: string
    name: string
    amount: number
    category: string
    subItems?: Array<{ name: string; amount: number; type?: string }>
  }> = []

  if (cashBankTotal !== 0) {
    assets.push({
      code: "1100",
      name: "Cash & Bank Balances",
      amount: cashBankTotal,
      category: "Current Assets",
      subItems: cashBankSubItems,
    })
  }

  if (receivablesTotal > 0) {
    assets.push({
      code: "1200",
      name: "Accounts Receivable (Patient Dues)",
      amount: receivablesTotal,
      category: "Current Assets",
    })
  }

  if (inventoryTotal > 0) {
    assets.push({
      code: "1300",
      name: "Inventories & Medical Supplies",
      amount: inventoryTotal,
      category: "Current Assets",
    })
  }

  for (const [code, amount] of voucherAssetsMap.entries()) {
    if (Math.abs(amount) > 0.01) {
      assets.push({
        code,
        name: groupNameMap.get(code) || `Asset Account ${code}`,
        amount,
        category: code.startsWith("15") ? "Fixed Assets" : "Other Assets",
      })
    }
  }

  // Compile Liabilities
  const liabilities: Array<{
    code: string
    name: string
    amount: number
    category: string
    subItems?: Array<{ name: string; amount: number; type?: string }>
  }> = []

  if (payablesTotal > 0) {
    liabilities.push({
      code: "2100",
      name: "Accounts Payable (Medical Suppliers & Vendors)",
      amount: payablesTotal,
      category: "Current Liabilities",
    })
  }

  for (const [code, amount] of voucherLiabilitiesMap.entries()) {
    if (Math.abs(amount) > 0.01) {
      liabilities.push({
        code,
        name: groupNameMap.get(code) || `Liability Account ${code}`,
        amount,
        category: code.startsWith("24") ? "Long-Term Borrowings" : "Current Liabilities",
      })
    }
  }

  const totalAssets = assets.reduce((s, a) => s + a.amount, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)

  // Compile Equity & Reserves
  const equity: Array<{
    code: string
    name: string
    amount: number
    category: string
    subItems?: Array<{ name: string; amount: number; type?: string }>
  }> = []

  let manualCapital = 0
  for (const [code, amount] of voucherEquityMap.entries()) {
    if (Math.abs(amount) > 0.01) {
      equity.push({
        code,
        name: groupNameMap.get(code) || `Capital & Reserves ${code}`,
        amount,
        category: "Capital",
      })
      manualCapital += amount
    }
  }

  // Retained Earnings balances the accounting equation: Assets = Liabilities + Equity
  const totalEquity = totalAssets - totalLiabilities
  const retainedSurplus = totalEquity - manualCapital

  equity.push({
    code: "3200",
    name: "Retained Earnings & Accumulated Surplus",
    amount: retainedSurplus,
    category: "Reserves & Surplus",
    subItems: [
      { name: "Total Operating Revenue", amount: totalRevenue },
      { name: "Less: Operating Expenses", amount: -totalExpenses },
      { name: "Net Operating Surplus", amount: netOperatingSurplus },
      { name: "Opening / Capital Reserves", amount: retainedSurplus - netOperatingSurplus },
    ],
  })

  return {
    asOf: params.asOf,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    netProfitLoss: netOperatingSurplus,
    totalRevenue,
    totalExpenses,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  }
}

export async function getCashFlowStatement(params: { from: string; to: string }) {
  const fromDate = new Date(params.from)
  const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)

  const transactions = await prisma.transaction.findMany({
    where: hospitalTransactionWhere({ date: { gte: fromDate, lte: toDate } }),
    select: { type: true, amount: true, category: true, scope: true },
  })

  // Categorize into operating, investing, financing
  const operating = { inflows: 0, outflows: 0, items: new Map<string, number>() }
  const investing = { inflows: 0, outflows: 0, items: new Map<string, number>() }
  const financing = { inflows: 0, outflows: 0, items: new Map<string, number>() }

  const investingCategories = ["ASSET_PURCHASE", "EQUIPMENT", "CAPITAL_EXPENDITURE", "INVESTMENT"]
  const financingCategories = ["LOAN", "LOAN_REPAYMENT", "CAPITAL_INFUSION", "DIVIDEND", "INVESTOR"]

  for (const txn of transactions) {
    const isInflow = txn.type === "INCOME" || txn.type === "RECEIPT"
    const cat = txn.category || "Other"

    let section = operating
    if (investingCategories.some((c) => cat.toUpperCase().includes(c))) section = investing
    else if (financingCategories.some((c) => cat.toUpperCase().includes(c))) section = financing

    if (isInflow) section.inflows += txn.amount
    else section.outflows += txn.amount

    section.items.set(cat, (section.items.get(cat) || 0) + (isInflow ? txn.amount : -txn.amount))
  }

  const formatSection = (s: typeof operating) => ({
    inflows: s.inflows, outflows: s.outflows, net: s.inflows - s.outflows,
    items: Array.from(s.items.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
  })

  const opData = formatSection(operating)
  const invData = formatSection(investing)
  const finData = formatSection(financing)

  return {
    operating: opData, investing: invData, financing: finData,
    netCashFlow: opData.net + invData.net + finData.net,
  }
}

// ═══════════════════════════════════════════════════════════════════
// TAX — GST Summary
// ═══════════════════════════════════════════════════════════════════

export async function getGSTSummary(params: { from: string; to: string }) {
  const fromDate = new Date(params.from)
  const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)

  // Output GST from sales/billing
  const billings = await prisma.billing.aggregate({
    where: hospitalBillingWhere({ billDate: { gte: fromDate, lte: toDate }, status: { not: "CANCELLED" } }),
    _sum: { netAmount: true, taxAmount: true },
    _count: true,
  })

  // Input GST from purchases
  const purchases = await prisma.purchaseInvoice.aggregate({
    where: hospitalPurchaseWhere({ date: { gte: fromDate, lte: toDate } }),
    _sum: { taxTotal: true, subTotal: true, grandTotal: true },
    _count: true,
  })

  // HSN-wise from purchase items
  const hsnBreakdown = await prisma.purchaseItem.groupBy({
    by: ["hsnCode"],
    where: { invoice: hospitalPurchaseWhere({ date: { gte: fromDate, lte: toDate } }), hsnCode: { not: null } },
    _sum: { totalAmount: true },
    _count: true,
  })

  const outputGST = billings._sum.taxAmount || 0
  const inputGST = purchases._sum.taxTotal || 0
  const netGST = outputGST - inputGST

  return {
    outputGST, inputGST, netGST,
    salesCount: billings._count,
    salesValue: billings._sum.netAmount || 0,
    purchaseCount: purchases._count,
    purchaseValue: purchases._sum.subTotal || 0,
    hsnBreakdown: hsnBreakdown.map((h) => ({ hsnCode: h.hsnCode || "N/A", amount: h._sum.totalAmount || 0, count: h._count })),
  }
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS — Opening Balances
// ═══════════════════════════════════════════════════════════════════

export async function getOpeningBalances() {
  const accounts = await prisma.financialAccount.findMany({
    where: hospitalAccountWhere(),
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, scope: true, openingBalance: true, currentBalance: true, isActive: true },
  })

  const suppliers = await prisma.supplier.findMany({
    where: { openingBalance: { not: 0 } },
    select: { id: true, name: true, openingBalance: true },
    orderBy: { name: "asc" },
  })

  return { accounts, suppliers }
}

export async function updateOpeningBalance(params: { accountId: string; openingBalance: number }) {
  await prisma.$transaction(async (tx) => {
    const acc = await tx.financialAccount.findUnique({ where: { id: params.accountId } })
    if (!acc) throw new Error("Account not found")
    const delta = params.openingBalance - acc.openingBalance
    await tx.financialAccount.update({
      where: { id: params.accountId },
      data: {
        openingBalance: params.openingBalance,
        ...(delta !== 0 && { currentBalance: { increment: delta } }),
      },
    })
  })

  revalidatePath("/dashboard/master-finance/cash-bank/accounts")
  revalidatePath("/dashboard/master-finance/cash-bank/bank-book")
  revalidatePath("/dashboard/master-finance/cash-bank/cash-book")
  revalidatePath("/dashboard/master-finance/settings/opening-balances")
  revalidatePath("/dashboard/master-finance/statements/balance-sheet")
  revalidatePath("/dashboard/master-finance/general-ledger")
  revalidatePath("/dashboard/master-finance")
  revalidatePath("/dashboard/finance")
  revalidatePath("/dashboard/finance/accounts")

  return { success: true, message: "Opening balance updated" }
}
