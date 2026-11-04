import { prisma } from "@/lib/prisma"
import { CanteenDashboardClient } from "@/components/canteen/canteen-dashboard-client"

export default async function CanteenPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [mealSlots, todayOrders, todayTokens, activeIpdDiets, todayMenu, lowStockItems] = await Promise.all([
    prisma.canteenMealSlot.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.canteenMealOrder.findMany({
      where: { orderDate: { gte: today, lt: tomorrow } },
      include: { items: true, mealSlot: true },
    }),
    prisma.canteenToken.findMany({
      where: { issuedAt: { gte: today, lt: tomorrow } },
      include: { items: true },
    }),
    prisma.canteenPatientDiet.count({ where: { isActive: true } }),
    prisma.canteenDailyMenu.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { mealSlot: true, menuItem: true },
    }),
    prisma.canteenInventoryItem.count({
      where: { isActive: true },
    }),
  ])

  const ipdRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const walkinRevenue = todayTokens.reduce((sum, t) => sum + t.totalAmount, 0)

  const perSlotStats = mealSlots.map((slot) => {
    const slotOrders = todayOrders.filter((o) => o.mealSlotId === slot.id)
    const slotTokens = todayTokens.filter((t) => t.mealSlotId === slot.id)
    return {
      slotId: slot.id,
      slotName: slot.name,
      slotCode: slot.code,
      startTime: slot.startTime,
      endTime: slot.endTime,
      ipdCount: slotOrders.length,
      walkinCount: slotTokens.length,
      totalServed: slotOrders.filter((o) => o.status === "SERVED").length + slotTokens.filter((t) => t.status === "SERVED").length,
      totalPending: slotOrders.filter((o) => o.status === "PENDING").length + slotTokens.filter((t) => t.status === "ISSUED").length,
    }
  })

  return (
    <CanteenDashboardClient
      todayIpdOrders={todayOrders.length}
      todayWalkinTokens={todayTokens.length}
      activeIpdDiets={activeIpdDiets}
      ipdRevenue={ipdRevenue}
      walkinRevenue={walkinRevenue}
      totalRevenue={ipdRevenue + walkinRevenue}
      perSlotStats={perSlotStats}
      todayMenuCount={todayMenu.length}
      lowStockCount={lowStockItems}
    />
  )
}
