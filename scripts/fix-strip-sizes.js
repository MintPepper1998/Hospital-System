const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  // Find all purchase invoice items that have packSize > 1
  // and fix their corresponding inventory batches
  const invoices = await p.purchaseInvoice.findMany({
    include: {
      items: {
        where: { packSize: { gt: 1 }, medicineId: { not: null } },
        select: { medicineId: true, batchNumber: true, packSize: true, itemName: true },
      },
    },
  })

  let fixed = 0
  for (const inv of invoices) {
    for (const item of inv.items) {
      if (!item.medicineId || !item.batchNumber) continue
      
      const batch = await p.inventoryBatch.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
          },
        },
        select: { id: true, medicinesPerStrip: true },
      })

      if (batch && batch.medicinesPerStrip !== item.packSize) {
        console.log(`FIX: ${item.itemName} (batch: ${item.batchNumber}): ${batch.medicinesPerStrip} -> ${item.packSize}`)
        await p.inventoryBatch.update({
          where: { id: batch.id },
          data: { medicinesPerStrip: item.packSize },
        })
        fixed++
      }
    }
  }

  console.log(`\nFixed ${fixed} batch(es)`)
}

main().catch(console.error).finally(() => p.$disconnect())
