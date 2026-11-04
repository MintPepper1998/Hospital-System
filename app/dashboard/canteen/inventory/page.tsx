import { prisma } from "@/lib/prisma"
import { CanteenInventoryClient } from "@/components/canteen/canteen-inventory-client"

export default async function CanteenInventoryPage() {
  const [inventoryItems, recentEntries] = await Promise.all([
    prisma.canteenInventoryItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.canteenStockEntry.findMany({
      take: 20,
      orderBy: { entryDate: "desc" },
      include: { inventoryItem: { select: { name: true, unit: true } } },
    }),
  ])

  return (
    <CanteenInventoryClient
      inventoryItems={JSON.parse(JSON.stringify(inventoryItems))}
      recentEntries={JSON.parse(JSON.stringify(recentEntries))}
    />
  )
}
