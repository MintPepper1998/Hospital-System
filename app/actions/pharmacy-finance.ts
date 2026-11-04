"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { actionError, getErrorMessage } from "@/lib/action-result"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { resolveAccountGroupCode } from "@/lib/account-group-resolver"
import { randomUUID } from "crypto"

export interface SettlementEntry {
  id: string
  billNumber: string
  billDate: string
  netAmount: number
  settlementStatus: string | null
  settledAt: string | null
  patientName: string
  admissionId: string | null
  notes: string | null
  items: { description: string; quantity: number; totalAmount: number }[]
}





// ============================================
// CREATE PHARMACY ACCOUNT
// ============================================

export async function createPharmacyAccount(data: {
  name: string
  type: string
  accountNumber?: string
  bankName?: string
  ifscCode?: string
  description?: string
  openingBalance?: number
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.name?.trim()) return { success: false, message: "Account name is required" }
    if (!data.type) return { success: false, message: "Account type is required" }

    const balance = data.openingBalance || 0

    await prisma.financialAccount.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        scope: "PHARMACY",
        accountNumber: data.accountNumber?.trim() || null,
        bankName: data.bankName?.trim() || null,
        ifscCode: data.ifscCode?.trim() || null,
        description: data.description?.trim() || null,
        openingBalance: balance,
        currentBalance: balance,
      },
    })

    revalidatePath("/dashboard/pharmacy-finance")
    revalidatePath("/dashboard/pharmacy-finance/accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "PharmacyAccount",
      changes: { name: data.name, type: data.type },
    })

    return { success: true, message: `Pharmacy account "${data.name}" created` }
  } catch (error) {
    console.error("[ERROR] createPharmacyAccount:", error)
    return actionError(getErrorMessage(error))
  }
}



// ============================================
// IPD SETTLEMENT MANAGEMENT
// ============================================

