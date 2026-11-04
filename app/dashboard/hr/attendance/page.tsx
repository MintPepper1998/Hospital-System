import { requireAuth } from "@/lib/auth-guard"
import { AttendanceClient } from "./attendance-client"

export const metadata = {
  title: "HR Staff Attendance | Shree Kamal Hospital",
}

export default async function HRAttendancePage() {
  await requireAuth(["SUPER_ADMIN", "ADMIN"])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Staff Attendance</h2>
      </div>
      <AttendanceClient />
    </div>
  )
}
