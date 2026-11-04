import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const INDIAN_FIRST_NAMES = [
  'Vikram', 'Rohan', 'Neelam', 'Kiran', 'Anita', 'Harsh', 'Sangeeta', 'Prakash',
  'Sarita', 'Ajay', 'Kamal', 'Deepika', 'Vivek', 'Manish', 'Neha', 'Gaurav'
]

const INDIAN_LAST_NAMES = [
  'Nambiar', 'Bhat', 'Sengupta', 'Chavan', 'Kaur', 'Nair', 'Shetty', 'Pawar',
  'Dixit', 'Bhattacharya', 'Naidu', 'Choudhury', 'Jha', 'Tiwari'
]

const DOCTOR_SPECIALIZATIONS = [
  { name: 'Neurologist', fee: 1000, salary: 180000, count: 2 },
  { name: 'Oncologist', fee: 1200, salary: 200000, count: 2 },
  { name: 'Dermatologist', fee: 500, salary: 120000, count: 2 },
  { name: 'Psychiatrist', fee: 800, salary: 140000, count: 2 },
  { name: 'Urologist', fee: 900, salary: 160000, count: 1 },
  { name: 'Endocrinologist', fee: 750, salary: 150000, count: 2 },
  { name: 'Gastroenterologist', fee: 850, salary: 170000, count: 2 },
  { name: 'Pulmonologist', fee: 700, salary: 140000, count: 1 }
]

function generateRandomName() {
  const first = INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)]
  const last = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)]
  return `${first} ${last}`
}

function generatePhoneNumber() {
  return `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`
}

async function main() {
  console.log('👨‍⚕️ Adding new doctor categories with custom fees and salaries...')

  const password = await bcrypt.hash('doctor123', 10)

  // Find the highest existing doctor index to avoid duplicate employeeIds
  const existingStaff = await prisma.staff.findMany({
    where: { employeeId: { startsWith: 'DOC' } }
  })
  
  let maxIndex = 0;
  for (const staff of existingStaff) {
    const num = parseInt(staff.employeeId.replace('DOC', ''), 10);
    if (!isNaN(num) && num > maxIndex) {
      maxIndex = num;
    }
  }

  let doctorIndex = maxIndex + 1;

  for (const spec of DOCTOR_SPECIALIZATIONS) {
    console.log(`\n🩺 Category: ${spec.name} (Fee: ₹${spec.fee}, Salary: ₹${spec.salary})`)
    for (let i = 0; i < spec.count; i++) {
        const name = generateRandomName()
        const email = `${spec.name.toLowerCase().substring(0, 4)}${doctorIndex}@hospital.com`
        
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
            email,
            password,
            name: `Dr. ${name}`,
            role: 'DOCTOR',
            isActive: true
            }
        })

        const staff = await prisma.staff.upsert({
            where: { employeeId: `DOC${doctorIndex.toString().padStart(3, '0')}` },
            update: {
                basicSalary: spec.salary,
                consultationFee: spec.fee
            },
            create: {
                employeeId: `DOC${doctorIndex.toString().padStart(3, '0')}`,
                userId: user.id,
                department: spec.name,
                designation: 'Senior Consultant',
                specialization: spec.name,
                licenseNumber: `MCI-${Math.floor(Math.random() * 900000 + 100000)}`,
                phone: generatePhoneNumber(),
                consultationFee: spec.fee,
                basicSalary: spec.salary
            }
        })

        console.log(`   ✓ Dr. ${name} created with ID ${staff.employeeId}`)
        doctorIndex++
    }
  }
  
  console.log('\n✅ Successfully added more doctors and structured their fees and salaries!')
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
