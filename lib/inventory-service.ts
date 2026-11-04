"use server"

/**
 * ═══════════════════════════════════════════════════════════════════
 * CENTRALIZED INVENTORY SERVICE
 * ═══════════════════════════════════════════════════════════════════
 *
 * ALL inventory mutations MUST go through this module.
 * No other file should directly call prisma.inventoryBatch.create/update/upsert.
 *
 * 4 operations:
 *   addToInventory()      — Purchase, stock entry
 *   deductFromInventory() — Sale, dispense
 *   restoreToInventory()  — Refund, bill delete (adds back to quantity only)
 *   reverseFromInventory()— Invoice delete/edit reversal (adjusts both quantity AND originalQuantity)
 */

import { Prisma } from "@prisma/client"
import { supplierAllowedFor } from "@/lib/supplier-scope"

// Transaction client type — allows these functions to run inside an existing transaction
type TxClient = Prisma.TransactionClient

// Rounding helpers
const round4 = (n: number) => Number(n.toFixed(4))

function assertNonNegativeWhole(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a whole number of at least 0`)
  }
}

function assertPositiveWhole(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a whole number of at least 1`)
  }
}

// ═══════════════════════════════════════════════════════════════════
// 1. ADD TO INVENTORY — Purchase, stock entry
// ═══════════════════════════════════════════════════════════════════

export interface AddToInventoryParams {
  medicineId: string
  batchNumber: string
  supplierId: string
  /** Number of strips/packs received (paid). Will be multiplied by packSize. */
  paidStrips: number
  /** Number of free/bonus strips. Will be multiplied by packSize. */
  freeStrips?: number
  /** Units per strip/pack for quantity math (e.g., 10 tablets per strip). Default: 1 */
  packSize?: number
  /** Actual medicines per strip for the batch record. Overrides packSize for medicinesPerStrip. */
  actualPackSize?: number
  /** Purchase price PER STRIP (not per unit). Will be divided by packSize. */
  purchasePricePerStrip: number
  /** Selling price (MRP) PER STRIP. Will be divided by packSize. */
  sellingPricePerStrip: number
  expiryDate: Date
  /** Optional fields */
  invoiceNumber?: string
  invoiceDate?: Date
  manufactureDate?: Date | null
  grnNumber?: string | null
  taxPercent?: number
}

/**
 * Add stock to inventory. Handles all strip→unit conversion in one place.
 * Uses upsert: creates a new batch or increments an existing one.
 */
