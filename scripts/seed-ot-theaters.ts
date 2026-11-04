import { PrismaClient, TheaterType } from "@prisma/client"

const prisma = new PrismaClient()

async function seedTheaters() {
  try {
    console.log("🏥 Seeding Operation Theaters...")

    const theaters = [
      {
        name: "Main OT 1",
        type: TheaterType.MAJOR,
        floor: "2nd Floor",
        capacity: 8,
        equipment: "General Surgery Equipment, Anesthesia Machine, Patient Monitor",
        features: "AC, Laminar Flow, Video Recording System",
        isOperational: true
      },
      {
        name: "Main OT 2",
        type: TheaterType.MAJOR,
        floor: "2nd Floor",
        capacity: 8,
        equipment: "Orthopedic Equipment, C-Arm, Arthroscopy",
        features: "AC, Laminar Flow, Bone Bank Access",
        isOperational: true
      },
      {
        name: "Minor OT",
        type: TheaterType.MINOR,
        floor: "1st Floor",
        capacity: 4,
        equipment: "Basic Surgery Kit, Minor Procedure Trolley",
        features: "AC, Emergency Power Backup",
        isOperational: true
      },
      {
        name: "Cath Lab",
        type: TheaterType.CATH_LAB,
        floor: "Ground Floor",
        capacity: 6,
        equipment: "Angiography Machine, IABP, Temporary Pacemaker",
        features: "Lead-lined walls, Digital Imaging, ICU Adjacent",
        isOperational: true
      },
      {
        name: "Emergency OT",
        type: TheaterType.EMERGENCY,
        floor: "Ground Floor",
        capacity: 6,
        equipment: "Trauma Surgery Kit, Ventilator, Defibrillator",
        features: "24/7 Ready, Direct ER Access, Rapid Response Team",
        isOperational: true
      }
    ]

    for (const theater of theaters) {
      await prisma.operationTheater.upsert({
        where: { name: theater.name },
        update: theater,
        create: theater
      })
      console.log(`✅ Created/Updated: ${theater.name}`)
    }

    console.log("\n🎉 Successfully seeded operation theaters!")
    console.log(`📊 Total theaters: ${theaters.length}`)
  } catch (error) {
    console.error("❌ Error seeding theaters:", error)
  } finally {
    await prisma.$disconnect()
  }
}

seedTheaters()
