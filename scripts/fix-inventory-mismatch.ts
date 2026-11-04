// Fix inventory quantities to match purchase invoice records
// Run with: npx tsx scripts/fix-inventory-mismatch.ts

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface Mismatch {
  medicineId: string
  medicineName: string
  batchNumber: string
  batchId: string
  purchaseTotal: number
  purchaseItemCount: number
  inventoryOriginal: number
  inventoryCurrent: number
  unitsSold: number
  expectedCurrent: number
  diff: number
}

async function main() {
  console.log("🔍 Scanning for purchase invoice ↔ inventory mismatches...\n")

  // 1. Get ALL PurchaseItems grouped by medicineId + batchNumber
  const purchaseItems = await prisma.purchaseItem.findMany({
    where: {
      medicineId: { not: null },
      batchNumber: { not: null },
    },
    select: {
      id: true,
      medicineId: true,
      batchNumber: true,
      quantity: true,
      freeQuantity: true,
      packSize: true,
      invoice: {
        select: { invoiceNumber: true, date: true }
      }
    }
  })

  console.log(`📦 Found ${purchaseItems.length} purchase item records with medicineId + batchNumber\n`)

  // Group by medicineId + batchNumber
  const grouped = new Map<string, {
    medicineId: string
    batchNumber: string
    totalQty: number
    totalFree: number
    count: number
    invoices: string[]
  }>()

  for (const pi of purchaseItems) {
    if (!pi.medicineId || !pi.batchNumber) continue
    const key = `${pi.medicineId}::${pi.batchNumber}`
    const existing = grouped.get(key) || {
      medicineId: pi.medicineId,
      batchNumber: pi.batchNumber,
      totalQty: 0,
      totalFree: 0,
      count: 0,
      invoices: []
    }
    existing.totalQty += pi.quantity
    existing.totalFree += (pi.freeQuantity || 0)
    existing.count += 1
    existing.invoices.push(pi.invoice?.invoiceNumber || "unknown")
    grouped.set(key, existing)
  }

  console.log(`📊 Grouped into ${grouped.size} unique medicine+batch combinations\n`)

  // 2. Compare each group against its InventoryBatch
  const mismatches: Mismatch[] = []
  let matchCount = 0

  for (const [key, group] of grouped) {
    const purchaseTotal = group.totalQty + group.totalFree

    const batch = await prisma.inventoryBatch.findUnique({
      where: {
        medicineId_batchNumber: {
          medicineId: group.medicineId,
          batchNumber: group.batchNumber,
        }
      },
      include: {
        medicine: { select: { name: true } }
      }
    })

    if (!batch) {
      console.log(`⚠️  MISSING BATCH: ${group.batchNumber} for medicine ${group.medicineId} (from ${group.count} purchase items)`)
      continue
    }

    const unitsSold = batch.originalQuantity - batch.quantity
    const expectedCurrent = purchaseTotal - unitsSold

    if (Math.abs(batch.originalQuantity - purchaseTotal) > 0) {
      mismatches.push({
        medicineId: group.medicineId,
        medicineName: batch.medicine?.name || "Unknown",
        batchNumber: group.batchNumber,
        batchId: batch.id,
        purchaseTotal,
        purchaseItemCount: group.count,
        inventoryOriginal: batch.originalQuantity,
        inventoryCurrent: batch.quantity,
        unitsSold: Math.max(0, unitsSold),
        expectedCurrent: Math.max(0, expectedCurrent),
        diff: purchaseTotal - batch.originalQuantity,
      })
    } else {
      matchCount++
    }
  }

  // 3. Report findings
  console.log(`\n${"=".repeat(80)}`)
  console.log(`✅ Matching: ${matchCount}`)
  console.log(`❌ Mismatched: ${mismatches.length}`)
  console.log(`${"=".repeat(80)}\n`)

  if (mismatches.length === 0) {
    console.log("🎉 No mismatches found! All purchase invoices match inventory.")
    await prisma.$disconnect()
    return
  }

  // Print details
  console.log("MISMATCHED RECORDS:")
  console.log("-".repeat(120))
  console.log(
    "Medicine".padEnd(30) +
    "Batch".padEnd(20) +
    "PurchInv".padStart(10) +
    "InvOrig".padStart(10) +
    "Diff".padStart(8) +
    "Sold".padStart(8) +
    "InvCurr".padStart(10) +
    "FixedTo".padStart(10)
  )
  console.log("-".repeat(120))

  for (const m of mismatches) {
    console.log(
      m.medicineName.slice(0, 28).padEnd(30) +
      m.batchNumber.slice(0, 18).padEnd(20) +
      String(m.purchaseTotal).padStart(10) +
      String(m.inventoryOriginal).padStart(10) +
      (m.diff > 0 ? `+${m.diff}` : String(m.diff)).padStart(8) +
      String(m.unitsSold).padStart(8) +
      String(m.inventoryCurrent).padStart(10) +
      String(m.expectedCurrent).padStart(10)
    )
  }

  // 4. Apply fixes
  console.log(`\n🔧 Applying fixes to ${mismatches.length} inventory batches...\n`)

  let fixedCount = 0
  let errorCount = 0

  for (const m of mismatches) {
    try {
      const newOriginal = m.purchaseTotal
      const newCurrent = Math.max(0, m.expectedCurrent)

      await prisma.inventoryBatch.update({
        where: { id: m.batchId },
        data: {
          originalQuantity: newOriginal,
          quantity: newCurrent,
        }
      })

      console.log(`  ✅ Fixed: ${m.medicineName} [${m.batchNumber}] → original: ${m.inventoryOriginal}→${newOriginal}, current: ${m.inventoryCurrent}→${newCurrent}`)
      fixedCount++
    } catch (err: any) {
      console.error(`  ❌ Error fixing ${m.medicineName} [${m.batchNumber}]: ${err.message}`)
      errorCount++
    }
  }

  console.log(`\n${"=".repeat(80)}`)
  console.log(`🏁 Done! Fixed: ${fixedCount}, Errors: ${errorCount}`)
  console.log(`${"=".repeat(80)}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("Fatal error:", e)
  prisma.$disconnect()
  process.exit(1)
})
