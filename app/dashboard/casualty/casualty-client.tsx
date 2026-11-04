"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"
import Link from "next/link"
import {
  Activity,
  Plus,
  Clock,
  User,
  Stethoscope,
  Loader2,
  Syringe,
  FileText,
  Printer,
  LogOut,
  AlertCircle,
  Bandage,
  Wind,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CasualtyAdmitModal } from "./casualty-admit-modal"
import { AddProcedureModal } from "./add-procedure-modal"
import { BookOPDModal } from "./book-opd-modal"
import { dischargeCasualty } from "@/app/actions/casualty"
import { PrintOPDButton } from "@/components/print-opd-button"

// ──────────────────────────────────────────────────
// TYPE DEFINITIONS
// ──────────────────────────────────────────────────

interface SerializedDoctor {
  id: string
  userId: string
  department: string | null
  designation: string | null
  specialization: string | null
  consultationFee: number
  user: { id: string; name: string | null; email: string; image: string | null }
}

interface SerializedPatient {
  id: string
  patientId: string
  gender: string | null
  phone: string | null
  dateOfBirth: string | null
  user: { id: string; name: string | null; email: string; image: string | null }
}

interface SerializedProcedure {
  id: string
  name: string
  category: string
  description: string | null
  quantity: number
  unitPrice: number
  performedBy: string | null
  performedAt: string
}

interface SerializedAppointment {
  id: string
  status: string
  appointmentDate: string
  appointmentTime: string
  reason: string | null
  source: string | null
  doctor: {
    id: string
    user: { name: string | null }
  }
}

interface SerializedVisit {
  id: string
  patientId: string
  chiefComplaint: string | null
  status: string
  arrivalTime: string
  vitals: string | null
  notes: string | null
  patient: {
    id: string
    patientId: string
    gender: string | null
    phone: string | null
    dateOfBirth: string | null
    user: { name: string | null; image: string | null }
  }
  assignedDoctor: {
    id: string
    user: { name: string | null }
  } | null
  procedures: SerializedProcedure[]
  appointments: SerializedAppointment[]
}

interface CasualtyClientProps {
  activeVisits: SerializedVisit[]
  todayDischarged: number
  todayProcedures: number
  doctors: SerializedDoctor[]
  recentPatients: SerializedPatient[]
}

// ──────────────────────────────────────────────────
// STATUS HELPERS
// ──────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; bgClass: string }> = {
  ADMITTED: { label: "Admitted", color: "#f59e0b", bgClass: "bg-amber-50 text-amber-700 border-amber-200" },
  TREATING: { label: "Treating", color: "#3b82f6", bgClass: "bg-blue-50 text-blue-700 border-blue-200" },
  REFERRED_TO_OPD: { label: "Referred to OPD", color: "#8b5cf6", bgClass: "bg-violet-50 text-violet-700 border-violet-200" },
  DISCHARGED: { label: "Discharged", color: "#22c55e", bgClass: "bg-green-50 text-green-700 border-green-200" },
}

const categoryIcons: Record<string, string> = {
  OXYGEN: "🫁",
  PLASTER: "🦴",
  DRESSING: "🩹",
  SUTURING: "🪡",
  INJECTION: "💉",
  SPLINT: "🩼",
  GENERAL: "⚕️",
  OTHER: "🔧",
}

// ──────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────

