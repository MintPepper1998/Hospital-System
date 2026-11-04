const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const txnCount = await prisma.transaction.count({
    where: { scope: "PHARMACY" }
  })
  
  const recentTxns = await prisma.transaction.findMany({
    where: { scope: "PHARMACY" },
    take: 5,
    orderBy: { date: "desc" },
    include: { account: { select: { name: true } } }
  })

  console.log({ txnCount })
  console.log(JSON.stringify(recentTxns, null, 2))
}

main().finally(() => prisma.$disconnect())
