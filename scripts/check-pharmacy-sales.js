const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const txnCount = await prisma.transaction.count({
    where: { category: "PHARMACY_SALE" }
  })
  
  const billingCount = await prisma.pharmacyBilling.count()
  
  const billings = await prisma.pharmacyBilling.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  })

  console.log({ txnCount, billingCount })
  console.log(JSON.stringify(billings, null, 2))
}

main().finally(() => prisma.$disconnect())
