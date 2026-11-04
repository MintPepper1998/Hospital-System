import Link from "next/link"
import { getCachedAdminDashboardData } from "@/lib/data/dashboard-cache"
import {
  TrendingUp,
  TrendingDown,
  Users,
  Bed,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export async function VisitsSection() {
  const data = await getCachedAdminDashboardData()

  return (
    <div className="flex flex-col space-y-4">
      {/* Visits for Today */}
      <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none">
        <CardContent className="p-4 md:p-5">
          <p className="text-xs text-gray-500">Visits for Today</p>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mt-1 mb-4">{data.visits.total}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs text-gray-500">New Patients</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl md:text-2xl font-bold text-gray-900">{data.patients.newToday}</span>
                  <span className="text-[10px] text-teal-600 flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" />10%
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs text-gray-500">Old Patients</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl md:text-2xl font-bold text-gray-900">{data.patients.returning}</span>
                  <span className="text-[10px] text-teal-600 flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" />10%
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs text-gray-500">Admitted</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl md:text-2xl font-bold text-gray-900">{data.patients.admitted}</span>
                  <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                    <TrendingDown className="h-3 w-3" />10%
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Bed className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Patients + Doctor's List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">Emergency Patients</CardTitle>
            <Link href="/dashboard/ipd">
              <span className="text-xs text-teal-600 hover:underline cursor-pointer">See all</span>
            </Link>
          </CardHeader>
          <CardContent className="pt-0 flex-1">
            {data.emergency.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-6 text-gray-400">
                <AlertTriangle className="h-7 w-7 mb-2" />
                <p className="text-xs">No emergency cases</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">S:No</th>
                      <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">Name</th>
                      <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500 hidden sm:table-cell">Room No</th>
                      <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500 hidden md:table-cell">Diagnosis</th>
                      <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.emergency.slice(0, 3).map((patient, idx) => (
                      <tr key={patient.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-[10px] md:text-xs text-gray-600">{idx + 1}</td>
                        <td className="py-2.5 text-[10px] md:text-xs font-medium text-gray-900">{patient.patientName}</td>
                        <td className="py-2.5 text-[10px] md:text-xs text-gray-600 hidden sm:table-cell">{patient.room.split(" - ")[1] || "—"}</td>
                        <td className="py-2.5 text-[10px] md:text-xs text-gray-600 hidden md:table-cell">{patient.diagnosis.substring(0, 15)}</td>
                        <td className="py-2.5">
                          <Link href={`/dashboard/ipd/discharge/${patient.id}`}>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2.5 border-teal-200 text-teal-600 hover:bg-teal-50 rounded-md">
                              View details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">Doctor&apos;s List</CardTitle>
            <Link href="/dashboard/hr/staff">
              <span className="text-xs text-teal-600 hover:underline cursor-pointer">See all</span>
            </Link>
          </CardHeader>
          <CardContent className="pt-0 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">S:No</th>
                    <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">Name</th>
                    <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500 hidden sm:table-cell">Phone No</th>
                    <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 text-[10px] md:text-xs font-medium text-gray-500 hidden md:table-cell">Specialists</th>
                  </tr>
                </thead>
                <tbody>
                  {data.doctors.slice(0, 4).map((doctor, idx) => (
                    <tr key={doctor.id} className="border-b border-gray-50">
                      <td className="py-2.5 text-[10px] md:text-xs text-gray-600">{idx + 1}</td>
                      <td className="py-2.5 text-[10px] md:text-xs font-medium text-gray-900">{doctor.name}</td>
                      <td className="py-2.5 text-[10px] md:text-xs text-gray-600 hidden sm:table-cell">{doctor.phone?.slice(-4) || "—"}</td>
                      <td className="py-2.5">
                        {doctor.isAvailable ? (
                          <span className="text-[10px] md:text-xs text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-[10px] md:text-xs text-gray-400">Inactive</span>
                        )}
                      </td>
                      <td className="py-2.5 text-[10px] md:text-xs text-gray-600 hidden md:table-cell">
                        {doctor.specialization || doctor.department || "General"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
