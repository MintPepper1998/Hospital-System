"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  ChevronRight,
  Clock,
  User,
} from "lucide-react"

// ── Types ──

interface Appointment {
  id: string
  appointmentTime: string
  reason: string | null
  status: string
  patient: {
    patientId: string
    user: {
      name: string | null
    }
  }
}

// ── Helpers ──

function getStatusConfig(status: string) {
  const map: Record<string, { label: string; bg: string; text: string; dot: string; glow: string }> = {
    PENDING:     { label: "Pending",     bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400",    glow: "" },
    SCHEDULED:   { label: "Scheduled",   bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    glow: "" },
    CONFIRMED:   { label: "Confirmed",   bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500",    glow: "" },
    WAITING:     { label: "Waiting",     bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   glow: "" },
    IN_PROGRESS: { label: "In Progress", bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500",  glow: "shadow-[0_0_8px_rgba(139,92,246,0.4)]" },
    COMPLETED:   { label: "Completed",   bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", glow: "" },
    CANCELLED:   { label: "Cancelled",   bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-400",     glow: "" },
    NO_SHOW:     { label: "No Show",     bg: "bg-gray-50",    text: "text-gray-500",    dot: "bg-gray-300",    glow: "" },
  }
  return map[status] || map.PENDING
}

function getInitials(name: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_GRADIENTS = [
  "from-teal-400 to-cyan-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-green-500",
]

// ── Component ──

interface TodayScheduleProps {
  appointments: Appointment[]
  dateLabel: string
}

export function TodaySchedule({ appointments, dateLabel }: TodayScheduleProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Calendar className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Today&apos;s Schedule</h3>
            <p className="text-[11px] text-gray-400">{dateLabel}</p>
          </div>
        </div>
        <Link href="/dashboard/clinical/opd">
          <Button variant="ghost" size="sm" className="text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 gap-1 h-8">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Content */}
      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Calendar className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No appointments today</p>
          <p className="text-xs mt-1">Enjoy your free day!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {appointments.map((appt, idx) => {
            const status = getStatusConfig(appt.status)
            const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
            const isActive = appt.status === "IN_PROGRESS"

            return (
              <div
                key={appt.id}
                className={`group flex items-center gap-4 px-5 py-3.5 transition-colors duration-200 hover:bg-gray-50/80 ${isActive ? "bg-violet-50/40" : ""}`}
              >
                {/* Time column */}
                <div className="w-16 flex-shrink-0 text-right">
                  <span className={`text-sm font-semibold tabular-nums ${isActive ? "text-violet-700" : "text-gray-700"}`}>
                    {appt.appointmentTime}
                  </span>
                </div>

                {/* Timeline dot */}
                <div className="relative flex flex-col items-center flex-shrink-0">
                  <div className={`h-3 w-3 rounded-full ${status.dot} ${status.glow} ring-4 ring-white z-10`} />
                  {idx < appointments.length - 1 && (
                    <div className="absolute top-3 w-px h-[calc(100%+14px)] bg-gray-200" />
                  )}
                </div>

                {/* Avatar */}
                <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <span className="text-[11px] font-bold text-white">
                    {getInitials(appt.patient.user.name)}
                  </span>
                </div>

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {appt.patient.user.name || "Unknown Patient"}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {appt.patient.patientId} &middot; {appt.reason || "General Consultation"}
                  </p>
                </div>

                {/* Status badge */}
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${status.bg} ${status.text} flex-shrink-0`}>
                  {status.label}
                </div>

                {/* Action */}
                <Link href={`/dashboard/clinical/opd/${appt.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-teal-50">
                    <ChevronRight className="h-4 w-4 text-teal-600" />
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
