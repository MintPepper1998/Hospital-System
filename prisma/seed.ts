import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Realistic Indian Names
const INDIAN_FIRST_NAMES = [
  'Rajesh', 'Priya', 'Amit', 'Sunita', 'Rahul', 'Kavita', 'Suresh', 'Meera',
  'Vijay', 'Anjali', 'Arun', 'Sneha', 'Ramesh', 'Pooja', 'Sandeep', 'Nisha',
  'Manoj', 'Divya', 'Ravi', 'Deepa', 'Kiran', 'Lakshmi', 'Prakash', 'Rekha',
  'Ganesh', 'Swati', 'Ashok', 'Varsha', 'Mohan', 'Asha', 'Vinod', 'Shanti',
  'Dinesh', 'Parvati', 'Sanjay', 'Gita', 'Mahesh', 'Radha', 'Naveen', 'Usha',
  'Abhishek', 'Kalpana', 'Siddharth', 'Malini', 'Arjun', 'Savitri', 'Nikhil', 'Manju',
  'Rohit', 'Shalini', 'Aditya', 'Vandana', 'Karthik', 'Bharti', 'Vishal', 'Madhuri'
]

const INDIAN_LAST_NAMES = [
  'Kumar', 'Sharma', 'Singh', 'Patel', 'Reddy', 'Rao', 'Nair', 'Iyer',
  'Mehta', 'Shah', 'Gupta', 'Verma', 'Desai', 'Joshi', 'Pillai', 'Menon',
  'Chatterjee', 'Banerjee', 'Kulkarni', 'Jain', 'Agarwal', 'Pandey', 'Sinha', 'Bose'
]

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
]

// Common Diagnoses
const DIAGNOSES = [
  'Acute Upper Respiratory Tract Infection',
  'Viral Fever',
  'Gastroenteritis',
  'Hypertension (Controlled)',
  'Type 2 Diabetes Mellitus',
  'Urinary Tract Infection',
  'Acute Bronchitis',
  'Dengue Fever (Suspected)',
  'Musculoskeletal Pain',
  'Migraine',
  'Acid Reflux / GERD',
  'Allergic Rhinitis',
  'Skin Rash - Dermatitis'
]

// Doctor Specializations
const DOCTOR_SPECIALIZATIONS = [
  { name: 'General Physician', fee: 300, count: 3 },
  { name: 'Cardiologist', fee: 600, count: 2 },
  { name: 'Orthopedic Surgeon', fee: 500, count: 2 },
  { name: 'Gynecologist', fee: 500, count: 1 },
  { name: 'Pediatrician', fee: 400, count: 1 },
  { name: 'ENT Specialist', fee: 450, count: 1 }
]

// Common Medicines (Indian Brands)
const MEDICINES = [
  { name: 'Dolo 650', generic: 'Paracetamol', type: 'TABLET', strength: '650mg', price: 2.5, manufacturer: 'Micro Labs' },
  { name: 'Augmentin', generic: 'Amoxicillin + Clavulanic Acid', type: 'TABLET', strength: '625mg', price: 25, manufacturer: 'GSK' },
  { name: 'Pan-D', generic: 'Pantoprazole + Domperidone', type: 'CAPSULE', strength: '40mg+30mg', price: 8, manufacturer: 'Alkem' },
  { name: 'Citralka', generic: 'Disodium Hydrogen Citrate', type: 'SYRUP', strength: '100ml', price: 95, manufacturer: 'Ajanta Pharma' },
  { name: 'Azithromycin', generic: 'Azithromycin', type: 'TABLET', strength: '500mg', price: 18, manufacturer: 'Cipla' },
  { name: 'Crocin Advance', generic: 'Paracetamol', type: 'TABLET', strength: '500mg', price: 3, manufacturer: 'GSK' },
  { name: 'Sinarest', generic: 'Paracetamol + Phenylephrine', type: 'TABLET', strength: '500mg+10mg', price: 4.5, manufacturer: 'Centrium' },
  { name: 'Combiflam', generic: 'Ibuprofen + Paracetamol', type: 'TABLET', strength: '400mg+325mg', price: 3.5, manufacturer: 'Sanofi' },
  { name: 'Cetrizine', generic: 'Cetirizine', type: 'TABLET', strength: '10mg', price: 1.5, manufacturer: 'Dr. Reddy\'s' },
  { name: 'Montek LC', generic: 'Montelukast + Levocetirizine', type: 'TABLET', strength: '10mg+5mg', price: 12, manufacturer: 'Sun Pharma' },
  { name: 'Rabeprazole', generic: 'Rabeprazole', type: 'TABLET', strength: '20mg', price: 6, manufacturer: 'Lupin' },
  { name: 'Metformin', generic: 'Metformin', type: 'TABLET', strength: '500mg', price: 2, manufacturer: 'USV' },
  { name: 'Amlodipine', generic: 'Amlodipine', type: 'TABLET', strength: '5mg', price: 2.5, manufacturer: 'Cipla' },
  { name: 'Norflox TZ', generic: 'Norfloxacin + Tinidazole', type: 'TABLET', strength: '400mg+600mg', price: 15, manufacturer: 'Cipla' },
  { name: 'ORS', generic: 'Oral Rehydration Salts', type: 'POWDER', strength: '21g', price: 8, manufacturer: 'Electral' }
]

