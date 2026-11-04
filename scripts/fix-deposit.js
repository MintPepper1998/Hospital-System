const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  const a = await p.iPDAdmission.findUnique({
    where: { id: "cmtcq3tfk0001jr1ch4zp9y87" },
    select: { id: true, initialDeposit: true, amountPaid: true }
  })
  console.log("Current:", JSON.stringify(a))
  
  await p.iPDAdmission.update({
    where: { id: "cmtcq3tfk0001jr1ch4zp9y87" },
    data: { initialDeposit: 7000 }
  })
  console.log("Updated initialDeposit to 7000")
}

main().catch(console.error).finally(() => p.$disconnect())
