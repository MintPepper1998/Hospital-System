import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Backfilling HSN codes on existing PurchaseItems from Medicine records...\n')

  // Find all PurchaseItems with null hsnCode that have a linked medicine
  const itemsWithoutHsn = await prisma.purchaseItem.findMany({
    where: {
      hsnCode: null,
      medicineId: { not: null }
    },
    select: {
      id: true,
      itemName: true,
      medicineId: true
    }
  })

  console.log(`Found ${itemsWithoutHsn.length} PurchaseItems without HSN codes.\n`)

  let updated = 0
  for (const item of itemsWithoutHsn) {
    if (!item.medicineId) continue

    const medicine = await prisma.medicine.findUnique({
      where: { id: item.medicineId },
      select: { hsnCode: true }
    })

    if (medicine?.hsnCode) {
      await prisma.purchaseItem.update({
        where: { id: item.id },
        data: { hsnCode: medicine.hsnCode }
      })
      console.log(`  ✓ ${item.itemName} → ${medicine.hsnCode}`)
      updated++
    } else {
      console.log(`  ✗ ${item.itemName} — medicine has no HSN code`)
    }
  }

  console.log(`\nUpdated ${updated} PurchaseItems with HSN codes from their linked medicines.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
