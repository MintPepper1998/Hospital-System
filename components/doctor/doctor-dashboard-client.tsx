"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Users, CheckCircle2, Clock, Stethoscope, Activity, BedDouble,
  FlaskConical, Calendar, ChevronRight, Pill, FolderOpen, Keyboard,
  TrendingUp, Heart, Thermometer, Gauge, Weight, Wind,
  UserCheck, AlertCircle, ArrowRight, History, Search, FileText, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"

// ── Types ──
interface TodayAppt {
  id: string; patientDbId: string; appointmentTime: string;
  reason: string | null; chiefComplaint: string | null; symptoms: string | null;
  status: string; bloodPressure: string | null; pulse: string | null;
  temperature: string | null; spo2: string | null; weight: string | null;
  patient: { patientId: string; user: { name: string | null } }
}
interface UpcomingAppt {
  id: string; appointmentDate: string; appointmentTime: string;
  status: string; reason: string | null;
  patient: { patientId: string; user: { name: string | null } }
}
interface RecentAppt {
  id: string; appointmentDate: string; diagnosis: string | null;
  patient: { patientId: string; user: { name: string | null } }
}
interface IpdPatient {
  admissionId: string; bedNumber: string; wardName: string;
  patientName: string; patientAge: string; patientGender: string;
  diagnosis: string; admissionDate: string; activeMedsCount: number
}
interface PrescriptionMed {
  id: string; medicationName: string; dosage: string;
  frequency: string; duration: string; quantity: number;
  instructions: string | null
}
interface PastPrescription {
  id: string; prescriptionDate: string;
  instructions: string | null; medications: PrescriptionMed[]
}
interface PastPatient {
  id: string; appointmentDate: string; appointmentTime: string;
  diagnosis: string | null; chiefComplaint: string | null;
  patient: {
    patientId: string;
    user: { name: string | null };
    prescriptions: PastPrescription[]
  }
}
interface Stats {
  totalToday: number; completed: number; pending: number;
  inProgress: number; vitalsDone: number; myInPatients: number;
  pendingLabResults: number; totalPatientsSeen: number
}
interface Props {
  doctorName: string; specialization: string | null; department: string | null;
  dateLabel: string; stats: Stats; todayAppointments: TodayAppt[];
  upcomingAppointments: UpcomingAppt[]; recentPatients: RecentAppt[];
  ipdPatients: IpdPatient[]; pastPatients: PastPatient[]
}

// ── Helpers ──
function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"
}
function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}
const COLORS = [
  "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600", "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-cyan-500 to-sky-600",
]
function statusBadge(s: string) {
  const m: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "Waiting", cls: "bg-amber-100 text-amber-700" },
    VITALS_DONE: { label: "Vitals ✓", cls: "bg-green-100 text-green-700" },
    IN_PROGRESS: { label: "In Progress", cls: "bg-violet-100 text-violet-700" },
    COMPLETED: { label: "Done", cls: "bg-emerald-100 text-emerald-700" },
    CONFIRMED: { label: "Confirmed", cls: "bg-blue-100 text-blue-700" },
    SCHEDULED: { label: "Scheduled", cls: "bg-sky-100 text-sky-700" },
    CANCELLED: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
  }
  return m[s] || { label: s, cls: "bg-gray-100 text-gray-600" }
}

