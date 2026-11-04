import { prisma } from "@/lib/prisma"
import { CanteenSettingsClient } from "@/components/canteen/canteen-settings-client"

export default async function CanteenSettingsPage() {
  const [mealSlots, dietPlans] = await Promise.all([
    prisma.canteenMealSlot.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.canteenDietPlan.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <CanteenSettingsClient
      mealSlots={JSON.parse(JSON.stringify(mealSlots))}
      dietPlans={JSON.parse(JSON.stringify(dietPlans))}
    />
  )
}
