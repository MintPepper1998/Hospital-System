const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const settings = await prisma.hospitalSettings.findUnique({ where: { id: 1 } })
  if (!settings) return;

  const update = {}
  
  if (settings.labTechnicianSignature && !settings.labTechnicianSignature.startsWith('http')) {
    update.labTechnicianSignature = `https://hospital-records-kamal.s3.ap-south-2.amazonaws.com/${settings.labTechnicianSignature}`
  }
  
  if (settings.pathologistSignature && !settings.pathologistSignature.startsWith('http')) {
    update.pathologistSignature = `https://hospital-records-kamal.s3.ap-south-2.amazonaws.com/${settings.pathologistSignature}`
  }

  if (Object.keys(update).length > 0) {
    await prisma.hospitalSettings.update({
      where: { id: 1 },
      data: update
    })
    console.log("Updated DB signatures to full URLs:", update)
  } else {
    console.log("No update needed, already full URLs")
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
