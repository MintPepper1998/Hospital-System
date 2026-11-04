import { prisma } from "@/lib/prisma"
import { MenuManagementClient } from "@/components/canteen/menu-management-client"

export default async function CanteenMenuPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [menuItems, mealSlots, todayMenu] = await Promise.all([
    prisma.canteenMenuItem.findMany({
      where: { isActive: true },
      orderBy: [{ subCategory: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.canteenMealSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.canteenDailyMenu.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { mealSlot: true, menuItem: true },
    }),
  ])

  return (
    <MenuManagementClient
      menuItems={JSON.parse(JSON.stringify(menuItems))}
      mealSlots={JSON.parse(JSON.stringify(mealSlots))}
      todayMenu={JSON.parse(JSON.stringify(todayMenu))}
    />
  )
}
