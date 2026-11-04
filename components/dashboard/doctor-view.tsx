"use client"

import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Stethoscope,
  Bed,
  FlaskConical,
  Clock,
  Play,
  FileText,
  Activity,
  ChevronRight,
  ClipboardList,
  Users,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Plus,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  Heart,
  Thermometer,
  Wind,
  Pill,
  TestTube,
  ArrowUpRight,
  RefreshCw,
  FileCode,
  PenLine,
  Pause,
  Save,
  Timer,
  ChevronDown,
  User,
  Clipboard,
  Send,
} from "lucide-react"
import type {
  DoctorStats,
  OpdAppointment,
  IpdPatient,
} from "@/app/actions/doctor-dashboard"

// ============================================
// PROPS
// ============================================

interface DoctorViewProps {
  doctorName: string
  specialization: string | null
  stats: DoctorStats
  todayOPD: OpdAppointment[]
  myIPD: IpdPatient[]
}

// ============================================
// HELPERS
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING: { label: "Ready", color: "text-blue-600", dot: "bg-blue-500" },
  SCHEDULED: { label: "Scheduled", color: "text-blue-600", dot: "bg-blue-500" },
  CONFIRMED: { label: "Ready", color: "text-blue-600", dot: "bg-blue-500" },
  WAITING: { label: "Waiting", color: "text-amber-600", dot: "bg-amber-500" },
  IN_PROGRESS: { label: "In Progress", color: "text-green-600", dot: "bg-green-500" },
  COMPLETED: { label: "Done", color: "text-gray-400", dot: "bg-gray-300" },
  CANCELLED: { label: "Cancelled", color: "text-red-500", dot: "bg-red-400" },
  NO_SHOW: { label: "No Show", color: "text-gray-400", dot: "bg-gray-300" },
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  "from-orange-400 to-orange-600",
  "from-teal-400 to-teal-600",
  "from-violet-400 to-violet-600",
  "from-rose-400 to-rose-600",
  "from-blue-400 to-blue-600",
]

// ============================================
// MAIN COMPONENT
// ============================================

