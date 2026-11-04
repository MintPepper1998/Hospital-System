"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { hasTemporaryPermission } from "@/lib/actions/permissions"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"
import { restoreToInventory } from "@/lib/inventory-service"
import { resolveFinancialAccount } from "@/lib/payment-routing"

export async function approveSalesRefund(returnId: string) {
  try {
    const authResult = await requireAuthSafe(["SUPER_ADMIN"])
    if (!authResult.ok) return { success: false, message: "Unauthorized: Admin access required" }

    const adminId = authResult.session.userId

    return await prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.findUnique({
        where: { id: returnId },
        include: {
          items: true,
          originalBill: {
            select: {
              id: true,
              billNumber: true,
              settlementStatus: true,
              ipdAdmissionId: true,
              paymentMethod: true,
              netAmount: true,
              balanceAmount: true,
              taxAmount: true,
            },
          },
        },
      })

      if (!salesReturn) throw new Error("Sales return not found")
      if (salesReturn.refundStatus !== "PENDING_APPROVAL") throw new Error("Return is not pending approval")

      const refundAmount = salesReturn.refundAmount
      const bill = salesReturn.originalBill

      // 1. Restore Inventory via centralized service
      for (const item of salesReturn.items) {
        if (item.medicineId) {
          await restoreToInventory(tx, {
            batchId: item.medicineId,
            units: item.quantity,
          })
        }
      }

      // 2. Handle the financial side based on the original bill's situation
      if (bill.settlementStatus === "SETTLED") {
        // IPD bill already settled with the hospital — cannot reverse via return
        throw new Error(
          "This IPD bill is already settled with the hospital. " +
          "Reverse it via Cross-Department Transfer from the Pharmacy Finance section."
        )
      }

      if (bill.settlementStatus === "PENDING") {
        // IPD bill not yet settled — lower the bill amount (no cash moves)
        const newNet = Math.max(0, bill.netAmount - refundAmount)
        const newBalance = Math.max(0, (bill.balanceAmount ?? bill.netAmount) - refundAmount)
        await tx.billing.update({
          where: { id: bill.id },
          data: {
            netAmount: newNet,
            balanceAmount: newBalance,
            ...(newNet <= 0.01 && { status: "REFUNDED" }),
          },
        })
      } else {
        // Check for open credit entry
        const creditEntry = await tx.creditEntry.findFirst({
          where: {
            referenceType: "BILLING",
            referenceId: bill.id,
            status: { not: "SETTLED" },
            type: "RECEIVABLE",
          },
        })

        if (creditEntry && creditEntry.balanceAmount > 0.01) {
          // Credit sale — reduce the credit entry balance
          const creditReduction = Math.min(refundAmount, creditEntry.balanceAmount)
          const cashRemainder = Math.round((refundAmount - creditReduction) * 100) / 100

          const newCreditBalance = Math.max(0, creditEntry.balanceAmount - creditReduction)
          const newCreditTotal = Math.max(0, creditEntry.totalAmount - creditReduction)
          await tx.creditEntry.update({
            where: { id: creditEntry.id },
            data: {
              totalAmount: newCreditTotal,
              balanceAmount: newCreditBalance,
              ...(newCreditBalance <= 0.01 && { status: "SETTLED" }),
            },
          })

          // If there's a cash remainder (partial credit, partial paid), refund that
          if (cashRemainder > 0.01) {
            await refundCash(tx, cashRemainder, bill, salesReturn)
          }
        } else {
          // Fully paid sale — refund cash
          await refundCash(tx, refundAmount, bill, salesReturn)
        }
      }

      // 3. Mark as Approved
      const updated = await tx.salesReturn.update({
        where: { id: returnId },
        data: {
          refundStatus: "APPROVED",
          approvedBy: adminId,
        },
      })

      // 4. Check if entire bill is now fully returned → mark REFUNDED
      const allReturnsForBill = await tx.salesReturn.findMany({
        where: { originalBillId: bill.id, refundStatus: "APPROVED" },
        include: { items: true },
      })
      const totalRefundedAmount = allReturnsForBill.reduce((sum, r) => sum + r.refundAmount, 0)

      // If total refunded >= original bill net amount, mark the bill as REFUNDED
      if (totalRefundedAmount >= bill.netAmount - 0.01) {
        await tx.billing.update({
          where: { id: bill.id },
          data: { status: "REFUNDED" },
        })
      }

      writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "SalesReturn", recordId: returnId, changes: { status: "APPROVED" } })

      return { success: true, message: "Refund approved successfully" }
    })
  } catch (error: any) {
    console.error("[approveSalesRefund] Error:", error)
    return { success: false, message: error.message || "Failed to approve refund" }
  }
}

/**
 * Internal helper: refund cash with a guarded balance decrement.
 * Determines the right account from the bill's payment method.
 */
