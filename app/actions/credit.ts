"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { actionError, getErrorMessage } from "@/lib/action-result"
import { resolveAccountGroupCode, resolveBillingTypeTag } from "@/lib/account-group-resolver"

// ============================================
// TYPES
// ============================================

export interface CreditEntryData {
  id: string
  type: string
  partyName: string
  partyType: string
  partyId: string | null
  referenceId: string | null
  referenceType: string | null
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  dueDate: string | null
  status: string
  notes: string | null
  createdAt: string
  settledAt: string | null
  payments: {
    id: string
    amount: number
    paymentMethod: string
    reference: string | null
    notes: string | null
    paymentDate: string
  }[]
}

export interface CreditDashboardData {
  totalReceivable: number
  totalPayable: number
  overdueReceivable: number
  overduePayable: number
  openReceivableCount: number
  openPayableCount: number
  receivables: CreditEntryData[]
  payables: CreditEntryData[]
  settledEntries: CreditEntryData[]
  accounts: { id: string; name: string; type: string }[]
}

export interface CreditPaymentReceipt {
  partyName: string
  partyType: string
  creditType: string
  totalAmount: number
  paidNow: number
  totalPaid: number
  remainingBalance: number
  newStatus: string
  paymentMethod: string
  reference: string | null
  paymentDate: string
  linkedBillNumber: string | null
}

// ============================================
// GET CREDIT DASHBOARD
// ============================================

export async function getCreditDashboard(): Promise<CreditDashboardData> {
  await requireAuth()

  // Open entries (not settled)
  const entries = await prisma.creditEntry.findMany({
    where: { status: { not: "SETTLED" } },
    orderBy: { createdAt: "desc" },
    include: {
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  })

  // Settled entries (for records tab) — last 100
  const settled = await prisma.creditEntry.findMany({
    where: { status: "SETTLED" },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  })

  const now = new Date()
  const receivables = entries.filter((e) => e.type === "RECEIVABLE")
  const payables = entries.filter((e) => e.type === "PAYABLE")

  const accounts = await prisma.financialAccount.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true },
    orderBy: { createdAt: "asc" },
  })

  const mapEntry = (e: typeof entries[0]): CreditEntryData => ({
    id: e.id,
    type: e.type,
    partyName: e.partyName,
    partyType: e.partyType,
    partyId: e.partyId,
    referenceId: e.referenceId,
    referenceType: e.referenceType,
    totalAmount: e.totalAmount,
    paidAmount: e.paidAmount,
    balanceAmount: e.balanceAmount,
    dueDate: e.dueDate?.toISOString() || null,
    status: e.status,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    settledAt: e.status === "SETTLED" ? e.updatedAt.toISOString() : null,
    payments: e.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      notes: p.notes,
      paymentDate: p.paymentDate.toISOString(),
    })),
  })

  return {
    totalReceivable: receivables.reduce((s, e) => s + e.balanceAmount, 0),
    totalPayable: payables.reduce((s, e) => s + e.balanceAmount, 0),
    overdueReceivable: receivables.filter((e) => e.dueDate && e.dueDate < now).reduce((s, e) => s + e.balanceAmount, 0),
    overduePayable: payables.filter((e) => e.dueDate && e.dueDate < now).reduce((s, e) => s + e.balanceAmount, 0),
    openReceivableCount: receivables.length,
    openPayableCount: payables.length,
    receivables: receivables.map(mapEntry),
    payables: payables.map(mapEntry),
    settledEntries: settled.map(mapEntry),
    accounts,
  }
}

// ============================================
// CREATE CREDIT ENTRY
// ============================================

