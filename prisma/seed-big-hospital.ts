import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ===================== HELPERS =====================
const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomFloat = (min: number, max: number) => +(Math.random() * (max - min) + min).toFixed(2)
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }
const hoursAgo = (n: number) => { const d = new Date(); d.setHours(d.getHours() - n); return d }

const FIRST_NAMES_M = ['Rajesh','Amit','Suresh','Vijay','Arun','Ramesh','Sandeep','Manoj','Ravi','Kiran','Prakash','Ganesh','Ashok','Mohan','Vinod','Dinesh','Sanjay','Mahesh','Naveen','Abhishek','Siddharth','Arjun','Nikhil','Rohit','Aditya','Karthik','Vishal','Prashant','Deepak','Gopal','Bikram','Subhash','Tarun','Lalit','Harish','Rakesh','Pankaj','Jitendra','Umesh','Balaji']
const FIRST_NAMES_F = ['Priya','Sunita','Kavita','Meera','Anjali','Sneha','Pooja','Nisha','Divya','Deepa','Lakshmi','Rekha','Swati','Varsha','Asha','Shanti','Parvati','Gita','Radha','Usha','Kalpana','Malini','Savitri','Manju','Shalini','Vandana','Bharti','Madhuri','Anita','Seema','Neha','Ranjita','Smita','Geeta','Jyoti','Hemalata','Mamata','Supriya','Sarita','Padma']
const LAST_NAMES = ['Kumar','Sharma','Singh','Patel','Reddy','Rao','Nair','Iyer','Mehta','Shah','Gupta','Verma','Desai','Joshi','Pillai','Menon','Chatterjee','Banerjee','Kulkarni','Jain','Agarwal','Pandey','Sinha','Bose','Das','Mishra','Mohanty','Sahoo','Behera','Pradhan','Rout','Panda','Nayak','Swain','Parida','Jena','Senapati','Dalai','Tripathy','Mahapatra']
const CITIES = ['Bhubaneswar','Cuttack','Rourkela','Berhampur','Sambalpur','Puri','Balasore','Baripada','Angul','Jharsuguda']
const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-']

const DIAGNOSES_IPD = [
  'Acute Appendicitis','Pneumonia','Typhoid Fever','Dengue Hemorrhagic Fever','Diabetic Ketoacidosis',
  'Acute Myocardial Infarction','Congestive Heart Failure','Acute Pancreatitis','Cholelithiasis',
  'Intestinal Obstruction','Cellulitis','Pyelonephritis','Severe Malaria','Cerebrovascular Accident',
  'Fracture Femur','Ectopic Pregnancy','Placenta Previa','Herniated Disc','Chronic Kidney Disease',
  'COPD Exacerbation','Pleural Effusion','Liver Cirrhosis','Acute Gastroenteritis (Severe)'
]

const PROCEDURES = [
  { name: 'Appendectomy', category: 'General Surgery', cost: 35000, duration: 60 },
  { name: 'Cholecystectomy (Lap)', category: 'General Surgery', cost: 55000, duration: 90 },
  { name: 'Hernia Repair', category: 'General Surgery', cost: 30000, duration: 45 },
  { name: 'LSCS (Cesarean Section)', category: 'Obstetrics', cost: 45000, duration: 60 },
  { name: 'Total Knee Replacement', category: 'Orthopedics', cost: 180000, duration: 120 },
  { name: 'Open Reduction Internal Fixation', category: 'Orthopedics', cost: 60000, duration: 90 },
  { name: 'Coronary Angioplasty', category: 'Cardiology', cost: 200000, duration: 120 },
  { name: 'Cataract Surgery (Phaco)', category: 'Ophthalmology', cost: 25000, duration: 30 },
  { name: 'Tonsillectomy', category: 'ENT', cost: 20000, duration: 45 },
  { name: 'Mastectomy', category: 'Oncology', cost: 80000, duration: 120 },
  { name: 'Hysterectomy', category: 'Gynecology', cost: 50000, duration: 90 },
  { name: 'Kidney Stone Removal (PCNL)', category: 'Urology', cost: 70000, duration: 90 }
]

const INSURANCE_COMPANIES = [
  'Star Health Insurance','ICICI Lombard','HDFC ERGO','Bajaj Allianz','New India Assurance',
  'National Insurance Co.','United India Insurance','Max Bupa','Niva Bupa','Care Health Insurance',
  'Tata AIG','SBI General Insurance','Reliance General Insurance'
]

