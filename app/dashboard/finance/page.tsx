import { redirect } from "next/navigation"
import { setupDefaultAccounts, getFinanceDashboardStats } from "@/app/actions/finance"
import { FinanceDashboardClient } from "@/components/finance/finance-dashboard-client"

export default async function FinanceDashboardPage() {
  // Finance section overview is hidden from all users; redirect to main dashboard
  redirect("/dashboard")

  await setupDefaultAccounts()
  const stats = await getFinanceDashboardStats()

  return (
    <div className="space-y-6">
      <FinanceDashboardClient stats={stats} />
    </div>
  )
}
