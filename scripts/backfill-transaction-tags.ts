/**
 * Backfill Transaction Tags
 * 
 * One-time script to tag old transactions created before Phase 1-2
 * that are missing accountGroupCode.
 * 
 * Run: npx tsx scripts/backfill-transaction-tags.ts
 */

import { PrismaClient } from "@prisma/client"
import { resolveAccountGroupCode } from "../lib/account-group-resolver"

const prisma = new PrismaClient()

async function backfillTransactionTags() {
  console.log("🔄 Starting transaction tag backfill...")

  // Find all transactions without accountGroupCode
  const untagged = await prisma.transaction.findMany({
    where: { accountGroupCode: null },
    select: {
      id: true,
      type: true,
      category: true,
      scope: true,
      billingType: true,
    },
  })

  console.log(`   Found ${untagged.length} untagged transactions`)

  if (untagged.length === 0) {
    console.log("✅ All transactions are already tagged. Nothing to do.")
    return
  }

  let updated = 0
  let skipped = 0
  const batchSize = 100

  for (let i = 0; i < untagged.length; i += batchSize) {
    const batch = untagged.slice(i, i + batchSize)

    const updates = batch.map((tx) => {
      const code = resolveAccountGroupCode(
        tx.type as "INCOME" | "EXPENSE",
        tx.category || "",
        tx.billingType,
        tx.scope
      )

      if (code === null) {
        // Transfers and internal movements — no P&L impact
        skipped++
        return null
      }

      return prisma.transaction.update({
        where: { id: tx.id },
        data: { accountGroupCode: code },
      })
    })

    const validUpdates = updates.filter(Boolean)
    if (validUpdates.length > 0) {
      await prisma.$transaction(validUpdates as any)
      updated += validUpdates.length
    }

    console.log(`   Processed ${Math.min(i + batchSize, untagged.length)}/${untagged.length} (${updated} tagged, ${skipped} skipped)`)
  }

  console.log(`\n✅ Backfill complete!`)
  console.log(`   Tagged:  ${updated}`)
  console.log(`   Skipped: ${skipped} (transfers/internal)`)
  console.log(`   Total:   ${untagged.length}`)
}

backfillTransactionTags()
  .catch((err) => {
    console.error("❌ Backfill failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