export async function addToInventory(tx: TxClient, params: AddToInventoryParams) {
  assertNonNegativeWhole(params.paidStrips, "Paid quantity")
  assertNonNegativeWhole(params.freeStrips ?? 0, "Free quantity")

  const packSize = params.packSize ?? 1
  const actualMedsPerStrip = params.actualPackSize ?? packSize
  assertPositiveWhole(packSize, "Pack size")
  assertPositiveWhole(actualMedsPerStrip, "Actual pack size")
  if (params.paidStrips + (params.freeStrips ?? 0) < 1) {
    throw new Error("At least one paid or free unit is required")
  }
  if (!Number.isFinite(params.purchasePricePerStrip) || params.purchasePricePerStrip < 0) {
    throw new Error("Purchase price must be a valid non-negative number")
  }
  if (!Number.isFinite(params.sellingPricePerStrip) || params.sellingPricePerStrip < 0) {
    throw new Error("Selling price must be a valid non-negative number")
  }
  if (!(params.expiryDate instanceof Date) || Number.isNaN(params.expiryDate.getTime())) {
    throw new Error("Expiry date is invalid")
  }
  if (params.taxPercent !== undefined && (!Number.isFinite(params.taxPercent) || params.taxPercent < 0)) {
    throw new Error("Tax percentage must be a valid non-negative number")
  }

  const supplier = await tx.supplier.findUnique({ where: { id: params.supplierId }, select: { scope: true } })
  if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) {
    throw new Error("Supplier is not available for pharmacy inventory")
  }
  const paidUnits = params.paidStrips * packSize
  const freeUnits = (params.freeStrips || 0) * packSize
  const totalUnits = paidUnits + freeUnits

  // Per-unit prices: strip price ÷ actual medicines per strip
  // Always use actualMedsPerStrip (real pack size) for price division,
  // not the quantity-math packSize which may be 1 when _dbQuantityUnits is used.
  const purchasePricePerUnit = round4(params.purchasePricePerStrip / actualMedsPerStrip)
  const sellingPricePerUnit = round4(params.sellingPricePerStrip / actualMedsPerStrip)

  // Effective purchase price: spread paid cost across all units (paid + free)
  // e.g., Buy 10 strips @ ₹100 + 2 free → effective = (10×100)/(12×packSize) per unit
  const effectivePurchasePrice = freeUnits > 0
    ? round4((paidUnits * purchasePricePerUnit) / totalUnits)
    : purchasePricePerUnit

  const result = await tx.inventoryBatch.upsert({
    where: {
      medicineId_batchNumber: {
        medicineId: params.medicineId,
        batchNumber: params.batchNumber,
      },
    },
    update: {
      quantity: { increment: totalUnits },
      originalQuantity: { increment: totalUnits },
      purchasePrice: effectivePurchasePrice,
      sellingPrice: sellingPricePerUnit,
      medicinesPerStrip: actualMedsPerStrip,
      taxPercent: params.taxPercent,
    },
    create: {
      medicineId: params.medicineId,
      batchNumber: params.batchNumber,
      supplierId: params.supplierId,
      quantity: totalUnits,
      originalQuantity: totalUnits,
      purchasePrice: effectivePurchasePrice,
      sellingPrice: sellingPricePerUnit,
      medicinesPerStrip: actualMedsPerStrip,
      taxPercent: params.taxPercent,
      expiryDate: params.expiryDate,
      manufactureDate: params.manufactureDate,
      grnNumber: params.grnNumber,
      invoiceNumber: params.invoiceNumber,
      invoiceDate: params.invoiceDate || new Date(),
      isActive: true,
      isExpired: false,
    },
    include: { medicine: true, supplier: true },
  })

  return { result, totalUnits, paidUnits, freeUnits, effectivePurchasePrice, sellingPricePerUnit }
}

// ═══════════════════════════════════════════════════════════════════
// 2. DEDUCT FROM INVENTORY — Sale, dispense
// ═══════════════════════════════════════════════════════════════════

export interface DeductFromInventoryParams {
  /** The inventory batch ID */
  batchId: string
  /** Number of individual units to deduct */
  units: number
}

/**
 * Deduct stock from inventory (sale/dispense).
 * Validates sufficient stock before deducting.
 * Only reduces `quantity`, NOT `originalQuantity`.
 */
export async function deductFromInventory(tx: TxClient, params: DeductFromInventoryParams) {
  assertPositiveWhole(params.units, "Quantity")

  const batch = await tx.inventoryBatch.findUnique({
    where: { id: params.batchId },
  })

  if (!batch) {
    throw new Error(`Inventory batch ${params.batchId} not found`)
  }

  if (batch.quantity < params.units) {
    throw new Error(
      `Insufficient stock. Available: ${batch.quantity}, Required: ${params.units}`
    )
  }

  // Conditional (atomic) decrement: guards against two concurrent dispenses
  // both passing the check above and overselling the batch.
  const updated = await tx.inventoryBatch.updateMany({
    where: { id: params.batchId, quantity: { gte: params.units } },
    data: {
      quantity: { decrement: params.units },
    },
  })

  if (updated.count !== 1) {
    throw new Error(
      `Insufficient stock (changed concurrently). Required: ${params.units}`
    )
  }

  return { ...batch, quantity: batch.quantity - params.units }
}

export interface FEFOAllocation {
  batchId: string
  batchNumber: string
  units: number
  sellingPrice: number
  purchasePrice: number
  taxPercent: number
}

/**
 * Deduct `units` of a medicine across sellable batches, earliest expiry first (FEFO).
 * Sellable = active, not flagged expired, expiry in the future, quantity > 0.
 * Throws (so the surrounding transaction rolls back) if total sellable stock is insufficient.
 */
