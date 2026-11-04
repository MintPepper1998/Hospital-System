const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const settings = await prisma.hospitalSettings.findUnique({ where: { id: 1 } })
  console.log(JSON.stringify(settings, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
