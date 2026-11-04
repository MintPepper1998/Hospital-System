import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding medicines to the inventory...')

  // Ensure there is at least one supplier
  let supplier = await prisma.supplier.findFirst()
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        name: 'Hospital Verified Suppliers',
        contactPerson: 'John Doe',
        email: 'supplier@hospital.com',
        phone: '1234567890',
        address: '123 Supplier Lane'
      }
    })
  }

  const medicines = [
    // Surgical/Anesthesia
    { name: 'Propofol 1%', genericName: 'Propofol', type: 'INJECTION', unitPrice: 150, minStockLevel: 50, schedule: 'H' },
    { name: 'Fentanyl 50mcg/ml', genericName: 'Fentanyl', type: 'INJECTION', unitPrice: 200, minStockLevel: 20, schedule: 'X' },
    { name: 'Midazolam 1mg/ml', genericName: 'Midazolam', type: 'INJECTION', unitPrice: 45, minStockLevel: 30, schedule: 'H1' },
    { name: 'Ketamine 50mg/ml', genericName: 'Ketamine', type: 'INJECTION', unitPrice: 85, minStockLevel: 15, schedule: 'H1' },
    { name: 'Ondansetron 4mg', genericName: 'Ondansetron', type: 'INJECTION', unitPrice: 35, minStockLevel: 100, schedule: 'H' },
    
    // Antibiotics
    { name: 'Augmentin 625mg', genericName: 'Amoxicillin + Clavulanic Acid', type: 'TABLET', unitPrice: 20, minStockLevel: 200, schedule: 'H1' },
    { name: 'Ceftriaxone 1g', genericName: 'Ceftriaxone', type: 'INJECTION', unitPrice: 65, minStockLevel: 100, schedule: 'H1' },
    { name: 'Metronidazole 400mg', genericName: 'Metronidazole', type: 'TABLET', unitPrice: 5, minStockLevel: 300, schedule: 'H1' },
    { name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', type: 'TABLET', unitPrice: 8, minStockLevel: 200, schedule: 'H1' },

    // Pain & Inflammation
    { name: 'Dolo 650', genericName: 'Paracetamol', type: 'TABLET', unitPrice: 2, minStockLevel: 500, schedule: 'OTC' },
    { name: 'Ultracet', genericName: 'Tramadol + Paracetamol', type: 'TABLET', unitPrice: 15, minStockLevel: 100, schedule: 'H1' },
    { name: 'Diclofenac 50mg', genericName: 'Diclofenac Sodium', type: 'TABLET', unitPrice: 4, minStockLevel: 200, schedule: 'H' },
    { name: 'Zerodol-P', genericName: 'Aceclofenac + Paracetamol', type: 'TABLET', unitPrice: 8, minStockLevel: 300, schedule: 'H' },

    // Local Anesthetics
    { name: 'Bupivacaine 0.5%', genericName: 'Bupivacaine', type: 'INJECTION', unitPrice: 40, minStockLevel: 200, schedule: 'H' },
    { name: 'Lidocaine 2%', genericName: 'Lidocaine', type: 'INJECTION', unitPrice: 30, minStockLevel: 500, schedule: 'H' },
    { name: 'Neostigmine 2.5mg', genericName: 'Neostigmine', type: 'INJECTION', unitPrice: 15, minStockLevel: 200, schedule: 'H' },
    { name: 'Normal Saline (NS) 500ml', genericName: 'Sodium Chloride 0.9%', type: 'INJECTION', unitPrice: 35, minStockLevel: 300, schedule: 'OTC' },
    { name: 'Ringer Lactate (RL) 500ml', genericName: 'Compound Sodium Lactate', type: 'INJECTION', unitPrice: 45, minStockLevel: 250, schedule: 'OTC' },

    // Chronic Care
    { name: 'Pan 40', genericName: 'Pantoprazole', type: 'TABLET', unitPrice: 12, minStockLevel: 400, schedule: 'H' },
    { name: 'Telma 40', genericName: 'Telmisartan', type: 'TABLET', unitPrice: 9, minStockLevel: 300, schedule: 'H' },
    { name: 'Glycomet 500', genericName: 'Metformin', type: 'TABLET', unitPrice: 3, minStockLevel: 500, schedule: 'H' }
  ]

  let addedCount = 0

  for (const med of medicines) {
    const existing = await prisma.medicine.findFirst({ where: { name: med.name } })
    if (!existing) {
      const createdMed = await prisma.medicine.create({
        data: {
          ...med,
          manufacturer: 'Hospital Verified Suppliers',
          isActive: true
        }
      })
      
      // Give it starting stock of 100 units 
      await prisma.inventoryBatch.create({
        data: {
          medicineId: createdMed.id,
          supplierId: supplier.id,
          batchNumber: `BAT-${Math.floor(Math.random() * 10000)}`,
          quantity: 100,
          originalQuantity: 100,
          purchasePrice: med.unitPrice * 0.7, // Assume a 30% margin
          sellingPrice: med.unitPrice, 
          purchaseDate: new Date(),
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
          isActive: true
        }
      })
      addedCount++
    }
  }

  console.log(`Successfully added ${addedCount} new medicines to the pharmacy inventory!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
