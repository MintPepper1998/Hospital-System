import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...')
  console.log('⚠️  Keeping only the admin user (admin@hospital.com)\n')

  // First, find the admin user to preserve
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@hospital.com' }
  })

  if (!adminUser) {
    console.log('❌ Admin user not found! Aborting cleanup.')
    return
  }

  console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})\n`)

  // Delete in order to respect foreign key constraints
  // Start from the most dependent tables and work backwards

  console.log('🗑️  Deleting clinical & operational data...')
  
  // Ambulance module
  const r1 = await prisma.$executeRawUnsafe(`DELETE FROM "ambulance_staff_assignments"`)
  console.log(`   ✓ Ambulance staff assignments cleared`)
  const r1b = await prisma.$executeRawUnsafe(`DELETE FROM "ambulance_trips"`)
  console.log(`   ✓ Ambulance trips cleared`)
  const r1c = await prisma.$executeRawUnsafe(`DELETE FROM "ambulances"`)
  console.log(`   ✓ Ambulances cleared`)

  // Canteen module
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "canteen_meal_orders"`)
    console.log(`   ✓ Canteen meal orders cleared`)
    await prisma.$executeRawUnsafe(`DELETE FROM "canteen_patient_diets"`)
    console.log(`   ✓ Canteen patient diets cleared`)
    await prisma.$executeRawUnsafe(`DELETE FROM "canteen_menu_items"`)
    console.log(`   ✓ Canteen menu items cleared`)
  } catch (e) { console.log(`   ⏭️  Canteen tables skipped (may not exist)`) }

  // IPD Equipment
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "ipd_equipment_usage"`)
    console.log(`   ✓ IPD equipment usage cleared`)
    await prisma.$executeRawUnsafe(`DELETE FROM "equipment_items"`)
    console.log(`   ✓ Equipment items cleared`)
  } catch (e) { console.log(`   ⏭️  Equipment tables skipped`) }

  // IPD Lab & Pharmacy
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "ipd_lab_requests"`)
    console.log(`   ✓ IPD lab requests cleared`)
  } catch (e) { console.log(`   ⏭️  IPD lab requests skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "ipd_prescriptions"`)
    console.log(`   ✓ IPD prescriptions cleared`)
  } catch (e) { console.log(`   ⏭️  IPD prescriptions skipped`) }

  // Clinical notes
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "clinical_notes"`)
    console.log(`   ✓ Clinical notes cleared`)
  } catch (e) { console.log(`   ⏭️  Clinical notes skipped`) }

  // Discharge records
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "discharges"`)
    console.log(`   ✓ Discharge records cleared`)
  } catch (e) { console.log(`   ⏭️  Discharges skipped`) }

  // IPD Admissions
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "ipd_admissions"`)
    console.log(`   ✓ IPD admissions cleared`)
  } catch (e) { console.log(`   ⏭️  IPD admissions skipped`) }

  // OT & Surgery
  console.log('\n🗑️  Deleting OT & Surgery data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "surgery_team_members"`)
    console.log(`   ✓ Surgery team members cleared`)
  } catch (e) { console.log(`   ⏭️  Surgery team members skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "surgeries"`)
    console.log(`   ✓ Surgeries cleared`)
  } catch (e) { console.log(`   ⏭️  Surgeries skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "ot_schedules"`)
    console.log(`   ✓ OT schedules cleared`)
  } catch (e) { console.log(`   ⏭️  OT schedules skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "operations"`)
    console.log(`   ✓ Operations cleared`)
  } catch (e) { console.log(`   ⏭️  Operations skipped`) }

  // Insurance
  console.log('\n🗑️  Deleting insurance data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "pre_authorizations"`)
    console.log(`   ✓ Pre-authorizations cleared`)
  } catch (e) { console.log(`   ⏭️  Pre-authorizations skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "insurance_claims"`)
    console.log(`   ✓ Insurance claims cleared`)
  } catch (e) { console.log(`   ⏭️  Insurance claims skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "insurance_policies"`)
    console.log(`   ✓ Insurance policies cleared`)
  } catch (e) { console.log(`   ⏭️  Insurance policies skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "insurance_providers"`)
    console.log(`   ✓ Insurance providers cleared`)
  } catch (e) { console.log(`   ⏭️  Insurance providers skipped`) }

  // Lab
  console.log('\n🗑️  Deleting lab data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "lab_results"`)
    console.log(`   ✓ Lab results cleared`)
  } catch (e) { console.log(`   ⏭️  Lab results skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "lab_orders"`)
    console.log(`   ✓ Lab orders cleared`)
  } catch (e) { console.log(`   ⏭️  Lab orders skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "lab_requests"`)
    console.log(`   ✓ Lab requests cleared`)
  } catch (e) { console.log(`   ⏭️  Lab requests skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "lab_test_catalog"`)
    console.log(`   ✓ Lab test catalog cleared`)
  } catch (e) { console.log(`   ⏭️  Lab test catalog skipped`) }

  // Billing
  console.log('\n🗑️  Deleting billing data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "billing_items"`)
    console.log(`   ✓ Billing items cleared`)
  } catch (e) { console.log(`   ⏭️  Billing items skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "billings"`)
    console.log(`   ✓ Billings cleared`)
  } catch (e) { console.log(`   ⏭️  Billings skipped`) }

  // Prescriptions
  console.log('\n🗑️  Deleting prescription data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "prescription_items"`)
    console.log(`   ✓ Prescription items cleared`)
  } catch (e) { console.log(`   ⏭️  Prescription items skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "prescriptions"`)
    console.log(`   ✓ Prescriptions cleared`)
  } catch (e) { console.log(`   ⏭️  Prescriptions skipped`) }

  // Medical records
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "medical_records"`)
    console.log(`   ✓ Medical records cleared`)
  } catch (e) { console.log(`   ⏭️  Medical records skipped`) }

  // Appointments & Online Bookings
  console.log('\n🗑️  Deleting appointments...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "online_bookings"`)
    console.log(`   ✓ Online bookings cleared`)
  } catch (e) { console.log(`   ⏭️  Online bookings skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "appointments"`)
    console.log(`   ✓ Appointments cleared`)
  } catch (e) { console.log(`   ⏭️  Appointments skipped`) }

  // Patient documents & feedback
  console.log('\n🗑️  Deleting patient data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "patient_documents"`)
    console.log(`   ✓ Patient documents cleared`)
  } catch (e) { console.log(`   ⏭️  Patient documents skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "patient_feedbacks"`)
    console.log(`   ✓ Patient feedbacks cleared`)
  } catch (e) { console.log(`   ⏭️  Patient feedbacks skipped`) }

  // Patients
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "patients"`)
    console.log(`   ✓ Patients cleared`)
  } catch (e) { console.log(`   ⏭️  Patients skipped`) }

  // Pharmacy
  console.log('\n🗑️  Deleting pharmacy data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "pharmacy_sale_items"`)
    console.log(`   ✓ Pharmacy sale items cleared`)
  } catch (e) { console.log(`   ⏭️  Pharmacy sale items skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "pharmacy_sales"`)
    console.log(`   ✓ Pharmacy sales cleared`)
  } catch (e) { console.log(`   ⏭️  Pharmacy sales skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "medicine_batches"`)
    console.log(`   ✓ Medicine batches cleared`)
  } catch (e) { console.log(`   ⏭️  Medicine batches skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "medicines"`)
    console.log(`   ✓ Medicines cleared`)
  } catch (e) { console.log(`   ⏭️  Medicines skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "suppliers"`)
    console.log(`   ✓ Suppliers cleared`)
  } catch (e) { console.log(`   ⏭️  Suppliers skipped`) }

  // Wards & Beds
  console.log('\n🗑️  Deleting wards & beds...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "beds"`)
    console.log(`   ✓ Beds cleared`)
  } catch (e) { console.log(`   ⏭️  Beds skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "wards"`)
    console.log(`   ✓ Wards cleared`)
  } catch (e) { console.log(`   ⏭️  Wards skipped`) }

  // HR & Payroll
  console.log('\n🗑️  Deleting HR & payroll data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "salary_records"`)
    console.log(`   ✓ Salary records cleared`)
  } catch (e) { console.log(`   ⏭️  Salary records skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "employees"`)
    console.log(`   ✓ Employees cleared`)
  } catch (e) { console.log(`   ⏭️  Employees skipped`) }

  // Staff & attendance (except admin)
  console.log('\n🗑️  Deleting staff data...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "staff_attendance"`)
    console.log(`   ✓ Staff attendance cleared`)
  } catch (e) { console.log(`   ⏭️  Staff attendance skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "rosters"`)
    console.log(`   ✓ Rosters cleared`)
  } catch (e) { console.log(`   ⏭️  Rosters skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "doctor_schedules"`)
    console.log(`   ✓ Doctor schedules cleared`)
  } catch (e) { console.log(`   ⏭️  Doctor schedules skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "staff"`)
    console.log(`   ✓ Staff cleared`)
  } catch (e) { console.log(`   ⏭️  Staff skipped`) }

  // Audit logs & misc
  console.log('\n🗑️  Deleting audit logs & misc...')
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "audit_logs"`)
    console.log(`   ✓ Audit logs cleared`)
  } catch (e) { console.log(`   ⏭️  Audit logs skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "medical_camps"`)
    console.log(`   ✓ Medical camps cleared`)
  } catch (e) { console.log(`   ⏭️  Medical camps skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "verification_tokens"`)
    console.log(`   ✓ Verification tokens cleared`)
  } catch (e) { console.log(`   ⏭️  Verification tokens skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "sessions"`)
    console.log(`   ✓ Sessions cleared`)
  } catch (e) { console.log(`   ⏭️  Sessions skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "accounts"`)
    console.log(`   ✓ Accounts cleared`)
  } catch (e) { console.log(`   ⏭️  Accounts skipped`) }

  // Delete all users EXCEPT the admin
  console.log('\n🗑️  Deleting all non-admin users...')
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { not: adminUser.id }
    }
  })
  console.log(`   ✓ Deleted ${deletedUsers.count} users (kept admin)`)

  // Final verification
  console.log('\n📊 Final verification:')
  const remainingUsers = await prisma.user.findMany()
  console.log(`   Users remaining: ${remainingUsers.length}`)
  for (const u of remainingUsers) {
    console.log(`   → ${u.email} (${u.role})`)
  }

  console.log('\n✨ DATABASE CLEANUP COMPLETED! ✨')
  console.log('Only the admin user (admin@hospital.com) has been preserved.')
}

cleanDatabase()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
