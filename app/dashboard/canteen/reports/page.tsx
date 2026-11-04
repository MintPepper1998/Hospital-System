import { prisma } from "@/lib/prisma"
import { CanteenReportsClient } from "@/components/canteen/canteen-reports-client"

export default async function CanteenReportsPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Last 7 days range
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Last 30 days range
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    todayOrders,
    weekOrders,
    monthOrders,
    todayTokens,
    weekTokens,
    monthTokens,
    topMenuItems,
    mealSlots,
    activeDietCount,
    inventoryItems,
  ] = await Promise.all([
    // Today's IPD orders
    prisma.canteenMealOrder.findMany({
      where: { orderDate: { gte: today, lt: tomorrow } },
      include: { items: true, mealSlot: true },
    }),
    // Week IPD orders
    prisma.canteenMealOrder.findMany({
      where: { orderDate: { gte: weekAgo, lt: tomorrow } },
      include: { items: true },
    }),
    // Month IPD orders
    prisma.canteenMealOrder.findMany({
      where: { orderDate: { gte: monthAgo, lt: tomorrow } },
      include: { items: true },
    }),
    // Today's tokens
    prisma.canteenToken.findMany({
      where: { issuedAt: { gte: today, lt: tomorrow } },
      include: { items: true },
    }),
    // Week tokens
    prisma.canteenToken.findMany({
      where: { issuedAt: { gte: weekAgo, lt: tomorrow } },
      include: { items: true },
    }),
    // Month tokens
    prisma.canteenToken.findMany({
      where: { issuedAt: { gte: monthAgo, lt: tomorrow } },
      include: { items: true },
    }),
    // Top selling items (from order items in the last 30 days)
    prisma.canteenMealOrderItem.groupBy({
      by: ["itemName"],
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    // Meal slots
    prisma.canteenMealSlot.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    // Active diets
    prisma.canteenPatientDiet.count({ where: { isActive: true } }),
    // Low stock items
    prisma.canteenInventoryItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ])

  // Compute daily revenue for the last 7 days
  const dailyRevenue: { date: string; ipd: number; walkin: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const nextD = new Date(d)
    nextD.setDate(nextD.getDate() + 1)

    const dayOrders = weekOrders.filter((o) => {
      const od = new Date(o.orderDate)
      return od >= d && od < nextD
    })
    const dayTokens = weekTokens.filter((t) => {
      const td = new Date(t.issuedAt)
      return td >= d && td < nextD
    })

    dailyRevenue.push({
      date: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      ipd: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
      walkin: dayTokens.reduce((s, t) => s + t.totalAmount, 0),
    })
  }

  // Per-slot breakdown for today
  const slotBreakdown = mealSlots.map((slot) => {
    const slotOrders = todayOrders.filter((o) => o.mealSlotId === slot.id)
    const slotTokens = todayTokens.filter((t) => t.mealSlotId === slot.id)
    return {
      name: slot.name,
      code: slot.code,
      ipdCount: slotOrders.length,
      walkinCount: slotTokens.length,
      ipdRevenue: slotOrders.reduce((s, o) => s + o.totalAmount, 0),
      walkinRevenue: slotTokens.reduce((s, t) => s + t.totalAmount, 0),
    }
  })

  const lowStockItems = inventoryItems.filter((i) => i.currentStock <= i.minStockLevel)

  return (
    <CanteenReportsClient
      todayIpdRevenue={todayOrders.reduce((s, o) => s + o.totalAmount, 0)}
      todayWalkinRevenue={todayTokens.reduce((s, t) => s + t.totalAmount, 0)}
      weekIpdRevenue={weekOrders.reduce((s, o) => s + o.totalAmount, 0)}
      weekWalkinRevenue={weekTokens.reduce((s, t) => s + t.totalAmount, 0)}
      monthIpdRevenue={monthOrders.reduce((s, o) => s + o.totalAmount, 0)}
      monthWalkinRevenue={monthTokens.reduce((s, t) => s + t.totalAmount, 0)}
      todayIpdOrders={todayOrders.length}
      todayWalkinTokens={todayTokens.length}
      weekIpdOrders={weekOrders.length}
      weekWalkinTokens={weekTokens.length}
      monthIpdOrders={monthOrders.length}
      monthWalkinTokens={monthTokens.length}
      topMenuItems={JSON.parse(JSON.stringify(topMenuItems))}
      dailyRevenue={dailyRevenue}
      slotBreakdown={slotBreakdown}
      activeDietCount={activeDietCount}
      lowStockCount={lowStockItems.length}
      lowStockItems={lowStockItems.map((i) => ({
        name: i.name,
        current: i.currentStock,
        min: i.minStockLevel,
        unit: i.unit,
      }))}
    />
  )
}
