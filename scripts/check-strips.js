const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  const r = await p.inventoryBatch.findMany({
    where: {
      medicine: { name: { in: ["L HIST MONT", "ZERODOL SP"], mode: "insensitive" } },
      isActive: true,
    },
    select: {
      medicine: { select: { name: true } },
      batchNumber: true,
      medicinesPerStrip: true,
      sellingPrice: true,
    },
  })
  console.log(JSON.stringify(r, null, 2))
}

main().catch(console.error).finally(() => p.$disconnect())