const MEDICINES_IPD = [
  { name: 'Inj. Ceftriaxone 1g', dosage: '1g IV', frequency: 'BD', duration: '5 days' },
  { name: 'Inj. Pantoprazole 40mg', dosage: '40mg IV', frequency: 'OD', duration: '3 days' },
  { name: 'Tab. Paracetamol 650mg', dosage: '650mg', frequency: 'TDS', duration: '5 days' },
  { name: 'Inj. Metronidazole 500mg', dosage: '500mg IV', frequency: 'TDS', duration: '5 days' },
  { name: 'Inj. Ondansetron 4mg', dosage: '4mg IV', frequency: 'SOS', duration: 'PRN' },
  { name: 'Tab. Metformin 500mg', dosage: '500mg', frequency: 'BD', duration: 'Ongoing' },
  { name: 'Tab. Amlodipine 5mg', dosage: '5mg', frequency: 'OD', duration: 'Ongoing' },
  { name: 'Inj. Insulin Glargine', dosage: '10 units SC', frequency: 'HS', duration: 'Ongoing' },
  { name: 'Tab. Aspirin 75mg', dosage: '75mg', frequency: 'OD', duration: 'Ongoing' },
  { name: 'Inj. Enoxaparin 40mg', dosage: '40mg SC', frequency: 'OD', duration: '7 days' },
  { name: 'Tab. Atorvastatin 20mg', dosage: '20mg', frequency: 'HS', duration: 'Ongoing' },
  { name: 'Inj. Tramadol 50mg', dosage: '50mg IV', frequency: 'BD', duration: '3 days' }
]

function genName(gender: 'MALE' | 'FEMALE') {
  const first = gender === 'MALE' ? randomFrom(FIRST_NAMES_M) : randomFrom(FIRST_NAMES_F)
  return `${first} ${randomFrom(LAST_NAMES)}`
}

function genPhone() {
  return `${randomInt(7000000000, 9999999999)}`
}

let billCounter = 1000
function nextBillNumber() {
  billCounter++
  return `BILL-${new Date().getFullYear()}-${billCounter.toString().padStart(5, '0')}`
}

