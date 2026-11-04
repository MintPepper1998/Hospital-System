/**
 * B8 — Reverse historical non-cash ledger rows created by old stock-adjustment
 * and purchase-return code (they wrongly moved pharmacy account balances).
 *
 * Run (dry run, default):  npx tsx scripts/pharmacy-finance/fix-noncash-ledger.ts
 * Apply (needs approval):  npx tsx scripts/pharmacy-finance/fix-noncash-ledger.ts --apply
 *
 * Idempotent: rows that already have a NONCASH_REVERSAL pointing at them are skipped.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")
const BAD_CATEGORIES = ["STOCK_WRITE_OFF", "STOCK_ADJUSTMENT_GAIN", "PURCHASE_RETURN"]

const round2 = (n: number) => Math.round(n * 100) / 100

async function main() {
  const bad = await prisma.transaction.findMany({
    where: { scope: "PHARMACY", category: { in: BAD_CATEGORIES } },
    select: { id: true, accountId: true, type: true, amount: true, category: true, paymentMethod: true, scope: true },
  })

  const reversed = await prisma.transaction.findMany({
    where: { category: "NONCASH_REVERSAL", referenceId: { in: bad.map((b) => b.id) } },
    select: { referenceId: true },
  })
  const done = new Set(reversed.map((r) => r.referenceId))
  const todo = bad.filter((b) => !done.has(b.id))

  const perCategory: Record<string, { count: number; total: number }> = {}
  const perAccount: Record<string, number> = {} // balance change the reversal will apply
  for (const t of todo) {
    const c = (perCategory[t.category] ??= { count: 0, total: 0 })
    c.count++
    c.total = round2(c.total + t.amount)
    // Original INCOME raised the balance -> reversal lowers it, and vice versa
    const delta = t.type === "INCOME" ? -t.amount : t.amount
    perAccount[t.accountId] = round2((perAccount[t.accountId] ?? 0) + delta)
  }

  const accounts = await prisma.financialAccount.findMany({
    where: { id: { in: Object.keys(perAccount) } },
    select: { id: true, name: true, currentBalance: true },
  })

  console.log(`Found ${bad.length} non-cash rows, ${done.size} already reversed, ${todo.length} to reverse.`)
  console.table(perCategory)
  console.table(
    accounts.map((a) => ({
      account: a.name,
      currentBalance: a.currentBalance,
      change: perAccount[a.id],
      newBalance: round2(a.currentBalance + perAccount[a.id]),
    }))
  )

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write reversals.")
    return
  }
  if (todo.length === 0) {
    console.log("Nothing to do.")
    return
  }

  await prisma.$transaction(
    async (tx) => {
      for (const t of todo) {
        await tx.transaction.create({
          data: {
            accountId: t.accountId,
            type: t.type === "INCOME" ? "EXPENSE" : "INCOME",
            amount: t.amount,
            category: "NONCASH_REVERSAL",
            paymentMethod: t.paymentMethod,
            scope: t.scope,
            referenceId: t.id,
            description: `Reversal of non-cash entry ${t.id}`,
            billingType: "PHARMACY",
          },
        })
      }
      for (const [accountId, delta] of Object.entries(perAccount)) {
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { currentBalance: { increment: delta } },
        })
      }
    },
    { timeout: 120_000 }
  )
  console.log(`Applied ${todo.length} reversals.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
