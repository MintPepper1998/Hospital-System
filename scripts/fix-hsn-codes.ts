import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Standard HSN codes for pharmaceutical products in India
const hsnCodeMap: Record<string, string> = {
  // Injections (HSN 3004.39 / 3004.90)
  'Propofol 1%': '30049099',
  'Fentanyl 50mcg/ml': '30049099',
  'Midazolam 1mg/ml': '30049099',
  'Ketamine 50mg/ml': '30049099',
  'Ondansetron 4mg': '30049099',
  'Bupivacaine 0.5%': '30049099',
  'Lidocaine 2%': '30049099',
  'Neostigmine 2.5mg': '30049099',
  'Ceftriaxone 1g': '30041020',
  'Normal Saline (NS) 500ml': '30049099',
  'Ringer Lactate (RL) 500ml': '30049099',

  // Tablets (HSN 3004.90)
  'Augmentin 625mg': '30042000',
  'Metronidazole 400mg': '30042000',
  'Ciprofloxacin 500mg': '30042000',
  'Dolo 650': '30049011',
  'Ultracet': '30049019',
  'Diclofenac 50mg': '30049019',
  'Zerodol-P': '30049019',
  'Pan 40': '30049039',
  'Telma 40': '30049099',
  'Glycomet 500': '30049099',
}

async function main() {
  console.log('Updating HSN codes for medicines...')

  let updated = 0
  for (const [name, hsnCode] of Object.entries(hsnCodeMap)) {
    const result = await prisma.medicine.updateMany({
      where: { name, hsnCode: null },
      data: { hsnCode },
    })
    if (result.count > 0) {
      console.log(`  ✓ ${name} → ${hsnCode}`)
      updated += result.count
    }
  }

  console.log(`\nUpdated HSN codes for ${updated} medicines.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