// ===================== MAIN =====================
async function main() {
  console.log('\n🏥 ═══════════════════════════════════════════════')
  console.log('   SHREE KAMAL HOSPITAL — BIG DATA SEEDER')
  console.log('   Making the system look like a busy 200-bed hospital')
  console.log('═══════════════════════════════════════════════════\n')

  // Get existing data
  const existingDoctors = await prisma.staff.findMany({
    where: { user: { role: 'DOCTOR' } },
    include: { user: true }
  })
  const existingTheaters = await prisma.operationTheater.findMany()
  const existingLabTests = await prisma.labTestCatalog.findMany()

  if (existingDoctors.length === 0) {
    console.log('❌ No doctors found! Run the base seed first: npx prisma db seed')
    return
  }

  console.log(`📋 Found ${existingDoctors.length} doctors, ${existingTheaters.length} theaters, ${existingLabTests.length} lab tests\n`)

  // ========================================
  // 1. ADD MORE NURSES & LAB TECHNICIANS
  // ========================================
  console.log('👩‍⚕️ Creating Nurses & Lab Technicians...')
  const nurseNames = ['Sunita Behera','Mamata Jena','Jyoti Rath','Sarita Mohapatra','Priyanka Sahoo','Ranjita Swain','Smita Parida','Geeta Nayak','Anita Das','Hemalata Rout']
  for (let i = 0; i < nurseNames.length; i++) {
    const email = `nurse${i + 1}@hospital-erp.internal`
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email, password: await bcrypt.hash('nurse123', 10),
        name: nurseNames[i], role: 'NURSE', isActive: true
      }
    }).then(async u => {
      await prisma.staff.upsert({
        where: { employeeId: `NRS${(i + 1).toString().padStart(3, '0')}` },
        update: {},
        create: {
          employeeId: `NRS${(i + 1).toString().padStart(3, '0')}`,
          userId: u.id, department: 'Nursing', designation: 'Staff Nurse',
          phone: genPhone()
        }
      })
    })
  }

  const labTechNames = ['Bikram Das','Tarun Mishra','Lalit Pradhan']
  for (let i = 0; i < labTechNames.length; i++) {
    const email = `labtech${i + 1}@hospital-erp.internal`
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email, password: await bcrypt.hash('lab123', 10),
        name: labTechNames[i], role: 'LAB_TECHNICIAN', isActive: true
      }
    }).then(async u => {
      await prisma.staff.upsert({
        where: { employeeId: `LAB${(i + 1).toString().padStart(3, '0')}` },
        update: {},
        create: {
          employeeId: `LAB${(i + 1).toString().padStart(3, '0')}`,
          userId: u.id, department: 'Pathology', designation: 'Lab Technician',
          phone: genPhone()
        }
      })
    })
  }
  console.log(`   ✅ 10 nurses + 3 lab technicians created\n`)

  // ========================================
  // 2. CREATE 100+ MORE PATIENTS
  // ========================================
  console.log('👨‍👩‍👧‍👦 Creating 120 additional patients...')
  const newPatients: any[] = []
  const existingPatientCount = await prisma.patient.count()
  
  for (let i = 0; i < 120; i++) {
    const gender: 'MALE' | 'FEMALE' = Math.random() > 0.45 ? 'MALE' : 'FEMALE'
    const name = genName(gender)
    const age = randomInt(1, 85)
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - age)
    const idx = existingPatientCount + i + 1
    const email = `patient-big-${idx}@hospital-erp.internal`
    const patientId = `PAT-2026-${idx.toString().padStart(4, '0')}`
    const isBsky = Math.random() < 0.15 // 15% BSKY patients

    try {
      const user = await prisma.user.create({
        data: { email, name, role: 'PATIENT', isActive: true }
      })
      const patient = await prisma.patient.create({
        data: {
          patientId, userId: user.id, dateOfBirth: dob,
          gender, phone: genPhone(), address: `${randomInt(1, 500)}, ${randomFrom(['Main Road','Station Road','College Road','Temple Road','Market Road','NH-16'])}, ${randomFrom(CITIES)}`,
          bloodGroup: randomFrom(BLOOD_GROUPS),
          emergencyContact: genPhone(),
          city: randomFrom(CITIES), state: 'Odisha', pincode: `7${randomInt(50, 70)}${randomInt(100, 999).toString().padStart(3, '0')}`,
          isBsky, bskyNumber: isBsky ? `BSKY-OD-${randomInt(100000, 999999)}` : null,
          nationality: 'Indian'
        }
      })
      newPatients.push(patient)
    } catch (e) {
      // skip duplicates
    }
  }
  console.log(`   ✅ ${newPatients.length} new patients created\n`)

  // Gather ALL patients
  const allPatients = await prisma.patient.findMany({ include: { user: true } })
  const allDoctors = existingDoctors

  // ========================================
  // 3. CREATE OPERATION THEATERS (if missing)
  // ========================================
  let theaters = existingTheaters
  if (theaters.length === 0) {
    console.log('🔧 Creating Operation Theaters...')
    const theaterConfigs = [
      { name: 'Main OT 1', type: 'MAJOR', floor: '2nd Floor' },
      { name: 'Main OT 2', type: 'MAJOR', floor: '2nd Floor' },
      { name: 'Minor OT', type: 'MINOR', floor: '1st Floor' },
      { name: 'Emergency OT', type: 'EMERGENCY', floor: 'Ground Floor' }
    ]
    for (const tc of theaterConfigs) {
      const t = await prisma.operationTheater.create({
        data: { name: tc.name, type: tc.type as any, floor: tc.floor, isOperational: true }
      })
      theaters.push(t)
    }
    console.log(`   ✅ ${theaters.length} theaters created\n`)
  }

  // ========================================
  // 4. CREATE PAST 30-DAY APPOINTMENTS (200+)
  // ========================================
  console.log('📋 Creating 250 past appointments (last 30 days)...')
  for (let i = 0; i < 250; i++) {
    const patient = randomFrom(allPatients)
    const doctor = randomFrom(allDoctors)
    const day = randomInt(1, 30)
    const hour = randomInt(9, 17)
    const apptDate = daysAgo(day)
    apptDate.setHours(hour, randomFrom([0, 15, 30, 45]), 0, 0)

    try {
      await prisma.appointment.create({
        data: {
          patientId: patient.id, doctorId: doctor.id,
          appointmentDate: apptDate, appointmentTime: `${hour}:${randomFrom(['00', '15', '30', '45'])}`,
          status: randomFrom(['COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
          reason: randomFrom(['Routine checkup','Follow-up','Fever and body ache','Chest pain','Abdominal pain','Joint pain','Skin rash','Diabetes follow-up','BP monitoring','Post-surgery review']),
          diagnosis: randomFrom(DIAGNOSES_IPD),
          notes: 'Patient examined. Vitals stable. Treatment advised.',
          chiefComplaint: randomFrom(['Fever x 3 days','Cough and cold','Abdominal pain','Chest discomfort','Joint pain','Difficulty breathing','Headache x 1 week','Dizziness','Back pain','Palpitations']),
          pulse: `${randomInt(60, 100)} bpm`, temperature: `${randomFloat(97.5, 100.4)}°F`,
          weight: `${randomInt(45, 95)} kg`, bloodPressure: `${randomInt(110, 160)}/${randomInt(70, 95)}`,
          spo2: `${randomInt(94, 100)}%`
        }
      })
    } catch (e) {}
  }
  console.log(`   ✅ Done\n`)

  // ========================================
  // 5. CREATE BILLINGS (OPD + Lab + Pharmacy)
  // ========================================
  console.log('💰 Creating 200 billing records...')
  const financialAccount = await prisma.financialAccount.findFirst() || await prisma.financialAccount.create({
    data: { name: 'Main Cash Drawer', type: 'CASH', openingBalance: 50000, currentBalance: 500000 }
  })
  const bankAccount = await prisma.financialAccount.findFirst({ where: { type: 'BANK' } }) || await prisma.financialAccount.create({
    data: { name: 'HDFC Current A/c 1234', type: 'BANK', openingBalance: 200000, currentBalance: 2500000 }
  })

  for (let i = 0; i < 200; i++) {
    const patient = randomFrom(allPatients)
    const day = randomInt(0, 30)
    const billDate = daysAgo(day)
    const type = randomFrom(['OPD', 'OPD', 'PHARMACY', 'PHARMACY', 'LABORATORY']) as any
    let amount: number
    if (type === 'OPD') amount = randomFrom([300, 400, 500, 600])
    else if (type === 'LABORATORY') amount = randomInt(200, 2000)
    else amount = randomInt(50, 1500)

    const billNum = nextBillNumber()
    const method = randomFrom(['CASH', 'CASH', 'CASH', 'UPI', 'CARD'])

    try {
      const bill = await prisma.billing.create({
        data: {
          billNumber: billNum, patientId: patient.id,
          type, billDate, totalAmount: amount, netAmount: amount,
          paidAmount: amount, balanceAmount: 0, status: 'PAID',
          paymentMethod: method,
          items: {
            create: [{
              description: type === 'OPD' ? 'Consultation Fee' : type === 'LABORATORY' ? 'Lab Test' : 'Medicines',
              quantity: 1, unitPrice: amount, amount, gstRate: 0, gstAmount: 0, totalAmount: amount
            }]
          },
          payments: {
            create: [{
              amount, method: method as any, paymentDate: billDate
            }]
          }
        }
      })

      // Create financial transaction
      await prisma.transaction.create({
        data: {
          date: billDate, accountId: method === 'CASH' ? financialAccount.id : bankAccount.id,
          type: 'INCOME', amount, category: 'PATIENT_BILL',
          paymentMethod: method, referenceId: bill.id,
          description: `${type} Bill - ${patient.patientId}`
        }
      })
    } catch (e) {}
  }
  console.log(`   ✅ 200 bills with payments + financial transactions\n`)

  // ========================================
  // 6. CREATE IPD ADMISSIONS (15 active + 30 discharged)
  // ========================================
  console.log('🏥 Creating IPD Admissions (15 active + 30 discharged)...')
  
  const availableBeds = await prisma.bed.findMany({
    where: { status: 'AVAILABLE' },
    include: { ward: true },
    take: 45
  })

  const admissions: any[] = []
  
  // 30 DISCHARGED admissions (past month)
  for (let i = 0; i < Math.min(30, availableBeds.length); i++) {
    const patient = randomFrom(allPatients)
    const doctor = randomFrom(allDoctors)
    const bed = availableBeds[i]
    if (!bed) continue
    
    const admitDays = randomInt(10, 30)
    const stayDays = randomInt(3, 8)
    const admitDate = daysAgo(admitDays)
    const dischargeDate = daysAgo(admitDays - stayDays)
    const bedCharge = bed.pricePerDay * stayDays
    const labCharge = randomInt(1000, 5000)
    const pharmaCharge = randomInt(2000, 8000)
    const totalBill = bedCharge + labCharge + pharmaCharge
    const diag = randomFrom(DIAGNOSES_IPD)

    try {
      const admission = await prisma.iPDAdmission.create({
        data: {
          patientId: patient.id, bedId: bed.id, primaryDoctorId: doctor.id,
          admissionDate: admitDate, dischargeDate,
          status: 'DISCHARGED', reason: diag, diagnosis: diag,
          initialDeposit: randomInt(10000, 30000),
          totalBedCharges: bedCharge, totalLabCharges: labCharge,
          totalPharmacyCharges: pharmaCharge, totalBillAmount: totalBill,
          amountPaid: totalBill, balanceDue: 0,
          dischargeSummary: `Patient admitted with ${diag}. Treated with IV antibiotics and supportive care. Condition improved. Discharged in stable condition with follow-up in 1 week.`,
          dischargeType: 'NORMAL',
          finalDiagnosis: diag,
          courseInHospital: 'Patient was treated with appropriate medications. Vitals monitored regularly. Gradual improvement noted. Afebrile for 48 hours before discharge.',
          conditionAtDischarge: 'Stable, afebrile, tolerating oral feeds',
          adviceOnDischarge: 'Continue medications as prescribed. Follow up after 1 week. Come to ER if fever recurs.',
          followUpDate: new Date(dischargeDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          isBskyAdmission: patient.isBsky || false,
          discharge: {
            create: {
              dischargeDate, type: 'NORMAL',
              summary: `Discharged after ${stayDays} days. ${diag} resolved.`,
              totalBillAmount: totalBill, amountPaid: totalBill, balanceDue: 0
            }
          },
          clinicalNotes: {
            create: Array.from({ length: stayDays }, (_, d) => ({
              authorId: doctor.id,
              authorName: doctor.user.name,
              date: new Date(admitDate.getTime() + d * 24 * 60 * 60 * 1000),
              note: d === 0
                ? `Day 1: Patient admitted. ${diag}. Started on IV antibiotics. NPO.`
                : d === stayDays - 1
                  ? `Day ${d + 1}: Patient afebrile for 24h. Tolerating oral feeds. Planned for discharge.`
                  : `Day ${d + 1}: Patient improving. Vitals stable. Continue current treatment.`,
              bp: `${randomInt(110, 140)}/${randomInt(70, 90)} mmHg`,
              pulse: `${randomInt(68, 98)} bpm`,
              temperature: d < 2 ? `${randomFloat(99.0, 101.5)}°F` : `${randomFloat(97.8, 98.8)}°F`,
              spO2: `${randomInt(95, 99)}%`,
              respiratoryRate: `${randomInt(16, 22)}/min`
            }))
          },
          ipdPrescriptions: {
            create: randomFrom(MEDICINES_IPD) ? [
              ...Array.from({ length: randomInt(2, 5) }, () => {
                const med = randomFrom(MEDICINES_IPD)
                return {
                  prescribedById: doctor.id, prescribedByName: doctor.user.name,
                  medicineName: med.name, dosage: med.dosage, frequency: med.frequency,
                  duration: med.duration, status: 'ACTIVE' as const, pharmacyStatus: 'DISPENSED' as const,
                  dispensedAt: admitDate
                }
              })
            ] : []
          }
        }
      })
      admissions.push(admission)
    } catch (e) {}
  }

  // 15 ACTIVE admissions (currently admitted)
  const freshBeds = await prisma.bed.findMany({
    where: { status: 'AVAILABLE' },
    include: { ward: true },
    take: 15
  })

  for (let i = 0; i < Math.min(15, freshBeds.length); i++) {
    const patient = randomFrom(allPatients)
    const doctor = randomFrom(allDoctors)
    const bed = freshBeds[i]
    if (!bed) continue

    const admitDays = randomInt(1, 5)
    const admitDate = daysAgo(admitDays)
    const diag = randomFrom(DIAGNOSES_IPD)

    try {
      const admission = await prisma.iPDAdmission.create({
        data: {
          patientId: patient.id, bedId: bed.id, primaryDoctorId: doctor.id,
          admissionDate: admitDate, status: 'ADMITTED',
          reason: diag, diagnosis: diag,
          initialDeposit: randomInt(10000, 50000),
          totalBedCharges: bed.pricePerDay * admitDays,
          isBskyAdmission: patient.isBsky || false,
          clinicalNotes: {
            create: Array.from({ length: admitDays }, (_, d) => ({
              authorId: doctor.id,
              authorName: doctor.user.name,
              date: new Date(admitDate.getTime() + d * 24 * 60 * 60 * 1000),
              note: d === 0
                ? `Admission Note: ${diag}. Patient presents with acute symptoms. Started empirical antibiotics. Investigations ordered.`
                : `Day ${d + 1}: Patient ${randomFrom(['showing improvement','stable','responding to treatment','vitals improving'])}. ${randomFrom(['Continue current Rx','Modify antibiotics','Add supportive care','Review lab results'])}.`,
              bp: `${randomInt(110, 150)}/${randomInt(70, 95)} mmHg`,
              pulse: `${randomInt(70, 100)} bpm`,
              temperature: `${randomFloat(98.0, 100.8)}°F`,
              spO2: `${randomInt(94, 99)}%`,
              respiratoryRate: `${randomInt(16, 24)}/min`
            }))
          },
          ipdPrescriptions: {
            create: Array.from({ length: randomInt(3, 6) }, () => {
              const med = randomFrom(MEDICINES_IPD)
              return {
                prescribedById: doctor.id, prescribedByName: doctor.user.name,
                medicineName: med.name, dosage: med.dosage, frequency: med.frequency,
                duration: med.duration, status: 'ACTIVE' as const, pharmacyStatus: 'DISPENSED' as const,
                dispensedAt: admitDate
              }
            })
          },
          ipdLabRequests: {
            create: Array.from({ length: randomInt(2, 4) }, () => {
              const test = existingLabTests.length > 0 ? randomFrom(existingLabTests) : null
              return {
                testCatalogId: test?.id,
                orderedById: doctor.id, orderedByName: doctor.user.name,
                type: randomFrom(['PATHOLOGY', 'PATHOLOGY', 'RADIOLOGY']) as any,
                testName: test?.name || randomFrom(['CBC', 'LFT', 'KFT', 'Blood Sugar', 'X-Ray Chest']),
                status: randomFrom(['COMPLETED', 'COMPLETED', 'PENDING']) as any,
                isUrgent: Math.random() < 0.2,
                result: 'Within normal limits. No significant abnormality.',
                completedAt: Math.random() < 0.7 ? daysAgo(randomInt(0, admitDays)) : null
              }
            })
          }
        }
      })

      // Mark bed as occupied
      await prisma.bed.update({ where: { id: bed.id }, data: { status: 'OCCUPIED' } })
      admissions.push(admission)
    } catch (e) {}
  }
  console.log(`   ✅ ${admissions.length} IPD admissions created\n`)

  // ========================================
  // 7. CREATE SURGERIES (20 completed + 5 today)
  // ========================================
  console.log('🔪 Creating Surgeries...')

  // 20 Completed surgeries in last 30 days
  for (let i = 0; i < 20; i++) {
    const patient = randomFrom(allPatients)
    const surgeon = randomFrom(allDoctors)
    const theater = randomFrom(theaters)
    const proc = randomFrom(PROCEDURES)
    const day = randomInt(3, 30)
    const schedDate = daysAgo(day)
    schedDate.setHours(randomInt(8, 14), 0, 0, 0)

    try {
      await prisma.surgery.create({
        data: {
          patientId: patient.id, leadSurgeonId: surgeon.id, theaterId: theater.id,
          procedureName: proc.name, category: proc.category,
          scheduledDate: schedDate, durationMinutes: proc.duration,
          actualStartTime: schedDate,
          actualEndTime: new Date(schedDate.getTime() + proc.duration * 60000),
          status: 'COMPLETED', pacStatus: 'FIT',
          pacNotes: 'Patient fit for surgery under general anesthesia.',
          diagnosis: randomFrom(DIAGNOSES_IPD),
          findings: 'Intra-operative findings consistent with pre-op diagnosis. No unexpected findings.',
          procedureNotes: `${proc.name} performed successfully. No complications.`,
          estimatedCost: proc.cost, actualCost: proc.cost,
          surgeryCharge: proc.cost, paymentStatus: 'PAID',
          paymentMethod: randomFrom(['CASH', 'UPI', 'CARD', 'INSURANCE']),
          isEmergency: Math.random() < 0.1
        }
      })
    } catch (e) {}
  }

  // 5 Scheduled for today
  const todayDate = new Date()
  for (let i = 0; i < 5; i++) {
    const patient = randomFrom(allPatients)
    const surgeon = randomFrom(allDoctors)
    const theater = theaters[i % theaters.length]
    const proc = randomFrom(PROCEDURES)
    const schedDate = new Date(todayDate)
    schedDate.setHours(9 + i * 2, 0, 0, 0)

    try {
      await prisma.surgery.create({
        data: {
          patientId: patient.id, leadSurgeonId: surgeon.id, theaterId: theater.id,
          procedureName: proc.name, category: proc.category,
          scheduledDate: schedDate, durationMinutes: proc.duration,
          status: i < 2 ? 'COMPLETED' : i === 2 ? 'IN_PROGRESS' : 'SCHEDULED',
          pacStatus: 'FIT', diagnosis: randomFrom(DIAGNOSES_IPD),
          estimatedCost: proc.cost, surgeryCharge: proc.cost,
          paymentStatus: 'PAID',
          isEmergency: false
        }
      })
    } catch (e) {}
  }
  console.log(`   ✅ 25 surgeries created\n`)

  // ========================================
  // 8. CREATE INSURANCE POLICIES
  // ========================================
  console.log('🛡️ Creating Insurance Policies...')
  let policyCount = 0
  
  for (let i = 0; i < 40; i++) {
    const patient = randomFrom(allPatients)
    const company = randomFrom(INSURANCE_COMPANIES)
    const isBsky = patient.isBsky
    const schemeType = isBsky ? 'BSKY' : randomFrom(['PRIVATE', 'PRIVATE', 'PMJAY', 'CGHS']) as any
    const policyNum = `${company.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${randomInt(100000, 999999)}`
    const coverage = schemeType === 'BSKY' ? 500000 : schemeType === 'PMJAY' ? 500000 : randomInt(200000, 1500000)

    try {
      await prisma.insurancePolicy.create({
        data: {
          patientId: patient.id, policyNumber: policyNum,
          schemeType, providerName: isBsky ? 'Biju Swasthya Kalyan Yojana' : company,
          coverageAmount: coverage, balanceAvailable: coverage,
          startDate: daysAgo(randomInt(30, 365)),
          endDate: new Date(new Date().getTime() + randomInt(180, 365) * 24 * 60 * 60 * 1000),
          isActive: true, verificationStatus: 'VERIFIED',
          verifiedAt: daysAgo(randomInt(1, 30)),
          bskyCardNumber: isBsky ? patient.bskyNumber : null,
          isNetworkHospital: true,
          copayPercentage: schemeType === 'PRIVATE' ? randomFrom([0, 10, 20]) : 0,
          roomRentCap: schemeType === 'PRIVATE' ? randomFrom([2000, 3000, 5000, null]) : null
        }
      })
      policyCount++
    } catch (e) {}
  }
  console.log(`   ✅ ${policyCount} insurance policies created\n`)

  // ========================================
  // 9. CREATE EXPENSE TRANSACTIONS
  // ========================================
  console.log('📊 Creating Financial Transactions (Expenses)...')
  const expenseCategories = [
    { cat: 'SALARY', desc: 'Staff Salary Payment', range: [15000, 80000] },
    { cat: 'UTILITY', desc: 'Electricity Bill', range: [20000, 50000] },
    { cat: 'UTILITY', desc: 'Water Bill', range: [3000, 8000] },
    { cat: 'PURCHASE', desc: 'Pharmacy Stock Purchase', range: [50000, 200000] },
    { cat: 'PURCHASE', desc: 'Surgical Supplies', range: [10000, 50000] },
    { cat: 'UTILITY', desc: 'Internet & Phone', range: [5000, 15000] },
    { cat: 'PURCHASE', desc: 'Lab Reagents', range: [15000, 40000] },
    { cat: 'UTILITY', desc: 'Laundry Services', range: [8000, 20000] },
    { cat: 'UTILITY', desc: 'Security Services', range: [25000, 40000] },
    { cat: 'PURCHASE', desc: 'Oxygen Cylinders', range: [10000, 30000] }
  ]

  for (let day = 0; day < 30; day++) {
    const txCount = randomInt(2, 5)
    for (let t = 0; t < txCount; t++) {
      const exp = randomFrom(expenseCategories)
      const amount = randomInt(exp.range[0], exp.range[1])
      try {
        await prisma.transaction.create({
          data: {
            date: daysAgo(day), accountId: randomFrom([financialAccount.id, bankAccount.id]),
            type: 'EXPENSE', amount, category: exp.cat,
            paymentMethod: randomFrom(['CASH', 'BANK_TRANSFER', 'UPI']),
            description: `${exp.desc} - ${daysAgo(day).toLocaleDateString('en-IN')}`
          }
        })
      } catch (e) {}
    }
  }
  console.log(`   ✅ ~100 expense transactions created\n`)

  // ========================================
  // 10. CREATE TODAY'S OPD QUEUE (Fresh)
  // ========================================
  console.log('🚦 Creating today\'s fresh OPD queue...')
  const today = new Date()
  
  // 15 waiting, 3 in-progress, 8 completed
  for (let i = 0; i < 26; i++) {
    const patient = randomFrom(allPatients)
    const doctor = randomFrom(allDoctors)
    const hour = 9 + Math.floor(i / 3)
    const status = i < 8 ? 'COMPLETED' : i < 11 ? 'IN_PROGRESS' : 'PENDING'

    try {
      await prisma.appointment.create({
        data: {
          patientId: patient.id, doctorId: doctor.id,
          appointmentDate: today,
          appointmentTime: `${hour}:${randomFrom(['00', '15', '30', '45'])}`,
          status: status as any,
          reason: randomFrom(['Routine checkup','Follow-up','Fever','Chest pain','Joint pain','Headache','Diabetes review','BP monitoring']),
          chiefComplaint: status === 'COMPLETED' ? randomFrom(['Fever x 3 days','Cough and cold','Body pain','Gastric issues']) : undefined,
          diagnosis: status === 'COMPLETED' ? randomFrom(DIAGNOSES_IPD) : undefined,
          pulse: status !== 'PENDING' ? `${randomInt(68, 98)} bpm` : undefined,
          temperature: status !== 'PENDING' ? `${randomFloat(97.8, 99.5)}°F` : undefined,
          bloodPressure: status !== 'PENDING' ? `${randomInt(110, 145)}/${randomInt(70, 90)}` : undefined,
          spo2: status !== 'PENDING' ? `${randomInt(95, 99)}%` : undefined
        }
      })
    } catch (e) {}
  }
  console.log(`   ✅ 26 appointments for today (8 done, 3 active, 15 waiting)\n`)

  // ========================================
  // SUMMARY
  // ========================================
  const counts = {
    users: await prisma.user.count(),
    patients: await prisma.patient.count(),
    doctors: await prisma.staff.count({ where: { user: { role: 'DOCTOR' } } }),
    nurses: await prisma.staff.count({ where: { user: { role: 'NURSE' } } }),
    appointments: await prisma.appointment.count(),
    admissions: await prisma.iPDAdmission.count(),
    activeAdmissions: await prisma.iPDAdmission.count({ where: { status: 'ADMITTED' } }),
    surgeries: await prisma.surgery.count(),
    bills: await prisma.billing.count(),
    policies: await prisma.insurancePolicy.count(),
    beds: await prisma.bed.count(),
    occupiedBeds: await prisma.bed.count({ where: { status: 'OCCUPIED' } }),
    clinicalNotes: await prisma.clinicalNote.count(),
    transactions: await prisma.transaction.count()
  }

  console.log('\n🎉 ═══════════════════════════════════════════════')
  console.log('   SEEDING COMPLETE — HOSPITAL IS NOW BUSY!')
  console.log('═══════════════════════════════════════════════════')
  console.log(`
   👤 Total Users:          ${counts.users}
   👨‍⚕️ Doctors:              ${counts.doctors}
   👩‍⚕️ Nurses:               ${counts.nurses}
   🧑‍🤝‍🧑 Patients:             ${counts.patients}
   📋 Total Appointments:   ${counts.appointments}
   🏥 IPD Admissions:       ${counts.admissions} (${counts.activeAdmissions} active)
   🛏️ Beds:                 ${counts.beds} (${counts.occupiedBeds} occupied)
   🔪 Surgeries:            ${counts.surgeries}
   💰 Bills:                ${counts.bills}
   🛡️ Insurance Policies:   ${counts.policies}
   📝 Clinical Notes:       ${counts.clinicalNotes}
   💳 Transactions:         ${counts.transactions}
  `)
}

main()
  .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