export async function deductFEFO(
  tx: TxClient,
  params: { medicineId: string; units: number; medicineName?: string }
): Promise<FEFOAllocation[]> {
  if (!Number.isInteger(params.units) || params.units < 1) {
    throw new Error("Quantity must be a whole number of at least 1")
  }

  const batches = await tx.inventoryBatch.findMany({
    where: {
      medicineId: params.medicineId,
      isActive: true,
      isExpired: false,
      expiryDate: { gt: new Date() },
      quantity: { gt: 0 },
    },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
  })

  const available = batches.reduce((s, b) => s + b.quantity, 0)
  if (available < params.units) {
    throw new Error(
      `Insufficient stock${params.medicineName ? ` for ${params.medicineName}` : ""}. Available: ${available}, Required: ${params.units}`
    )
  }

  const allocations: FEFOAllocation[] = []
  let remaining = params.units
  for (const b of batches) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity, remaining)
    await deductFromInventory(tx, { batchId: b.id, units: take })
    allocations.push({
      batchId: b.id,
      batchNumber: b.batchNumber,
      units: take,
      sellingPrice: b.sellingPrice,
      purchasePrice: b.purchasePrice,
      taxPercent: b.taxPercent,
    })
    remaining -= take
  }

  return allocations
}

// ═══════════════════════════════════════════════════════════════════
// 3. RESTORE TO INVENTORY — Refund, bill delete
// ═══════════════════════════════════════════════════════════════════

export interface RestoreToInventoryParams {
  /** The inventory batch ID */
  batchId: string
  /** Number of individual units to restore */
  units: number
}

/**
 * Restore stock to inventory (refund/return/bill delete).
 * Adds units back to `quantity` only. Does NOT change `originalQuantity`.
 * This is for when items are returned by customers — the original purchase is still valid.
 */
export async function restoreToInventory(tx: TxClient, params: RestoreToInventoryParams) {
  assertPositiveWhole(params.units, "Quantity")

  const batch = await tx.inventoryBatch.findUnique({
    where: { id: params.batchId },
  })

  if (!batch) {
    // Batch may have been deleted — silently skip
    return null
  }

  // Restore units back to the batch.
  // Note: We do NOT cap at originalQuantity because stock adjustments may have
  // legitimately changed quantity without updating originalQuantity.
  const newQuantity = batch.quantity + params.units

  const result = await tx.inventoryBatch.update({
    where: { id: params.batchId },
    data: {
      quantity: newQuantity,
    },
  })

  return result
}

// ═══════════════════════════════════════════════════════════════════
// 4. REVERSE FROM INVENTORY — Invoice delete, edit reversal
// ═══════════════════════════════════════════════════════════════════

export interface ReverseFromInventoryParams {
  /** Medicine ID */
  medicineId: string
  /** Batch number */
  batchNumber: string
  /** Total units to reverse (paid + free) */
  totalUnits: number
}

/**
 * Reverse a purchase from inventory (invoice delete/edit reversal).
 * Reduces BOTH `quantity` AND `originalQuantity`.
 * This is for when a purchase invoice is deleted or being reversed before re-applying.
 */
export async function reverseFromInventory(tx: TxClient, params: ReverseFromInventoryParams) {
  assertPositiveWhole(params.totalUnits, "Quantity")

  const batch = await tx.inventoryBatch.findUnique({
    where: {
      medicineId_batchNumber: {
        medicineId: params.medicineId,
        batchNumber: params.batchNumber,
      },
    },
  })

  if (!batch) {
    // Batch doesn't exist — nothing to reverse
    return null
  }

  const newQty = Math.max(0, batch.quantity - params.totalUnits)
  const newOrigQty = Math.max(0, batch.originalQuantity - params.totalUnits)

  const result = await tx.inventoryBatch.update({
    where: { id: batch.id },
    data: {
      quantity: newQty,
      originalQuantity: newOrigQty,
    },
  })

  return result
}
