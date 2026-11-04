import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cbc = await prisma.labTestCatalog.findFirst({
    where: { name: { contains: 'CBC' } }
  })
  console.dir(cbc?.parameters, { depth: null })
}

main().catch(console.error).finally(() => prisma.$disconnect())