export async function createCreditEntry(data: {
  type: "RECEIVABLE" | "PAYABLE"
  partyName: string
  partyType: "PATIENT" | "SUPPLIER" | "OTHER"
  partyId?: string
  referenceId?: string
  referenceType?: string
  totalAmount: number
  dueDate?: string
  notes?: string
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.partyName?.trim()) return { success: false, message: "Party name is required" }
    if (!data.totalAmount || data.totalAmount <= 0) return { success: false, message: "Amount must be > 0" }

    await prisma.creditEntry.create({
      data: {
        type: data.type,
        partyName: data.partyName.trim(),
        partyType: data.partyType,
        partyId: data.partyId || null,
        referenceId: data.referenceId || null,
        referenceType: data.referenceType || null,
        totalAmount: data.totalAmount,
        balanceAmount: data.totalAmount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes?.trim() || null,
      },
    })

    revalidatePath("/dashboard/finance/credit")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "CreditEntry",
      changes: { partyName: data.partyName, type: data.type, amount: data.totalAmount },
    })

    return {
      success: true,
      message: `Credit entry for "${data.partyName}" (₹${data.totalAmount.toLocaleString("en-IN")}) created`,
    }
  } catch (error) {
    console.error("[ERROR] createCreditEntry:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// RECORD CREDIT PAYMENT
// ============================================

export interface CreditPaymentSplit {
  amount: number
  paymentMethod: string
  accountId: string
  reference?: string
}

export async function recordCreditPayment(data: {
  creditEntryId: string
  amount: number
  paymentMethod: string
  accountId?: string
  reference?: string
  notes?: string
  paymentDate?: string | Date
  splits?: CreditPaymentSplit[]
}): Promise<{ success: boolean; message: string; receipt?: CreditPaymentReceipt; paymentId?: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.amount || data.amount <= 0) return { success: false, message: "Amount must be > 0" }

    const entry = await prisma.creditEntry.findUnique({ where: { id: data.creditEntryId } })
    if (!entry) return { success: false, message: "Credit entry not found" }
    if (entry.status === "SETTLED") return { success: false, message: "This credit entry is already settled" }

    if (data.amount > entry.balanceAmount + 0.01) {
      return {
        success: false,
        message: `Amount exceeds remaining balance of ₹${entry.balanceAmount.toLocaleString("en-IN")}`,
      }
    }

    // Validate split payments if SPLIT method is selected
    if (data.paymentMethod === "SPLIT") {
      if (!data.splits || data.splits.length === 0) {
        return { success: false, message: "At least one split payment line is required for SPLIT method" }
      }
      const splitTotal = data.splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
      if (Math.abs(splitTotal - data.amount) > 0.01) {
        return {
          success: false,
          message: `Split amounts (₹${splitTotal.toFixed(2)}) must equal total to collect (₹${data.amount.toFixed(2)})`,
        }
      }
      for (let i = 0; i < data.splits.length; i++) {
        const s = data.splits[i]
        if (!s.amount || s.amount <= 0) {
          return { success: false, message: `Split #${i + 1} has an invalid amount` }
        }
        if (!s.accountId) {
          return { success: false, message: `Please select an account for Split #${i + 1} (${s.paymentMethod})` }
        }
      }
    }

    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date()
    const newPaid = entry.paidAmount + data.amount
    const newBalance = entry.totalAmount - newPaid
    const newStatus = newBalance <= 0.01 ? "SETTLED" : "PARTIAL"

    // Use interactive transaction for atomic read-then-write on account
    const result = await prisma.$transaction(async (tx) => {
      let primaryPayment: any = null

      if (data.paymentMethod === "SPLIT" && data.splits && data.splits.length > 0) {
        // 1. Process each split payment
        for (const sp of data.splits) {
          const splitPay = await tx.creditPayment.create({
            data: {
              creditEntryId: data.creditEntryId,
              amount: sp.amount,
              paymentMethod: sp.paymentMethod,
              accountId: sp.accountId,
              reference: sp.reference?.trim() || data.reference?.trim() || null,
              notes: data.notes?.trim() || "Split payment",
              paymentDate: paymentDate,
            },
          })
          if (!primaryPayment) primaryPayment = splitPay

          // Financial account & ledger transaction for this split
          const account = await tx.financialAccount.findUnique({
            where: { id: sp.accountId },
            select: { scope: true, name: true, isActive: true },
          })
          if (!account) throw new Error("Financial account not found")
          if (!account.isActive) throw new Error(`Account "${account.name}" is inactive`)

          if (authResult.session.role === "PHARMACIST" && account.scope !== "PHARMACY") {
            throw new Error("Pharmacists can only record payments to pharmacy accounts")
          }

          const isReceivable = entry.type === "RECEIVABLE"
          const txType = isReceivable ? "INCOME" : ("EXPENSE" as const)
          const isPharmacy = account.scope === "PHARMACY"
          const category = isReceivable
            ? (isPharmacy ? "CREDIT_COLLECTION" : "Credit Payment Received")
            : "Credit Payment Made"
          const accountGroupCode = isReceivable ? "1130" : resolveAccountGroupCode(txType, category, null)
          const billingTypeTag = resolveBillingTypeTag(null, entry.referenceType === "BILLING" ? entry.partyType : null)

          await tx.transaction.create({
            data: {
              accountId: sp.accountId,
              type: txType,
              amount: sp.amount,
              category,
              paymentMethod: sp.paymentMethod,
              scope: account.scope,
              description: `Credit payment (${sp.paymentMethod}) – ${entry.partyName}`,
              referenceId: entry.referenceId,
              accountGroupCode,
              billingType: billingTypeTag,
              date: paymentDate,
            },
          })

          if (isReceivable) {
            await tx.financialAccount.update({
              where: { id: sp.accountId },
              data: { currentBalance: { increment: sp.amount } },
            })
          } else {
            const r = await tx.financialAccount.updateMany({
              where: { id: sp.accountId, currentBalance: { gte: sp.amount } },
              data: { currentBalance: { decrement: sp.amount } },
            })
            if (r.count !== 1) {
              throw new Error(`Insufficient balance in "${account.name}" for payment of ₹${sp.amount.toFixed(2)}`)
            }
          }
        }
      } else {
        // Single payment record
        primaryPayment = await tx.creditPayment.create({
          data: {
            creditEntryId: data.creditEntryId,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            accountId: data.accountId || null,
            reference: data.reference?.trim() || null,
            notes: data.notes?.trim() || null,
            paymentDate: paymentDate,
          },
        })

        if (data.accountId) {
          const account = await tx.financialAccount.findUnique({
            where: { id: data.accountId },
            select: { scope: true, name: true, isActive: true },
          })
          if (!account) throw new Error("Financial account not found")
          if (!account.isActive) throw new Error(`Account "${account.name}" is inactive`)

          if (authResult.session.role === "PHARMACIST" && account.scope !== "PHARMACY") {
            throw new Error("Pharmacists can only record payments to pharmacy accounts")
          }

          const isReceivable = entry.type === "RECEIVABLE"
          const txType = isReceivable ? "INCOME" : ("EXPENSE" as const)
          const isPharmacy = account.scope === "PHARMACY"
          const category = isReceivable
            ? (isPharmacy ? "CREDIT_COLLECTION" : "Credit Payment Received")
            : "Credit Payment Made"
          const accountGroupCode = isReceivable ? "1130" : resolveAccountGroupCode(txType, category, null)
          const billingTypeTag = resolveBillingTypeTag(null, entry.referenceType === "BILLING" ? entry.partyType : null)

          await tx.transaction.create({
            data: {
              accountId: data.accountId,
              type: txType,
              amount: data.amount,
              category,
              paymentMethod: data.paymentMethod,
              scope: account.scope,
              description: `Credit payment – ${entry.partyName}`,
              referenceId: entry.referenceId,
              accountGroupCode,
              billingType: billingTypeTag,
              date: paymentDate,
            },
          })

          if (isReceivable) {
            await tx.financialAccount.update({
              where: { id: data.accountId },
              data: { currentBalance: { increment: data.amount } },
            })
          } else {
            const r = await tx.financialAccount.updateMany({
              where: { id: data.accountId, currentBalance: { gte: data.amount } },
              data: { currentBalance: { decrement: data.amount } },
            })
            if (r.count !== 1) {
              throw new Error(`Insufficient balance in "${account.name}" for payment of ₹${data.amount.toFixed(2)}`)
            }
          }
        }
      }

      // 2. Update credit entry
      await tx.creditEntry.update({
        where: { id: data.creditEntryId },
        data: {
          paidAmount: newPaid,
          balanceAmount: Math.max(0, newBalance),
          status: newStatus,
        },
      })

      // 3. Update linked billing record when credit is paid
      if (entry.referenceType === "BILLING" && entry.referenceId) {
        let splitCash: number | null = null
        let splitUpi: number | null = null
        let splitCard: number | null = null
        if (data.paymentMethod === "SPLIT" && data.splits) {
          for (const sp of data.splits) {
            if (sp.paymentMethod === "CASH") splitCash = (splitCash || 0) + sp.amount
            else if (sp.paymentMethod === "UPI") splitUpi = (splitUpi || 0) + sp.amount
            else if (sp.paymentMethod === "CARD") splitCard = (splitCard || 0) + sp.amount
          }
        }

        const splitNotes = data.paymentMethod === "SPLIT" && data.splits
          ? `[SPLIT: ${data.splits.map(s => `${s.paymentMethod} ₹${s.amount}`).join(", ")}]`
          : null

        if (newStatus === "SETTLED") {
          await tx.billing.update({
            where: { id: entry.referenceId },
            data: {
              status: "PAID",
              paidAmount: entry.totalAmount,
              balanceAmount: 0,
              paymentMethod: data.paymentMethod,
              ...(splitCash !== null ? { splitCashAmount: splitCash } : {}),
              ...(splitUpi !== null ? { splitUpiAmount: splitUpi } : {}),
              ...(splitCard !== null ? { splitCardAmount: splitCard } : {}),
              ...(splitNotes ? { notes: splitNotes } : {}),
            },
          })
        } else {
          await tx.billing.update({
            where: { id: entry.referenceId },
            data: {
              paidAmount: newPaid,
              balanceAmount: Math.max(0, newBalance),
              paymentMethod: data.paymentMethod,
              ...(splitCash !== null ? { splitCashAmount: splitCash } : {}),
              ...(splitUpi !== null ? { splitUpiAmount: splitUpi } : {}),
              ...(splitCard !== null ? { splitCardAmount: splitCard } : {}),
              ...(splitNotes ? { notes: splitNotes } : {}),
            },
          })
        }
      }

      return primaryPayment
    })

    const paymentId = result?.id

    // Fetch bill number for receipt (outside the transaction, read-only)
    let linkedBillNumber: string | null = null
    if (entry.referenceType === "BILLING" && entry.referenceId) {
      const billing = await prisma.billing.findUnique({
        where: { id: entry.referenceId },
        select: { billNumber: true },
      })
      linkedBillNumber = billing?.billNumber || null
    }

    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/finance/credit")
    revalidatePath("/dashboard/finance/accounts")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/pharmacy-finance")
    revalidatePath("/dashboard/pharmacy-finance/receivables")
    revalidatePath("/dashboard/pharmacy-finance/accounts")
    revalidatePath("/dashboard/pharmacy-finance/day-close")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "CreditPayment",
      changes: {
        creditEntryId: data.creditEntryId,
        partyName: entry.partyName,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: paymentDate.toISOString(),
        newStatus,
      },
    })

    // Build receipt data for printing
    const receipt: CreditPaymentReceipt = {
      partyName: entry.partyName,
      partyType: entry.partyType,
      creditType: entry.type,
      totalAmount: entry.totalAmount,
      paidNow: data.amount,
      totalPaid: newPaid,
      remainingBalance: Math.max(0, newBalance),
      newStatus,
      paymentMethod: data.paymentMethod,
      reference: data.reference || null,
      paymentDate: paymentDate.toISOString(),
      linkedBillNumber,
    }

    return {
      success: true,
      message: `₹${data.amount.toLocaleString("en-IN")} recorded against "${entry.partyName}". Status: ${newStatus}`,
      receipt,
      paymentId,
    }
  } catch (error) {
    console.error("[ERROR] recordCreditPayment:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// DELETE CREDIT ENTRY (only if no payments)
// ============================================

export async function deleteCreditEntry(
  id: string
): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const entry = await prisma.creditEntry.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    })
    if (!entry) return { success: false, message: "Credit entry not found" }

    if (entry._count.payments > 0) {
      return { success: false, message: "Cannot delete — payments already recorded against this entry" }
    }

    // If linked to billing, cancel that billing too
    if (entry.referenceType === "BILLING" && entry.referenceId) {
      await prisma.billing.update({
        where: { id: entry.referenceId },
        data: {
          status: "CANCELLED",
          notes: "Credit entry deleted — bill cancelled",
        },
      }).catch(() => {})
    }

    await prisma.creditEntry.delete({ where: { id } })

    revalidatePath("/dashboard/finance/credit")
    revalidatePath("/dashboard/finance/billing")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "CreditEntry",
      changes: { id, partyName: entry.partyName, amount: entry.totalAmount },
    })

    return { success: true, message: `Credit entry for "${entry.partyName}" deleted` }
  } catch (error) {
    console.error("[ERROR] deleteCreditEntry:", error)
    return actionError(getErrorMessage(error))
  }
}
