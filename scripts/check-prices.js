const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  // Check the purchase invoice item for CIPLADINE BAND AID
  const items = await p.$queryRaw`
    SELECT "itemName", "batchNumber", "quantity", "freeQuantity", "rate", "sellPrice", "packSize", "taxPercent", "totalAmount"
    FROM "purchase_invoice_items"
    WHERE "itemName" ILIKE '%CIPLADINE BAND%'
  `
  console.log("=== PURCHASE INVOICE ITEMS ===")
  console.log(JSON.stringify(items, null, 2))

  // The batch data we already know:
  // sellingPrice: 284.25 (stored per-unit on batch)
  // medicinesPerStrip: 136
  // taxPercent: 12 (should be 5!)
  
  // In POS: strip price = sellingPrice * medicinesPerStrip = 284.25 * 136 = 38,658 ← BUG!
  // Expected: sellingPrice should be 284.25/136 = 2.09 per unit, strip price = 284.25
  
  console.log("\n=== ANALYSIS ===")
  console.log("Stored sellingPrice (per unit on batch):", 284.25)
  console.log("medicinesPerStrip:", 136)
  console.log("POS strip display:", 284.25 * 136, "← THIS IS WRONG")
  console.log("Expected per-unit:", 284.25 / 136)
  console.log("Expected strip display:", 284.25)
}

main().catch(console.error).finally(() => p.$disconnect())
