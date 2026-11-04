import Link from "next/link"
import { getCachedAdminDashboardData } from "@/lib/data/dashboard-cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LazyDashboardCalendar } from "@/components/dashboard/lazy-charts"

export async function SidebarSection() {
  const data = await getCachedAdminDashboardData()

  return (
    <div className="flex flex-col space-y-4">
      {/* Check In */}
      <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900">Check In</CardTitle>
          <Link href="/dashboard/hr/roster">
            <span className="text-xs text-teal-600 hover:underline cursor-pointer">See all</span>
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {data.staffCheckIn.length === 0 ? (
            <div className="text-center py-5 text-gray-400">
              <p className="text-xs">No roster entries today</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">S:No</th>
                  <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">Role</th>
                  <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.staffCheckIn.slice(0, 3).map((staff, idx) => (
                  <tr key={staff.id} className="border-b border-gray-50">
                    <td className="py-2.5 text-[10px] md:text-xs text-gray-600">{idx + 1}</td>
                    <td className="py-2.5 text-[10px] md:text-xs font-medium text-gray-900">{staff.name}</td>
                    <td className="py-2.5 text-[10px] md:text-xs text-gray-600">{staff.role}</td>
                    <td className="py-2.5 text-[10px] md:text-xs text-gray-900 font-medium">
                      {staff.shiftTime.length === 5
                        ? `${staff.shiftTime}AM`
                        : staff.shiftTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* My Calendar */}
      <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold text-gray-900">My Calendar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="max-w-[260px] mx-auto">
            <LazyDashboardCalendar />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
