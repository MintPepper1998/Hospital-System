"use client"

import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import {
  Bed,
  Activity,
  Pill,
  UserPlus,
  LogOut,
  FileText,
  Clock,
  AlertTriangle,
  HeartPulse,
  ChevronRight,
  Thermometer,
  Droplets,
  Wind,
  MapPin,
  Wrench,
} from "lucide-react"
import type { NurseStats, WardPatient } from "@/app/actions/nurse-dashboard"

// ============================================
// PROPS & HELPERS
// ============================================

interface NurseViewProps {
  userName: string
  stats: NurseStats
  patients: WardPatient[]
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good Morning"
  if (hour < 17) return "Good Afternoon"
  return "Good Evening"
}

function getShiftLabel(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 14) return "Morning Shift"
  if (hour >= 14 && hour < 22) return "Evening Shift"
  return "Night Shift"
}

/** Group patients by ward name */
function groupByWard(patients: WardPatient[]): Record<string, WardPatient[]> {
  const groups: Record<string, WardPatient[]> = {}
  for (const p of patients) {
    const key = `${p.wardName} (${p.wardType})`
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }
  return groups
}

// ============================================
// MAIN COMPONENT
// ============================================

export function NurseView({ userName, stats, patients }: NurseViewProps) {
  const greeting = getGreeting()
  const shift = getShiftLabel()
  const wards = groupByWard(patients)
  const wardEntries = Object.entries(wards)
  const firstName = userName.split(" ")[0]

  return (
    <div className="space-y-6 pb-8">
      {/* ━━━ HERO HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-6 py-6 sm:px-8 sm:py-7">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/[0.07] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/[0.05] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Pulse icon */}
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-xl bg-rose-500/20 ring-1 ring-rose-400/30 flex-shrink-0">
              <HeartPulse className="h-7 w-7 text-rose-400" />
            </div>
            <div>
              <p className="text-rose-300/80 text-xs font-medium tracking-widest uppercase">
                {shift} &middot; Nursing Station
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight" style={{ fontFamily: "var(--font-geist-sans)" }}>
                {greeting}, {firstName}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {format(new Date(), "EEEE, dd MMMM yyyy")}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 sm:flex-col sm:gap-2">
            <Link href="/dashboard/ipd" className="flex-1 sm:flex-none">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 text-sm font-medium transition-all ring-1 ring-white/[0.08] hover:ring-white/[0.15]">
                <Bed className="h-4 w-4 text-cyan-400" />
                <span>Bed Map</span>
              </button>
            </Link>
            <Link href="/dashboard/ipd/admission" className="flex-1 sm:flex-none">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-all shadow-lg shadow-rose-500/25">
                <UserPlus className="h-4 w-4" />
                <span>Admit Patient</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ━━━ VITAL SIGN READOUT CARDS ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Active In-Patients */}
        <StatReadout
          label="In-Patients"
          value={stats.activePatients}
          icon={<Bed className="h-5 w-5" />}
          accentClass="text-cyan-500 bg-cyan-500/10 ring-cyan-500/20"
          borderClass="border-b-cyan-500"
        />

        {/* Vitals Pending */}
        <StatReadout
          label="Vitals Pending"
          value={stats.vitalsPending}
          icon={<Activity className="h-5 w-5" />}
          accentClass={
            stats.vitalsPending > 0
              ? "text-red-500 bg-red-500/10 ring-red-500/20"
              : "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20"
          }
          borderClass={stats.vitalsPending > 0 ? "border-b-red-500" : "border-b-emerald-500"}
          valueClass={stats.vitalsPending > 0 ? "text-red-600" : "text-emerald-600"}
          pulse={stats.vitalsPending > 0}
          footnote={stats.vitalsPending > 0 ? "Overdue > 6hrs" : "All up to date"}
        />

        {/* Active Meds */}
        <StatReadout
          label="Active Meds"
          value={stats.medsDue}
          icon={<Pill className="h-5 w-5" />}
          accentClass="text-violet-500 bg-violet-500/10 ring-violet-500/20"
          borderClass="border-b-violet-500"
        />

        {/* New Today */}
        <StatReadout
          label="Admitted Today"
          value={stats.todayAdmissions}
          icon={<UserPlus className="h-5 w-5" />}
          accentClass="text-amber-500 bg-amber-500/10 ring-amber-500/20"
          borderClass="border-b-amber-500"
        />

        {/* Discharged Today */}
        <StatReadout
          label="Discharged"
          value={stats.todayDischarges}
          icon={<LogOut className="h-5 w-5" />}
          accentClass="text-slate-500 bg-slate-500/10 ring-slate-500/20"
          borderClass="border-b-slate-400"
        />
      </div>

      {/* ━━━ WARD-GROUPED PATIENT CARDS ━━━━━━━━━━━━━━━━━━ */}
      {patients.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {wardEntries.map(([wardLabel, wardPatients]) => (
            <WardSection key={wardLabel} wardLabel={wardLabel} patients={wardPatients} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// STAT READOUT CARD
// ============================================

function StatReadout({
  label,
  value,
  icon,
  accentClass,
  borderClass,
  valueClass,
  pulse,
  footnote,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accentClass: string
  borderClass: string
  valueClass?: string
  pulse?: boolean
  footnote?: string
}) {
  return (
    <div className={`relative bg-white rounded-xl border border-gray-100 border-b-[3px] ${borderClass} p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-none">
            {label}
          </p>
          <p className={`text-3xl font-bold mt-2 tracking-tight ${valueClass || "text-slate-900"}`} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
            {value}
          </p>
          {footnote && (
            <p className={`text-[10px] mt-1 font-medium ${pulse ? "text-red-500" : "text-emerald-600"}`}>
              {footnote}
            </p>
          )}
        </div>
        <div className={`relative h-10 w-10 rounded-lg flex items-center justify-center ring-1 ${accentClass}`}>
          {icon}
          {pulse && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-20 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Bed className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">No Active In-Patients</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
        All beds are currently available. New admissions will appear here automatically.
      </p>
      <Link href="/dashboard/ipd/admission">
        <button className="mt-5 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors shadow-lg shadow-rose-500/20">
          <UserPlus className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Admit a Patient
        </button>
      </Link>
    </div>
  )
}

// ============================================
// WARD SECTION
// ============================================

function WardSection({ wardLabel, patients }: { wardLabel: string; patients: WardPatient[] }) {
  const pendingCount = patients.filter((p) => p.vitalsPending).length

  return (
    <section>
      {/* Ward Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {wardLabel}
          </h3>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">{patients.length} patients</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-red-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              {pendingCount} vitals due
            </span>
          )}
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {patients.map((p) => (
          <PatientCard key={p.admissionId} patient={p} />
        ))}
      </div>
    </section>
  )
}

// ============================================
// PATIENT CARD
// ============================================

function PatientCard({ patient: p }: { patient: WardPatient }) {
  const isUrgent = p.vitalsPending

  return (
    <div className={`group relative rounded-xl border bg-white overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${isUrgent ? "border-red-200 ring-1 ring-red-100" : "border-gray-150 hover:border-gray-200"}`}>
      {/* Urgent top strip */}
      {isUrgent && (
        <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
      )}

      <div className="p-4">
        {/* Row 1: Bed + Patient + Status */}
        <div className="flex items-start gap-3">
          {/* Bed Number Badge */}
          <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex flex-col items-center justify-center ${isUrgent ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50 ring-1 ring-slate-200"}`}>
            <span className="text-[10px] text-slate-400 font-medium leading-none">BED</span>
            <span className="text-sm font-bold text-slate-800 leading-tight" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
              {p.bedNumber.replace(/^[A-Z]+-/, "")}
            </span>
          </div>

          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/ipd/patient/${p.admissionId}`}
              className="text-sm font-semibold text-slate-900 hover:text-rose-600 transition-colors truncate block"
            >
              {p.patientName}
            </Link>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {p.patientAge} / {p.patientGender} &middot; Dr. {p.doctorName.replace(/^Dr\.?\s*/i, "")}
            </p>
          </div>

          {/* Status Indicator */}
          <div className="flex-shrink-0">
            {isUrgent ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            ) : (
              <span className="inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-emerald-500/20" />
            )}
          </div>
        </div>

        {/* Row 2: Vitals Summary Chips */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {isUrgent ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-md ring-1 ring-red-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              Vitals overdue
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md ring-1 ring-emerald-200">
              <Activity className="h-2.5 w-2.5" />
              Vitals OK
            </span>
          )}
          {p.activeMedsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-50 px-2 py-1 rounded-md ring-1 ring-violet-200">
              <Pill className="h-2.5 w-2.5" />
              {p.activeMedsCount} meds
            </span>
          )}
          {p.activeEquipmentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md ring-1 ring-amber-200" title={p.equipmentNames.join(", ")}>
              <Wrench className="h-2.5 w-2.5" />
              {p.activeEquipmentCount} equip
            </span>
          )}
          {p.lastVitalsAt && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
              <Clock className="h-2.5 w-2.5" />
              {formatDistanceToNow(new Date(p.lastVitalsAt), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Row 3: Diagnosis (collapsed) */}
        {p.diagnosis && p.diagnosis !== "—" && (
          <p className="text-[11px] text-slate-500 mt-2 truncate italic">
            {p.diagnosis}
          </p>
        )}

        {/* Row 4: Action Buttons */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
          <Link href={`/dashboard/ipd/patient/${p.admissionId}?tab=vitals`} className="flex-1">
            <button className={`w-full flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-lg transition-all ${isUrgent ? "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <Thermometer className="h-3 w-3" />
              Vitals
            </button>
          </Link>
          <Link href={`/dashboard/ipd/patient/${p.admissionId}?tab=medications`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all ring-1 ring-violet-200/50">
              <Pill className="h-3 w-3" />
              Meds
            </button>
          </Link>
          <Link href={`/dashboard/ipd/patient/${p.admissionId}?tab=notes`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all ring-1 ring-slate-200/50">
              <FileText className="h-3 w-3" />
              Notes
            </button>
          </Link>
          <Link href={`/dashboard/ipd/patient/${p.admissionId}?tab=equipment`} className="flex-1">
            <button className={`w-full flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-lg transition-all ring-1 ${p.activeEquipmentCount > 0 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-200/50' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 ring-slate-200/50'}`}>
              <Wrench className="h-3 w-3" />
              Equip{p.activeEquipmentCount > 0 ? ` (${p.activeEquipmentCount})` : ''}
            </button>
          </Link>
          <Link href={`/dashboard/ipd/patient/${p.admissionId}`}>
            <button className="h-[34px] w-[34px] flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all ring-1 ring-slate-200/50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
