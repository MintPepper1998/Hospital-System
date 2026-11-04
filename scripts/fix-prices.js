const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  // Find all inventory batches that have a corresponding purchase invoice item
  // and fix sellingPrice, purchasePrice, and taxPercent to match
  const batches = await p.inventoryBatch.findMany({
    where: { isActive: true },
    select: {
      id: true,
      batchNumber: true,
      medicineId: true,
      sellingPrice: true,
      purchasePrice: true,
      medicinesPerStrip: true,
      taxPercent: true,
      medicine: { select: { name: true } },
    },
  })

  console.log(`Checking ${batches.length} active batches...`)
  let fixed = 0
  let errors = []

  for (const batch of batches) {
    // Find matching purchase invoice item
    const item = await p.purchaseItem.findFirst({
      where: {
        medicineId: batch.medicineId,
        batchNumber: batch.batchNumber,
      },
      select: {
        rate: true,        // per-unit purchase price
        sellPrice: true,   // per-unit sell price
        packSize: true,
        taxPercent: true,
      },
      orderBy: { id: "desc" },
    })

    if (!item) continue // No matching purchase item

    const packSize = item.packSize || 1
    // PurchaseItem stores per-unit values
    const expectedPurchasePrice = item.rate
    const expectedSellingPrice = item.sellPrice || item.rate * 1.2
    const expectedTax = item.taxPercent || 0

    const priceMismatch = Math.abs(batch.sellingPrice - expectedSellingPrice) > 0.01
    const purchaseMismatch = Math.abs(batch.purchasePrice - expectedPurchasePrice) > 0.5
    const taxMismatch = batch.taxPercent !== expectedTax

    if (priceMismatch || taxMismatch) {
      const issues = []
      if (priceMismatch) issues.push(`MRP: ${batch.sellingPrice} → ${expectedSellingPrice}`)
      if (purchaseMismatch) issues.push(`Cost: ${batch.purchasePrice} → ${expectedPurchasePrice}`)
      if (taxMismatch) issues.push(`GST: ${batch.taxPercent}% → ${expectedTax}%`)

      console.log(`FIX: ${batch.medicine.name} (${batch.batchNumber}): ${issues.join(", ")}`)

      try {
        await p.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            sellingPrice: expectedSellingPrice,
            purchasePrice: expectedPurchasePrice,
            taxPercent: expectedTax,
          },
        })
        fixed++
      } catch (e) {
        errors.push(`${batch.medicine.name}: ${e.message}`)
      }
    }
  }

  console.log(`\nFixed ${fixed} batch(es)`)
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`)
    errors.forEach(e => console.log(`  - ${e}`))
  }
}

main().catch(console.error).finally(() => p.$disconnect())
