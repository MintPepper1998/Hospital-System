"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { ChevronRight, Users } from "lucide-react"

// ── Types ──

interface Appointment {
  id: string
  appointmentDate: Date | string
  diagnosis: string | null
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

const AVATAR_GRADIENTS = [
  "from-rose-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-blue-500",
]

// ── Component ──

interface RecentPatientsProps {
  patients: Appointment[]
}

export function RecentPatients({ patients }: RecentPatientsProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
            <Users className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Recent Patients</h3>
            <p className="text-[11px] text-gray-400">Last consultations</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs font-medium">No recent consultations</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {patients.map((appt, idx) => {
              const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
              return (
                <Link
                  key={appt.id}
                  href={`/dashboard/clinical/opd/${appt.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/80 transition-colors group"
                >
                  {/* Avatar */}
                  <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <span className="text-[11px] font-bold text-white">
                      {getInitials(appt.patient.user.name)}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appt.patient.user.name || "Unknown"}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {format(new Date(appt.appointmentDate), "MMM d")} &middot;{" "}
                      {appt.diagnosis?.substring(0, 35) || "General consultation"}
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