async function refundCash(
  tx: any,
  amount: number,
  bill: { id: string; billNumber: string; paymentMethod: string | null },
  salesReturn: { id: string; returnNumber: string },
) {
  // For SPLIT bills, refund to the cash drawer by default
  const method = bill.paymentMethod === "SPLIT" ? "CASH" : (bill.paymentMethod || "CASH")
  const accountId = await resolveFinancialAccount(tx, method, "PHARMACY")
  if (!accountId) {
    throw new Error(`No pharmacy ${method} account found for refund`)
  }

  // Load the account to get its scope and validate balance
  const account = await tx.financialAccount.findUnique({
    where: { id: accountId },
    select: { name: true, scope: true },
  })

  // Guarded decrement — atomic balance check + update
  const r = await tx.financialAccount.updateMany({
    where: { id: accountId, currentBalance: { gte: amount } },
    data: { currentBalance: { decrement: amount } },
  })
  if (r.count !== 1) {
    throw new Error(`Insufficient balance in "${account?.name || "pharmacy account"}" for refund of ₹${amount.toFixed(2)}`)
  }

  await tx.transaction.create({
    data: {
      accountId,
      type: "EXPENSE",
      category: "SALES_REFUND",
      amount,
      date: new Date(),
      description: `Refund for Sales Return ${salesReturn.returnNumber} — Bill ${bill.billNumber}`,
      paymentMethod: method,
      scope: account?.scope || "PHARMACY",
      referenceId: salesReturn.id,
      accountGroupCode: "6100", // Sales Returns & Refunds contra
      billingType: "PHARMACY",
    },
  })
}

export interface SalesReturnItemInput {
  billingItemId: string
  returnQuantity: number
  returnReason: string
}

export async function processSalesReturn(
  billId: string, 
  patientId: string, 
  type: "RETURN" | "EXCHANGE",
  items: SalesReturnItemInput[]
) {
  try {
    const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
    if (!authResult.ok) return { success: false, message: "Unauthorized" }

    if (authResult.session.role === "PHARMACIST") {
      const hasPerm = await hasTemporaryPermission(authResult.session.userId, "PHARMACY_RETURN")
      if (!hasPerm) return { success: false, message: "You do not have temporary access to process returns. Please request access from HR." }
    }

    if (!items || items.length === 0) {
      return { success: false, message: "No items provided for return/exchange" }
    }

    const bill = await prisma.billing.findUnique({
      where: { id: billId },
      include: { items: true }
    })

    if (!bill) return { success: false, message: "Original bill not found" }

    // 7-day validation check
    const billDate = new Date(bill.createdAt)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    if (billDate < sevenDaysAgo) {
      return { 
        success: false, 
        message: "Return/Exchange rejected: Purchase is older than 7 days." 
      }
    }

    let totalRefund = 0
    const returnItemsData: any[] = []

    for (const itemInput of items) {
      const billItem = bill.items.find(i => i.id === itemInput.billingItemId)
      if (!billItem) throw new Error("Billing item not found")

      if (itemInput.returnQuantity > billItem.quantity) {
        throw new Error("Cannot return more than originally purchased")
      }

      // Use actual per-unit amounts from the original bill (already includes any discounts)
      const originalPerUnitTotal = billItem.totalAmount / billItem.quantity
      const itemTotalRefund = originalPerUnitTotal * itemInput.returnQuantity

      totalRefund += itemTotalRefund

      returnItemsData.push({
        medicineId: billItem.referenceId,
        itemName: billItem.description,
        quantity: itemInput.returnQuantity,
        unitPrice: billItem.unitPrice,
        totalAmount: itemTotalRefund
      })
    }

    // Generate Return Number (timestamp-based to avoid race conditions)
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
    const returnNumber = `SR-${ts}-${rand}`

    const salesReturn = await prisma.salesReturn.create({
      data: {
        returnNumber,
        originalBillId: billId,
        patientId,
        type,
        refundAmount: totalRefund,
        refundStatus: "PENDING_APPROVAL",
        items: {
          create: returnItemsData
        }
      }
    })

    revalidatePath("/dashboard/pharmacy/sales-returns")
    revalidatePath("/dashboard/pharmacy/bills")
    
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "SalesReturn", recordId: salesReturn.id, changes: { billId, refundAmount: salesReturn.refundAmount } })

    return { success: true, message: `Return processed successfully. Pending Admin Approval.`, data: salesReturn }
  } catch (error: any) {
    console.error("[processSalesReturn] Error:", error)
    return { success: false, message: error.message || "Failed to process return" }
  }
}

export async function getSalesReturns() {
  try {
    const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
    if (!authResult.ok) return { success: false, message: "Unauthorized" }

    const returns = await prisma.salesReturn.findMany({
      include: {
        patient: { select: { user: { select: { name: true } } } },
        originalBill: { select: { billNumber: true } },
        items: true
      },
      orderBy: { createdAt: "desc" }
    })

    return { success: true, data: returns }
  } catch (error: any) {
    console.error("[getSalesReturns] Error:", error)
    return { success: false, message: "Failed to fetch sales returns" }
  }
}
