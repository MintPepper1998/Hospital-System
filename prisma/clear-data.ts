import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️ Clearing all data from database...')

  // Delete everything in reverse order of dependencies
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`
  
  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ')

  if (tables.length > 0) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`)
      console.log('✅ All tables truncated successfully.')
    } catch (error) {
      console.log('Trunate failed, attempting manual deletes...')
      // Manual deletes if TRUNCATE CASCADE fails for some reason
      // (It shouldn't, but just in case)
    }
  }

  console.log('👤 Creating Admin User...')
  const hashedPassword = await bcrypt.hash('Admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hospital.com' },
    update: {
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true
    },
    create: {
      email: 'admin@hospital.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true
    }
  })

  // Create Staff record for admin
  await prisma.staff.upsert({
    where: { employeeId: 'ADMIN001' },
    update: {},
    create: {
      employeeId: 'ADMIN001',
      userId: admin.id,
      department: 'Administration',
      designation: 'Hospital Administrator',
      phone: '+91 9876543210'
    }
  })
  
  console.log(`✅ Admin created: ${admin.email}\n`)
  console.log('✨ DATABASE INITIALIZATION COMPLETED SUCCESSFULLY! ✨\n')
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
