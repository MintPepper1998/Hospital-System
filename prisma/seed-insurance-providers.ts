/**
 * Seed script: Populates the insurance_providers table with
 * all currently hardcoded insurers, TPAs, and government schemes.
 *
 * Run:  npx ts-node prisma/seed-insurance-providers.ts
 */
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  console.log("🏥 Seeding Insurance Providers...")

  // ─── INSURERS (from the hardcoded INSURERS array) ───────────────────────
  const insurers = [
    { name: "Star Health", shortName: "STAR", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "Star Health TPA" },
    { name: "ICICI Lombard", shortName: "ICICI", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "FHPL (Family Health Plan)" },
    { name: "HDFC ERGO", shortName: "HDFC", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "Medi Assist" },
    { name: "Bajaj Allianz", shortName: "BAJAJ", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "Medi Assist" },
    { name: "Max Bupa (Niva Bupa)", shortName: "NIVA", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false },
    { name: "Care Health", shortName: "CARE", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "Paramount Health" },
    { name: "New India Assurance", shortName: "NIA", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "MD India" },
    { name: "United India Insurance", shortName: "UII", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "MD India" },
    { name: "National Insurance", shortName: "NATIONAL", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "Good Health TPA" },
    { name: "Oriental Insurance", shortName: "OIC", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false },
    { name: "SBI General", shortName: "SBI", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false },
    { name: "Tata AIG", shortName: "TATA", supportsCashless: true, supportsReimbursement: true, isEmpaneled: true, linkedTpaName: "Vidal Health (TTK)" },
    { name: "Reliance General", shortName: "RELIANCE", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false },
    { name: "Aditya Birla Health", shortName: "ABH", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false },
    { name: "Manipal Cigna", shortName: "CIGNA", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false },
    { name: "Cholamandalam MS", shortName: "CHOLA", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false },
  ]

  // ─── TPAs (from the hardcoded TPA_LIST array) ──────────────────────────
  const tpas = [
    { name: "Medi Assist", shortName: "MEDIASSIST" },
    { name: "FHPL (Family Health Plan)", shortName: "FHPL" },
    { name: "Paramount Health", shortName: "PARAMOUNT" },
    { name: "Vidal Health (TTK)", shortName: "VIDAL" },
    { name: "Raksha TPA", shortName: "RAKSHA" },
    { name: "MD India", shortName: "MDI" },
    { name: "Good Health TPA", shortName: "GOODHEALTH" },
    { name: "Star Health TPA", shortName: "STARTPA" },
    { name: "Medsave Health TPA", shortName: "MEDSAVE" },
    { name: "Heritage Health TPA", shortName: "HERITAGE" },
    { name: "United Health TPA", shortName: "UNITEDTPA" },
  ]

  // ─── GOVERNMENT SCHEMES ────────────────────────────────────────────────
  const govtSchemes = [
    { name: "PMJAY (Ayushman Bharat)", shortName: "PMJAY", supportsCashless: true, supportsReimbursement: false, isEmpaneled: true, defaultSettlementType: "CASHLESS" },
    { name: "BSKY (Biju Swasthya Kalyan Yojana)", shortName: "BSKY", supportsCashless: true, supportsReimbursement: false, isEmpaneled: true, defaultSettlementType: "CASHLESS" },
    { name: "CGHS (Central Govt Health Scheme)", shortName: "CGHS", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false, defaultSettlementType: "CASHLESS" },
    { name: "ECHS (Ex-Servicemen)", shortName: "ECHS", supportsCashless: true, supportsReimbursement: true, isEmpaneled: false, defaultSettlementType: "CASHLESS" },
  ]

  // ─── Step 1: Seed TPAs first (so we can link insurers to them) ─────────
  console.log("  → Seeding TPAs...")
  for (const tpa of tpas) {
    await prisma.insuranceProvider.upsert({
      where: { name: tpa.name },
      update: {},
      create: {
        name: tpa.name,
        shortName: tpa.shortName,
        providerType: "TPA",
        supportsCashless: true,
        supportsReimbursement: true,
        defaultSettlementType: "CASHLESS",
        isEmpaneled: false,
        isActive: true,
      },
    })
  }
  console.log(`  ✓ ${tpas.length} TPAs seeded`)

  // ─── Step 2: Seed Insurers (with TPA linking) ──────────────────────────
  console.log("  → Seeding Insurers...")
  for (const ins of insurers) {
    let linkedTpaId = null
    if (ins.linkedTpaName) {
      const tpa = await prisma.insuranceProvider.findUnique({
        where: { name: ins.linkedTpaName },
      })
      linkedTpaId = tpa?.id || null
    }

    await prisma.insuranceProvider.upsert({
      where: { name: ins.name },
      update: {},
      create: {
        name: ins.name,
        shortName: ins.shortName,
        providerType: "INSURER",
        supportsCashless: ins.supportsCashless,
        supportsReimbursement: ins.supportsReimbursement,
        defaultSettlementType: "CASHLESS",
        isEmpaneled: ins.isEmpaneled,
        linkedTpaId,
        isActive: true,
      },
    })
  }
  console.log(`  ✓ ${insurers.length} Insurers seeded`)

  // ─── Step 3: Seed Government Schemes ───────────────────────────────────
  console.log("  → Seeding Government Schemes...")
  for (const scheme of govtSchemes) {
    await prisma.insuranceProvider.upsert({
      where: { name: scheme.name },
      update: {},
      create: {
        name: scheme.name,
        shortName: scheme.shortName,
        providerType: "GOVT_SCHEME",
        supportsCashless: scheme.supportsCashless,
        supportsReimbursement: scheme.supportsReimbursement,
        defaultSettlementType: scheme.defaultSettlementType,
        isEmpaneled: scheme.isEmpaneled,
        isActive: true,
      },
    })
  }
  console.log(`  ✓ ${govtSchemes.length} Govt Schemes seeded`)

  const total = await prisma.insuranceProvider.count()
  console.log(`\n✅ Done! Total providers in database: ${total}`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