export async function getIPDSettlements(filter: "ALL" | "PENDING" | "SETTLED" = "ALL") {
  await requireAuth()

  const where: any = {
    type: "PHARMACY",
    settlementStatus: { not: null },
  }
  if (filter === "PENDING") where.settlementStatus = "PENDING"
  if (filter === "SETTLED") where.settlementStatus = "SETTLED"

  const bills = await prisma.billing.findMany({
    where,
    include: {
      patient: { include: { user: true } },
      items: { select: { description: true, quantity: true, totalAmount: true } },
      ipdAdmission: {
        select: {
          id: true,
          amountPaid: true,
          balanceDue: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return bills.map((b: any): SettlementEntry & { patientFullName?: string; ipdPaid?: boolean } => ({
    id: b.id,
    billNumber: b.billNumber,
    billDate: b.billDate.toISOString(),
    netAmount: b.netAmount,
    settlementStatus: b.settlementStatus,
    settledAt: b.settledAt?.toISOString() || null,
    patientName: b.patient?.user?.name || b.patient?.patientId || "Unknown",
    patientFullName: b.patient?.user?.name || undefined,
    admissionId: b.ipdAdmissionId,
    notes: b.notes,
    items: b.items.map((i: any) => ({ description: i.description, quantity: i.quantity, totalAmount: i.totalAmount })),
    ipdPaid: b.ipdAdmission ? (b.ipdAdmission.balanceDue ?? 0) <= 0 : undefined,
  }))
}

/**
 * Internal helper: settle a single PHARMACY bill inside an existing transaction.
 * Creates a proper double-entry: Hospital account (debit/expense) → Pharmacy account (credit/income).
 */
async function settleBillInTx(
  tx: any,
  bill: { id: string; billNumber: string; netAmount: number },
  userId: string,
) {
  // Atomically claim the bill — prevents double-settle from two tabs
  const claimed = await tx.billing.updateMany({
    where: { id: bill.id, settlementStatus: "PENDING" },
    data: {
      settlementStatus: "SETTLED",
      settledAt: new Date(),
      settledBy: userId,
      paidAmount: bill.netAmount,
      balanceAmount: 0,
      status: "PAID",
    },
  })
  if (claimed.count !== 1) {
    throw new Error(`Bill ${bill.billNumber} is no longer pending`)
  }

  // ── Hospital side: EXPENSE (debit) — money leaves the hospital account ──
  const hospitalAccountId = await resolveFinancialAccount(tx, "BANK_TRANSFER", "HOSPITAL")
  if (hospitalAccountId) {
    // Check balance
    const hospitalAccount = await tx.financialAccount.findUnique({
      where: { id: hospitalAccountId },
      select: { currentBalance: true, name: true },
    })
    if (hospitalAccount && hospitalAccount.currentBalance < bill.netAmount) {
      throw new Error(
        `Insufficient balance in ${hospitalAccount.name || "Hospital account"}. ` +
        `Available: ₹${hospitalAccount.currentBalance.toFixed(2)}, Required: ₹${bill.netAmount.toFixed(2)}`
      )
    }

    const hospitalGroupCode = resolveAccountGroupCode("EXPENSE", "INTER_DEPT_TRANSFER_OUT", "HOSPITAL", "HOSPITAL")
    await tx.transaction.create({
      data: {
        accountId: hospitalAccountId,
        type: "EXPENSE",
        amount: bill.netAmount,
        category: "INTER_DEPT_TRANSFER_OUT",
        paymentMethod: "BANK_TRANSFER",
        scope: "HOSPITAL",
        referenceId: bill.id,
        description: `IPD settlement transfer to Pharmacy - ${bill.billNumber}`,
        accountGroupCode: hospitalGroupCode,
        billingType: "PHARMACY",
      },
    })
    await tx.financialAccount.update({
      where: { id: hospitalAccountId },
      data: { currentBalance: { decrement: bill.netAmount } },
    })
  }

  // ── Pharmacy side: INCOME (credit) — money enters the pharmacy account ──
  const pharmacyAccountId = await resolveFinancialAccount(tx, "BANK_TRANSFER", "PHARMACY")
  if (pharmacyAccountId) {
    const pharmacyGroupCode = resolveAccountGroupCode("INCOME", "IPD_SETTLEMENT", "PHARMACY", "PHARMACY")
    await tx.transaction.create({
      data: {
        accountId: pharmacyAccountId,
        type: "INCOME",
        amount: bill.netAmount,
        category: "IPD_SETTLEMENT",
        paymentMethod: "BANK_TRANSFER",
        scope: "PHARMACY",
        referenceId: bill.id,
        description: `IPD medicine settlement - ${bill.billNumber}`,
        accountGroupCode: pharmacyGroupCode,
        billingType: "PHARMACY",
      },
    })
    await tx.financialAccount.update({
      where: { id: pharmacyAccountId },
      data: { currentBalance: { increment: bill.netAmount } },
    })
  }
}

export async function settleIPDMedicineBill(billingId: string): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const bill = await prisma.billing.findUnique({ where: { id: billingId } })
    if (!bill) return { success: false, message: "Bill not found" }
    if (bill.settlementStatus !== "PENDING") return { success: false, message: "Bill is not pending settlement" }

    await prisma.$transaction(async (tx) => {
      await settleBillInTx(tx, bill, authResult.session.userId)
    })

    revalidatePath("/dashboard/pharmacy-finance")
    revalidatePath("/dashboard/pharmacy-finance/settlements")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "IPDSettlement",
      recordId: billingId,
      changes: { settlementStatus: "SETTLED", billNumber: bill.billNumber },
    })

    return { success: true, message: `Bill ${bill.billNumber} settled` }
  } catch (error: any) {
    console.error("[ERROR] settleIPDMedicineBill:", error)
    return actionError(error.message || getErrorMessage(error))
  }
}

export async function bulkSettleIPDMedicineBills(admissionId: string): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const pendingBills = await prisma.billing.findMany({
      where: {
        ipdAdmissionId: admissionId,
        type: "PHARMACY",
        settlementStatus: "PENDING",
      },
    })

    if (pendingBills.length === 0) {
      return { success: false, message: "No pending bills found for this admission" }
    }

    // All bills in one transaction — every bill gets proper ledger entries
    await prisma.$transaction(async (tx) => {
      for (const bill of pendingBills) {
        await settleBillInTx(tx, bill, authResult.session.userId)
      }
    })

    revalidatePath("/dashboard/pharmacy-finance")
    revalidatePath("/dashboard/pharmacy-finance/settlements")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "IPDSettlement",
      changes: { admissionId, settledCount: pendingBills.length },
    })

    return { success: true, message: `${pendingBills.length} bill(s) settled for admission` }
  } catch (error: any) {
    console.error("[ERROR] bulkSettleIPDMedicineBills:", error)
    return actionError(error.message || getErrorMessage(error))
  }
}

