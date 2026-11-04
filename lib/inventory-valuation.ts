"use server"

/**
 * ═══════════════════════════════════════════════════════════════════
 * INVENTORY VALUATION SERVICE
 * ═══════════════════════════════════════════════════════════════════
 *
 * Computes the total monetary value of pharmacy inventory at a point in time.
 * Used by the P&L engine to calculate true COGS:
 *
 *   COGS = Opening Stock + Purchases − Closing Stock
 *
 * Since InventoryBatch tracks current `quantity` (not historical snapshots),
 * this function returns the CURRENT closing stock value.
 * For historical periods, the P&L engine uses:
 *   Effective COGS = Purchase transactions (5110) − Closing Stock Value
 */

import { prisma } from "@/lib/prisma"

export interface InventoryValuationResult {
  /** Total value of all active inventory at purchase cost */
  totalValue: number
  /** Number of active batches included */
  batchCount: number
  /** Breakdown by top medicines (for display) */
  topItems: Array<{
    medicineName: string
    quantity: number
    purchasePrice: number
    value: number
  }>
}

/**
 * Get the current closing stock valuation.
 * Value = Σ(batch.quantity × batch.purchasePrice) for all active batches with qty > 0.
 */
export async function getClosingStockValuation(): Promise<InventoryValuationResult> {
  // Aggregate total value across all active batches
  const batches = await prisma.inventoryBatch.findMany({
    where: {
      isActive: true,
      quantity: { gt: 0 },
    },
    select: {
      quantity: true,
      purchasePrice: true,
      medicine: {
        select: { name: true },
      },
    },
  })

  let totalValue = 0
  const medicineValues = new Map<string, { quantity: number; purchasePrice: number; value: number }>()

  for (const batch of batches) {
    const batchValue = batch.quantity * batch.purchasePrice
    totalValue += batchValue

    const existing = medicineValues.get(batch.medicine.name)
    if (existing) {
      existing.quantity += batch.quantity
      existing.value += batchValue
    } else {
      medicineValues.set(batch.medicine.name, {
        quantity: batch.quantity,
        purchasePrice: batch.purchasePrice,
        value: batchValue,
      })
    }
  }

  // Top 10 medicines by value
  const topItems = Array.from(medicineValues.entries())
    .map(([medicineName, data]) => ({
      medicineName,
      ...data,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return {
    totalValue: Number(totalValue.toFixed(2)),
    batchCount: batches.length,
    topItems,
  }
}

/**
 * Quick aggregate-only valuation (no breakdown, faster for P&L engine).
 * Uses Prisma raw aggregation for performance.
 */
export async function getClosingStockTotal(): Promise<number> {
  const result = await prisma.inventoryBatch.findMany({
    where: {
      isActive: true,
      quantity: { gt: 0 },
    },
    select: {
      quantity: true,
      purchasePrice: true,
    },
  })

  let total = 0
  for (const batch of result) {
    total += batch.quantity * batch.purchasePrice
  }

  return Number(total.toFixed(2))
}
