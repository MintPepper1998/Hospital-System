import { getAPAgingReport } from "@/app/actions/master-finance-payables"
import { APAgingClient } from "./ap-aging-client"

export default async function APAgingPage() {
  const data = await getAPAgingReport()
  return <APAgingClient data={JSON.parse(JSON.stringify(data))} />
}
