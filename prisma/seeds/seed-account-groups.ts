/**
 * Account Groups Seed — Default Chart of Accounts for Indian Hospital
 * 
 * Uses 1000-6000 standard COA numbering system.
 * All groups are marked as system accounts (cannot be deleted by users).
 * 
 * Run: npx ts-node prisma/seeds/seed-account-groups.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface AccountGroupSeed {
  code: string
  name: string
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" | "CONTRA"
  nature: "DEBIT" | "CREDIT"
  parentCode?: string
  scope?: "HOSPITAL" | "PHARMACY" | "BOTH"
  description?: string
  displayOrder: number
}

const ACCOUNT_GROUPS: AccountGroupSeed[] = [
  // ═══════════════════════════════════════
  // ROOT ACCOUNT GROUPS
  // ═══════════════════════════════════════
  { code: "1000", name: "Assets", type: "ASSET", nature: "DEBIT", displayOrder: 1 },
  { code: "2000", name: "Liabilities", type: "LIABILITY", nature: "CREDIT", displayOrder: 2 },
  { code: "3000", name: "Equity / Capital", type: "EQUITY", nature: "CREDIT", displayOrder: 3 },
  { code: "4000", name: "Revenue / Income", type: "REVENUE", nature: "CREDIT", displayOrder: 4 },
  { code: "5000", name: "Expenses", type: "EXPENSE", nature: "DEBIT", displayOrder: 5 },
  { code: "6000", name: "Contra / Adjustments", type: "CONTRA", nature: "DEBIT", displayOrder: 6 },
]

async function seedAccountGroups() {
  console.log("🌱 Seeding Account Groups (Chart of Accounts)...")

  // Check if already seeded
  const existingCount = await prisma.accountGroup.count()
  if (existingCount > 0) {
    console.log(`  ℹ️  Already seeded (${existingCount} groups exist). Skipping.`)
    return
  }

  // First pass: create all groups without parent relationships
  const codeToId: Record<string, string> = {}

  for (const group of ACCOUNT_GROUPS) {
    const created = await prisma.accountGroup.create({
      data: {
        code: group.code,
        name: group.name,
        type: group.type,
        nature: group.nature,
        scope: group.scope || "BOTH",
        isSystemAccount: true,
        description: group.description || null,
        displayOrder: group.displayOrder,
      },
    })
    codeToId[group.code] = created.id
  }

  // Second pass: set parent relationships
  for (const group of ACCOUNT_GROUPS) {
    if (group.parentCode && codeToId[group.parentCode]) {
      await prisma.accountGroup.update({
        where: { id: codeToId[group.code] },
        data: { parentId: codeToId[group.parentCode] },
      })
    }
  }

  console.log(`  ✅ Seeded ${ACCOUNT_GROUPS.length} account groups.`)
}

async function backfillTransactions() {
  console.log("\n🔄 Backfilling existing transactions with accountGroupCode...")

  // Get all transactions without an accountGroupCode
  const transactions = await prisma.transaction.findMany({
    where: { accountGroupCode: null },
    select: { id: true, type: true, category: true, scope: true, referenceId: true },
  })

  if (transactions.length === 0) {
    console.log("  ℹ️  No transactions to backfill.")
    return
  }

  console.log(`  📊 Found ${transactions.length} transactions to backfill.`)

  // Batch by reference to get billing types
  const referenceIds = transactions
    .map((t) => t.referenceId)
    .filter((id): id is string => id !== null)

  const billings = referenceIds.length > 0
    ? await prisma.billing.findMany({
        where: { id: { in: referenceIds } },
        select: { id: true, type: true },
      })
    : []

  const billingTypeMap = new Map(billings.map((b) => [b.id, b.type]))

  let updated = 0
  for (const txn of transactions) {
    const billingType = txn.referenceId ? billingTypeMap.get(txn.referenceId) || null : null
    const cat = (txn.category || "").toUpperCase()

    let accountGroupCode: string | null = null

    if (txn.type === "INCOME") {
      if (cat.includes("TRANSFER")) {
        accountGroupCode = null
      } else if (billingType === "OPD" || billingType === "CASUALTY" || billingType === "EMERGENCY") {
        accountGroupCode = "4110"
      } else if (billingType === "IPD") {
        accountGroupCode = "4120"
      } else if (billingType === "OT") {
        accountGroupCode = "4130"
      } else if (billingType === "LABORATORY") {
        accountGroupCode = "4140"
      } else if (billingType === "PHARMACY") {
        accountGroupCode = "4150"
      } else if (billingType === "AMBULANCE") {
        accountGroupCode = "4170"
      } else if (billingType === "CANTEEN") {
        accountGroupCode = "4180"
      } else if (cat.includes("BSKY") || cat.includes("PMJAY")) {
        accountGroupCode = "4110"
      } else {
        accountGroupCode = "4200"
      }
    } else if (txn.type === "EXPENSE") {
      if (cat.includes("TRANSFER")) {
        accountGroupCode = null
      } else if (txn.scope === "PHARMACY" && (cat.includes("PURCHASE") || cat.includes("SUPPLIER"))) {
        accountGroupCode = "5110"
      } else {
        accountGroupCode = "5270"
      }
    }

    if (accountGroupCode) {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: {
          accountGroupCode,
          billingType: billingType || null,
        },
      })
      updated++
    }
  }

  console.log(`  ✅ Backfilled ${updated} / ${transactions.length} transactions.`)
}

async function main() {
  try {
    await seedAccountGroups()
    await backfillTransactions()
    console.log("\n🎉 Account group seeding complete!")
  } catch (error) {
    console.error("❌ Seed error:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
