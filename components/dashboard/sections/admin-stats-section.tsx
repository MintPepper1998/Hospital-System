import { getCachedAdminStats } from "@/lib/data/dashboard-cache"
import { AdminStatsCards } from "@/components/dashboard/admin-stats"

export async function AdminStatsSection() {
  const adminStats = await getCachedAdminStats()
  return <AdminStatsCards stats={adminStats} />
}