// ============================================
// CROSS-DEPARTMENT TRANSFER
// ============================================

export interface CrossDeptAccount {
  id: string
  name: string
  type: string
  scope: string
  currentBalance: number
}

export async function getCrossDepartmentAccounts(): Promise<{
  hospital: CrossDeptAccount[]
  pharmacy: CrossDeptAccount[]
}> {
  await requireAuth()

  const [hospital, pharmacy] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { isActive: true, scope: "HOSPITAL" },
      select: { id: true, name: true, type: true, scope: true, currentBalance: true },
      orderBy: { name: "asc" },
    }),
    prisma.financialAccount.findMany({
      where: { isActive: true, scope: "PHARMACY" },
      select: { id: true, name: true, type: true, scope: true, currentBalance: true },
      orderBy: { name: "asc" },
    }),
  ])

  return {
    hospital: hospital.map(a => ({ ...a, currentBalance: Math.round(a.currentBalance * 100) / 100 })),
    pharmacy: pharmacy.map(a => ({ ...a, currentBalance: Math.round(a.currentBalance * 100) / 100 }))
  }
}

export async function crossDepartmentTransfer(data: {
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

    // Validate cross-department (different scopes)
    if (fromAccount.scope === toAccount.scope) {
      return { success: false, message: "Both accounts are in the same department. Use the regular transfer instead." }
    }

    if (fromAccount.currentBalance < data.amount) {
      return {
        success: false,
        message: `Insufficient balance in "${fromAccount.name}" (₹${fromAccount.currentBalance.toLocaleString("en-IN")})`,
      }
    }

    const direction = `${fromAccount.scope === "HOSPITAL" ? "Hospital" : "Pharmacy"} → ${toAccount.scope === "HOSPITAL" ? "Hospital" : "Pharmacy"}`
    const desc = data.notes?.trim() || `Inter-department transfer: ${fromAccount.name} → ${toAccount.name}`

    const amount = Math.round(data.amount * 100) / 100
    const transferRef = randomUUID()

    await prisma.$transaction(async (tx) => {
      // Guarded decrement on source (prevents concurrent overdraw)
      const debit = await tx.financialAccount.updateMany({
        where: { id: data.fromAccountId, currentBalance: { gte: amount } },
        data: { currentBalance: { decrement: amount } },
      })
      if (debit.count !== 1) {
        throw new Error(`Insufficient balance in "${fromAccount.name}"`)
      }

      await tx.transaction.create({
        data: {
          accountId: data.fromAccountId,
          type: "EXPENSE",
          amount,
          category: "INTER_DEPT_TRANSFER_OUT",
          paymentMethod: "BANK_TRANSFER",
          scope: fromAccount.scope,
          referenceId: transferRef,
          description: `${desc} [${direction}]`,
          accountGroupCode: resolveAccountGroupCode("EXPENSE", "INTER_DEPT_TRANSFER_OUT"),
          billingType: null,
        },
      })

      // Credit to destination
      await tx.transaction.create({
        data: {
          accountId: data.toAccountId,
          type: "INCOME",
          amount,
          category: "INTER_DEPT_TRANSFER_IN",
          paymentMethod: "BANK_TRANSFER",
          scope: toAccount.scope,
          referenceId: transferRef,
          description: `${desc} [${direction}]`,
          accountGroupCode: resolveAccountGroupCode("INCOME", "INTER_DEPT_TRANSFER_IN"),
          billingType: null,
        },
      })
      await tx.financialAccount.update({
        where: { id: data.toAccountId },
        data: { currentBalance: { increment: amount } },
      })
    })

    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/finance/accounts")
    revalidatePath("/dashboard/pharmacy-finance")
    revalidatePath("/dashboard/pharmacy-finance/accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "CrossDepartmentTransfer",
      changes: {
        from: fromAccount.name,
        fromScope: fromAccount.scope,
        to: toAccount.name,
        toScope: toAccount.scope,
        amount: data.amount,
      },
    })

    return {
      success: true,
      message: `₹${data.amount.toLocaleString("en-IN")} transferred from "${fromAccount.name}" (${fromAccount.scope}) to "${toAccount.name}" (${toAccount.scope})`,
    }
  } catch (error) {
    console.error("[ERROR] crossDepartmentTransfer:", error)
    return actionError(getErrorMessage(error))
  }
}
