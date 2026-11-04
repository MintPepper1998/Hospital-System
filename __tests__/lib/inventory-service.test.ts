import { describe, expect, it } from "vitest"
import {
  addToInventory,
  deductFEFO,
  deductFromInventory,
  restoreToInventory,
  reverseFromInventory,
} from "@/lib/inventory-service"

const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
type MockBatch = ReturnType<typeof makeBatch>
type BatchWhere = {
  id?: string
  medicineId_batchNumber?: { medicineId: string; batchNumber: string }
}
type MockTransaction = {
  supplier: {
    findUnique: () => Promise<{ scope: string }>
  }
  inventoryBatch: {
    upsert: (args: { create: Record<string, unknown> }) => Promise<MockBatch>
    findUnique: (args: { where: BatchWhere }) => Promise<MockBatch>
    findMany: () => Promise<MockBatch[]>
    updateMany: () => Promise<{ count: number }>
    update: (args: { data: Record<string, unknown> }) => Promise<MockBatch>
  }
}

function makeBatch(overrides: Record<string, unknown> = {}) {
  return {
    id: "batch-1",
    medicineId: "medicine-1",
    batchNumber: "B-1",
    quantity: 10,
    originalQuantity: 10,
    purchasePrice: 2,
    sellingPrice: 3,
    taxPercent: 0,
    expiryDate: futureExpiry,
    isActive: true,
    isExpired: false,
    ...overrides,
  }
}

function makeTx(options: {
  supplierScope?: string
  batch?: ReturnType<typeof makeBatch>
  batches?: ReturnType<typeof makeBatch>[]
} = {}) {
  const batch = options.batch || makeBatch()
  const batches = options.batches || [batch]

  return {
    supplier: {
      findUnique: async () => ({ scope: options.supplierScope || "PHARMACY" }),
    },
    inventoryBatch: {
      upsert: async () => batch,
      findUnique: async (args: { where: BatchWhere }) => {
        void args.where
        return batch
      },
      findMany: async () => batches,
      updateMany: async () => ({ count: 1 }),
      update: async ({ data }) => ({
        ...batch,
        quantity: typeof data.quantity === "number" ? data.quantity : batch.quantity,
        originalQuantity: typeof data.originalQuantity === "number" ? data.originalQuantity : batch.originalQuantity,
      }),
    },
  } satisfies MockTransaction
}

const asInventoryTransaction = (tx: MockTransaction) =>
  tx as unknown as Parameters<typeof addToInventory>[0]

describe("inventory service", () => {
  it("adds paid and free strips as individual units", async () => {
    const result = await addToInventory(asInventoryTransaction(makeTx()), {
      medicineId: "medicine-1",
      batchNumber: "B-1",
      supplierId: "supplier-1",
      paidStrips: 10,
      freeStrips: 2,
      packSize: 10,
      purchasePricePerStrip: 100,
      sellingPricePerStrip: 150,
      expiryDate: futureExpiry,
    })

    expect(result.paidUnits).toBe(100)
    expect(result.freeUnits).toBe(20)
    expect(result.totalUnits).toBe(120)
    expect(result.sellingPricePerUnit).toBe(15)
  })

  it("rejects an empty stock addition", async () => {
    await expect(addToInventory(asInventoryTransaction(makeTx()), {
      medicineId: "medicine-1",
      batchNumber: "B-1",
      supplierId: "supplier-1",
      paidStrips: 0,
      freeStrips: 0,
      purchasePricePerStrip: 100,
      sellingPricePerStrip: 150,
      expiryDate: futureExpiry,
    })).rejects.toThrow("At least one paid or free unit is required")
  })

  it("deducts stock only for a positive whole-unit quantity", async () => {
    const tx = makeTx()

    const result = await deductFromInventory(asInventoryTransaction(tx), { batchId: "batch-1", units: 3 })

    expect(result.quantity).toBe(7)
    await expect(deductFromInventory(asInventoryTransaction(tx), { batchId: "batch-1", units: 0 })).rejects.toThrow(
      "Quantity must be a whole number of at least 1",
    )
  })

  it("allocates a sale FEFO across batches", async () => {
    const first = makeBatch({ quantity: 2, expiryDate: new Date(Date.now() + 5 * 86400000) })
    const second = makeBatch({ id: "batch-2", batchNumber: "B-2", quantity: 5, expiryDate: new Date(Date.now() + 10 * 86400000) })
    const tx = makeTx({ batches: [first, second] })
    tx.inventoryBatch.findUnique = async ({ where }) => where.id === "batch-1" ? first : second

    const allocations = await deductFEFO(asInventoryTransaction(tx), { medicineId: "medicine-1", units: 4 })

    expect(allocations).toEqual([
      expect.objectContaining({ batchId: "batch-1", units: 2 }),
      expect.objectContaining({ batchId: "batch-2", units: 2 }),
    ])
  })

  it("restores sale units without changing original purchase quantity", async () => {
    const result = await restoreToInventory(asInventoryTransaction(makeTx()), { batchId: "batch-1", units: 2 })

    expect(result?.quantity).toBe(12)
    expect(result?.originalQuantity).toBe(10)
  })

  it("reverses purchase units from both current and original quantity", async () => {
    const result = await reverseFromInventory(asInventoryTransaction(makeTx()), {
      medicineId: "medicine-1",
      batchNumber: "B-1",
      totalUnits: 2,
    })

    expect(result?.quantity).toBe(8)
    expect(result?.originalQuantity).toBe(8)
  })
})
