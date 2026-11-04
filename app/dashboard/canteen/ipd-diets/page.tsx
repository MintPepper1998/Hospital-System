import { prisma } from "@/lib/prisma"
import { IpdDietsClient } from "@/components/canteen/ipd-diets-client"

export default async function IpdDietsPage() {
  const [activeDiets, dietPlans, mealSlots, menuItems] = await Promise.all([
    prisma.canteenPatientDiet.findMany({
      where: { isActive: true },
      include: {
        dietPlan: true,
        admission: {
          include: {
            patient: { include: { user: { select: { name: true } } } },
            bed: { include: { ward: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.canteenDietPlan.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.canteenMealSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.canteenMenuItem.findMany({
      where: { isActive: true },
      orderBy: [{ subCategory: "asc" }, { name: "asc" }],
    }),
  ])

  // Also get today's meal orders for each admission
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayOrders = await prisma.canteenMealOrder.findMany({
    where: {
      orderType: "IPD",
      orderDate: { gte: today, lt: tomorrow },
    },
    include: { items: true, mealSlot: true },
  })

  return (
    <IpdDietsClient
      activeDiets={JSON.parse(JSON.stringify(activeDiets))}
      dietPlans={JSON.parse(JSON.stringify(dietPlans))}
      mealSlots={JSON.parse(JSON.stringify(mealSlots))}
      menuItems={JSON.parse(JSON.stringify(menuItems))}
      todayOrders={JSON.parse(JSON.stringify(todayOrders))}
    />
  )
}