export function DoctorDashboardClient({
  doctorName, specialization, department, dateLabel, stats,
  todayAppointments, upcomingAppointments, recentPatients, ipdPatients, pastPatients,
}: Props) {
  const [time, setTime] = useState("")
  const [activeTab, setActiveTab] = useState<"queue" | "ipd" | "past">("queue")
  const [pastSearch, setPastSearch] = useState("")
  const [prescriptionPatient, setPrescriptionPatient] = useState<PastPatient | null>(null)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }))
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "q") setActiveTab("queue")
      if (e.key === "i") setActiveTab("ipd")
      if (e.key === "h") setActiveTab("past")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const completionPct = stats.totalToday > 0 ? Math.round((stats.completed / stats.totalToday) * 100) : 0
  const nextPatient = todayAppointments.find(a => a.status === "VITALS_DONE" || a.status === "PENDING")

  // Filter past patients by search
  const filteredPastPatients = pastPatients.filter(p => {
    if (!pastSearch.trim()) return true
    const q = pastSearch.toLowerCase()
    return (
      p.patient.user.name?.toLowerCase().includes(q) ||
      p.patient.patientId.toLowerCase().includes(q) ||
      p.diagnosis?.toLowerCase().includes(q) ||
      p.chiefComplaint?.toLowerCase().includes(q)
    )
  })

  const openPrescriptions = (patient: PastPatient) => {
    setPrescriptionPatient(patient)
    setShowPrescriptionModal(true)
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8">
      {/* ── HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0052A3] via-[#0066CC] to-[#2980D4] p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium">{getGreeting()}</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">Dr. {doctorName.split(" ").pop()}</h1>
            <p className="text-blue-200 text-sm mt-1">
              {specialization || department || "General Medicine"} &middot; {dateLabel}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-3xl font-bold tabular-nums" suppressHydrationWarning>{time}</p>
              <p className="text-blue-200 text-xs mt-1">Live Clock</p>
            </div>
            {nextPatient && (
              <Link href={`/dashboard/clinical/emr/${nextPatient.id}`}>
                <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Next Patient: {nextPatient.patient.user.name?.split(" ")[0] || "—"}
                </Button>
              </Link>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="relative mt-5">
          <div className="flex justify-between text-xs text-blue-200 mb-1.5">
            <span>Today&apos;s Progress</span>
            <span>{stats.completed}/{stats.totalToday} completed ({completionPct}%)</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-green-300 rounded-full transition-all duration-1000"
              style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Today", value: stats.totalToday, sub: "Scheduled", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
          { label: "Completed", value: stats.completed, sub: `${completionPct}%`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
          { label: "In Queue", value: stats.pending, sub: "Waiting", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
          { label: "Active", value: stats.inProgress, sub: "Consulting", icon: Stethoscope, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
          { label: "IPD", value: stats.myInPatients, sub: "Admitted", icon: BedDouble, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
          { label: "Lab Pending", value: stats.pendingLabResults, sub: "Results", icon: FlaskConical, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border ${card.border} bg-white p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{card.label}</span>
              <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── SHORTCUTS BAR ── */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-white rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-500 mr-2">
          <Keyboard className="h-4 w-4" /> <span className="font-semibold text-gray-700">Shortcuts:</span>
        </div>
        {[
          { key: "Q", label: "Queue", href: "#" },
          { key: "I", label: "IPD", href: "#" },
          { key: "H", label: "History", href: "#" },
        ].map(s => (
          <button key={s.key} onClick={() => setActiveTab(s.key === "Q" ? "queue" : s.key === "I" ? "ipd" : "past")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors">
            <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px] font-mono font-bold shadow-sm">{s.key}</kbd>
            {s.label}
          </button>
        ))}
        <div className="h-4 w-px bg-gray-200 mx-1" />
        {[
          { label: "OPD Queue", href: "/dashboard/clinical/opd", icon: Users },
          { label: "Prescriptions", href: "/dashboard/pharmacy", icon: Pill },
          { label: "Lab Orders", href: "/dashboard/lab", icon: FlaskConical },
          { label: "Patient Records", href: "/dashboard/clinical/opd", icon: FolderOpen },
          { label: "IPD Rounds", href: "/dashboard/ipd", icon: BedDouble },
        ].map(a => (
          <Link key={a.label} href={a.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-medium text-blue-700 transition-colors">
            <a.icon className="h-3.5 w-3.5" /> {a.label}
          </Link>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT: Patient Queue / IPD (8 cols) */}
        <div className="xl:col-span-8 space-y-5">
          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
            <button onClick={() => setActiveTab("queue")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "queue" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Users className="inline h-4 w-4 mr-1.5 -mt-0.5" />
              OPD Queue ({todayAppointments.length})
            </button>
            <button onClick={() => setActiveTab("ipd")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "ipd" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <BedDouble className="inline h-4 w-4 mr-1.5 -mt-0.5" />
              My IPD Patients ({ipdPatients.length})
            </button>
            <button onClick={() => setActiveTab("past")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "past" ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <History className="inline h-4 w-4 mr-1.5 -mt-0.5" />
              Past Patients ({pastPatients.length})
            </button>
          </div>

          {/* OPD Queue Tab */}
          {activeTab === "queue" && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Today&apos;s Patient Queue</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
                </div>
                <Link href="/dashboard/clinical/opd">
                  <Button variant="outline" size="sm" className="text-xs">View Full OPD <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                </Link>
              </div>
              {todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Calendar className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">No appointments scheduled today</p>
                  <p className="text-xs mt-1">Enjoy your free day, Doctor!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {todayAppointments.map((appt, idx) => {
                    const st = statusBadge(appt.status)
                    const grad = COLORS[idx % COLORS.length]
                    const isActive = appt.status === "IN_PROGRESS"
                    const isReady = appt.status === "VITALS_DONE"
                    return (
                      <div key={appt.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group ${isActive ? "bg-violet-50/50 border-l-4 border-l-violet-500" : isReady ? "bg-green-50/30 border-l-4 border-l-green-500" : ""}`}>
                        {/* Time */}
                        <div className="w-16 text-right flex-shrink-0">
                          <span className={`text-sm font-semibold tabular-nums ${isActive ? "text-violet-700" : "text-gray-700"}`}>
                            {appt.appointmentTime}
                          </span>
                        </div>
                        {/* Avatar */}
                        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <span className="text-xs font-bold text-white">{initials(appt.patient.user.name)}</span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{appt.patient.user.name || "Unknown"}</p>
                            <span className="text-[10px] font-mono text-gray-400">{appt.patient.patientId}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {appt.chiefComplaint || appt.reason || "General Consultation"}
                          </p>
                        </div>
                        {/* Vitals mini */}
                        {appt.bloodPressure && (
                          <div className="hidden lg:flex items-center gap-3 text-[10px] text-gray-500 flex-shrink-0">
                            {appt.bloodPressure && <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 text-red-400" />{appt.bloodPressure}</span>}
                            {appt.pulse && <span className="flex items-center gap-0.5"><Activity className="h-3 w-3 text-orange-400" />{appt.pulse}</span>}
                            {appt.spo2 && <span className="flex items-center gap-0.5"><Wind className="h-3 w-3 text-blue-400" />{appt.spo2}</span>}
                          </div>
                        )}
                        {/* Status */}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex-shrink-0 ${st.cls}`}>{st.label}</span>
                        {/* Action */}
                        {(isReady || isActive) && (
                          <Link href={`/dashboard/clinical/emr/${appt.id}`} className="flex-shrink-0">
                            <Button size="sm" className={`text-xs ${isActive ? "bg-violet-600 hover:bg-violet-700" : "bg-green-600 hover:bg-green-700"} text-white`}>
                              <Stethoscope className="mr-1 h-3.5 w-3.5" />
                              {isActive ? "Continue" : "Start Consultation"}
                            </Button>
                          </Link>
                        )}
                        {!isReady && !isActive && ["PENDING", "SCHEDULED", "CONFIRMED", "WAITING"].includes(appt.status) && (
                          <Button size="sm" variant="outline" disabled className="text-xs bg-gray-50 text-gray-400 border-gray-200 flex-shrink-0">
                            <Activity className="mr-1 h-3.5 w-3.5" />
                            Vitals Pending
                          </Button>
                        )}
                        {!isReady && !isActive && !["PENDING", "SCHEDULED", "CONFIRMED", "WAITING"].includes(appt.status) && (
                          <Link href={`/dashboard/clinical/emr/${appt.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4 text-gray-400" /></Button>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* IPD Tab */}
          {activeTab === "ipd" && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">My Admitted Patients</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{ipdPatients.length} currently admitted</p>
                </div>
                <Link href="/dashboard/ipd">
                  <Button variant="outline" size="sm" className="text-xs">IPD Dashboard <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                </Link>
              </div>
              {ipdPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <BedDouble className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">No admitted patients</p>
                </div>
              ) : (
                <div className="divide-y">
                  {ipdPatients.map((p, idx) => (
                    <Link key={p.admissionId} href={`/dashboard/ipd/patient/${p.admissionId}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${COLORS[idx % COLORS.length]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <span className="text-xs font-bold text-white">{initials(p.patientName)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.patientName}</p>
                        <p className="text-xs text-gray-500 truncate">{p.diagnosis}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{p.wardName}</span>
                        <span className="font-mono">Bed {p.bedNumber}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">{p.patientAge} / {p.patientGender}</p>
                        <p className="text-[10px] text-gray-400">{p.activeMedsCount} active meds</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Past Patients Tab */}
          {activeTab === "past" && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <History className="h-4.5 w-4.5 text-amber-600" />
                    Past Patients
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{pastPatients.length} previous consultations</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, diagnosis..."
                    value={pastSearch}
                    onChange={e => setPastSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-xs border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all w-full sm:w-64"
                  />
                  {pastSearch && (
                    <button onClick={() => setPastSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
              {filteredPastPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <History className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">{pastSearch ? "No matching patients found" : "No past patients"}</p>
                  {pastSearch && <p className="text-xs mt-1">Try a different search term</p>}
                </div>
              ) : (
                <div className="divide-y max-h-[520px] overflow-y-auto">
                  {filteredPastPatients.map((appt, idx) => {
                    const grad = COLORS[idx % COLORS.length]
                    const hasRx = appt.patient.prescriptions.length > 0
                    return (
                      <div key={appt.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                        {/* Avatar */}
                        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <span className="text-xs font-bold text-white">{initials(appt.patient.user.name)}</span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{appt.patient.user.name || "Unknown"}</p>
                            <span className="text-[10px] font-mono text-gray-400">{appt.patient.patientId}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {appt.diagnosis || appt.chiefComplaint || "General Consultation"}
                          </p>
                        </div>
                        {/* Date */}
                        <div className="hidden md:block text-right flex-shrink-0">
                          <p className="text-xs font-medium text-gray-600">
                            {format(new Date(appt.appointmentDate), "MMM d, yyyy")}
                          </p>
                          <p className="text-[10px] text-gray-400">{appt.appointmentTime}</p>
                        </div>
                        {/* Prescription Button */}
                        <Button
                          size="sm"
                          variant={hasRx ? "default" : "outline"}
                          onClick={() => openPrescriptions(appt)}
                          className={`text-xs flex-shrink-0 gap-1.5 ${hasRx ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm" : "text-gray-500"}`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {hasRx ? `Rx (${appt.patient.prescriptions.length})` : "No Rx"}
                        </Button>
                        {/* EMR link */}
                        <Link href={`/dashboard/clinical/emr/${appt.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </Button>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (4 cols) */}
        <div className="xl:col-span-4 space-y-5">
          {/* Upcoming */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-50 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Upcoming</h3>
                  <p className="text-[10px] text-gray-400">Next 7 days</p>
                </div>
              </div>
            </div>
            {upcomingAppointments.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-xs">No upcoming appointments</div>
            ) : (
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {upcomingAppointments.map((a, idx) => (
                  <Link key={a.id} href={`/dashboard/clinical/emr/${a.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${COLORS[idx % COLORS.length]} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-[10px] font-bold text-white">{initials(a.patient.user.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.patient.user.name}</p>
                      <p className="text-[10px] text-gray-400">{format(new Date(a.appointmentDate), "EEE, MMM d")} &middot; {a.appointmentTime}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Consultations */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Recent Consultations</h3>
                <p className="text-[10px] text-gray-400">{stats.totalPatientsSeen} total seen</p>
              </div>
            </div>
            {recentPatients.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-xs">No recent consultations</div>
            ) : (
              <div className="divide-y max-h-[280px] overflow-y-auto">
                {recentPatients.map((a, idx) => (
                  <Link key={a.id} href={`/dashboard/clinical/emr/${a.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${COLORS[idx % COLORS.length]} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-[10px] font-bold text-white">{initials(a.patient.user.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.patient.user.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {format(new Date(a.appointmentDate), "MMM d")} &middot; {a.diagnosis?.substring(0, 30) || "General"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Performance Card */}
          <div className="rounded-2xl border bg-gradient-to-br from-[#0052A3] to-[#0066CC] p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-200" />
              <h3 className="text-sm font-bold">Your Performance</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-2xl font-bold">{stats.totalPatientsSeen}</p>
                <p className="text-[10px] text-blue-200 mt-0.5">Total Consultations</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-2xl font-bold">{completionPct}%</p>
                <p className="text-[10px] text-blue-200 mt-0.5">Today&apos;s Rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRESCRIPTION MODAL ── */}
      <Dialog open={showPrescriptionModal} onOpenChange={setShowPrescriptionModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Prescriptions — {prescriptionPatient?.patient.user.name || "Patient"}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3 text-xs">
              <span className="font-mono text-gray-500">{prescriptionPatient?.patient.patientId}</span>
              <span className="text-gray-300">•</span>
              <span>Visit: {prescriptionPatient ? format(new Date(prescriptionPatient.appointmentDate), "MMM d, yyyy") : ""}</span>
              {prescriptionPatient?.diagnosis && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-orange-600 font-medium">{prescriptionPatient.diagnosis}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {prescriptionPatient && prescriptionPatient.patient.prescriptions.length > 0 ? (
            <div className="space-y-4 mt-2">
              {prescriptionPatient.patient.prescriptions.map((rx, rxIdx) => (
                <div key={rx.id} className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Prescription header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-900">Prescription #{rxIdx + 1}</span>
                    </div>
                    <span className="text-xs text-violet-600 font-medium">
                      {format(new Date(rx.prescriptionDate), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  {/* Medications table */}
                  {rx.medications.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Medicine</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Dosage</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Frequency</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Duration</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rx.medications.map((med, medIdx) => (
                            <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2.5 text-gray-400 text-xs">{medIdx + 1}</td>
                              <td className="px-4 py-2.5">
                                <p className="font-medium text-gray-900">{med.medicationName}</p>
                                {med.instructions && (
                                  <p className="text-[10px] text-gray-400 mt-0.5 italic">{med.instructions}</p>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{med.dosage}</span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-600">{med.frequency}</td>
                              <td className="px-4 py-2.5 text-gray-600">{med.duration}</td>
                              <td className="px-4 py-2.5">
                                <span className="font-semibold text-gray-900">{med.quantity}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-400 text-xs">No medications in this prescription</div>
                  )}
                  {/* Instructions */}
                  {rx.instructions && (
                    <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                      <p className="text-xs text-amber-800">
                        <strong className="text-amber-900">Instructions:</strong> {rx.instructions}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText className="h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">No prescriptions found</p>
              <p className="text-xs mt-1">This patient has no recorded prescriptions</p>
            </div>
          )}

          {/* View full history link */}
          {prescriptionPatient && (
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <Link href={`/dashboard/clinical/patient/${prescriptionPatient.patient.patientId}`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  View Full Patient History
                </Button>
              </Link>
              <Link href={`/dashboard/clinical/emr/${prescriptionPatient.id}`}>
                <Button size="sm" className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Open EMR Record
                </Button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
