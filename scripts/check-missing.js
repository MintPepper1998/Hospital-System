const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const billings = await prisma.billing.findMany({
    where: {
      type: "PHARMACY",
      status: "PAID",
      transactions: { none: { scope: "PHARMACY" } },
    }
  })

  console.log(`Still missing transactions for ${billings.length} bills.`)
  if (billings.length > 0) {
    console.log(JSON.stringify(billings.slice(0, 5), null, 2))
  }
}

main().finally(() => prisma.$disconnect())
