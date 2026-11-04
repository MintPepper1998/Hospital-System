import { getCachedAdminStats } from "@/lib/data/dashboard-cache"
import { LazyRevenueAnalytics } from "@/components/dashboard/lazy-charts"

export async function RevenueSection() {
  const adminStats = await getCachedAdminStats()

  return (
    <LazyRevenueAnalytics
      data={adminStats.revenueChart}
      monthRevenue={adminStats.financials.monthRevenue}
    />
  )
}
