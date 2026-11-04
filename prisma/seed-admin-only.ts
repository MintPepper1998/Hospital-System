import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🏥 Starting Hospital ERP Empty Database Setup...\n')

  // ========================================
  // 1. CREATE ADMIN USER
  // ========================================
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
  console.log('📊 Summary:')
  console.log(`   • 1 Admin Only`)
  console.log(`   • Database is completely clean and empty otherwise.`)
  console.log('\n🔐 Login Credentials:')
  console.log(`   Admin: admin@hospital.com / Admin123`)
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
