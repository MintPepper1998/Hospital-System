import { prisma } from "../lib/prisma"

const APPLY = process.argv.includes("--apply")

async function main() {
  const suppliers = await prisma.supplier.findMany({
    where: { NOT: { scope: "PHARMACY" } },
    select: { id: true, name: true, scope: true },
    orderBy: { name: "asc" },
  })

  console.log(`Suppliers requiring migration: ${suppliers.length}`)
  for (const supplier of suppliers) {
    console.log(`- ${supplier.name} (${supplier.scope}) -> PHARMACY`)
  }

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to update these suppliers.")
    return
  }

  if (suppliers.length === 0) {
    console.log("No supplier scope changes are needed.")
    return
  }

  const result = await prisma.supplier.updateMany({
    where: { id: { in: suppliers.map((supplier) => supplier.id) } },
    data: { scope: "PHARMACY" },
  })

  console.log(`Updated ${result.count} supplier(s) to PHARMACY.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
