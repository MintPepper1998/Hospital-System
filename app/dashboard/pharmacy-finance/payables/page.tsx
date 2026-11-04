import { getSupplierPayables } from "@/app/actions/pharmacy-fin/payables"
import { PayablesClient } from "@/components/pharmacy-finance/payables-client"

export const metadata = { title: "Payables" }

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  
  const search = typeof sp.search === "string" ? sp.search : undefined
  const onlyOutstanding = sp.outstanding === "true"

  const data = await getSupplierPayables({ search, onlyOutstanding })

  return <PayablesClient data={data} searchParams={sp} />
}
