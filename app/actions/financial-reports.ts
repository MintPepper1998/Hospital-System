"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { getClosingStockTotal } from "@/lib/inventory-valuation"

// ============================================
// TYPES
// ============================================

export interface PnlLineItem {
  code: string
  name: string
  amount: number
  children: PnlLineItem[]
}

export interface PnlSection {
  title: string
  items: PnlLineItem[]
  total: number
}

export interface PnlReport {
  period: { from: string; to: string; label: string }
  revenue: PnlSection
  directExpenses: PnlSection
  grossProfit: number
  indirectExpenses: PnlSection
  netProfit: number
  ratios: {
    grossMargin: number
    netMargin: number
    salaryToRevenue: number
    operatingExpenseRatio: number
  }
  departmentBreakdown: Array<{ department: string; revenue: number; expense: number; profit: number }>
  scope: "HOSPITAL" | "PHARMACY" | "COMBINED"
  /** Inventory snapshot for pharmacy COGS calculation */
  inventorySnapshot?: {
    closingStockValue: number
  }
}

// ============================================
// P&L REPORT GENERATOR
// ============================================

/**
 * Generates a Profit & Loss statement by aggregating transactions
 * using accountGroupCode tags against the AccountGroup chart of accounts.
 * 
 * FY start = April (user decision: "March" → FY starts April)
 */
