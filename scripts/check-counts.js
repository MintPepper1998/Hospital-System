const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const txnCount = await prisma.transaction.count({
    where: { scope: "PHARMACY" }
  })
  
  console.log(`Total PHARMACY transactions in DB: ${txnCount}`)

  const hospitalTxns = await prisma.transaction.count({
    where: { scope: "HOSPITAL" }
  })
  console.log(`Total HOSPITAL transactions in DB: ${hospitalTxns}`)
  
  const bills = await prisma.billing.findMany({
    where: { type: "PHARMACY", status: "PAID" },
    select: { id: true, billNumber: true }
  })

  const billIds = bills.map(b => b.id)
  
  const linkedTxns = await prisma.transaction.findMany({
    where: { referenceId: { in: billIds } }
  })
  
  console.log(`Transactions linked to PHARMACY bills: ${linkedTxns.length}`)
  
  if (linkedTxns.length > 0) {
    console.log("Sample of linked txns scopes:")
    console.log(linkedTxns.slice(0, 5).map(t => ({ id: t.id, scope: t.scope, ref: t.referenceId })))
  }
}

main().finally(() => prisma.$disconnect())
