import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function killConnections() {
  console.log('Killing idle connections...')
  try {
    await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
        AND datname = current_database();
    `)
    console.log('Connections killed successfully.')
  } catch (err) {
    console.error('Error killing connections:', err)
  }
}

killConnections().finally(() => prisma.$disconnect())
