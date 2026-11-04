const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function fixImpossibleBatches() {
  console.log("=== FIXING IMPOSSIBLE BATCHES ===")

  // Find batches where quantity > originalQuantity
  // We have to pull them all and check in JS because Prisma doesn't support comparing two fields in where clause
  const allBatches = await prisma.inventoryBatch.findMany({
    where: { isActive: true },
    select: { id: true, batchNumber: true, quantity: true, originalQuantity: true, medicineId: true }
  })
  
  let fixedCount = 0
  
  for (const batch of allBatches) {
    if (batch.quantity > batch.originalQuantity) {
      console.log(`Fixing batch ${batch.id} (Batch: ${batch.batchNumber}): quantity=${batch.quantity} -> ${batch.originalQuantity}`)
      await prisma.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantity: batch.originalQuantity }
      })
      fixedCount++
    }
  }

  console.log(`\nFixed ${fixedCount} batches.`)
}

fixImpossibleBatches()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
