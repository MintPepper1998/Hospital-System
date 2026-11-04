import { getBillingDashboard } from "@/app/actions/master-finance-revenue"
import { BillingDashboardClient } from "./billing-dashboard-client"

export default async function BillingPage() {
  const data = await getBillingDashboard()
  return <BillingDashboardClient data={JSON.parse(JSON.stringify(data))} />
}
