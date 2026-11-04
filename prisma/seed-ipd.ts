/**
 * IPD Seeding Script
 * Run with: npx ts-node prisma/seed-ipd.ts
 * Or add to package.json scripts: "seed:ipd": "ts-node prisma/seed-ipd.ts"
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedIPD() {
  console.log('🏥 Starting IPD seeding...\n')

  // Check if wards already exist
  const existingWards = await prisma.ward.count()
  if (existingWards > 0) {
    console.log(`⚠️  ${existingWards} wards already exist. Skipping ward creation.`)
    console.log('   To re-seed, delete existing wards first.\n')
  } else {
    // Create Wards
    console.log('📋 Creating Wards...')
    
    const generalWard = await prisma.ward.create({
      data: {
        name: 'General Ward',
        type: 'GENERAL',
        floor: 'Ground Floor',
        capacity: 10,
        description: 'General ward for routine patient care',
        isActive: true,
      },
    })
    console.log(`   ✅ Created: ${generalWard.name} (ID: ${generalWard.id})`)

    const icuWard = await prisma.ward.create({
      data: {
        name: 'ICU',
        type: 'ICU',
        floor: '1st Floor',
        capacity: 5,
        description: 'Intensive Care Unit for critical patients',
        isActive: true,
      },
    })
    console.log(`   ✅ Created: ${icuWard.name} (ID: ${icuWard.id})`)

    const privateWard = await prisma.ward.create({
      data: {
        name: 'Private Rooms',
        type: 'PRIVATE',
        floor: '2nd Floor',
        capacity: 8,
        description: 'Private rooms with attached bathroom and AC',
        isActive: true,
      },
    })
    console.log(`   ✅ Created: ${privateWard.name} (ID: ${privateWard.id})`)

    const hduWard = await prisma.ward.create({
      data: {
        name: 'HDU',
        type: 'HDU',
        floor: '1st Floor',
        capacity: 4,
        description: 'High Dependency Unit - step-down from ICU',
        isActive: true,
      },
    })
    console.log(`   ✅ Created: ${hduWard.name} (ID: ${hduWard.id})`)

    // Create Beds
    console.log('\n🛏️  Creating Beds...')

    // General Ward Beds (5 beds)
    const generalBeds = [
      { bedNumber: 'G-101', pricePerDay: 500, features: 'Fan, Shared Bathroom' },
      { bedNumber: 'G-102', pricePerDay: 500, features: 'Fan, Shared Bathroom' },
      { bedNumber: 'G-103', pricePerDay: 600, features: 'Fan, Oxygen Point' },
      { bedNumber: 'G-104', pricePerDay: 600, features: 'Fan, Oxygen Point' },
      { bedNumber: 'G-105', pricePerDay: 700, features: 'AC, Oxygen Point' },
    ]

    for (const bed of generalBeds) {
      await prisma.bed.create({
        data: {
          wardId: generalWard.id,
          bedNumber: bed.bedNumber,
          pricePerDay: bed.pricePerDay,
          status: 'AVAILABLE',
          features: bed.features,
        },
      })
    }
    console.log(`   ✅ Created ${generalBeds.length} beds in General Ward`)

    // ICU Beds (3 beds)
    const icuBeds = [
      { bedNumber: 'ICU-01', pricePerDay: 5000, features: 'Ventilator, Monitor, Central Oxygen' },
      { bedNumber: 'ICU-02', pricePerDay: 5000, features: 'Ventilator, Monitor, Central Oxygen' },
      { bedNumber: 'ICU-03', pricePerDay: 6000, features: 'Ventilator, Monitor, Dialysis Ready' },
    ]

    for (const bed of icuBeds) {
      await prisma.bed.create({
        data: {
          wardId: icuWard.id,
          bedNumber: bed.bedNumber,
          pricePerDay: bed.pricePerDay,
          status: 'AVAILABLE',
          features: bed.features,
        },
      })
    }
    console.log(`   ✅ Created ${icuBeds.length} beds in ICU`)

    // Private Room Beds (4 beds)
    const privateBeds = [
      { bedNumber: 'PVT-201', pricePerDay: 2500, features: 'AC, TV, Attached Bath, Sofa' },
      { bedNumber: 'PVT-202', pricePerDay: 2500, features: 'AC, TV, Attached Bath, Sofa' },
      { bedNumber: 'PVT-203', pricePerDay: 3000, features: 'AC, TV, Attached Bath, Fridge, Sofa' },
      { bedNumber: 'PVT-204', pricePerDay: 3500, features: 'Deluxe Suite - AC, TV, Kitchen, Living Area' },
    ]

    for (const bed of privateBeds) {
      await prisma.bed.create({
        data: {
          wardId: privateWard.id,
          bedNumber: bed.bedNumber,
          pricePerDay: bed.pricePerDay,
          status: 'AVAILABLE',
          features: bed.features,
        },
      })
    }
    console.log(`   ✅ Created ${privateBeds.length} beds in Private Rooms`)

    // HDU Beds (2 beds)
    const hduBeds = [
      { bedNumber: 'HDU-01', pricePerDay: 3000, features: 'Monitor, Oxygen, Nurse Station Nearby' },
      { bedNumber: 'HDU-02', pricePerDay: 3000, features: 'Monitor, Oxygen, Nurse Station Nearby' },
    ]

    for (const bed of hduBeds) {
      await prisma.bed.create({
        data: {
          wardId: hduWard.id,
          bedNumber: bed.bedNumber,
          pricePerDay: bed.pricePerDay,
          status: 'AVAILABLE',
          features: bed.features,
        },
      })
    }
    console.log(`   ✅ Created ${hduBeds.length} beds in HDU`)
  }

  // Summary
  console.log('\n📊 Final Summary:')
  const wardCount = await prisma.ward.count()
  const bedCount = await prisma.bed.count()
  const availableBeds = await prisma.bed.count({ where: { status: 'AVAILABLE' } })
  const occupiedBeds = await prisma.bed.count({ where: { status: 'OCCUPIED' } })

  console.log(`   Wards: ${wardCount}`)
  console.log(`   Total Beds: ${bedCount}`)
  console.log(`   Available: ${availableBeds}`)
  console.log(`   Occupied: ${occupiedBeds}`)

  // Show ward breakdown
  const wards = await prisma.ward.findMany({
    include: {
      _count: {
        select: { beds: true }
      }
    }
  })
  
  console.log('\n   Ward Breakdown:')
  for (const ward of wards) {
    console.log(`   - ${ward.name}: ${ward._count.beds} beds`)
  }

  console.log('\n✅ IPD seeding complete!')
}

seedIPD()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
