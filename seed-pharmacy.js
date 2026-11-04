const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("Starting Pharmacy Seeding...")

  // 1. Create or get a User and Patient for walk-in billing
  let walkInUser = await prisma.user.findFirst({ where: { email: "walkin@hospital.com" } })
  if (!walkInUser) {
    walkInUser = await prisma.user.create({
      data: {
        name: "Walk-in Patient",
        email: "walkin@hospital.com",
        password: "N/A",
        role: "PATIENT"
      }
    })
  }

  let walkInPatient = await prisma.patient.findFirst({ where: { userId: walkInUser.id } })
  if (!walkInPatient) {
    walkInPatient = await prisma.patient.create({
      data: {
        userId: walkInUser.id,
        patientId: "PT-" + Math.floor(Math.random() * 10000),
        dateOfBirth: new Date("1990-01-01"),
        phone: "1234567890"
      }
    })
  }

  // 2. Create Supplier
  let supplier = await prisma.supplier.findFirst({ where: { name: "MedLife Pharmaceuticals" } })
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        name: "MedLife Pharmaceuticals",
        contactPerson: "Rajesh Kumar",
        phone: "9876543210"
      }
    })
  }

  // 3. Create Medicines & Batches
  const medData = [
    { name: "Paracetamol 500mg", genericName: "Paracetamol", price: 1.5, cost: 0.8 },
    { name: "Amoxicillin 250mg", genericName: "Amoxicillin", price: 5.0, cost: 2.5 },
    { name: "Ibuprofen 400mg", genericName: "Ibuprofen", price: 2.0, cost: 1.0 },
    { name: "Cetirizine 10mg", genericName: "Cetirizine", price: 1.2, cost: 0.5 },
    { name: "Azithromycin 500mg", genericName: "Azithromycin", price: 12.0, cost: 8.0 }
  ]

  const createdMeds = []
  
  for (const m of medData) {
    let med = await prisma.medicine.findFirst({ where: { name: m.name } })
    if (!med) {
      med = await prisma.medicine.create({
        data: {
          name: m.name,
          genericName: m.genericName,
          unitPrice: m.price,
          type: "TABLET"
        }
      })
    }
    
    // Add stock
    const batch = await prisma.inventoryBatch.create({
      data: {
        medicineId: med.id,
        batchNumber: "B-" + Math.floor(Math.random() * 100000),
        supplierId: supplier.id,
        quantity: 5000,
        originalQuantity: 5000,
        purchasePrice: m.cost,
        sellingPrice: m.price,
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2))
      }
    })

    createdMeds.push({ ...med, batchCost: m.cost })
  }

  // 4. Generate Bills for the last 45 days
  const now = new Date()
  let billCount = 0

  for (let i = 45; i >= 0; i--) {
    // 2-5 bills per day
    const billsPerDay = Math.floor(Math.random() * 4) + 2;
    for (let j = 0; j < billsPerDay; j++) {
      const billDate = new Date(now)
      billDate.setDate(billDate.getDate() - i)
      billDate.setHours(Math.floor(Math.random() * 10) + 8) // Between 8 AM and 6 PM

      // Pick 1 to 3 random medicines
      const itemsCount = Math.floor(Math.random() * 3) + 1
      const billItems = []
      let total = 0
      let totalCost = 0

      for (let k = 0; k < itemsCount; k++) {
        const rMed = createdMeds[Math.floor(Math.random() * createdMeds.length)]
        const qty = Math.floor(Math.random() * 5) + 1
        const lineTotal = qty * rMed.unitPrice
        const lineCost = qty * rMed.batchCost

        billItems.push({
          description: rMed.name,
          quantity: qty,
          unitPrice: rMed.unitPrice,
          amount: lineTotal,
          totalAmount: lineTotal,
          referenceId: rMed.id,
          unitCost: rMed.batchCost,
          costAmount: lineCost
        })
        
        total += lineTotal
        totalCost += lineCost
      }

      await prisma.billing.create({
        data: {
          billNumber: "PH-" + Date.now().toString() + Math.floor(Math.random() * 1000),
          patientId: walkInPatient.id,
          type: "PHARMACY",
          billDate: billDate,
          totalAmount: total,
          netAmount: total,
          paidAmount: total,
          balanceAmount: 0,
          status: "PAID",
          paymentMethod: Math.random() > 0.5 ? "CASH" : "UPI",
          items: {
            create: billItems
          }
        }
      })
      billCount++
    }
  }

  console.log(`Seeding complete: Created ${billCount} bills over the last 45 days, added thousands of items to stock!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
