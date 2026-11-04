"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { BillingStatus, BillingType } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit"
import { restoreToInventory } from "@/lib/inventory-service"

/**
 * Fetch all pharmacy bills.
 */
export async function getPharmacyBills() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const bills = await prisma.billing.findMany({
      where: { type: BillingType.PHARMACY },
      include: {
        patient: {
          select: { phone: true, user: { select: { name: true } } }
        },
        pharmacyCustomer: {
          select: { name: true, phone: true }
        },
        items: true,
        salesReturns: {
          select: {
            id: true,
            returnNumber: true,
            refundAmount: true,
            refundStatus: true,
            items: { select: { quantity: true, itemName: true } },
          }
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: bills }
  } catch (error) {
    console.error("[getPharmacyBills] Error:", error)
    return { success: false, message: "Failed to fetch pharmacy bills" }
  }
}

/**
 * Delete a pharmacy bill and restore inventory for all its items.
 */
export async function deletePharmacyBill(billId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.$transaction(async (tx) => {
      const bill = await tx.billing.findUnique({
        where: { id: billId, type: BillingType.PHARMACY },
        include: { items: true }
      })

      if (!bill) throw new Error("Pharmacy bill not found.")

      const isClinicalDispenseBill = bill.items.some((item) =>
        item.serviceCategory === "PHARMACY_IPD" || item.serviceCategory === "PHARMACY_DISCHARGE"
      )
      if (isClinicalDispenseBill) {
        throw new Error("IPD and discharge pharmacy bills cannot be deleted here. Use the clinical return or correction workflow so inventory remains synchronized.")
      }

      // Find associated sales returns to prevent double-restoring inventory
      const salesReturns = await tx.salesReturn.findMany({
        where: { originalBillId: billId },
        include: { items: true }
      })

      // Build a map of batchId → already-restored quantity from approved sales returns.
      // NOTE: SalesReturnItem.medicineId actually stores the batchId (BillingItem.referenceId)
      // due to a historical schema quirk documented in sales-returns.ts.
      const restoredQuantities: Record<string, number> = {}
      for (const sr of salesReturns) {
        if (sr.refundStatus === "APPROVED" || sr.refundStatus === "PROCESSED" || sr.refundStatus === "COMPLETED" || sr.refundStatus === "REFUNDED") {
          for (const srItem of sr.items) {
            if (srItem.medicineId) {
              // srItem.medicineId is actually the batchId
              restoredQuantities[srItem.medicineId] = (restoredQuantities[srItem.medicineId] || 0) + srItem.quantity
            }
          }
        }
      }

      // 1. Restore inventory for all items
      for (const item of bill.items) {
        if (item.serviceCategory === "PHARMACY" && item.referenceId) {
          const batchId = item.referenceId
          
          // Look up by batchId — matches the key used above (srItem.medicineId = batchId)
          const alreadyRestored = restoredQuantities[batchId] || 0
          const netToRestore = item.quantity - alreadyRestored
          
          if (netToRestore > 0) {
            // Check if batch exists
            const batch = await tx.inventoryBatch.findUnique({
              where: { id: batchId }
            })

            if (batch) {
              await restoreToInventory(tx, {
                batchId: batchId,
                units: netToRestore,
              })
            }
          }
        }
      }

      // 1.5 Delete associated sales returns
      await tx.salesReturn.deleteMany({
        where: { originalBillId: billId }
      })

      // 2. Delete the bill (this cascades to BillingItem usually, but we can do it explicitly)
      await tx.billingItem.deleteMany({
        where: { billingId: billId }
      })
      await tx.payment.deleteMany({
        where: { billingId: billId }
      })
      await tx.billing.delete({
        where: { id: billId }
      })
    })

    revalidatePath("/dashboard/pharmacy/bills")
    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "PharmacyBill", recordId: billId, changes: {} })
    return { success: true }
  } catch (error: any) {
    console.error("[deletePharmacyBill] Error:", error)
    return { success: false, message: error.message || "Failed to delete pharmacy bill" }
  }
}

/**
 * Refund a specific quantity for a billing item.
 * Restores inventory stock and adjusts the bill totals down.
 */
export async function refundPharmacyBillItem(billId: string, itemId: string, returnQuantity: number) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (returnQuantity <= 0) {
    return { success: false, message: "Return quantity must be greater than 0" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const bill = await tx.billing.findUnique({
        where: { id: billId },
        include: { items: true }
      })

      if (!bill) throw new Error("Bill not found")
      
      const item = bill.items.find((i) => i.id === itemId)
      if (!item) throw new Error("Item not found in this bill")
      if (item.serviceCategory !== "PHARMACY" || !item.referenceId) {
        throw new Error("This item cannot be refunded automatically (Missing batch reference)")
      }

      if (returnQuantity > item.quantity) {
        throw new Error(`Cannot return ${returnQuantity}. Only ${item.quantity} units were billed.`)
      }

      // 1. Restore inventory
      const batchId = item.referenceId
      const batch = await tx.inventoryBatch.findUnique({ where: { id: batchId } })
      if (batch) {
        await restoreToInventory(tx, {
          batchId: batchId,
          units: returnQuantity,
        })
      }

      // 2. Adjust BillingItem totals
      const newQuantity = item.quantity - returnQuantity
      
      if (newQuantity === 0) {
        // Remove item entirely if returning all
        await tx.billingItem.delete({ where: { id: itemId } })
      } else {
        const newAmount = newQuantity * item.unitPrice
        const newGstAmount = (newAmount * item.gstRate) / 100
        const newTotalAmount = newAmount + newGstAmount
        
        // Try to update the description to reflect the new quantity
        const oldDescBase = item.description.split(" - ")[0] // e.g. "Paracetamol (Batch: B123)"
        const newDescription = oldDescBase ? `${oldDescBase} - ${newQuantity} unit(s)` : item.description
        
        await tx.billingItem.update({
          where: { id: itemId },
          data: {
            quantity: newQuantity,
            amount: newAmount,
            gstAmount: newGstAmount,
            totalAmount: newTotalAmount,
            description: newDescription,
          }
        })
      }

      // 3. Recalculate full Bill totals
      const remainingItems = await tx.billingItem.findMany({ where: { billingId: billId } })
      
      const subtotal = remainingItems.reduce((sum, i) => sum + i.amount, 0)
      const totalTax = remainingItems.reduce((sum, i) => sum + i.gstAmount, 0)
      const newGrandTotal = subtotal + totalTax
      
      // Calculate Round Off
      const roundedTotal = Math.round(newGrandTotal)
      const roundOff = roundedTotal - newGrandTotal
      
      const newNetAmount = roundedTotal
      
      // If the net amount drops below what they already paid, keep the paid amount as is 
      // (the logic for actual money refund is up to the user; we just reduce the bill totals)
      await tx.billing.update({
        where: { id: billId },
        data: {
          totalAmount: subtotal,
          taxAmount: totalTax,
          roundOff: roundOff,
          netAmount: newNetAmount,
          status: newNetAmount <= bill.paidAmount ? BillingStatus.PAID : BillingStatus.PARTIALLY_PAID
        }
      })
    })

    revalidatePath("/dashboard/pharmacy/bills")
    revalidatePath(`/dashboard/pharmacy/bills/${billId}/edit`)
    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "PharmacyRefund", recordId: billId, changes: { itemId, returnQuantity } })
    return { success: true }
  } catch (error: any) {
    console.error("[refundPharmacyBillItem] Error:", error)
    return { success: false, message: error.message || "Failed to process refund" }
  }
}
