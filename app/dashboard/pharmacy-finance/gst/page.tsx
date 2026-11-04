import { getGstSummary } from "@/app/actions/pharmacy-fin/gst"
import { GstClient } from "@/components/pharmacy-finance/gst-client"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"

export const metadata = { title: "GST Summary" }

export default async function GstPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")
  const data = await getGstSummary(range)

  return <GstClient data={data} range={range} />
}
