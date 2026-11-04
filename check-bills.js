const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const bills = await prisma.billing.findMany({ 
    where: { billNumber: { startsWith: 'OPD-' } }, 
    orderBy: { billNumber: 'desc' }, 
    take: 10, 
    select: { billNumber: true, createdAt: true } 
  }); 
  console.log(bills); 
} 

main().finally(() => prisma.$disconnect());
