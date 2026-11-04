const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const bills = await prisma.billing.findMany({
    where: { type: "PHARMACY", status: "PAID" },
  })

  console.log(`Total PAID PHARMACY bills: ${bills.length}`)
  
  if (bills.length > 0) {
    console.log(bills.slice(0, 5))
  }
}

main().finally(() => prisma.$disconnect())
