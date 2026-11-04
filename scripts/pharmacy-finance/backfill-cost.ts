/**
 * B3.4 Backfill script for old sales
 * 
 * For BillingItem where costAmount IS NULL and the billing type is PHARMACY
 * and referenceId matches an InventoryBatch.id: 
 * unitCost = batch.purchasePrice, costAmount = round2(qty * unitCost).
 *
 * For discharge medicines with batchAllocations JSON linked through billingId: 
 * sum the allocations.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")
const round2 = (n: number) => Math.round(n * 100) / 100

async function main() {
  // Find POS billing items
  const posItems = await prisma.billingItem.findMany({
    where: {
      costAmount: null,
      serviceCategory: "PHARMACY",
      billing: { type: "PHARMACY" },
      referenceId: { not: null },
    },
    select: {
      id: true,
      quantity: true,
      referenceId: true,
    }
  })

  // Find discharge/IPD billing items
  const ipdItems = await prisma.billingItem.findMany({
    where: {
      costAmount: null,
      serviceCategory: { in: ["PHARMACY_IPD", "PHARMACY_DISCHARGE"] },
      billing: { type: "PHARMACY" },
      referenceId: { not: null },
    },
    select: {
      id: true,
      quantity: true,
      referenceId: true,
      serviceCategory: true,
    }
  })

  console.log(`Found ${posItems.length} POS items and ${ipdItems.length} IPD/Discharge items missing cost data.`)
  if (!APPLY) {
    console.log("Dry run only. Use --apply to update the database.")
  }

  let fixed = 0
  let unknown = 0

  if (APPLY) {
    await prisma.$transaction(async (tx) => {
      // Handle POS items
      for (const item of posItems) {
        if (!item.referenceId) {
          unknown++
          continue
        }
        const batch = await tx.inventoryBatch.findUnique({
          where: { id: item.referenceId },
          select: { purchasePrice: true }
        })
        if (batch) {
          const unitCost = batch.purchasePrice || 0
          const costAmount = round2(item.quantity * unitCost)
          await tx.billingItem.update({
            where: { id: item.id },
            data: { unitCost, costAmount }
          })
          fixed++
        } else {
          unknown++
        }
      }

      // Handle IPD/Discharge items
      for (const item of ipdItems) {
        if (!item.referenceId) {
          unknown++
          continue
        }
        
        // Let's check allocations (IPD prescription or Discharge medicine)
        let allocsRaw: any = null
        if (item.serviceCategory === "PHARMACY_DISCHARGE") {
          const rx = await tx.dischargeMedicine.findUnique({
            where: { id: item.referenceId },
            select: { batchAllocations: true }
          })
          allocsRaw = rx?.batchAllocations
        }

        if (allocsRaw && Array.isArray(allocsRaw)) {
          let costAmount = 0
          for (const a of allocsRaw) {
            costAmount += (a.units || 0) * (a.purchasePrice || 0)
          }
          costAmount = round2(costAmount)
          const unitCost = item.quantity > 0 ? round2(costAmount / item.quantity) : 0
          await tx.billingItem.update({
            where: { id: item.id },
            data: { unitCost, costAmount }
          })
          fixed++
        } else {
          unknown++
        }
      }
    }, { timeout: 120_000 })
  }

  console.log(`Finished. Fixed: ${fixed}, Unknown/skipped: ${unknown}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
