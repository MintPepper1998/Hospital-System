import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const policies = await prisma.insurancePolicy.findMany({
    include: { patient: { include: { user: true } } }
  });
  console.log(JSON.stringify(policies, null, 2));
}

main().finally(() => prisma.$disconnect());
