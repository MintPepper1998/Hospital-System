// Force fresh server render on every navigation — prevents stale OPD queue
// on desktop (Electron) clients where the router cache persists across sessions.
export const dynamic = "force-dynamic"
export const revalidate = 0

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Users, Calendar, Activity, Clock, ChevronLeft, ChevronRight, Search, AlertTriangle } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { PatientActionButtons } from "@/components/patient-action-buttons"
import { AppointmentStatus } from "@prisma/client"
import { Input } from "@/components/ui/input"
import { OPDSearchInput } from "@/components/opd-search-input"

interface OPDPageProps {
  searchParams: Promise<{
    page?: string
    q?: string
    status?: string
    sort?: string
    date?: string
    todayOnly?: string
  }>
}

export default async function OPDPage({ searchParams }: OPDPageProps) {
  const params = await searchParams
  const currentPage = Number(params?.page) || 1
  const pageSize = 10
  const q = (params?.q || "").trim()
  const statusFilter = params?.status || "ALL"
  const sortBy = params?.sort || "RECENT"
  const todayOnly = params?.todayOnly === "true"

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const selectedDate = params?.date ? new Date(params.date) : today
  selectedDate.setHours(0, 0, 0, 0)
  const selectedDateEnd = new Date(selectedDate)
  selectedDateEnd.setDate(selectedDateEnd.getDate() + 1)

  const dateStart = todayOnly ? today : selectedDate
  const dateEnd = todayOnly ? tomorrow : selectedDateEnd

  const basePatients = await prisma.patient.findMany({
    where: {
      patientId: { not: "PAT-WALKIN" },
      OR: q
        ? [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { patientId: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { appointments: { some: { id: { contains: q, mode: "insensitive" } } } },
          ]
        : undefined,
    },
    include: {
      user: true,
      appointments: {
        where: {
          appointmentDate: {
            gte: dateStart,
            lt: dateEnd,
          },
        },
        orderBy: {
          appointmentDate: "desc",
        },
        include: {
          doctor: {
            include: { user: true }
          }
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  })

  const enrichedPatients = basePatients
    .map((patient) => {
      const latestAppointment = patient.appointments[0] || null
      const status = latestAppointment?.status || "NO_APPOINTMENT"
      const queueTimeText = latestAppointment?.appointmentTime || "00:00"
      const [hh, mm] = queueTimeText.split(":").map((v) => Number(v) || 0)
      const appointmentTs = new Date(latestAppointment?.appointmentDate || patient.createdAt)
      appointmentTs.setHours(hh, mm, 0, 0)
      const waitMinutes = latestAppointment
        ? Math.max(0, Math.floor((Date.now() - appointmentTs.getTime()) / (1000 * 60)))
        : 0
      const criticalText = `${latestAppointment?.reason || ""} ${latestAppointment?.chiefComplaint || ""} ${latestAppointment?.symptoms || ""}`.toLowerCase()
      const isCritical =
        criticalText.includes("urgent") ||
        criticalText.includes("emergency") ||
        criticalText.includes("critical") ||
        criticalText.includes("severe")
      const isProfileComplete = !!(patient.dateOfBirth && patient.gender && patient.address)
      return {
        ...patient,
        latestAppointment,
        queueStatus: status,
        waitMinutes,
        isCritical,
        isProfileComplete,
        isCasualty: latestAppointment?.source === "CASUALTY",
        queueToken: latestAppointment ? latestAppointment.id.slice(-6).toUpperCase() : patient.id.slice(-6).toUpperCase(),
      }
    })
    .filter((p) => {
      if (statusFilter === "ALL") return true
      if (statusFilter === "WAITING") return p.queueStatus === "PENDING" || p.queueStatus === "SCHEDULED" || p.queueStatus === "CONFIRMED" || p.queueStatus === "WAITING"
      if (statusFilter === "VITALS_DONE") return p.queueStatus === "VITALS_DONE"
      if (statusFilter === "IN_CONSULTATION") return p.queueStatus === "IN_PROGRESS"
      if (statusFilter === "DONE") return p.queueStatus === "COMPLETED"
      return true
    })
    .sort((a, b) => {
      if (sortBy === "CRITICAL_FIRST") {
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1
        return b.waitMinutes - a.waitMinutes
      }
      if (sortBy === "WAIT_TIME") return b.waitMinutes - a.waitMinutes
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const totalCount = enrichedPatients.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const start = (currentPage - 1) * pageSize
  const allPatients = enrichedPatients.slice(start, start + pageSize)

  // Count patients registered today
  const todayPatientsCount = await prisma.patient.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  })

  const totalPatientsCount = await prisma.patient.count({
    where: { patientId: { not: "PAT-WALKIN" } }
  })

  // Fetch all doctors for appointment booking
  const doctors = await prisma.staff.findMany({
    where: {
      user: {
        role: "DOCTOR",
        isActive: true,
      },
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  })

  // Count today's appointments
  const todayAppointmentsCount = await prisma.appointment.count({
    where: {
      appointmentDate: {
        gte: today,
        lt: tomorrow,
      },
    },
  })

  // Count pending appointments (waiting)
  const pendingAppointmentsCount = await prisma.appointment.count({
    where: {
      status: AppointmentStatus.PENDING,
    },
  })

  return (
    <div className="space-y-6 pb-8 bg-[#e0e5ec] min-h-screen p-4 sm:p-8 rounded-[2.5rem] neo-flat mt-4">
      {/* Header with Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-800">
            Outpatient Department (OPD)
          </h2>
          <p className="text-sm font-semibold text-zinc-500 mt-2">
            Manage outpatient consultations and appointments
          </p>
        </div>
        <Link href="/dashboard/clinical/opd/register">
          <button className="px-5 py-2.5 rounded-full neo-flat text-blue-600 font-bold flex items-center transition-all active:scale-95 bg-[#e0e5ec]">
            <UserPlus className="mr-2 h-4 w-4" />
            New Patient
          </button>
        </Link>
      </div>

      {/* Queue Controls */}
      <div className="neo-flat rounded-[2rem] bg-[#e0e5ec] p-6">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-zinc-500 mb-2 block">
              Search patient / UHID / phone / token
            </label>
            <div className="neo-pressed rounded-xl bg-[#e0e5ec] overflow-hidden">
              <OPDSearchInput defaultValue={q} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 mb-2 block">Queue Status</label>
            <select name="status" defaultValue={statusFilter} className="h-10 w-full rounded-xl neo-pressed bg-[#e0e5ec] px-3 text-sm font-semibold text-zinc-700 outline-none border-none">
              <option value="ALL">All</option>
              <option value="WAITING">Waiting (Vitals Pending)</option>
              <option value="VITALS_DONE">Vitals Done</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 mb-2 block">Sort</label>
            <select name="sort" defaultValue={sortBy} className="h-10 w-full rounded-xl neo-pressed bg-[#e0e5ec] px-3 text-sm font-semibold text-zinc-700 outline-none border-none">
              <option value="RECENT">Recent First</option>
              <option value="WAIT_TIME">Wait Time</option>
              <option value="CRITICAL_FIRST">Critical First</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 mb-2 block">Date</label>
            <input type="date" name="date" defaultValue={format(selectedDate, "yyyy-MM-dd")} className="h-10 w-full rounded-xl neo-pressed bg-[#e0e5ec] px-3 text-sm font-semibold text-zinc-700 outline-none border-none" />
          </div>
          <div className="flex gap-3 items-center pb-1">
            <label className="text-xs font-bold text-zinc-600 flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="todayOnly" value="true" defaultChecked={todayOnly} className="w-4 h-4 rounded-sm" />
              Today only
            </label>
            <button type="submit" className="px-5 py-2 rounded-full neo-button text-zinc-700 font-bold bg-[#e0e5ec] active:scale-95 transition-all">Apply</button>
          </div>
        </form>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-zinc-600">Today's Patients</h3>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-800">{todayPatientsCount}</div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">Registered today</p>
          </div>
        </div>

        <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-zinc-600">Total Patients</h3>
            <Users className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-800">{totalPatientsCount}</div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">In database</p>
          </div>
        </div>

        <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-zinc-600">Appointments</h3>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-800">{todayAppointmentsCount}</div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">Scheduled for today</p>
          </div>
        </div>

        <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-zinc-600">Pending</h3>
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-800">{pendingAppointmentsCount}</div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">Awaiting confirmation</p>
          </div>
        </div>
      </div>

      {/* Recent Patients List */}
      <div className="neo-flat rounded-[2rem] bg-[#e0e5ec] p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
            <div className="p-1.5 rounded-full neo-pressed text-zinc-600">
              <Activity className="h-5 w-5" />
            </div>
            Recent Patients
          </h3>
          <p className="text-xs font-semibold text-zinc-500 mt-1 pl-10">Recently registered patients</p>
        </div>
        
        <div>
          {allPatients.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 neo-pressed rounded-full text-zinc-300 mb-4">
                <Users className="h-10 w-10" />
              </div>
              <p className="font-bold text-sm text-zinc-700">No patients registered yet</p>
              <p className="text-xs font-semibold text-zinc-500 mt-1">Click "New Patient" to register the first patient</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-pressed gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e0e5ec] neo-flat text-zinc-700 font-black text-lg flex-shrink-0">
                      {patient.user.name?.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-800">{patient.user.name}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-zinc-500 mt-1">
                        <span className="text-blue-600 bg-[#e0e5ec] neo-flat px-2 py-0.5 rounded-full">
                          {patient.patientId}
                        </span>
                        <span>TK-{patient.queueToken}</span>
                        <span>{patient.phone}</span>
                        {patient.gender && <span>{patient.gender}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center justify-end gap-2 mb-1.5">
                        {patient.isCritical && (
                          <span className="px-2 py-0.5 rounded-full neo-flat bg-[#e0e5ec] text-[10px] font-bold text-red-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            CRITICAL
                          </span>
                        )}
                        {patient.isCasualty && (
                          <span className="px-2 py-0.5 rounded-full neo-flat bg-[#e0e5ec] text-[10px] font-bold text-orange-600 flex items-center">
                            CASUALTY
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full neo-flat bg-[#e0e5ec] text-[10px] font-bold ${
                          !patient.isProfileComplete
                            ? "text-red-500"
                            : !patient.latestAppointment
                            ? "text-zinc-400"
                            : patient.queueStatus === "PENDING"
                            ? "text-orange-500"
                            : patient.queueStatus === "VITALS_DONE"
                            ? "text-green-600"
                            : patient.queueStatus === "IN_PROGRESS"
                            ? "text-blue-500"
                            : patient.queueStatus === "COMPLETED"
                            ? "text-emerald-500"
                            : "text-zinc-500"
                        }`}>
                          {!patient.isProfileComplete
                            ? "⚠️ Incomplete Profile"
                            : !patient.latestAppointment
                            ? "📋 No Appointment"
                            : patient.queueStatus === "PENDING"
                            ? "⏳ Awaiting Vitals"
                            : patient.queueStatus === "VITALS_DONE"
                            ? "✅ Vitals Done"
                            : patient.queueStatus === "IN_PROGRESS"
                            ? "In Consultation"
                            : patient.queueStatus === "COMPLETED"
                            ? ((patient.latestAppointment as any)?.isPaperConsultation ? "📄 Paper OPD Done" : "Done")
                            : patient.queueStatus}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Registered {format(new Date(patient.createdAt), "MMM dd, yyyy")} • {format(new Date(patient.createdAt), "hh:mm a")}
                      </p>
                      {patient.latestAppointment && (
                        <p className="text-[11px] font-bold text-orange-600 mt-1">
                          Wait: {patient.waitMinutes} min
                        </p>
                      )}
                    </div>
                    {/* Wrap action buttons to match style if possible, or leave as is if component isn't easily restyled */}
                    <div className="neo-flat bg-[#e0e5ec] p-1 rounded-[1.25rem]">
                      <PatientActionButtons
                        patientId={patient.id}
                        patientName={patient.user.name || "Patient"}
                        patientPhone={patient.phone}
                        appointment={patient.appointments[0] || null}
                        doctors={doctors as any}
                        isProfileComplete={patient.isProfileComplete}
                        hideConsultation={true}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 mt-6 border-t-2 border-zinc-200/50">
                  <div className="text-xs font-semibold text-zinc-500">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} patients
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/clinical/opd?page=${currentPage - 1}&q=${encodeURIComponent(q)}&status=${statusFilter}&sort=${sortBy}&date=${format(selectedDate, "yyyy-MM-dd")}&todayOnly=${todayOnly}`}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    >
                      <button className="px-3 py-1.5 rounded-full neo-button bg-[#e0e5ec] text-xs font-bold text-zinc-600 flex items-center active:scale-95 transition-all">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Prev
                      </button>
                    </Link>
                    
                    <div className="text-xs font-black text-zinc-700 px-2">
                      {currentPage} / {totalPages}
                    </div>
                    
                    <Link
                      href={`/dashboard/clinical/opd?page=${currentPage + 1}&q=${encodeURIComponent(q)}&status=${statusFilter}&sort=${sortBy}&date=${format(selectedDate, "yyyy-MM-dd")}&todayOnly=${todayOnly}`}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    >
                      <button className="px-3 py-1.5 rounded-full neo-button bg-[#e0e5ec] text-xs font-bold text-zinc-600 flex items-center active:scale-95 transition-all">
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
