/**
 * Backfill existing IPD admissions with sequential IP numbers.
 * Run: npx tsx scripts/backfill-ip-numbers.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Get all admissions without an ipNumber, ordered by admissionDate
  const admissions = await prisma.iPDAdmission.findMany({
    where: { ipNumber: null },
    orderBy: { admissionDate: "asc" },
    select: { id: true, admissionDate: true },
  })

  if (admissions.length === 0) {
    console.log("All admissions already have IP numbers.")
    return
  }

  console.log(`Found ${admissions.length} admissions without IP numbers. Backfilling...`)

  // Group by year
  const byYear = new Map<number, typeof admissions>()
  for (const adm of admissions) {
    const year = new Date(adm.admissionDate).getFullYear()
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(adm)
  }

  for (const [year, yearAdmissions] of byYear) {
    // Find the current max sequence for this year
    const existing = await prisma.iPDAdmission.findFirst({
      where: { ipNumber: { startsWith: "IPD/", endsWith: `/${year}` } },
      orderBy: { ipNumber: "desc" },
      select: { ipNumber: true },
    })

    let seq = 1
    if (existing?.ipNumber) {
      const parts = existing.ipNumber.split("/")
      if (parts.length === 3) seq = parseInt(parts[1], 10) + 1
    }

    for (const adm of yearAdmissions) {
      const ipNumber = `IPD/${String(seq).padStart(3, "0")}/${year}`
      await prisma.iPDAdmission.update({
        where: { id: adm.id },
        data: { ipNumber },
      })
      console.log(`  ${adm.id} → ${ipNumber}`)
      seq++
    }
  }

  console.log("Done!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
