const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function diagnose() {
  console.log("=== PHARMACY DIAGNOSTIC REPORT ===\n")

  // 1. Check for duplicate medicines (same name+strength)
  console.log("--- 1. DUPLICATE MEDICINES CHECK ---")
  const allMedicines = await prisma.medicine.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, strength: true, type: true, createdAt: true }
  })
  
  const nameMap = new Map()
  for (const med of allMedicines) {
    const key = `${med.name.toLowerCase().trim()}|${(med.strength || "").toLowerCase().trim()}`
    if (!nameMap.has(key)) nameMap.set(key, [])
    nameMap.get(key).push(med)
  }
  
  let dupeCount = 0
  for (const [key, meds] of nameMap) {
    if (meds.length > 1) {
      dupeCount++
      console.log(`  DUPLICATE: "${meds[0].name}" (${meds[0].strength || "N/A"}) — ${meds.length} copies`)
      for (const m of meds) {
        const batches = await prisma.inventoryBatch.count({ where: { medicineId: m.id } })
        const bills = await prisma.billingItem.count({ where: { referenceId: { in: (await prisma.inventoryBatch.findMany({ where: { medicineId: m.id }, select: { id: true } })).map(b => b.id) } } })
        console.log(`    ID: ${m.id}, Type: ${m.type}, Created: ${m.createdAt.toISOString().split("T")[0]}, Batches: ${batches}, Referenced in sales: ${bills}`)
      }
    }
  }
  if (dupeCount === 0) console.log("  ✅ No duplicate medicines found")
  console.log()

  // 2. Check for inventory batches with same medicineId+batchNumber (shouldn't happen due to unique constraint)
  console.log("--- 2. DUPLICATE INVENTORY BATCHES CHECK ---")
  const batchGroups = await prisma.$queryRaw`
    SELECT "medicineId", "batchNumber", COUNT(*) as cnt
    FROM inventory_batches
    GROUP BY "medicineId", "batchNumber"
    HAVING COUNT(*) > 1
  `
  if (batchGroups.length === 0) {
    console.log("  ✅ No duplicate batches found (unique constraint working)")
  } else {
    for (const bg of batchGroups) {
      console.log(`  DUPLICATE BATCH: medicineId=${bg.medicineId}, batch=${bg.batchNumber}, count=${bg.cnt}`)
    }
  }
  console.log()

  // 3. Check stock deduction: Find recent sales and verify stock was actually deducted
  console.log("--- 3. STOCK DEDUCTION VERIFICATION ---")
  const recentSales = await prisma.billing.findMany({
    where: { type: "PHARMACY", status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      items: true,
    }
  })
  
  let stockIssueCount = 0
  for (const sale of recentSales) {
    for (const item of sale.items) {
      if (!item.referenceId) continue // lab tests or non-inventory items
      
      const batch = await prisma.inventoryBatch.findUnique({
        where: { id: item.referenceId },
        include: { medicine: { select: { name: true } } }
      })
      
      if (!batch) {
        console.log(`  ⚠️  Bill ${sale.billNumber}: Batch ${item.referenceId} NOT FOUND (deleted?)`)
        stockIssueCount++
        continue
      }
      
      // Check: originalQuantity - quantity should account for sold units  
      const sold = batch.originalQuantity - batch.quantity
      if (sold < 0) {
        console.log(`  ❌ Bill ${sale.billNumber}: ${batch.medicine.name} batch ${batch.batchNumber} has NEGATIVE sold count (orig=${batch.originalQuantity}, current=${batch.quantity})`)
        stockIssueCount++
      }
    }
  }
  
  if (stockIssueCount === 0) {
    console.log("  ✅ Recent 10 sales: stock deduction appears correct")
  }
  console.log()

  // 4. Check for batches where quantity > originalQuantity (impossible state)
  console.log("--- 4. IMPOSSIBLE BATCH STATES ---")
  const impossibleBatches = await prisma.inventoryBatch.findMany({
    where: {
      quantity: { gt: prisma.inventoryBatch.fields.originalQuantity }
    },
    include: { medicine: { select: { name: true } } }
  })
  
  // Prisma doesn't support field comparison directly, so let's do it manually
  const allBatches = await prisma.inventoryBatch.findMany({
    where: { isActive: true },
    include: { medicine: { select: { name: true } } }
  })
  
  let impossibleCount = 0
  for (const batch of allBatches) {
    if (batch.quantity > batch.originalQuantity) {
      impossibleCount++
      console.log(`  ❌ ${batch.medicine.name} (batch: ${batch.batchNumber}): quantity=${batch.quantity} > originalQuantity=${batch.originalQuantity}`)
    }
  }
  if (impossibleCount === 0) {
    console.log("  ✅ All batches have valid quantity states")
  }
  console.log()

  // 5. Check for double-add via add-stock-entry-form flow
  // The form calls addStock() for each item (which adds to inventory), 
  // then calls createPurchaseInvoiceFromStock() (which creates invoice records only).
  // But createPurchaseInvoice() in purchase.ts ALSO calls addToInventory.
  // Let's check if any purchase invoices created by both paths exist.
  console.log("--- 5. PURCHASE INVOICE + STOCK DOUBLE-ADD CHECK ---")
  
  // Find purchase invoices where items were created via createPurchaseInvoiceFromStock
  // These would have been created AFTER the stock was already added
  const invoices = await prisma.purchaseInvoice.findMany({
    include: {
      items: {
        include: { medicine: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  })
  
  let doubleAddSuspect = 0
  for (const inv of invoices) {
    for (const item of inv.items) {
      if (!item.medicineId) continue
      
      // Check if inventory batch has more stock than expected
      const batch = await prisma.inventoryBatch.findFirst({
        where: {
          medicineId: item.medicineId,
          batchNumber: item.batchNumber || undefined
        }
      })
      
      if (batch && batch.originalQuantity > (item.quantity + item.freeQuantity) * 2) {
        // More than double the expected quantity — suspicious
        doubleAddSuspect++
        console.log(`  ⚠️  Invoice ${inv.invoiceNumber}: ${item.medicine?.name} batch ${item.batchNumber}`)
        console.log(`      PurchaseItem qty: ${item.quantity}+${item.freeQuantity} = ${item.quantity + item.freeQuantity}`)
        console.log(`      InventoryBatch original: ${batch.originalQuantity}, current: ${batch.quantity}`)
      }
    }
  }
  if (doubleAddSuspect === 0) {
    console.log("  ✅ No obvious double-add detected in recent 20 invoices")
  }
  console.log()

  // 6. Medicine name case sensitivity check  
  console.log("--- 6. CASE-SENSITIVITY / WHITESPACE DUPLICATES ---")
  const caseDupes = new Map()
  for (const med of allMedicines) {
    const normalizedKey = `${med.name.toLowerCase().replace(/\s+/g, " ").trim()}|${(med.strength || "").toLowerCase().replace(/\s+/g, " ").trim()}`
    if (!caseDupes.has(normalizedKey)) caseDupes.set(normalizedKey, [])
    caseDupes.get(normalizedKey).push(med)
  }
  
  let caseDupeCount = 0
  for (const [key, meds] of caseDupes) {
    if (meds.length > 1) {
      // Check if they differ only in case/whitespace
      const uniqueNames = new Set(meds.map(m => m.name))
      if (uniqueNames.size > 1) {
        caseDupeCount++
        console.log(`  CASE/WHITESPACE DUP: ${[...uniqueNames].join(" vs ")} (strength: ${meds[0].strength || "N/A"})`)
      }
    }
  }
  if (caseDupeCount === 0) {
    console.log("  ✅ No case/whitespace duplicates found")
  }
  console.log()

  // 7. Summary
  console.log("=== SUMMARY ===")
  console.log(`Total active medicines: ${allMedicines.length}`)
  console.log(`Duplicate medicine entries: ${dupeCount}`)
  console.log(`Stock deduction issues: ${stockIssueCount}`)
  console.log(`Impossible batch states: ${impossibleCount}`)
  console.log(`Double-add suspects: ${doubleAddSuspect}`)
  console.log(`Case/whitespace duplicates: ${caseDupeCount}`)
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
