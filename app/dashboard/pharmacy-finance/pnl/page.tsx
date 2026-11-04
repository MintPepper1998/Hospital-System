import { getPharmacyPnL } from "@/app/actions/pharmacy-fin/pnl"
import { PnLClient } from "@/components/pharmacy-finance/pnl-client"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"

export const metadata = { title: "Profit & Loss" }

export default async function PnLPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")

  // For comparison, get the previous period
  const diff = range.to.getTime() - range.from.getTime()
  const prevRange = {
    from: new Date(range.from.getTime() - diff),
    to: new Date(range.to.getTime() - diff),
    fromStr: new Date(range.from.getTime() - diff).toISOString().split("T")[0],
    toStr: new Date(range.to.getTime() - diff).toISOString().split("T")[0],
  }

  const current = await getPharmacyPnL(range)
  const previous = await getPharmacyPnL(prevRange)

  return <PnLClient current={current} previous={previous} range={range} />
}
