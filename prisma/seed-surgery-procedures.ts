import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PROCEDURES = [
  {
    name: "Appendectomy", code: "APX-001", category: "General Surgery",
    description: "Surgical removal of the appendix", estimatedDuration: 60, theaterType: "MAJOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 5000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 15000 },
      { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", amount: 5000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 8000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 2000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 3000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 4000, isOptional: true },
      { chargeType: "MISCELLANEOUS", chargeLabel: "Miscellaneous Charges", amount: 2000, isOptional: true },
    ],
  },
  {
    name: "CABG (Coronary Artery Bypass Grafting)", code: "CAR-001", category: "Cardiac Surgery",
    description: "Open-heart surgery to bypass blocked coronary arteries", estimatedDuration: 300, theaterType: "MAJOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 25000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 80000 },
      { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", amount: 20000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 30000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 5000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 8000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 50000 },
      { chargeType: "PER_DIEM", chargeLabel: "Per Diem Charges", amount: 5000 },
      { chargeType: "MISCELLANEOUS", chargeLabel: "Miscellaneous Charges", amount: 15000 },
    ],
  },
  {
    name: "Total Knee Replacement (TKR)", code: "ORT-001", category: "Orthopaedic",
    description: "Complete knee joint replacement surgery", estimatedDuration: 180, theaterType: "MAJOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 15000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 50000 },
      { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", amount: 15000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 15000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 3000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 5000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 20000 },
      { chargeType: "MISCELLANEOUS", chargeLabel: "Implant Cost", amount: 80000 },
    ],
  },
  {
    name: "Cesarean Section (C-Section)", code: "OBG-001", category: "Obstetrics & Gynaecology",
    description: "Surgical delivery of baby via abdominal incision", estimatedDuration: 90, theaterType: "MAJOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 8000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 20000 },
      { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", amount: 7000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 10000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 2000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 5000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 8000 },
      { chargeType: "PER_DIEM", chargeLabel: "Per Diem Charges", amount: 3000 },
    ],
  },
  {
    name: "Hernia Repair (Laparoscopic)", code: "GEN-002", category: "General Surgery",
    description: "Minimally invasive hernia repair", estimatedDuration: 75, theaterType: "MAJOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 5000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 18000 },
      { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", amount: 5000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 8000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 2000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 3000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 5000 },
      { chargeType: "MISCELLANEOUS", chargeLabel: "Mesh Implant", amount: 8000 },
    ],
  },
  {
    name: "Cholecystectomy (Laparoscopic)", code: "GEN-003", category: "General Surgery",
    description: "Laparoscopic gallbladder removal", estimatedDuration: 60, theaterType: "MAJOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 5000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 15000 },
      { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", amount: 5000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 8000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 2000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 3000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 3000 },
    ],
  },
  {
    name: "Cataract Surgery (Phaco)", code: "OPH-001", category: "Ophthalmology",
    description: "Phacoemulsification cataract extraction with IOL implantation", estimatedDuration: 30, theaterType: "MINOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 3000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 10000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 3000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 1000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 2000 },
      { chargeType: "MISCELLANEOUS", chargeLabel: "IOL Lens", amount: 8000 },
    ],
  },
  {
    name: "Fracture ORIF (Open Reduction Internal Fixation)", code: "ORT-002", category: "Orthopaedic",
    description: "Surgical fixation of bone fracture with plates/screws", estimatedDuration: 120, theaterType: "MAJOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 8000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 25000 },
      { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", amount: 8000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 10000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 3000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 3000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 5000 },
      { chargeType: "MISCELLANEOUS", chargeLabel: "Implant (Plate/Screws)", amount: 15000 },
    ],
  },
  {
    name: "Abscess Incision & Drainage", code: "GEN-004", category: "General Surgery",
    description: "Minor surgical drainage of abscess", estimatedDuration: 20, theaterType: "MINOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 2000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 5000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 3000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 1000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 1000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 1500, isOptional: true },
    ],
  },
  {
    name: "Hysterectomy (Abdominal)", code: "OBG-002", category: "Obstetrics & Gynaecology",
    description: "Surgical removal of uterus via abdominal approach", estimatedDuration: 120, theaterType: "MAJOR",
    charges: [
      { chargeType: "OT", chargeLabel: "OT Charges", amount: 10000 },
      { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", amount: 30000 },
      { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", amount: 10000 },
      { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", amount: 12000 },
      { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", amount: 3000 },
      { chargeType: "NURSING", chargeLabel: "Nursing Charges", amount: 5000 },
      { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", amount: 10000 },
      { chargeType: "PER_DIEM", chargeLabel: "Per Diem Charges", amount: 3000 },
    ],
  },
]

async function main() {
  console.log("🏥 Seeding surgery procedures...")

  for (const proc of PROCEDURES) {
    const existing = await prisma.surgeryProcedure.findUnique({ where: { name: proc.name } })
    if (existing) {
      console.log(`  ⏭️  Skipping "${proc.name}" (already exists)`)
      continue
    }

    const totalCharge = proc.charges.reduce((s, c) => s + c.amount, 0)

    await prisma.surgeryProcedure.create({
      data: {
        name: proc.name,
        code: proc.code,
        category: proc.category,
        description: proc.description,
        estimatedDuration: proc.estimatedDuration,
        theaterType: proc.theaterType,
        totalCharge,
        isActive: true,
        chargeComponents: {
          create: proc.charges.map((c, i) => ({
            chargeLabel: c.chargeLabel,
            chargeType: c.chargeType,
            amount: c.amount,
            isOptional: c.isOptional || false,
            sortOrder: i + 1,
          })),
        },
      },
    })

    console.log(`  ✅ Created "${proc.name}" — ${proc.charges.length} charges — ₹${totalCharge.toLocaleString("en-IN")}`)
  }

  console.log("\n🎉 Surgery procedures seeded successfully!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
