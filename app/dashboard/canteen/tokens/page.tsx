import { prisma } from "@/lib/prisma"
import { TokenCounterClient } from "@/components/canteen/token-counter-client"
import { getHospitalSettings } from "@/app/actions/settings"

export default async function TokenCounterPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [menuItems, mealSlots, todayTokens, hospitalSettings] = await Promise.all([
    prisma.canteenMenuItem.findMany({
      where: { isActive: true },
      orderBy: [{ subCategory: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.canteenMealSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.canteenToken.findMany({
      where: { issuedAt: { gte: today, lt: tomorrow } },
      include: { items: true },
      orderBy: { issuedAt: "desc" },
    }),
    getHospitalSettings(),
  ])

  return (
    <TokenCounterClient
      menuItems={JSON.parse(JSON.stringify(menuItems))}
      mealSlots={JSON.parse(JSON.stringify(mealSlots))}
      todayTokens={JSON.parse(JSON.stringify(todayTokens))}
      hospitalName={hospitalSettings.name}
      hospitalAddress={hospitalSettings.address}
      hospitalPhone={hospitalSettings.phone}
    />
  )
}
