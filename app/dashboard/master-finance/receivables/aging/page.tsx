import { getARAgingReport } from "@/app/actions/master-finance-revenue"
import { ARAgingClient } from "./aging-client"

export default async function ARAgingPage() {
  const data = await getARAgingReport()
  return <ARAgingClient data={JSON.parse(JSON.stringify(data))} />
}
