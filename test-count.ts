import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.count()
  .then(c => console.log('User count:', c))
  .catch(e => console.error(e.message))
  .finally(() => prisma.$disconnect());
