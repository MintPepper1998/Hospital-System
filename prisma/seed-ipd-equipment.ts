import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const EQUIPMENT_ITEMS = [
  // Monitoring
  { name: "Multi-Para Monitor", code: "EQ-001", category: "Monitoring", chargeType: "PER_DAY" as const, ratePerUnit: 800, depositAmount: 2000, description: "Heart rate, BP, SpO2, temperature monitoring" },
  { name: "Cardiac Monitor", code: "EQ-002", category: "Monitoring", chargeType: "PER_DAY" as const, ratePerUnit: 1200, depositAmount: 3000, description: "Continuous ECG monitoring with alarms" },
  { name: "Pulse Oximeter", code: "EQ-003", category: "Monitoring", chargeType: "PER_DAY" as const, ratePerUnit: 200, depositAmount: 500, description: "Portable SpO2 and pulse rate monitor" },
  { name: "BP Monitor (Digital)", code: "EQ-004", category: "Monitoring", chargeType: "PER_DAY" as const, ratePerUnit: 150, depositAmount: 0, description: "Non-invasive blood pressure monitor" },

  // Respiratory
  { name: "Oxygen Concentrator", code: "EQ-005", category: "Respiratory", chargeType: "HOURLY" as const, ratePerUnit: 100, depositAmount: 5000, description: "5L/min oxygen concentrator" },
  { name: "Oxygen Cylinder (Jumbo)", code: "EQ-006", category: "Respiratory", chargeType: "PER_DAY" as const, ratePerUnit: 500, depositAmount: 2000, description: "Medical grade oxygen cylinder with regulator" },
  { name: "Nebulizer Machine", code: "EQ-007", category: "Respiratory", chargeType: "PER_DAY" as const, ratePerUnit: 300, depositAmount: 1000, description: "Compressor nebulizer for medication delivery" },
  { name: "BiPAP Machine", code: "EQ-008", category: "Respiratory", chargeType: "HOURLY" as const, ratePerUnit: 200, depositAmount: 5000, description: "Bilevel positive airway pressure ventilation" },
  { name: "CPAP Machine", code: "EQ-009", category: "Respiratory", chargeType: "HOURLY" as const, ratePerUnit: 150, depositAmount: 3000, description: "Continuous positive airway pressure support" },
  { name: "Ventilator", code: "EQ-010", category: "Respiratory", chargeType: "HOURLY" as const, ratePerUnit: 500, depositAmount: 10000, description: "Mechanical ventilator for critical care" },

  // Infusion
  { name: "Infusion Pump", code: "EQ-011", category: "Infusion", chargeType: "PER_DAY" as const, ratePerUnit: 500, depositAmount: 2000, description: "IV infusion pump for controlled medication delivery" },
  { name: "Syringe Pump", code: "EQ-012", category: "Infusion", chargeType: "PER_DAY" as const, ratePerUnit: 400, depositAmount: 1500, description: "Precision syringe pump for critical medications" },

  // Mobility & Support
  { name: "Wheelchair", code: "EQ-013", category: "Mobility", chargeType: "PER_DAY" as const, ratePerUnit: 150, depositAmount: 500, description: "Standard wheelchair for patient transport" },
  { name: "Walker / Zimmer Frame", code: "EQ-014", category: "Mobility", chargeType: "PER_DAY" as const, ratePerUnit: 100, depositAmount: 300, description: "Walking aid frame" },
  { name: "Air Mattress", code: "EQ-015", category: "Therapeutic", chargeType: "PER_DAY" as const, ratePerUnit: 350, depositAmount: 1000, description: "Anti-bedsore alternating pressure mattress" },

  // Therapeutic
  { name: "DVT Pump (SCD)", code: "EQ-016", category: "Therapeutic", chargeType: "PER_DAY" as const, ratePerUnit: 600, depositAmount: 2000, description: "Sequential compression device for DVT prevention" },
  { name: "Suction Machine", code: "EQ-017", category: "Therapeutic", chargeType: "PER_DAY" as const, ratePerUnit: 400, depositAmount: 1500, description: "Portable suction apparatus" },
  { name: "Phototherapy Unit (Neonatal)", code: "EQ-018", category: "Therapeutic", chargeType: "HOURLY" as const, ratePerUnit: 100, depositAmount: 0, description: "Blue light therapy for neonatal jaundice" },

  // Diagnostic
  { name: "Portable ECG Machine", code: "EQ-019", category: "Diagnostic", chargeType: "PER_DAY" as const, ratePerUnit: 300, depositAmount: 1000, description: "12-lead portable ECG" },
  { name: "Glucometer", code: "EQ-020", category: "Diagnostic", chargeType: "PER_DAY" as const, ratePerUnit: 50, depositAmount: 200, description: "Blood glucose monitoring device" },
]

async function main() {
  console.log("🏥 Seeding IPD equipment items...\n")

  for (const item of EQUIPMENT_ITEMS) {
    const existing = await prisma.iPDEquipmentItem.findFirst({ where: { code: item.code } })
    if (existing) {
      console.log(`  ⏭️  ${item.code} ${item.name} — already exists`)
      continue
    }
    await prisma.iPDEquipmentItem.create({ data: item })
    console.log(`  ✅ ${item.code} ${item.name} — ₹${item.ratePerUnit}/${item.chargeType === "HOURLY" ? "hr" : "day"}`)
  }

  console.log(`\n✅ Done! ${EQUIPMENT_ITEMS.length} equipment items seeded.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
