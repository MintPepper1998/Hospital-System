import { getPharmacyFinanceOverview } from "@/app/actions/pharmacy-fin/overview"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"
import { OverviewClient } from "@/components/pharmacy-finance/overview-client"

export const metadata = { title: "Pharmacy Finance Overview" }

export default async function PharmacyFinanceOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")
  const data = await getPharmacyFinanceOverview(range)

  return <OverviewClient range={range} data={data} />
}
