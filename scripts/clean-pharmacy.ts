import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanPharmacy() {
  console.log('🧹 Starting pharmacy database cleanup...')

  // Delete in order to respect foreign key constraints
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
    // There may be IPD Prescriptions that reference Medicine
    await prisma.$executeRawUnsafe(`DELETE FROM "ipd_prescriptions"`)
    console.log(`   ✓ IPD Prescriptions cleared (to clear medicine references)`)
  } catch (e) { console.log(`   ⏭️  IPD Prescriptions skipped`) }
  
  try {
    // We should also delete inventory batches first before medicines
    await prisma.$executeRawUnsafe(`DELETE FROM "inventory_batches"`)
    console.log(`   ✓ Inventory batches cleared`)
  } catch (e) { console.log(`   ⏭️  Inventory batches skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "medicine_batches"`)
    console.log(`   ✓ Medicine batches cleared`)
  } catch (e) { console.log(`   ⏭️  Medicine batches skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "medicines"`)
    console.log(`   ✓ Medicines cleared`)
  } catch (e) { console.error(`   ❌  Failed to clear Medicines:`, e) }

  try {
    // Before we can delete suppliers, we might need to delete purchases
    await prisma.$executeRawUnsafe(`DELETE FROM "purchase_items"`)
    console.log(`   ✓ Purchase items cleared`)
  } catch (e) { console.log(`   ⏭️  Purchase items skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "purchase_invoices"`)
    console.log(`   ✓ Purchase invoices cleared`)
  } catch (e) { console.log(`   ⏭️  Purchase invoices skipped`) }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "suppliers"`)
    console.log(`   ✓ Suppliers cleared`)
  } catch (e) { console.error(`   ❌  Failed to clear Suppliers:`, e) }

  console.log('\n✨ PHARMACY CLEANUP COMPLETED! ✨')
}

cleanPharmacy()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