export async function generatePnlReport(params: {
  from: string   // "YYYY-MM-DD"
  to: string     // "YYYY-MM-DD"
  scope?: "HOSPITAL" | "PHARMACY" | "COMBINED"
}): Promise<{ success: boolean; data?: PnlReport; message?: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const { from, to, scope = "HOSPITAL" } = params

    // Date boundaries in IST
    const startDate = new Date(`${from}T00:00:00+05:30`)
    const endDate = new Date(`${to}T23:59:59.999+05:30`)

    // 1. Fetch all account groups (chart of accounts)
    const accountGroups = await prisma.accountGroup.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
    })

    const groupMap = new Map(accountGroups.map(g => [g.code, g]))

    // 2. Aggregate transactions by accountGroupCode
    const scopeFilter =
      scope === "COMBINED"
        ? {}
        : scope === "PHARMACY"
          ? { scope: "PHARMACY" }
          : { scope: "HOSPITAL" }

    const rawAggregation = await prisma.transaction.groupBy({
      by: ["accountGroupCode", "type"],
      where: {
        date: { gte: startDate, lte: endDate },
        accountGroupCode: { not: null },
        ...scopeFilter,
      },
      _sum: { amount: true },
    })

    // Build a code → amount map
    const codeAmounts = new Map<string, number>()
    for (const row of rawAggregation) {
      if (!row.accountGroupCode) continue
      const existing = codeAmounts.get(row.accountGroupCode) || 0
      codeAmounts.set(row.accountGroupCode, existing + (row._sum.amount || 0))
    }

    // 3. Build P&L sections from the COA tree
    //    Revenue = 4000-series, Direct Expenses = 5100-series, Indirect = 5200-series

    function buildLineItems(prefix: string): PnlLineItem[] {
      const items: PnlLineItem[] = []
      for (const [code, group] of groupMap) {
        if (!code.startsWith(prefix)) continue
        // Only leaf nodes (no children with amounts) or parent nodes
        const childCodes = accountGroups.filter(g => g.parentId === group.id)
        const children: PnlLineItem[] = []
        let childTotal = 0

        for (const child of childCodes) {
          const childAmount = codeAmounts.get(child.code) || 0
          if (childAmount > 0) {
            children.push({ code: child.code, name: child.name, amount: childAmount, children: [] })
            childTotal += childAmount
          }
        }

        const ownAmount = codeAmounts.get(code) || 0
        const totalAmount = ownAmount + childTotal

        if (totalAmount > 0 && childCodes.length === 0) {
          // Leaf node
          items.push({ code, name: group.name, amount: totalAmount, children })
        } else if (children.length > 0) {
          // Parent with children that have amounts
          items.push({ code, name: group.name, amount: totalAmount, children })
        }
      }
      return items.sort((a, b) => a.code.localeCompare(b.code))
    }

    // Revenue groups: 4xxx
    const revenueGroups = accountGroups.filter(g => g.code.startsWith("4") && g.code.length === 4)
    const revenueItems: PnlLineItem[] = []
    let totalRevenue = 0

    for (const rg of revenueGroups) {
      const children = accountGroups.filter(g => g.parentId === rg.id)
      const childItems: PnlLineItem[] = []
      let groupTotal = 0

      if (children.length > 0) {
        for (const child of children) {
          const amt = codeAmounts.get(child.code) || 0
          if (amt > 0) {
            childItems.push({ code: child.code, name: child.name, amount: amt, children: [] })
            groupTotal += amt
          }
        }
      }

      // Also add amount directly on this group code
      const directAmt = codeAmounts.get(rg.code) || 0
      groupTotal += directAmt

      if (groupTotal > 0) {
        revenueItems.push({ code: rg.code, name: rg.name, amount: groupTotal, children: childItems })
        totalRevenue += groupTotal
      }
    }

    // Direct Expense groups: 51xx
    const directExpGroups = accountGroups.filter(g => g.code.startsWith("51") && g.code.length === 4)
    const directExpItems: PnlLineItem[] = []
    let totalDirectExp = 0

    for (const eg of directExpGroups) {
      const children = accountGroups.filter(g => g.parentId === eg.id)
      const childItems: PnlLineItem[] = []
      let groupTotal = 0

      if (children.length > 0) {
        for (const child of children) {
          const amt = codeAmounts.get(child.code) || 0
          if (amt > 0) {
            childItems.push({ code: child.code, name: child.name, amount: amt, children: [] })
            groupTotal += amt
          }
        }
      }

      const directAmt = codeAmounts.get(eg.code) || 0
      groupTotal += directAmt

      if (groupTotal > 0) {
        directExpItems.push({ code: eg.code, name: eg.name, amount: groupTotal, children: childItems })
        totalDirectExp += groupTotal
      }
    }

    // Indirect Expense groups: 52xx
    const indirectExpGroups = accountGroups.filter(g => g.code.startsWith("52") && g.code.length === 4)
    const indirectExpItems: PnlLineItem[] = []
    let totalIndirectExp = 0

    for (const eg of indirectExpGroups) {
      const children = accountGroups.filter(g => g.parentId === eg.id)
      const childItems: PnlLineItem[] = []
      let groupTotal = 0

      if (children.length > 0) {
        for (const child of children) {
          const amt = codeAmounts.get(child.code) || 0
          if (amt > 0) {
            childItems.push({ code: child.code, name: child.name, amount: amt, children: [] })
            groupTotal += amt
          }
        }
      }

      const directAmt = codeAmounts.get(eg.code) || 0
      groupTotal += directAmt

      if (groupTotal > 0) {
        indirectExpItems.push({ code: eg.code, name: eg.name, amount: groupTotal, children: childItems })
        totalIndirectExp += groupTotal
      }
    }

    // Contra entries: 6xxx (Purchase Returns reduce COGS, Sales Returns reduce Revenue)
    const contraGroups = accountGroups.filter(g => g.code.startsWith("6") && g.code.length === 4)
    let totalContra = 0
    // Split contra: 6100 (Sales Returns) reduces revenue, 6200+ reduces direct expenses
    let salesReturnContra = 0
    let expenseContra = 0
    for (const cg of contraGroups) {
      const amt = codeAmounts.get(cg.code) || 0
      if (cg.code === "6100") {
        salesReturnContra += amt
      } else {
        expenseContra += amt
      }
      totalContra += amt
    }
    // Sales returns reduce revenue
    totalRevenue = Math.max(0, totalRevenue - salesReturnContra)
    // Purchase returns etc. reduce direct expenses
    totalDirectExp = Math.max(0, totalDirectExp - expenseContra)

    // Inventory-based COGS adjustment for pharmacy scope
    // COGS = Purchases + Write-offs − Closing Stock Value
    let closingStockValue = 0
    if (scope === "PHARMACY" || scope === "COMBINED") {
      closingStockValue = await getClosingStockTotal()
      // Add "Less: Closing Stock" as a deduction line in direct expenses
      if (closingStockValue > 0) {
        directExpItems.push({
          code: "5199",
          name: "Less: Closing Stock",
          amount: -closingStockValue,
          children: [],
        })
        totalDirectExp = Math.max(0, totalDirectExp - closingStockValue)
      }
    }

    const grossProfit = totalRevenue - totalDirectExp
    const netProfit = grossProfit - totalIndirectExp

    // 4. Department breakdown from billingType tags
    const deptAgg = await prisma.transaction.groupBy({
      by: ["billingType", "type"],
      where: {
        date: { gte: startDate, lte: endDate },
        billingType: { not: null },
        ...scopeFilter,
      },
      _sum: { amount: true },
    })

    const deptMap = new Map<string, { revenue: number; expense: number }>()
    for (const row of deptAgg) {
      if (!row.billingType) continue
      const dept = deptMap.get(row.billingType) || { revenue: 0, expense: 0 }
      if (row.type === "INCOME") dept.revenue += row._sum.amount || 0
      else if (row.type === "EXPENSE") dept.expense += row._sum.amount || 0
      deptMap.set(row.billingType, dept)
    }

    const departmentBreakdown = Array.from(deptMap.entries())
      .map(([department, data]) => ({
        department,
        revenue: data.revenue,
        expense: data.expense,
        profit: data.revenue - data.expense,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // 5. Calculate ratios
    // Find salary-related expenses (code 5210)
    const salaryExpense = codeAmounts.get("5210") || 0
    const totalExpenses = totalDirectExp + totalIndirectExp

    const report: PnlReport = {
      period: {
        from,
        to,
        label: formatPeriodLabel(startDate, endDate),
      },
      revenue: {
        title: "Revenue",
        items: revenueItems,
        total: totalRevenue,
      },
      directExpenses: {
        title: "Cost of Revenue (Direct Expenses)",
        items: directExpItems,
        total: totalDirectExp,
      },
      grossProfit,
      indirectExpenses: {
        title: "Operating Expenses (Indirect)",
        items: indirectExpItems,
        total: totalIndirectExp,
      },
      netProfit,
      ratios: {
        grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        salaryToRevenue: totalRevenue > 0 ? (salaryExpense / totalRevenue) * 100 : 0,
        operatingExpenseRatio: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
      },
      departmentBreakdown,
      scope,
      ...(scope === "PHARMACY" || scope === "COMBINED"
        ? { inventorySnapshot: { closingStockValue } }
        : {}),
    }

    return { success: true, data: report }
  } catch (error) {
    console.error("[ERROR] generatePnlReport:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to generate P&L report" }
  }
}

// ============================================
// HELPER: FY period label
// ============================================

function formatPeriodLabel(start: Date, end: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const s = `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`
  const e = `${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`
  return `${s} — ${e}`
}

// ============================================
// QUICK P&L SUMMARY (for dashboard widget)
// ============================================

export async function getPnlSummary(scope: "HOSPITAL" | "PHARMACY" = "HOSPITAL") {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return null

  // Current month
  const now = new Date()
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const from = new Date(istNow.getFullYear(), istNow.getMonth(), 1)
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`
  const toStr = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, "0")}-${String(istNow.getDate()).padStart(2, "0")}`

  const result = await generatePnlReport({ from: fromStr, to: toStr, scope })
  if (!result.success || !result.data) return null

  return {
    totalRevenue: result.data.revenue.total,
    totalExpenses: result.data.directExpenses.total + result.data.indirectExpenses.total,
    netProfit: result.data.netProfit,
    grossMargin: result.data.ratios.grossMargin,
    netMargin: result.data.ratios.netMargin,
    period: result.data.period.label,
  }
}