// Lab Tests
const LAB_TESTS = [
  { name: 'Complete Blood Count (CBC)', code: 'CBC001', category: 'Hematology', price: 300, normalRange: 'Varies by parameter' },
  { name: 'Widal Test', code: 'WIDAL001', category: 'Serology', price: 200, normalRange: '<1:80' },
  { name: 'Lipid Profile', code: 'LIPID001', category: 'Biochemistry', price: 800, normalRange: 'Total Chol <200 mg/dL' },
  { name: 'Liver Function Test (LFT)', code: 'LFT001', category: 'Biochemistry', price: 500, normalRange: 'Varies by parameter' },
  { name: 'Kidney Function Test (KFT)', code: 'KFT001', category: 'Biochemistry', price: 500, normalRange: 'Creatinine 0.6-1.2 mg/dL' },
  { name: 'Blood Sugar Fasting', code: 'BSF001', category: 'Biochemistry', price: 150, normalRange: '70-110 mg/dL' },
  { name: 'Blood Sugar PP (Post Prandial)', code: 'BSPP001', category: 'Biochemistry', price: 150, normalRange: '<140 mg/dL' },
  { name: 'HbA1c (Glycated Hemoglobin)', code: 'HBA1C001', category: 'Biochemistry', price: 600, normalRange: '<5.7%' },
  { name: 'Dengue NS1 Antigen', code: 'DENGUE001', category: 'Serology', price: 600, normalRange: 'Negative' },
  { name: 'Urine Routine & Microscopy', code: 'URINE001', category: 'Pathology', price: 200, normalRange: 'No abnormalities' },
  { name: 'X-Ray Chest PA View', code: 'XRAY001', category: 'Radiology', price: 400, normalRange: 'Normal study' },
  { name: 'ECG (Electrocardiogram)', code: 'ECG001', category: 'Cardiology', price: 250, normalRange: 'Normal sinus rhythm' },
  { name: 'Thyroid Profile (T3, T4, TSH)', code: 'THYROID001', category: 'Biochemistry', price: 700, normalRange: 'TSH 0.4-4.0 mIU/L' }
]

// Pharmacy Suppliers
const SUPPLIERS = [
  { name: 'Apollo Pharma Distributors', contactPerson: 'Rajesh Kumar', phone: '+91 98765 43210', gstNumber: '29ABCDE1234F1Z5', address: 'Andheri East, Mumbai', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Sun Pharma Agencies', contactPerson: 'Amit Shah', phone: '+91 98765 43211', gstNumber: '27FGHIJ5678K2Y6', address: 'Koramangala, Bangalore', city: 'Bangalore', state: 'Karnataka' },
  { name: 'Cipla Medical Supplies', contactPerson: 'Priya Menon', phone: '+91 98765 43212', gstNumber: '29KLMNO9012M3X7', address: 'Vashi, Navi Mumbai', city: 'Navi Mumbai', state: 'Maharashtra' }
]

// Wards Configuration
const WARDS = [
  { name: 'General Ward (Male)', type: 'GENERAL', description: 'Non-AC general ward for male patients', bedCount: 15, pricePerDay: 800 },
  { name: 'General Ward (Female)', type: 'GENERAL', description: 'Non-AC general ward for female patients', bedCount: 15, pricePerDay: 800 },
  { name: 'Private AC Ward', type: 'PRIVATE', description: 'Air-conditioned private rooms', bedCount: 10, pricePerDay: 2000 },
  { name: 'ICU (Intensive Care)', type: 'ICU', description: 'Critical care unit with monitoring', bedCount: 8, pricePerDay: 5000 }
]

function generateRandomName() {
  const first = INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)]
  const last = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)]
  return `${first} ${last}`
}

function generatePhoneNumber() {
  return `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`
}

function generateAddress() {
  const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)]
  const streetNum = Math.floor(Math.random() * 500 + 1)
  return `${streetNum}, MG Road, ${city}`
}

