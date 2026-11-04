import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('👤 Creating Super Admin User...')
  const hashedPassword = await bcrypt.hash('Admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hospital.com' },
    update: {
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      permissions: ["CLINICAL", "IPD", "PATHOLOGY", "RADIOLOGY", "PHARMACY", "FINANCE", "INSURANCE", "REPORTS", "HR_STAFF", "ADMIN"]
    },
    create: {
      email: 'admin@hospital.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      permissions: ["CLINICAL", "IPD", "PATHOLOGY", "RADIOLOGY", "PHARMACY", "FINANCE", "INSURANCE", "REPORTS", "HR_STAFF", "ADMIN"]
    }
  })

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
  console.log('✨ System is 100% clean and ready for real data! ✨')
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
