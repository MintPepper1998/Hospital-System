"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { BillingStatus, PaymentMethod } from "@prisma/client"
import { z } from "zod"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { resolveAccountGroupCode, resolveBillingTypeTag } from "@/lib/account-group-resolver"
import { hospitalBillingWhere } from "@/lib/finance-scope"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "INSURANCE", "BSKY"]),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
  recordedBy: z.string().optional(),
})

// ============================================
// RECORD PAYMENT (Partial or Full)
// ============================================

export async function recordPayment(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const rawData = {
      invoiceId: formData.get("invoiceId") as string,
      amount: parseFloat(formData.get("amount") as string),
      method: formData.get("method") as string,
      transactionId: (formData.get("transactionId") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      recordedBy: (formData.get("recordedBy") as string) || undefined,
    }

    // Validate input
    const parsed = recordPaymentSchema.safeParse(rawData)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || "Validation failed"
      return { success: false, message: firstError }
    }

    const { invoiceId, amount, method, transactionId, notes, recordedBy } = parsed.data

    // Fetch the current billing/invoice
    const billing = await prisma.billing.findUnique({
      where: { id: invoiceId },
    })

    if (!billing) {
      return { success: false, message: "Invoice not found" }
    }
    if (billing.type === "PHARMACY") {
      return { success: false, message: "Pharmacy bills must be collected in Pharmacy Finance" }
    }

    if (billing.status === BillingStatus.CANCELLED) {
      return { success: false, message: "Cannot record payment on a cancelled invoice" }
    }

    if (billing.status === BillingStatus.PAID) {
      return { success: false, message: "This invoice is already fully paid" }
    }

    // Validate payment amount does not exceed balance
    const currentBalance = billing.balanceAmount
    if (amount > currentBalance + 0.01) { // Small tolerance for floating point
      return {
        success: false,
        message: `Payment amount (₹${amount.toFixed(2)}) exceeds the remaining balance (₹${currentBalance.toFixed(2)})`,
      }
    }

    // Calculate new amounts
    const newPaidAmount = billing.paidAmount + amount
    const newBalance = Math.max(0, billing.netAmount - newPaidAmount) // Prevent negative balance

    // Determine new status
    let newStatus: BillingStatus
    if (newBalance <= 0.01) {
      // Fully paid (with tolerance for floating point)
      newStatus = BillingStatus.PAID
    } else if (newPaidAmount > 0) {
      newStatus = BillingStatus.PARTIALLY_PAID
    } else {
      newStatus = BillingStatus.PENDING
    }

    // Execute in a transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the payment record
      const payment = await tx.payment.create({
        data: {
          billingId: invoiceId,
          amount,
          method: method as PaymentMethod,
          paymentMethod: method, // Legacy field
          transactionId: transactionId || null,
          notes: notes || null,
          recordedBy: recordedBy || null,
          paymentDate: new Date(),
        },
      })

      // 2. Update the billing/invoice with new totals and status
      const updatedBilling = await tx.billing.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newStatus,
          // Update payment method on billing if this is the first/only payment
          paymentMethod: billing.paidAmount === 0 ? method : billing.paymentMethod,
        },
      })

      // 3. Create ledger transaction for this payment
      const billingTypeStr = billing.type?.toString() || null
      const accountId = await resolveFinancialAccount(tx, method)
      if (accountId) {
        const accountGroupCode = resolveAccountGroupCode("INCOME", `${billingTypeStr}_PAYMENT`, billingTypeStr)
        const billingTypeTag = resolveBillingTypeTag(billingTypeStr)
        await tx.transaction.create({
          data: {
            accountId,
            type: "INCOME",
            amount,
            category: `${billingTypeStr}_PAYMENT`,
            paymentMethod: method,
            referenceId: invoiceId,
            description: `Payment against bill ${billing.billNumber}`,
            accountGroupCode,
            billingType: billingTypeTag,
          },
        })
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amount } },
        })
      }

      return { payment, updatedBilling }
    })

    console.log(
      `[SUCCESS] Payment of ₹${amount.toFixed(2)} recorded for invoice ${billing.billNumber}. ` +
      `Status: ${newStatus}. Balance: ₹${newBalance.toFixed(2)}`
    )

    // Revalidate relevant pages
    revalidatePath(`/dashboard/finance/billing/${invoiceId}`)
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard")

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "Payment", recordId: invoiceId, changes: { amount, method } })

    return {
      success: true,
      message: newStatus === BillingStatus.PAID
        ? `Payment of ₹${amount.toFixed(2)} recorded. Invoice is now fully PAID.`
        : `Payment of ₹${amount.toFixed(2)} recorded. Remaining balance: ₹${newBalance.toFixed(2)}`,
      data: {
        paymentId: result.payment.id,
        newPaidAmount,
        newBalance,
        newStatus,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] recordPayment failed:", error)
    const message = error instanceof Error ? error.message : "Failed to record payment"
    return { success: false, message }
  }
}

// ============================================
// GET PAYMENT HISTORY FOR AN INVOICE
// ============================================

