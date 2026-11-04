const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const bills = await prisma.billing.findMany({
    where: { type: 'PHARMACY' },
    include: { items: true },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(bills, null, 2));
}
run();
