import { getReturnsRegister } from "@/app/actions/pharmacy-fin/returns"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"
import { ReturnsClient } from "@/components/pharmacy-finance/returns-client"

export const metadata = { title: "Returns & Refunds" }

export default async function ReturnsRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")
  
  const status = typeof sp.status === "string" ? sp.status : undefined
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1

  const data = await getReturnsRegister({ range, status, page })

  return <ReturnsClient range={range} data={data} searchParams={sp} />
}
