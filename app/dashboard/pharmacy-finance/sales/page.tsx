import { getSalesRegister } from "@/app/actions/pharmacy-fin/sales"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"
import { SalesClient } from "@/components/pharmacy-finance/sales-client"

export const metadata = { title: "Sales Register" }

export default async function SalesRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")
  
  const channel = typeof sp.channel === "string" ? sp.channel : undefined
  const paymentMethod = typeof sp.paymentMethod === "string" ? sp.paymentMethod : undefined
  const status = typeof sp.status === "string" ? sp.status : undefined
  const search = typeof sp.search === "string" ? sp.search : undefined
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1

  const data = await getSalesRegister({ range, channel, paymentMethod, status, search, page })

  return <SalesClient range={range} data={data} searchParams={sp} />
}