export function CasualtyClient({
  activeVisits,
  todayDischarged,
  todayProcedures,
  doctors,
  recentPatients,
}: CasualtyClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Modal states
  const [showAdmitModal, setShowAdmitModal] = useState(false)
  const [procedureModalVisit, setProcedureModalVisit] = useState<SerializedVisit | null>(null)
  const [opdModalVisit, setOPDModalVisit] = useState<SerializedVisit | null>(null)
  const [dischargingId, setDischargingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Stats
  const opdReferrals = activeVisits.filter((v) => v.status === "REFERRED_TO_OPD").length

  const filteredVisits = activeVisits.filter((v) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      v.patient.user.name?.toLowerCase().includes(q) ||
      v.patient.patientId.toLowerCase().includes(q) ||
      v.chiefComplaint?.toLowerCase().includes(q)
    )
  })

  // Discharge handler
  async function handleDischarge(visitId: string) {
    if (!confirm("Are you sure you want to discharge this patient?")) return
    setDischargingId(visitId)
    try {
      const result = await dischargeCasualty(visitId)
      if (result.success) {
        toast.success(result.billNumber ? `Patient discharged. Bill: ${result.billNumber}` : "Patient discharged successfully.")
        startTransition(() => router.refresh())
      }
    } catch (err: any) {
      toast.error(err.message || "Discharge failed")
    } finally {
      setDischargingId(null)
    }
  }

  return (
    <>
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
            <Bandage className="h-7 w-7 text-orange-600" />
            Casualty Department
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Walk-in procedures, first aid, and OPD referrals</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/dashboard/casualty/records">
            <Button className="neo-button bg-[#e0e5ec] text-zinc-600 hover:bg-[#d5dae2] rounded-2xl px-5 py-3 font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Past Records
            </Button>
          </Link>
          <Button
            onClick={() => setShowAdmitModal(true)}
            className="neo-button bg-[#e0e5ec] text-zinc-800 hover:bg-[#d5dae2] rounded-2xl px-6 py-3 font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Admit Patient
          </Button>
        </div>
      </div>

      {/* ═══════════════ STATS ROW ═══════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Patients"
          value={activeVisits.length}
          icon={<User className="h-5 w-5 text-amber-600" />}
          accent="amber"
        />
        <StatCard
          label="Today's Procedures"
          value={todayProcedures}
          icon={<Syringe className="h-5 w-5 text-blue-600" />}
          accent="blue"
        />
        <StatCard
          label="OPD Referrals"
          value={opdReferrals}
          icon={<Stethoscope className="h-5 w-5 text-violet-600" />}
          accent="violet"
        />
        <StatCard
          label="Discharged Today"
          value={todayDischarged}
          icon={<LogOut className="h-5 w-5 text-emerald-600" />}
          accent="emerald"
        />
      </div>

      {/* ═══════════════ SEARCH ═══════════════ */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search by name, ID, or complaint…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#e0e5ec] neo-pressed rounded-xl border-0 text-sm"
        />
      </div>

      {/* ═══════════════ PATIENT CARDS ═══════════════ */}
      {filteredVisits.length === 0 ? (
        <div className="neo-flat bg-[#e0e5ec] rounded-3xl p-12 text-center">
          <AlertCircle className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-600">No active casualty patients</h3>
          <p className="text-sm text-zinc-500 mt-1">Click "Admit Patient" to register a walk-in</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredVisits.map((visit) => (
            <PatientCard
              key={visit.id}
              visit={visit}
              onAddProcedure={() => setProcedureModalVisit(visit)}
              onBookOPD={() => setOPDModalVisit(visit)}
              onDischarge={() => handleDischarge(visit.id)}
              isDischarging={dischargingId === visit.id}
            />
          ))}
        </div>
      )}

      {/* ═══════════════ MODALS ═══════════════ */}
      <CasualtyAdmitModal
        isOpen={showAdmitModal}
        onClose={() => { setShowAdmitModal(false); startTransition(() => router.refresh()) }}
        doctors={doctors}
        recentPatients={recentPatients}
      />

      {procedureModalVisit && (
        <AddProcedureModal
          isOpen={!!procedureModalVisit}
          onClose={() => { setProcedureModalVisit(null); startTransition(() => router.refresh()) }}
          visit={procedureModalVisit}
        />
      )}

      {opdModalVisit && (
        <BookOPDModal
          isOpen={!!opdModalVisit}
          onClose={() => { setOPDModalVisit(null); startTransition(() => router.refresh()) }}
          visit={opdModalVisit}
          doctors={doctors}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────
// STAT CARD
// ──────────────────────────────────────────────────

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  const bgMap: Record<string, string> = {
    amber: "bg-gradient-to-br from-amber-50 to-orange-50",
    blue: "bg-gradient-to-br from-blue-50 to-sky-50",
    violet: "bg-gradient-to-br from-violet-50 to-purple-50",
    emerald: "bg-gradient-to-br from-emerald-50 to-green-50",
  }
  return (
    <div className={`neo-flat bg-[#e0e5ec] rounded-2xl p-5 flex items-center gap-4`}>
      <div className={`${bgMap[accent] || bgMap.amber} rounded-xl p-3`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-zinc-800">{value}</p>
        <p className="text-xs text-zinc-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────
// PATIENT CARD
// ──────────────────────────────────────────────────

function PatientCard({
  visit,
  onAddProcedure,
  onBookOPD,
  onDischarge,
  isDischarging,
}: {
  visit: SerializedVisit
  onAddProcedure: () => void
  onBookOPD: () => void
  onDischarge: () => void
  isDischarging: boolean
}) {
  const status = statusConfig[visit.status] || statusConfig.ADMITTED
  const totalCharges = visit.procedures.reduce((s, p) => s + p.unitPrice * p.quantity, 0)
  const arrivalStr = formatDistanceToNow(new Date(visit.arrivalTime), { addSuffix: true })

  return (
    <div className="neo-flat bg-[#e0e5ec] rounded-2xl overflow-hidden transition-all duration-300 hover:translate-y-[-2px]">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-orange-600 font-bold text-sm">
              {visit.patient.user.name?.charAt(0) || "?"}
            </div>
            <div>
              <Link href={`/dashboard/casualty/patient/${visit.id}`} className="font-bold text-zinc-800 text-sm leading-tight hover:text-orange-600 transition-colors">{visit.patient.user.name}</Link>
              <p className="text-[11px] text-zinc-500">{visit.patient.patientId} · {visit.patient.gender || "—"}</p>
            </div>
          </div>
          <Badge className={`${status.bgClass} text-[10px] font-semibold border rounded-full px-2 py-0.5`}>
            {status.label}
          </Badge>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-zinc-500 mb-2">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{arrivalStr}</span>
          {visit.assignedDoctor && (
            <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" />Dr. {visit.assignedDoctor.user.name}</span>
          )}
        </div>

        {/* Complaint */}
        {visit.chiefComplaint && (
          <p className="text-xs text-zinc-600 bg-white/60 rounded-lg px-3 py-2 mb-3 leading-relaxed">
            <span className="font-semibold text-zinc-700">Complaint:</span> {visit.chiefComplaint}
          </p>
        )}

        {/* Procedures */}
        {visit.procedures.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Procedures ({visit.procedures.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {visit.procedures.slice(0, 5).map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 bg-white/70 text-zinc-700 text-[10px] rounded-full px-2.5 py-1 font-medium border border-zinc-200/60"
                >
                  {categoryIcons[p.category] || "⚕️"} {p.name}
                </span>
              ))}
              {visit.procedures.length > 5 && (
                <span className="text-[10px] text-zinc-500 self-center">+{visit.procedures.length - 5} more</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-600 mt-1.5 font-medium">Total: ₹{totalCharges.toLocaleString("en-IN")}</p>
          </div>
        )}

        {/* OPD Appointments */}
        {visit.appointments.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">OPD Bookings</p>
            {visit.appointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between bg-violet-50/80 rounded-lg px-3 py-2 mb-1 border border-violet-100">
                <div className="text-xs">
                  <span className="font-semibold text-violet-700">Dr. {appt.doctor.user.name}</span>
                  <span className="text-violet-500 ml-2">{appt.appointmentTime}</span>
                </div>
                <PrintOPDButton
                  appointmentId={appt.id}
                  label="Print OPD"
                  iconSize="h-3 w-3"
                  className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-zinc-200/60 bg-white/30 px-4 py-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={onAddProcedure}
          className="neo-button bg-[#e0e5ec] rounded-xl px-3 py-1.5 text-[11px] font-semibold text-zinc-700 flex items-center gap-1.5 hover:bg-[#d5dae2] transition-colors"
        >
          <Syringe className="h-3.5 w-3.5 text-blue-500" /> Add Procedure
        </button>
        <button
          onClick={onBookOPD}
          className="neo-button bg-[#e0e5ec] rounded-xl px-3 py-1.5 text-[11px] font-semibold text-zinc-700 flex items-center gap-1.5 hover:bg-[#d5dae2] transition-colors"
        >
          <FileText className="h-3.5 w-3.5 text-violet-500" /> Book OPD
        </button>
        <button
          onClick={onDischarge}
          disabled={isDischarging}
          className="neo-button bg-[#e0e5ec] rounded-xl px-3 py-1.5 text-[11px] font-semibold text-red-600 flex items-center gap-1.5 hover:bg-red-50 transition-colors ml-auto"
        >
          {isDischarging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          Discharge
        </button>
      </div>
    </div>
  )
}
