const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const medicine = await prisma.medicine.findUnique({ where: { id: 'cmrj5vtas0005jj1cy8udrd3w' } });
  const batch = await prisma.inventoryBatch.findUnique({ where: { id: 'cmrj5vtas0005jj1cy8udrd3w' } });
  console.log({ medicine: !!medicine, batch: !!batch });
}
run();
