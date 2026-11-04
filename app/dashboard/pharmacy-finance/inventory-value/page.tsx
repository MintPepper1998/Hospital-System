import { getInventoryValuation, getInventoryWriteOffs } from "@/app/actions/pharmacy-fin/inventory"
import { InventoryValueClient } from "@/components/pharmacy-finance/inventory-client"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"

export const metadata = { title: "Inventory Value" }

export default async function InventoryValuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")

  const val = await getInventoryValuation()
  const writeOffs = await getInventoryWriteOffs(range)

  return <InventoryValueClient valuation={val} writeOffs={writeOffs} range={range} />
}
