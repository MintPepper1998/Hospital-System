/**
 * Quick Seed Script for EMR Queue Testing
 * 
 * Creates 5 appointments for TODAY to test the Doctor's Queue
 * 
 * Usage: npx ts-node prisma/seed-queue.ts
 */

import { PrismaClient, Gender, AppointmentStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// Indian patient names
const PATIENTS = [
  {
    name: "Rahul Sharma",
    gender: "MALE" as Gender,
    phone: "9876543210",
    age: 35,
    reason: "Fever & Cold since 3 days"
  },
  {
    name: "Priya Patel",
    gender: "FEMALE" as Gender,
    phone: "9876543211",
    age: 28,
    reason: "Stomach Pain and Nausea"
  },
  {
    name: "Amit Verma",
    gender: "MALE" as Gender,
    phone: "9876543212",
    age: 42,
    reason: "Follow-up for Diabetes"
  },
  {
    name: "Sneha Gupta",
    gender: "FEMALE" as Gender,
    phone: "9876543213",
    age: 31,
    reason: "Severe Headache & Dizziness"
  },
  {
    name: "Vikram Singh",
    gender: "MALE" as Gender,
    phone: "9876543214",
    age: 50,
    reason: "General Health Checkup"
  }
]

async function main() {
  console.log('🏥 Starting EMR Queue Seed Script...\n')

  // Step 1: Find or create a doctor
  console.log('👨‍⚕️ Finding doctor...')
  let doctor = await prisma.staff.findFirst({
    where: {
      user: {
        role: 'DOCTOR'
      }
    },
    include: {
      user: true
    }
  })

  if (!doctor) {
    console.log('   No doctor found. Creating a test doctor...')
    
    // Create a doctor user
    const doctorUser = await prisma.user.create({
      data: {
        email: 'doctor.test@hospital.com',
        name: 'Dr. Rajesh Kumar',
        password: await hash('doctor123', 10),
        role: 'DOCTOR'
      }
    })

    // Create doctor staff profile
    doctor = await prisma.staff.create({
      data: {
        userId: doctorUser.id,
        employeeId: 'DOC001',
        department: 'General Medicine',
        specialization: 'General Physician',
        phone: '9999999999',
        consultationFee: 500
      },
      include: {
        user: true
      }
    })

    console.log(`   ✅ Created doctor: ${doctor.user.name}`)
  } else {
    console.log(`   ✅ Found doctor: ${doctor.user.name}`)
  }

  // Step 2: Create patients and appointments
  console.log('\n👥 Creating patients and appointments...\n')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const appointments = []

  for (let i = 0; i < PATIENTS.length; i++) {
    const patientData = PATIENTS[i]
    
    console.log(`   ${i + 1}. Creating ${patientData.name}...`)

    // Generate unique email and patient ID
    const email = `${patientData.name.toLowerCase().replace(/\s+/g, '.')}@test.com`
    const patientId = `PAT-TEST-${String(i + 1).padStart(3, '0')}`

    // Calculate date of birth from age
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - patientData.age)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: patientData.name,
        password: await hash('patient123', 10),
        role: 'PATIENT'
      }
    })

    // Create patient profile
    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        patientId,
        dateOfBirth: dob,
        gender: patientData.gender,
        phone: patientData.phone,
        address: 'Bangalore, Karnataka',
        bloodGroup: i % 4 === 0 ? 'O+' : i % 4 === 1 ? 'A+' : i % 4 === 2 ? 'B+' : 'AB+',
        emergencyContact: '9999888877' // Emergency contact phone number
      }
    })

    // Determine status (First 3 PENDING, Last 2 IN_PROGRESS)
    const status: AppointmentStatus = i < 3 ? 'PENDING' : 'IN_PROGRESS'
    
    // Generate appointment time (9 AM onwards, 30 min slots)
    const appointmentTime = `${String(9 + i).padStart(2, '0')}:00`

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: today,
        appointmentTime,
        status,
        reason: patientData.reason,
        duration: 30
      }
    })

    appointments.push(appointment)

    console.log(`      ✅ Patient: ${patient.patientId}`)
    console.log(`      ✅ Appointment: ${appointmentTime} | Status: ${status}`)
    console.log(`      ✅ Reason: ${patientData.reason}\n`)
  }

  // Summary
  console.log('\n✅ EMR Queue Seed Complete!\n')
  console.log('📊 Summary:')
  console.log(`   - Doctor: ${doctor.user.name}`)
  console.log(`   - Patients Created: ${PATIENTS.length}`)
  console.log(`   - Appointments Created: ${appointments.length}`)
  console.log(`   - PENDING (Waiting): ${appointments.filter(a => a.status === 'PENDING').length}`)
  console.log(`   - IN_PROGRESS (Active): ${appointments.filter(a => a.status === 'IN_PROGRESS').length}`)
  console.log('\n🎯 Next Steps:')
  console.log('   1. Restart your dev server: npm run dev')
  console.log('   2. Navigate to: /dashboard/clinical/emr')
  console.log('   3. You should see 5 appointments in the queue!')
  console.log('\n💡 Test Login:')
  console.log(`   Email: ${doctor.user.email}`)
  console.log(`   Password: doctor123`)
  console.log('\n')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding queue:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
