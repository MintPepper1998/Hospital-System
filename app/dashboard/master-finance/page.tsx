import { getFinanceDashboardData } from "@/app/actions/master-finance"
import { MasterFinanceDashboardClient } from "./dashboard-client"

export default async function MasterFinancePage() {
  const data = await getFinanceDashboardData()
  return <MasterFinanceDashboardClient data={data} />
}
