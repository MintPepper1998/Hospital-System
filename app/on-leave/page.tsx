import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SignOutButton } from "./sign-out-button"
import { BriefcaseMedical, CalendarX2 } from "lucide-react"

export default async function OnLeavePage() {
  const session = await auth()

  // If not logged in, redirect to login
  if (!session?.user?.email) {
    redirect("/login")
  }

  // Double-check they are actually on leave (not just accessing this URL directly)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { name: true, role: true, id: true },
  })

  if (!user) redirect("/login")

  // SUPER_ADMIN can never land here — redirect to dashboard
  if (user.role === "SUPER_ADMIN" || user.role === "PATIENT") {
    redirect("/dashboard")
  }

  const staffRecord = await prisma.staff.findFirst({
    where: { userId: user.id },
    select: { isOnLeave: true, leaveReason: true, department: true },
  })

  // If they are NOT on leave, send them to dashboard
  if (!staffRecord?.isOnLeave) {
    redirect("/dashboard")
  }

  const hospitalSettings = await prisma.hospitalSettings.findUnique({
    where: { id: 1 },
    select: { name: true },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

          <div className="p-8 text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                  <CalendarX2 className="h-10 w-10 text-amber-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                You are currently marked as{" "}
                <span className="font-semibold text-amber-600">On Leave</span>.
                System access is restricted during your leave period.
              </p>
            </div>

            {/* Staff Info */}
            <div className="bg-gray-50 rounded-xl px-5 py-4 text-left space-y-2.5 border border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <BriefcaseMedical className="h-3.5 w-3.5" />
                <span className="font-medium uppercase tracking-wide">
                  {hospitalSettings?.name || "Hospital"} ERP
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Staff Name</span>
                  <span className="font-semibold text-gray-900">{user.name || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    On Leave
                  </span>
                </div>
                {staffRecord.department && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Department</span>
                    <span className="font-medium text-gray-700">{staffRecord.department}</span>
                  </div>
                )}
                {staffRecord.leaveReason && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 shrink-0">Reason</span>
                    <span className="font-medium text-gray-700 text-right text-xs">{staffRecord.leaveReason}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Help text */}
            <p className="text-xs text-gray-400">
              Contact your administrator to restore access or update your leave status.
            </p>

            {/* Sign out */}
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  )
}
