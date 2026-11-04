"use server"

import { prisma } from "@/lib/prisma"

// --- Cost Centers ---
export async function getCostCenters() {
  const centers = await prisma.costCenter.findMany({
    include: {
      allocations: true,
      budgets: true
    },
    orderBy: { createdAt: "desc" }
  })
  return centers
}

export async function createCostCenter(data: { name: string, code: string, type: string, parentId?: string }) {
  return await prisma.costCenter.create({ data })
}

export async function updateCostCenter(id: string, data: { name: string, code: string, type: string, isActive: boolean }) {
  return await prisma.costCenter.update({ where: { id }, data })
}

export async function deleteCostCenter(id: string) {
  return await prisma.costCenter.delete({ where: { id } })
}

// --- Allocations ---
export async function getCostAllocations() {
  const allocations = await prisma.costAllocation.findMany({
    include: { costCenter: true }
  })
  return allocations
}

export async function saveCostAllocations(allocations: { costCenterId: string, expenseType: string, percentage: number }[]) {
  // Clear existing for those types, then create new
  const expenseTypes = [...new Set(allocations.map(a => a.expenseType))]
  await prisma.costAllocation.deleteMany({
    where: { expenseType: { in: expenseTypes } }
  })
  
  await prisma.costAllocation.createMany({
    data: allocations
  })
  return { success: true }
}

// --- Department P&L ---
export async function getDepartmentPnl(params: { from: string, to: string, costCenterId?: string }) {
  // Fetch transactions and allocations, then compute pseudo-P&L.
  // In a real system, you'd match voucher entries mapped to this cost center + allocated global expenses.
  
  const costCenters = await prisma.costCenter.findMany({
    where: params.costCenterId ? { id: params.costCenterId } : {}
  })

  // Simulated logic for UI display:
  const result = costCenters.map(cc => {
    // Fake data for now, you would calculate real sums here
    const revenue = cc.type === "REVENUE" ? Math.floor(Math.random() * 500000) + 100000 : 0
    const directCosts = Math.floor(Math.random() * 200000) + 50000
    const allocatedCosts = Math.floor(Math.random() * 50000) + 10000
    return {
      costCenter: cc,
      revenue,
      directCosts,
      allocatedCosts,
      netProfit: revenue - directCosts - allocatedCosts
    }
  })

  return result
}

// --- Budgets ---
export async function getBudgets() {
  return await prisma.budget.findMany({
    include: {
      costCenter: true,
      items: true
    },
    orderBy: { createdAt: "desc" }
  })
}

export async function createBudget(data: { costCenterId: string, fiscalYear: string, month: number | null, items: { accountGroupCode: string, budgetedAmount: number, notes?: string }[] }) {
  return await prisma.budget.create({
    data: {
      costCenterId: data.costCenterId,
      fiscalYear: data.fiscalYear,
      month: data.month,
      status: "DRAFT",
      items: {
        create: data.items
      }
    }
  })
}

export async function approveBudget(id: string) {
  return await prisma.budget.update({
    where: { id },
    data: { status: "APPROVED" }
  })
}

export async function getBudgetVsActuals(params: { fiscalYear: string, month?: number }) {
  const budgets = await prisma.budget.findMany({
    where: { 
      fiscalYear: params.fiscalYear,
      ...(params.month ? { month: params.month } : {})
    },
    include: {
      costCenter: true,
      items: true
    }
  })
  
  // Return budgeted vs fake actuals for UI
  return budgets.map(b => {
    const items = b.items.map(item => {
      const actualAmount = item.budgetedAmount * (0.8 + Math.random() * 0.4) // +/- 20%
      return {
        ...item,
        actualAmount,
        variance: item.budgetedAmount - actualAmount,
        variancePercentage: ((item.budgetedAmount - actualAmount) / item.budgetedAmount) * 100
      }
    })
    
    return {
      ...b,
      items,
      totalBudgeted: items.reduce((sum, i) => sum + i.budgetedAmount, 0),
      totalActual: items.reduce((sum, i) => sum + i.actualAmount, 0)
    }
  })
}
