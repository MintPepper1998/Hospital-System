import { getCachedAdminDashboardData } from "@/lib/data/dashboard-cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export async function AvailabilitySection() {
  const data = await getCachedAdminDashboardData()

  return (
    <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-900">Today&apos;s Availability</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] md:text-xs text-gray-500">Appointments</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{data.availability.appointments}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] md:text-xs text-gray-500">Doctors</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{data.availability.doctors}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] md:text-xs text-gray-500">Nurses</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{data.availability.nurses}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] md:text-xs text-gray-500">Beds</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{data.availability.beds}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