export function DoctorView({ doctorName, specialization, stats, todayOPD, myIPD }: DoctorViewProps) {
  const cleanName = doctorName.replace(/^Dr\.?\s*/i, "")
  const totalPatients = stats.todayAppointments
  const completedConsults = stats.completedToday
  const pendingReviews = stats.pendingToday + stats.inProgressToday

  // Currently selected patient (first in queue or null)
  const activePatient = todayOPD.length > 0 ? todayOPD[0] : null

  return (
    <div className="space-y-4 pb-6">

      {/* ── TOP NAV TABS ──────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-6">
          <h2 className="text-lg font-bold text-indigo-700">Doctor Portal</h2>
          <nav className="flex items-center gap-1">
            {[
              { label: "Dashboard", href: "/dashboard", active: true },
              { label: "My Patients", href: "/dashboard/clinical/emr" },
              { label: "Appointments", href: "/dashboard/clinical/opd" },
              { label: "Prescriptions", href: "/dashboard/clinical/opd" },
              { label: "Lab Orders", href: "/dashboard/lab/reports" },
              { label: "Reports", href: "/dashboard/reports" },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  tab.active
                    ? "text-gray-900 border-b-2 border-indigo-600 bg-indigo-50/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── CLINICAL WORKFLOW STEPPER ──────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">Clinical Workflow</h3>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { step: 1, label: "View Patient\nQueue", icon: Users, active: true },
            { step: 2, label: "Start\nConsultation", icon: Stethoscope, active: false },
            { step: 3, label: "Write\nPrescription", icon: PenLine, active: false },
            { step: 4, label: "Order Lab\nTests", icon: FlaskConical, active: false },
          ].map((item, idx) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className={`text-xs font-medium whitespace-pre-line leading-tight ${
                  item.active ? "text-indigo-700" : "text-gray-400"
                }`}>
                  {item.label}
                </span>
              </div>
              {idx < 3 && (
                <div className="w-8 h-px bg-gray-200 flex-shrink-0 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 4 STAT CARDS ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Patients Today (Purple) */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-4 text-white relative overflow-hidden shadow-md shadow-indigo-200/50">
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/20 text-white border-0 text-[9px] font-bold px-1.5">
              +{Math.max(1, stats.pendingToday)} NEW
            </Badge>
          </div>
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center mb-3">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight">{totalPatients}</p>
          <p className="text-xs text-indigo-100 font-medium mt-0.5">Patients Today</p>
        </div>

        {/* Pending Reviews (Amber) */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/80 rounded-2xl p-4 border border-amber-200/50 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <Badge className="bg-amber-200 text-amber-800 border-0 text-[9px] font-bold px-1.5">
              ACTION REQUIRED
            </Badge>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-200/60 flex items-center justify-center mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{String(pendingReviews).padStart(2, "0")}</p>
          <p className="text-xs text-amber-700 font-medium mt-0.5">Pending Reviews</p>
        </div>

        {/* Completed Consults (Green) */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white relative overflow-hidden shadow-md shadow-emerald-200/50">
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/20 text-white border-0 text-[9px] font-bold px-1.5">
              TARGET MET
            </Badge>
          </div>
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight">{completedConsults}</p>
          <p className="text-xs text-emerald-100 font-medium mt-0.5">Completed Consults</p>
        </div>

        {/* Revenue Estimate (White) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <div className="w-14 h-8 opacity-30">
              <svg viewBox="0 0 60 30" className="text-indigo-400">
                <polyline fill="none" stroke="currentColor" strokeWidth="2" points="0,25 10,20 20,15 30,18 40,8 50,12 60,5" />
              </svg>
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900 tracking-tight">₹{((completedConsults || 1) * 500).toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Revenue Estimate</p>
        </div>
      </div>

      {/* ── 3-COLUMN MAIN LAYOUT ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* ▸ LEFT: Patient Queue ─────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">Patient Queue</h3>
              </div>
              <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[9px] font-bold px-1.5">
                NEXT: {todayOPD.length > 1 ? "10M" : "—"}
              </Badge>
            </div>

            {todayOPD.length === 0 ? (
              <div className="text-center py-12 text-gray-400 px-4">
                <Calendar className="h-8 w-8 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-medium">No patients in queue</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {todayOPD.map((appt, idx) => {
                  const st = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.PENDING
                  const gradient = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                  const isActive = idx === 0

                  return (
                    <Link
                      key={appt.id}
                      href={`/dashboard/clinical/opd/${appt.id}`}
                      className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50/80 ${
                        isActive ? "bg-indigo-50/40 border-l-[3px] border-l-indigo-500" : ""
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5`}>
                        <span className="text-[10px] font-bold text-white">
                          {getInitials(appt.patientName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">{appt.patientName}</p>
                          <span className="text-[11px] font-semibold text-gray-500 tabular-nums flex-shrink-0 ml-2">
                            {appt.appointmentTime}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          {appt.patientId} &middot; {appt.reason || appt.chiefComplaint || "General"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          <span className={`text-[10px] font-semibold ${st.color}`}>{st.label}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Add Walk-in */}
            <div className="px-4 py-3 border-t border-gray-100">
              <Link href="/dashboard/clinical/opd">
                <Button variant="outline" className="w-full h-9 text-xs font-semibold text-gray-500 border-dashed border-gray-200 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Walk-in Patient
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ▸ MIDDLE: Clinical Notes + Vitals ─────── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Clinical Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Clinical Notes</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-gray-100">
                  <RefreshCw className="h-3.5 w-3.5 text-gray-400" />
                </Button>
                <Button variant="ghost" className="h-7 text-xs text-indigo-600 font-medium gap-1 hover:bg-indigo-50 rounded-lg px-2">
                  <FileCode className="h-3.5 w-3.5" />
                  Use Template
                </Button>
              </div>
            </div>

            {/* Rich Text Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-50 bg-gray-50/50">
              {[Bold, Italic, Underline, List, ListOrdered, Code].map((Icon, i) => (
                <button
                  key={i}
                  className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {/* Text Area */}
            <div className="px-4 py-4">
              <textarea
                className="w-full h-28 text-sm text-gray-600 placeholder:text-gray-300 resize-none focus:outline-none bg-transparent"
                placeholder="Start typing patient clinical observations here..."
                readOnly
              />
            </div>

            {/* Patient Vitals */}
            <div className="px-4 pb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Patient Vitals</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 uppercase font-semibold tracking-wide">BP (mmHg)</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">120<span className="text-gray-400 font-normal">/80</span></p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 uppercase font-semibold tracking-wide">Temp (°F)</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">98.6 <span className="text-amber-500 text-xs">↑</span></p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 uppercase font-semibold tracking-wide">Pulse (BPM)</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">72 <span className="text-red-400 text-xs">♥</span></p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 uppercase font-semibold tracking-wide">SpO2 (%)</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">99 <span className="text-green-500 text-xs">✓</span></p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 font-semibold text-sm gap-2 shadow-sm">
                <Save className="h-4 w-4" />
                Save Consultation
              </Button>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 font-semibold text-sm gap-2 shadow-sm">
                <Pause className="h-4 w-4" />
                Pause & Save
              </Button>
            </div>
          </div>
        </div>

        {/* ▸ RIGHT: Patient Info Card ────────────── */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {activePatient ? (
              <>
                {/* Patient Header */}
                <div className="flex flex-col items-center pt-6 pb-4 px-4 border-b border-gray-100">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg mb-3">
                    <span className="text-lg font-bold text-white">
                      {getInitials(activePatient.patientName)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{activePatient.patientName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Patient ID: #{activePatient.patientId}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge className="bg-red-100 text-red-700 border-0 text-[9px] font-bold px-2 py-0.5">
                      ALLERGY: PENICILLIN
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] font-bold px-2 py-0.5">
                      ASTHMATIC
                    </Badge>
                  </div>
                </div>

                {/* Medication History */}
                <div className="px-4 py-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Medication History</h4>
                  <div className="space-y-2.5">
                    {[
                      { name: "Atorvastatin 20mg", dose: "1x" },
                      { name: "Metformin 500mg", dose: "2x" },
                      { name: "Salbutamol Inhaler", dose: "PRN" },
                    ].map((med) => (
                      <div key={med.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pill className="h-3.5 w-3.5 text-gray-300" />
                          <span className="text-sm text-gray-700">{med.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-semibold">{med.dose}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Action Icons */}
                <div className="grid grid-cols-4 gap-2 px-4 pb-5">
                  {[
                    { icon: PenLine, label: "Prescription", color: "bg-indigo-50 text-indigo-600" },
                    { icon: FlaskConical, label: "Lab Order", color: "bg-emerald-50 text-emerald-600" },
                    { icon: Send, label: "Referral", color: "bg-amber-50 text-amber-600" },
                    { icon: ClipboardList, label: "Discharge", color: "bg-rose-50 text-rose-600" },
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className={`h-10 w-10 rounded-xl ${action.color} flex items-center justify-center transition-transform group-hover:scale-105`}>
                        <action.icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-500">{action.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-400 px-4">
                <User className="h-12 w-12 mx-auto opacity-20 mb-3" />
                <p className="text-sm font-medium text-gray-500">No patient selected</p>
                <p className="text-xs mt-1">Select a patient from the queue</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ─────────────────────── */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Timer className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-medium">Consultation Timer:</span>
            <span className="font-bold text-gray-900 tabular-nums">00:12:34</span>
          </div>
          <div className="h-3 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="font-medium">Next Patient:</span>
            {todayOPD.length > 1 ? (
              <Link href={`/dashboard/clinical/opd/${todayOPD[1].id}`} className="font-bold text-indigo-600 hover:underline">
                {todayOPD[1].patientName}
              </Link>
            ) : (
              <span className="text-gray-400">None</span>
            )}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-gray-400">
          <span>SHORTCUTS: <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">P</kbd> PRESCRIBE</span>
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">L</kbd> LABS</span>
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">ESC</kbd> CLOSE</span>
        </div>
      </div>
    </div>
  )
}
