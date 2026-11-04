import { getPharmacyReceivables } from "@/app/actions/pharmacy-fin/receivables"
import { getHospitalSettings } from "@/app/actions/settings"
import { ReceivablesClient } from "@/components/pharmacy-finance/receivables-client"

export const metadata = { title: "Receivables" }

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  
  const status = (typeof sp.status === "string" ? sp.status : "OPEN") as any
  const search = typeof sp.search === "string" ? sp.search : undefined
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1

  const [data, hospitalSettings] = await Promise.all([
    getPharmacyReceivables({ status, search, page }),
    getHospitalSettings(),
  ])

  return (
    <ReceivablesClient 
      data={data} 
      searchParams={sp} 
      hospitalSettings={hospitalSettings} 
    />
  )
}
