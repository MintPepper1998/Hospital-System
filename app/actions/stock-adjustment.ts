"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { resolveAccountGroupCode } from "@/lib/account-group-resolver"

// ==========================================
// GET ALL STOCK ADJUSTMENTS
// ==========================================
export async function getStockAdjustments() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const adjustments = await prisma.stockAdjustment.findMany({
      include: {
        items: {
          include: {
            inventoryBatch: {
              include: { medicine: true }
            }
          }
        }
      },
      orderBy: { date: "desc" }
    })
    return { success: true, data: adjustments }
  } catch (error: any) {
    console.error("[ERROR] getStockAdjustments:", error)
    return { success: false, message: error.message || "Failed to fetch stock adjustments" }
  }
}

// ==========================================
// GET SINGLE STOCK ADJUSTMENT
// ==========================================
export async function getStockAdjustmentById(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            inventoryBatch: {
              include: { medicine: true }
            }
          }
        }
      }
    })
    return { success: true, data: adjustment }
  } catch (error: any) {
    console.error("[ERROR] getStockAdjustmentById:", error)
    return { success: false, message: error.message || "Failed to fetch stock adjustment" }
  }
}

// ==========================================
// CREATE STOCK ADJUSTMENT
// ==========================================
export interface AdjustmentItemInput {
  inventoryBatchId: string
  medicineId: string
  quantityChange: number
  unitCost: number
}

export async function createStockAdjustment(data: {
  reason: string
  notes?: string
  items: AdjustmentItemInput[]
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (!data.items || data.items.length === 0) {
    return { success: false, message: "At least one item is required" }
  }

  try {
    const adjustment = await prisma.$transaction(async (tx) => {
      // 1. Create the stock adjustment record
      const newAdjustment = await tx.stockAdjustment.create({
        data: {
          reason: data.reason,
          notes: data.notes,
          adjustedBy: authResult.session.name || "System",
          items: {
            create: data.items.map((item) => ({
              inventoryBatchId: item.inventoryBatchId,
              medicineId: item.medicineId,
              quantityChange: item.quantityChange,
              unitCost: item.unitCost,
            })),
          },
        },
        include: { items: true },
      })

      // 2. Update the quantities in the inventory batches
      for (const item of data.items) {
        // Find current batch to ensure we don't go negative
        const batch = await tx.inventoryBatch.findUnique({
          where: { id: item.inventoryBatchId }
        })

        if (!batch) {
          throw new Error(`Batch not found for ID: ${item.inventoryBatchId}`)
        }

        const newQuantity = batch.quantity + item.quantityChange
        if (newQuantity < 0) {
          throw new Error(`Cannot adjust ${batch.batchNumber} below 0. Current stock: ${batch.quantity}, Change: ${item.quantityChange}`)
        }

        await tx.inventoryBatch.update({
          where: { id: item.inventoryBatchId },
          data: {
            quantity: newQuantity,
            // Also update originalQuantity so restoreToInventory doesn't use a stale cap
            originalQuantity: { increment: item.quantityChange },
          },
        })
      }

      // 3. Stock adjustments are NON-CASH events — no ledger transaction or
      //    account balance change. The P&L engine reads write-off/gain values
      //    directly from StockAdjustmentItem (quantity × unitCost).

      return newAdjustment
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "PharmacyStockAdjustment",
      recordId: adjustment.id,
      changes: { reason: data.reason, itemCount: data.items.length },
    })

    revalidatePath("/dashboard/pharmacy/adjustments")
    revalidatePath("/dashboard/pharmacy/inventory")
    
    return { success: true, message: "Stock adjustment created successfully", data: adjustment }
  } catch (error: any) {
    console.error("[ERROR] createStockAdjustment:", error)
    return { success: false, message: error.message || "Failed to create stock adjustment" }
  }
}

export async function updateStockAdjustment(
  id: string, 
  data: { reason: string; notes?: string; items: { inventoryBatchId: string; medicineId: string; quantityChange: number; unitCost: number }[] }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const adjustment = await prisma.$transaction(async (tx) => {
      const oldAdjustment = await tx.stockAdjustment.findUnique({
        where: { id },
        include: { items: true }
      })
      if (!oldAdjustment) throw new Error("Adjustment not found")

      // 1. Revert old items
      for (const oldItem of oldAdjustment.items) {
        const batch = await tx.inventoryBatch.findUnique({ where: { id: oldItem.inventoryBatchId } })
        if (batch) {
          const newQty = batch.quantity - oldItem.quantityChange
          // We don't check for < 0 here because reverting could technically drop it below 0 if they sold stock in the meantime.
          // Wait, if it drops below 0, it means they sold stock they didn't have? 
          // Reverting a positive adjustment might drop it below zero. We must check this.
          if (newQty < 0) throw new Error(`Reverting would drop ${batch.batchNumber} below 0.`)
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              quantity: newQty,
              originalQuantity: { decrement: oldItem.quantityChange },
            }
          })
        }
      }

      // 2. Delete old items
      await tx.stockAdjustmentItem.deleteMany({ where: { stockAdjustmentId: id } })

      // 3. Apply new items
      for (const newItem of data.items) {
        const batch = await tx.inventoryBatch.findUnique({ where: { id: newItem.inventoryBatchId } })
        if (!batch) throw new Error(`Batch not found: ${newItem.inventoryBatchId}`)
        
        const newQty = batch.quantity + newItem.quantityChange
        if (newQty < 0) throw new Error(`Cannot adjust ${batch.batchNumber} below 0`)
        
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            quantity: newQty,
            originalQuantity: { increment: newItem.quantityChange },
          }
        })
      }

      // 4. Update the adjustment record
      const updated = await tx.stockAdjustment.update({
        where: { id },
        data: {
          reason: data.reason,
          notes: data.notes,
          items: {
            create: data.items.map(item => ({
              inventoryBatchId: item.inventoryBatchId,
              medicineId: item.medicineId,
              quantityChange: item.quantityChange,
              unitCost: item.unitCost
            }))
          }
        },
        include: { items: true }
      })

      return updated
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "PharmacyStockAdjustment",
      recordId: id,
      changes: { reason: data.reason },
    })

    revalidatePath("/dashboard/pharmacy/adjustments")
    revalidatePath("/dashboard/pharmacy/inventory")
    return { success: true, message: "Adjustment updated successfully", data: adjustment }
  } catch (error: any) {
    console.error("[ERROR] updateStockAdjustment:", error)
    return { success: false, message: error.message || "Failed to update adjustment" }
  }
}

