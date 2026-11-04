/**
 * One-time migration script to clean up legacy pharmacy-named accounts
 * that were mis-scoped as HOSPITAL.
 *
 * What it does:
 *   1. Renames HOSPITAL-scoped "PHARMACY CASH ACCOUNT" → "Hospital Cash Account"
 *   2. Renames HOSPITAL-scoped "PHARMACY BANK ACCOUNT" → "Hospital Bank Account"
 *   3. Standardizes PHARMACY-scoped "PHARMACY CASH DRAWER" → "Pharmacy Cash Drawer"
 *   4. Standardizes PHARMACY-scoped "PHARMACY BANK ACCOUNT" → "Pharmacy Bank Account"
 *
 * Non-destructive: No balances or transactions are moved/deleted.
 *
 * Usage: node scripts/migrate-pharmacy-accounts.js
 */

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

const RENAMES = [
  // HOSPITAL-scoped pharmacy-named accounts → proper hospital names
  {
    where: { name: "PHARMACY CASH ACCOUNT", scope: "HOSPITAL" },
    newName: "Hospital Cash Account",
  },
  {
    where: { name: "PHARMACY BANK ACCOUNT", scope: "HOSPITAL" },
    newName: "Hospital Bank Account",
  },
  // PHARMACY-scoped accounts → standardized casing
  {
    where: { name: "PHARMACY CASH DRAWER", scope: "PHARMACY" },
    newName: "Pharmacy Cash Drawer",
  },
  {
    where: { name: "PHARMACY BANK ACCOUNT", scope: "PHARMACY" },
    newName: "Pharmacy Bank Account",
  },
]

async function main() {
  console.log("=== Pharmacy Account Migration ===\n")

  for (const { where, newName } of RENAMES) {
    const account = await prisma.financialAccount.findFirst({
      where: { name: where.name, scope: where.scope },
    })

    if (!account) {
      console.log(`  SKIP: "${where.name}" (${where.scope}) — not found`)
      continue
    }

    if (account.name === newName) {
      console.log(`  SKIP: "${where.name}" (${where.scope}) — already renamed`)
      continue
    }

    await prisma.financialAccount.update({
      where: { id: account.id },
      data: { name: newName },
    })

    console.log(`  ✓ "${where.name}" (${where.scope}) → "${newName}"  [balance: ₹${account.currentBalance}]`)
  }

  console.log("\n=== Migration Complete ===")
}

main()
  .catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
