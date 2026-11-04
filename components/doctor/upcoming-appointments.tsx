"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { ChevronRight, CalendarClock } from "lucide-react"

// ── Types ──

interface Appointment {
  id: string
  appointmentDate: Date | string
  appointmentTime: string
  status: string
  patient: {
    patientId: string
    user: {
      name: string | null
    }
  }
}

// ── Helpers ──

function getInitials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function getRelativeDay(date: Date | string) {
  const d = new Date(date)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return format(d, "EEE, MMM d")
}

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
]

// ── Component ──

interface UpcomingAppointmentsProps {
  appointments: Appointment[]
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
            <CalendarClock className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Upcoming</h3>
            <p className="text-[11px] text-gray-400">Next 7 days</p>
          </div>
        </div>
        <Link href="/dashboard/clinical/opd">
          <Button variant="ghost" size="sm" className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 gap-1 h-8">
            All <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
            <CalendarClock className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs font-medium">No upcoming appointments</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {appointments.map((appt, idx) => {
              const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length]
              return (
                <Link
                  key={appt.id}
                  href={`/dashboard/clinical/opd/${appt.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/80 transition-colors group"
                >
                  {/* Avatar */}
                  <div className={`h-9 w-9 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0 text-[11px] font-bold`}>
                    {getInitials(appt.patient.user.name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appt.patient.user.name || "Unknown"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {getRelativeDay(appt.appointmentDate)} &middot; {appt.appointmentTime}
                    </p>
                  </div>
                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
