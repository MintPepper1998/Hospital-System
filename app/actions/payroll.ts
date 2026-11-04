"use server"

import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { actionError, getErrorMessage } from "@/lib/action-result"

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "DOCTOR",
  "NURSE",
  "ACCOUNTANT",
  "PHARMACIST",
  "RECEPTIONIST",
  "LAB_TECHNICIAN",
] as const

function inferDepartmentFromRole(role: string): string {
  switch (role) {
    case "DOCTOR":
      return "Clinical"
    case "NURSE":
      return "Nursing"
    case "PHARMACIST":
      return "Pharmacy"
    case "LAB_TECHNICIAN":
      return "Laboratory"
    case "ACCOUNTANT":
      return "Finance"
    case "RECEPTIONIST":
      return "Front Desk"
    case "SUPER_ADMIN":
      return "Administration"
    default:
      return "General"
  }
}

export async function syncUsersToEmployees() {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

  const users = await prisma.user.findMany({
    where: {
      role: { in: [...STAFF_ROLES] as Role[] },
    },
    select: {
      id: true,
      name: true,
      role: true,
      staff: {
        select: {
          basicSalary: true,
          department: true,
        },
      },
    },
  })

  for (const user of users) {
    const mappedSalary = user.staff?.basicSalary ?? 0
    const mappedDepartment =
      user.staff?.department?.trim() || inferDepartmentFromRole(String(user.role))

    const existing = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true, basicSalary: true },
    })

    if (!existing) {
      await prisma.employee.create({
        data: {
          userId: user.id,
          name: user.name || "Unnamed Staff",
          role: String(user.role),
          department: mappedDepartment,
          basicSalary: mappedSalary,
        },
      })
      continue
    }

    await prisma.employee.update({
      where: { id: existing.id },
      data: {
        name: user.name || "Unnamed Staff",
        role: String(user.role),
        department: mappedDepartment,
        basicSalary:
          (existing.basicSalary ?? 0) <= 0 && mappedSalary > 0
            ? mappedSalary
            : existing.basicSalary,
      },
    })
  }
}

export interface PayrollEmployee {
  id: string
  userId: string | null
  name: string
  role: string
  department: string
  basicSalary: number
  createdAt: string
  updatedAt: string
  recentSalaryRecords: Array<{
    id: string
    month: string
    year: number
    amountPaid: number
    bonus: number
    deductions: number
    paymentDate: string
    status: string
    transactionId: string | null
  }>
}

export async function getEmployees(): Promise<PayrollEmployee[]> {
  await requireAuth()

  await syncUsersToEmployees()

  const employees = await prisma.employee.findMany({
    include: {
      salaryRecords: {
        orderBy: { paymentDate: "desc" },
        take: 3,
      },
    },
    orderBy: { name: "asc" },
  })

  return employees.map((e) => ({
    id: e.id,
    userId: e.userId ?? null,
    name: e.name,
    role: e.role,
    department: e.department,
    basicSalary: e.basicSalary,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    recentSalaryRecords: e.salaryRecords.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      amountPaid: r.amountPaid,
      bonus: r.bonus,
      deductions: r.deductions,
      paymentDate: r.paymentDate.toISOString(),
      status: r.status,
      transactionId: r.transactionId ?? null,
    })),
  }))
}

export async function processSalary(data: {
  employeeId: string
  month: string
  year: number
  baseAmount: number
  bonus?: number
  deductions?: number
  accountId: string
  paymentMethod?: string
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.employeeId || !data.month || !data.year || !data.accountId) {
      return { success: false, message: "Missing required payroll fields" }
    }

    const bonus = data.bonus ?? 0
    const deductions = data.deductions ?? 0
    const finalAmount = data.baseAmount + bonus - deductions

    if (finalAmount <= 0) {
      return { success: false, message: "Final salary amount must be greater than 0" }
    }

    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: data.employeeId },
      })
      if (!employee) {
        throw new Error("Employee not found")
      }

      const existing = await tx.salaryRecord.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: data.employeeId,
            month: data.month,
            year: data.year,
          },
        },
      })
      if (existing) {
        throw new Error(`Salary already processed for ${employee.name} (${data.month} ${data.year})`)
      }

      const account = await tx.financialAccount.findUnique({
        where: { id: data.accountId },
      })
      if (!account) {
        throw new Error("Selected financial account not found")
      }

      if (account.currentBalance < finalAmount) {
        throw new Error(`Insufficient balance in ${account.name}. Required: ₹${finalAmount.toLocaleString("en-IN")}`)
      }

      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "EXPENSE",
          amount: finalAmount,
          category: "SALARY",
          paymentMethod: data.paymentMethod || "BANK_TRANSFER",
          description: `Salary for ${employee.name} - ${data.month} ${data.year}`,
        },
      })

      await tx.financialAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: { decrement: finalAmount },
        },
      })

      const salaryRecord = await tx.salaryRecord.create({
        data: {
          employeeId: employee.id,
          month: data.month,
          year: data.year,
          amountPaid: finalAmount,
          bonus,
          deductions,
          status: "PAID",
          transactionId: transaction.id,
        },
      })

      return { salaryRecord, transaction, employeeName: employee.name }
    }, {
      maxWait: 10000,
      timeout: 20000,
    })

    revalidatePath("/dashboard/hr/payroll")
    revalidatePath("/dashboard/finance")

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "Salary", recordId: result.salaryRecord.id, changes: { employeeName: result.employeeName, month: data.month, year: data.year, amount: finalAmount } })

    return {
      success: true,
      message: `Salary processed for ${result.employeeName} (${data.month} ${data.year})`,
      salaryRecordId: result.salaryRecord.id,
      transactionId: result.transaction.id,
    }
  } catch (error) {
    console.error("[ERROR] processSalary:", error)
    return actionError(getErrorMessage(error))
  }
}

export async function updateEmployeeSalary(employeeId: string, newSalary: number) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!employeeId) {
      return { success: false, message: "Employee ID is required" }
    }
    if (!Number.isFinite(newSalary) || newSalary < 0) {
      return { success: false, message: "Salary must be a valid non-negative number" }
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        basicSalary: newSalary,
      },
    })

    revalidatePath("/dashboard/hr/payroll")
    return { success: true, message: "Basic salary updated successfully" }
  } catch (error) {
    console.error("[ERROR] updateEmployeeSalary:", error)
    return actionError(getErrorMessage(error))
  }
}