export async function getPaymentHistory(invoiceId: string) {
  await requireAuth()
  try {
    const billing = await prisma.billing.findUnique({ where: { id: invoiceId }, select: { type: true } })
    if (billing?.type === "PHARMACY") {
      return { success: false, message: "Pharmacy bills are available in Pharmacy Finance only", data: [] }
    }

    const payments = await prisma.payment.findMany({
      where: { billingId: invoiceId },
      orderBy: { paymentDate: "desc" },
    })

    return { success: true, data: payments }
  } catch (error: unknown) {
    console.error("[ERROR] getPaymentHistory failed:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch payment history"
    return { success: false, message, data: [] }
  }
}

// ============================================
// GET INVOICE SUMMARY (with payment breakdown)
// ============================================

export async function getInvoiceSummary(invoiceId: string) {
  await requireAuth()
  try {
    const billing = await prisma.billing.findUnique({
      where: { id: invoiceId },
      include: {
        patient: {
          include: { user: true },
        },
        items: true,
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    })

    if (!billing) {
      return { success: false, message: "Invoice not found" }
    }
    if (billing.type === "PHARMACY") {
      return { success: false, message: "Pharmacy bills are available in Pharmacy Finance only" }
    }

    return {
      success: true,
      data: {
        ...billing,
        paymentCount: billing.payments.length,
        isFullyPaid: billing.status === BillingStatus.PAID,
        isPartiallyPaid: billing.status === BillingStatus.PARTIALLY_PAID,
        remainingBalance: billing.balanceAmount,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] getInvoiceSummary failed:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch invoice summary"
    return { success: false, message }
  }
}

// ============================================
// GET ALL UNPAID/PARTIALLY PAID INVOICES
// ============================================

export async function getOutstandingInvoices() {
  await requireAuth()
  try {
    const invoices = await prisma.billing.findMany({
      where: hospitalBillingWhere({
        status: {
          in: [BillingStatus.PENDING, BillingStatus.PARTIALLY_PAID],
        },
      }),
      include: {
        patient: {
          include: { user: true },
        },
      },
      orderBy: { billDate: "desc" },
    })

    return { success: true, data: invoices }
  } catch (error: unknown) {
    console.error("[ERROR] getOutstandingInvoices failed:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch outstanding invoices"
    return { success: false, message, data: [] }
  }
}

// ============================================
// UPDATE BILLING (status, notes, payment method)
// ============================================

export async function updateBilling(id: string, formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const status = formData.get("status") as string | null
    const paymentMethod = formData.get("paymentMethod") as string | null
    const notes = formData.get("notes") as string | null
    const paidAmountRaw = formData.get("paidAmount") as string | null

    const billing = await prisma.billing.findUnique({ where: { id } })
    if (!billing) return { success: false, message: "Bill not found" }
    if (billing.type === "PHARMACY") return { success: false, message: "Pharmacy bills must be managed in Pharmacy Finance" }

    const paidAmount = paidAmountRaw ? parseFloat(paidAmountRaw) : billing.paidAmount
    const balanceAmount = Math.max(0, billing.netAmount - paidAmount)

    let newStatus = (status || billing.status) as BillingStatus
    if (!status) {
      if (balanceAmount <= 0.01) newStatus = BillingStatus.PAID
      else if (paidAmount > 0) newStatus = BillingStatus.PARTIALLY_PAID
      else newStatus = BillingStatus.PENDING
    }

    await prisma.billing.update({
      where: { id },
      data: {
        status: newStatus,
        paymentMethod: paymentMethod || billing.paymentMethod,
        notes: notes !== null ? notes : billing.notes,
        paidAmount,
        balanceAmount,
      },
    })

    revalidatePath(`/dashboard/finance/billing/${id}`)
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Billing", recordId: id, changes: {} })
    return { success: true, message: "Bill updated successfully" }
  } catch (error: unknown) {
    console.error("[ERROR] updateBilling failed:", error)
    const message = error instanceof Error ? error.message : "Failed to update bill"
    return { success: false, message }
  }
}

// ============================================
// DELETE BILLING (cascade-safe)
// ============================================

export async function deleteBilling(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const billing = await prisma.billing.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        insuranceClaims: true,
        salesReturns: true,
        labRequests: true,
        surgeries: true,
        ambulanceBillings: true,
      },
    })
    if (!billing) return { success: false, message: "Bill not found" }
    if (billing.type === "PHARMACY") return { success: false, message: "Pharmacy bills must be managed in Pharmacy Finance" }

    await prisma.$transaction(async (tx) => {
      // 1. Delete child records that belong solely to this bill
      await tx.billingItem.deleteMany({ where: { billingId: id } })
      await tx.payment.deleteMany({ where: { billingId: id } })
      await tx.salesReturn.deleteMany({ where: { originalBillId: id } })
      await tx.insuranceClaim.deleteMany({ where: { billingId: id } })

      // 2. Nullify references in records that should NOT be deleted
      if (billing.labRequests.length > 0) {
        await tx.labRequest.updateMany({
          where: { billingId: id },
          data: { billingId: null },
        })
      }
      if (billing.surgeries.length > 0) {
        await tx.surgery.updateMany({
          where: { billingId: id },
          data: { billingId: null },
        })
      }
      if (billing.ambulanceBillings.length > 0) {
        await tx.ambulanceBilling.updateMany({
          where: { billingId: id },
          data: { billingId: null },
        })
      }

      // 3. Reverse ledger balances, THEN delete linked transactions
      const linkedTransactions = await tx.transaction.findMany({
        where: { referenceId: id },
      })
      for (const txn of linkedTransactions) {
        const reversal = txn.type === "INCOME" ? -txn.amount : txn.amount
        await tx.financialAccount.update({
          where: { id: txn.accountId },
          data: { currentBalance: { increment: reversal } },
        })
      }
      await tx.transaction.deleteMany({
        where: { referenceId: id },
      })

      // 4. Finally delete the billing itself
      await tx.billing.delete({ where: { id } })
    })

    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/reports/hospital-pnl")
    revalidatePath("/dashboard/reports/medicine-pnl")

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "Billing", recordId: id, changes: {} })
    return { success: true, message: `Bill ${billing.billNumber} deleted successfully` }
  } catch (error: unknown) {
    console.error("[ERROR] deleteBilling failed:", error)
    const message = error instanceof Error ? error.message : "Failed to delete bill"
    return { success: false, message }
  }
}