function getRandomDate(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date
}

async function main() {
  console.log('🏥 Starting Hospital ERP Database Seeding...\n')

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

  // ========================================
  // 2. CREATE DOCTORS
  // ========================================
  console.log('👨‍⚕️ Creating Doctors...')
  const doctors = []
  let doctorIndex = 1

  for (const spec of DOCTOR_SPECIALIZATIONS) {
    for (let i = 0; i < spec.count; i++) {
      const name = generateRandomName()
      const email = `doctor${doctorIndex}@hospital.com`
      const password = await bcrypt.hash('doctor123', 10)

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
        update: {},
        create: {
          employeeId: `DOC${doctorIndex.toString().padStart(3, '0')}`,
          userId: user.id,
          department: spec.name,
          designation: spec.name,
          specialization: spec.name,
          licenseNumber: `MCI-${Math.floor(Math.random() * 900000 + 100000)}`,
          phone: generatePhoneNumber(),
          consultationFee: spec.fee
        }
      })

      doctors.push(staff)
      console.log(`   ✓ ${user.name} - ${spec.name} (₹${spec.fee})`)
      doctorIndex++
    }
  }
  console.log(`✅ Created ${doctors.length} doctors\n`)

  // ========================================
  // 3. CREATE RECEPTIONISTS & PHARMACISTS
  // ========================================
  console.log('👥 Creating Support Staff...')
  
  // Receptionists
  for (let i = 1; i <= 2; i++) {
    const name = generateRandomName()
    const email = `reception${i}@hospital.com`
    const password = await bcrypt.hash('reception123', 10)

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password,
        name,
        role: 'RECEPTIONIST',
        isActive: true
      }
    })

    await prisma.staff.upsert({
      where: { employeeId: `REC${i.toString().padStart(3, '0')}` },
      update: {},
      create: {
        employeeId: `REC${i.toString().padStart(3, '0')}`,
        userId: user.id,
        department: 'Front Desk',
        designation: 'Receptionist',
        phone: generatePhoneNumber()
      }
    })
    console.log(`   ✓ Receptionist: ${name}`)
  }

  // Pharmacists
  for (let i = 1; i <= 2; i++) {
    const name = generateRandomName()
    const email = `pharmacy${i}@hospital.com`
    const password = await bcrypt.hash('pharmacy123', 10)

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password,
        name,
        role: 'PHARMACIST',
        isActive: true
      }
    })

    await prisma.staff.upsert({
      where: { employeeId: `PHR${i.toString().padStart(3, '0')}` },
      update: {},
      create: {
        employeeId: `PHR${i.toString().padStart(3, '0')}`,
        userId: user.id,
        department: 'Pharmacy',
        designation: 'Pharmacist',
        phone: generatePhoneNumber()
      }
    })
    console.log(`   ✓ Pharmacist: ${name}`)
  }
  console.log(`✅ Support staff created\n`)

  // ========================================
  // 4. CREATE WARDS & BEDS
  // ========================================
  console.log('🏨 Creating Wards & Beds...')
  const createdWards = []

  for (const wardConfig of WARDS) {
    // Find or create ward
    let ward = await prisma.ward.findFirst({
      where: { name: wardConfig.name }
    })

    if (!ward) {
      ward = await prisma.ward.create({
        data: {
          name: wardConfig.name,
          type: wardConfig.type,
          description: wardConfig.description,
          capacity: wardConfig.bedCount
        }
      })
    }
    createdWards.push(ward)

    // Create beds for this ward
    for (let i = 1; i <= wardConfig.bedCount; i++) {
      const bedNumber = `${wardConfig.name.substring(0, 3).toUpperCase()}-${i.toString().padStart(2, '0')}`
      
      await prisma.bed.upsert({
        where: {
          wardId_bedNumber: {
            wardId: ward.id,
            bedNumber: bedNumber
          }
        },
        update: {},
        create: {
          bedNumber,
          wardId: ward.id,
          pricePerDay: wardConfig.pricePerDay,
          status: 'AVAILABLE'
        }
      })
    }

    console.log(`   ✓ ${wardConfig.name}: ${wardConfig.bedCount} beds @ ₹${wardConfig.pricePerDay}/day`)
  }
  console.log(`✅ Created ${WARDS.length} wards with ${WARDS.reduce((sum, w) => sum + w.bedCount, 0)} beds\n`)

  // ========================================
  // 5. CREATE PHARMACY INFRASTRUCTURE
  // ========================================
  console.log('💊 Creating Pharmacy Inventory...')
  
  // Suppliers
  const createdSuppliers = []
  for (const sup of SUPPLIERS) {
    const supplier = await prisma.supplier.upsert({
      where: { name: sup.name },
      update: {},
      create: {
        name: sup.name,
        contactPerson: sup.contactPerson,
        phone: sup.phone,
        gstNumber: sup.gstNumber,
        address: sup.address,
        city: sup.city,
        state: sup.state
      }
    })
    createdSuppliers.push(supplier)
    console.log(`   ✓ Supplier: ${sup.name}`)
  }

  // Medicines
  for (const med of MEDICINES) {
    const medicine = await prisma.medicine.upsert({
      where: {
        name_strength: {
          name: med.name,
          strength: med.strength
        }
      },
      update: {},
      create: {
        name: med.name,
        genericName: med.generic,
        manufacturer: med.manufacturer,
        type: med.type as any,
        strength: med.strength,
        unitPrice: med.price,
        minStockLevel: 50
      }
    })

    // Add stock batches (2-3 batches per medicine)
    const batchCount = Math.floor(Math.random() * 2) + 2
    for (let b = 1; b <= batchCount; b++) {
      const randomSupplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)]
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 24 + 12)) // 12-36 months
      const qty = Math.floor(Math.random() * 400 + 100) // 100-500 units

      await prisma.inventoryBatch.create({
        data: {
          medicineId: medicine.id,
          batchNumber: `BATCH-${Date.now()}-${b}`,
          expiryDate,
          quantity: qty,
          originalQuantity: qty,
          purchasePrice: med.price * 0.7, // Cost price (30% margin)
          sellingPrice: med.price, // MRP
          supplierId: randomSupplier.id
        }
      })
    }

    console.log(`   ✓ Medicine: ${med.name} (${med.type}) - ₹${med.price}`)
  }
  console.log(`✅ Created ${MEDICINES.length} medicines with stock batches\n`)

  // ========================================
  // 6. CREATE LAB TESTS
  // ========================================
  console.log('🔬 Creating Lab Test Catalog...')
  for (const test of LAB_TESTS) {
    await prisma.labTestCatalog.upsert({
      where: { code: test.code },
      update: {},
      create: {
        name: test.name,
        code: test.code,
        category: test.category,
        price: test.price,
        normalRange: test.normalRange,
        unit: 'Varies',
        isActive: true
      }
    })
    console.log(`   ✓ ${test.name} (${test.code}) - ₹${test.price}`)
  }
  console.log(`✅ Created ${LAB_TESTS.length} lab tests\n`)

  // ========================================
  // 7. CREATE PATIENTS
  // ========================================
  console.log('👨‍👩‍👧‍👦 Creating Patients...')
  const patients = []

  for (let i = 1; i <= 50; i++) {
    const name = generateRandomName()
    const age = Math.floor(Math.random() * 60 + 18)
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - age)
    const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
    const email = `patient${i}@email.com`

    // Create User for patient
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        role: 'PATIENT',
        isActive: true
      }
    })

    // Create Patient record
    const patient = await prisma.patient.upsert({
      where: { patientId: `PAT${i.toString().padStart(4, '0')}` },
      update: {},
      create: {
        patientId: `PAT${i.toString().padStart(4, '0')}`,
        userId: user.id,
        dateOfBirth: dob,
        gender: gender as any,
        phone: generatePhoneNumber(),
        address: generateAddress(),
        bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][Math.floor(Math.random() * 8)],
        emergencyContact: generatePhoneNumber()
      }
    })
    patients.push(patient)
  }
  console.log(`✅ Created ${patients.length} patients\n`)

  // ========================================
  // 8. CREATE PAST APPOINTMENTS (COMPLETED)
  // ========================================
  console.log('📋 Creating Past Appointments (Last 7 Days)...')
  for (let i = 0; i < 30; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)]
    const doctor = doctors[Math.floor(Math.random() * doctors.length)]
    const daysAgo = Math.floor(Math.random() * 7 + 1)
    const appointmentDate = getRandomDate(daysAgo)

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: appointmentDate,
        appointmentTime: `${Math.floor(Math.random() * 8 + 10)}:00`, // 10 AM - 6 PM
        status: 'COMPLETED',
        reason: 'Follow-up consultation',
        diagnosis: DIAGNOSES[Math.floor(Math.random() * DIAGNOSES.length)],
        notes: 'Patient examined. Treatment advised.',
        prescription: 'Continue medications as prescribed. Follow up if symptoms persist.'
      }
    })
  }
  console.log(`✅ Created 30 completed appointments\n`)

  // ========================================
  // 9. CREATE TODAY'S OPD QUEUE
  // ========================================
  console.log('🚦 Creating Today\'s OPD Queue...')
  const today = new Date()
  
  // 10 PENDING (Waiting)
  for (let i = 0; i < 10; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)]
    const doctor = doctors[Math.floor(Math.random() * doctors.length)]

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: today,
        appointmentTime: `${Math.floor(Math.random() * 4 + 9)}:${['00', '15', '30', '45'][Math.floor(Math.random() * 4)]}`,
        status: 'PENDING',
        reason: 'General consultation'
      }
    })
  }
  console.log(`   ✓ 10 patients PENDING (in waiting area)`)

  // 5 IN_PROGRESS (Inside cabin)
  for (let i = 0; i < 5; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)]
    const doctor = doctors[Math.floor(Math.random() * doctors.length)]

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: today,
        appointmentTime: `${Math.floor(Math.random() * 3 + 10)}:${['00', '30'][Math.floor(Math.random() * 2)]}`,
        status: 'IN_PROGRESS',
        reason: 'Follow-up visit'
      }
    })
  }
  console.log(`   ✓ 5 patients IN_PROGRESS (consulting doctor)`)

  // 5 COMPLETED (Just finished today)
  for (let i = 0; i < 5; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)]
    const doctor = doctors[Math.floor(Math.random() * doctors.length)]

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: today,
        appointmentTime: `${Math.floor(Math.random() * 2 + 9)}:${['00', '30'][Math.floor(Math.random() * 2)]}`,
        status: 'COMPLETED',
        reason: 'New patient consultation',
        diagnosis: DIAGNOSES[Math.floor(Math.random() * DIAGNOSES.length)],
        notes: 'Patient examined. Stable condition.',
        prescription: 'Medication prescribed. Rest advised.'
      }
    })
  }
  console.log(`   ✓ 5 patients COMPLETED (finished today)`)
  console.log(`✅ Today's OPD queue created\n`)

  // ========================================
  // 10. CREATE IPD ADMISSIONS
  // ========================================
  console.log('🏥 Creating IPD Admissions...')
  
  const availableBeds = await prisma.bed.findMany({
    where: { 
      status: 'AVAILABLE',
      ward: { 
        OR: [
          { type: 'ICU' },
          { type: 'PRIVATE' }
        ]
      }
    },
    include: { ward: true },
    take: 5
  })

  for (let i = 0; i < 5; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)]
    const doctor = doctors[Math.floor(Math.random() * doctors.length)]
    const bed = availableBeds[i]
    
    if (!bed) continue

    const admissionDate = getRandomDate(Math.floor(Math.random() * 3 + 1)) // 1-3 days ago

    await prisma.iPDAdmission.create({
      data: {
        patientId: patient.id,
        bedId: bed.id,
        primaryDoctorId: doctor.id,
        admissionDate,
        status: 'ADMITTED',
        reason: DIAGNOSES[Math.floor(Math.random() * DIAGNOSES.length)],
        diagnosis: 'Under observation',
        initialDeposit: Math.floor(Math.random() * 20000 + 10000) // ₹10k-30k
      }
    })

    // Mark bed as OCCUPIED
    await prisma.bed.update({
      where: { id: bed.id },
      data: { status: 'OCCUPIED' }
    })

    console.log(`   ✓ ${patient.patientId} admitted to ${bed.bedNumber} (${bed.ward.name})`)
  }
  console.log(`✅ Created 5 IPD admissions\n`)

  console.log('✨ DATABASE SEEDING COMPLETED SUCCESSFULLY! ✨\n')
  console.log('📊 Summary:')
  console.log(`   • 1 Admin`)
  console.log(`   • ${doctors.length} Doctors`)
  console.log(`   • 2 Receptionists`)
  console.log(`   • 2 Pharmacists`)
  console.log(`   • ${WARDS.reduce((sum, w) => sum + w.bedCount, 0)} Beds in ${WARDS.length} Wards`)
  console.log(`   • ${MEDICINES.length} Medicines with Stock`)
  console.log(`   • ${LAB_TESTS.length} Lab Tests`)
  console.log(`   • ${patients.length} Patients`)
  console.log(`   • 30 Past Appointments (Completed)`)
  console.log(`   • 20 Today's Appointments (10 Pending, 5 In-Progress, 5 Completed)`)
  console.log(`   • 5 IPD Admissions (Active)`)
  console.log('\n🔐 Login Credentials:')
  console.log(`   Admin: admin@hospital.com / Admin123`)
  console.log(`   Doctor: doctor1@hospital.com / doctor123`)
  console.log(`   Reception: reception1@hospital.com / reception123`)
  console.log(`   Pharmacy: pharmacy1@hospital.com / pharmacy123`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