export async function deleteStockAdjustment(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.findUnique({
        where: { id },
        include: { items: true }
      })
      if (!adjustment) throw new Error("Adjustment not found")

      // Revert stock
      for (const item of adjustment.items) {
        const batch = await tx.inventoryBatch.findUnique({ where: { id: item.inventoryBatchId } })
        if (batch) {
          const newQuantity = batch.quantity - item.quantityChange
          if (newQuantity < 0) {
            throw new Error(`Cannot revert adjustment: Stock for ${batch.batchNumber} would drop below 0.`)
          }
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              quantity: newQuantity,
              originalQuantity: { decrement: item.quantityChange },
            }
          })
        }
      }

      await tx.stockAdjustmentItem.deleteMany({ where: { stockAdjustmentId: id } })
      await tx.stockAdjustment.delete({ where: { id } })

      return adjustment
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "PharmacyStockAdjustment",
      recordId: id,
      changes: { reason: result.reason },
    })

    revalidatePath("/dashboard/pharmacy/adjustments")
    revalidatePath("/dashboard/pharmacy/inventory")
    return { success: true, message: "Stock adjustment deleted and stock reverted" }
  } catch (error: any) {
    console.error("[ERROR] deleteStockAdjustment:", error)
    return { success: false, message: error.message || "Failed to delete adjustment" }
  }
}

// ==========================================
// SEARCH INVENTORY BATCHES (For Modal)
// ==========================================
export async function searchInventoryBatches(query: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (!query || query.length < 2) return { success: true, data: [] }

  try {
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        isActive: true,
        medicine: { isActive: true },
        quantity: { gt: 0 },
        OR: [
          { medicine: { name: { contains: query, mode: "insensitive" } } },
          { batchNumber: { contains: query, mode: "insensitive" } },
        ]
      },
      include: { medicine: true },
      take: 10,
    })
    return { success: true, data: batches }
  } catch (error: any) {
    console.error("[ERROR] searchInventoryBatches:", error)
    return { success: false, message: "Failed to search inventory batches" }
  }
}
