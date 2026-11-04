import { getCachedAdminDashboardData } from "@/lib/data/dashboard-cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LazySpecializationChart } from "@/components/dashboard/lazy-charts"

export async function SpecializationSection() {
  const data = await getCachedAdminDashboardData()

  return (
    <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-gray-900">Patients by specialization</CardTitle>
        <span className="text-xs text-teal-600 cursor-pointer hover:underline">See all</span>
      </CardHeader>
      <CardContent className="pt-0 flex-1 overflow-hidden">
        <LazySpecializationChart data={data.specializationStats} />
      </CardContent>
    </Card>
  )
}
