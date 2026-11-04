"use server"

import { prisma } from "@/lib/prisma"

// --- Expense Requests ---
export async function getExpenseRequests() {
  return await prisma.expenseRequest.findMany({
    include: {
      approvals: true
    },
    orderBy: { createdAt: "desc" }
  })
}

export async function createExpenseRequest(data: {
  requestedBy: string,
  department: string,
  category: string,
  description: string,
  amount: number,
  costCenterId?: string,
  attachments?: string[]
}) {
  return await prisma.expenseRequest.create({
    data: {
      ...data,
      attachments: data.attachments || [],
      status: "PENDING",
      currentLevel: 1
    }
  })
}

// --- Approvals ---
export async function getApprovalQueue(userRole: string, department?: string) {
  // Simulating fetching queue for a specific role (e.g. Finance Manager)
  // In real life, we'd match the policy level to the user's role.
  const expenses = await prisma.expenseRequest.findMany({
    where: {
      status: "PENDING",
      ...(department ? { department } : {})
    },
    include: { approvals: true },
    orderBy: { createdAt: "asc" }
  })
  
  return expenses
}

export async function approveExpense(expenseId: string, approverUserId: string, approverName: string, level: number, remarks?: string) {
  // Log approval
  await prisma.expenseApproval.create({
    data: {
      expenseId,
      approverUserId,
      approverName,
      level,
      action: "APPROVED",
      remarks
    }
  })
  
  // Advance level or mark APPROVED
  // Simplified logic for simulation: assume 2 levels max.
  const isFinalLevel = level >= 2
  
  if (isFinalLevel) {
    return await prisma.expenseRequest.update({
      where: { id: expenseId },
      data: { status: "APPROVED" }
    })
  } else {
    return await prisma.expenseRequest.update({
      where: { id: expenseId },
      data: { currentLevel: level + 1 }
    })
  }
}

export async function rejectExpense(expenseId: string, approverUserId: string, approverName: string, level: number, remarks: string) {
  await prisma.expenseApproval.create({
    data: {
      expenseId,
      approverUserId,
      approverName,
      level,
      action: "REJECTED",
      remarks
    }
  })
  
  return await prisma.expenseRequest.update({
    where: { id: expenseId },
    data: { status: "REJECTED" }
  })
}

// --- Policies ---
export async function getApprovalPolicies() {
  return await prisma.approvalPolicy.findMany({
    orderBy: { level: "asc" }
  })
}

export async function updateApprovalPolicy(id: string, data: { roleRequired: string, maxAmount: number | null }) {
  return await prisma.approvalPolicy.update({
    where: { id },
    data
  })
}
