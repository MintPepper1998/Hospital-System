"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import {
  ArrowLeft,
  Clock,
  User,
  Stethoscope,
  Syringe,
  FileText,
  Printer,
  LogOut,
  AlertCircle,
  Bandage,
  Activity,
  Phone,
  Calendar,
  Loader2,
  Plus,
  Receipt,
  Edit3,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PrintOPDButton } from "@/components/print-opd-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AddProcedureModal } from "../../add-procedure-modal"
import { BookOPDModal } from "../../book-opd-modal"
import { dischargeCasualty, updateCasualtyStatus } from "@/app/actions/casualty"

// ──────────────────────────────────────────────────
// STATUS CONFIG
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
// TYPES
// ──────────────────────────────────────────────────
interface CasualtyPatientDetailProps {
  visit: any
  doctors: any[]
}

// ──────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────
export function CasualtyPatientDetail({ visit, doctors }: CasualtyPatientDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showProcedureModal, setShowProcedureModal] = useState(false)
  const [showOPDModal, setShowOPDModal] = useState(false)
  const [dischargingId, setDischargingId] = useState(false)
  const [showProcedures, setShowProcedures] = useState(true)
  const [showBillings, setShowBillings] = useState(true)

  const status = statusConfig[visit.status] || statusConfig.ADMITTED
  const totalCharges = visit.procedures.reduce(
    (s: number, p: any) => s + p.unitPrice * p.quantity,
    0
  )
  const arrivalStr = formatDistanceToNow(new Date(visit.arrivalTime), { addSuffix: true })
  const isActive = ["ADMITTED", "TREATING", "REFERRED_TO_OPD"].includes(visit.status)

  async function handleDischarge() {
    if (!confirm("Are you sure you want to discharge this patient? A bill will be generated for all procedures.")) return
    setDischargingId(true)
    try {
      const result = await dischargeCasualty(visit.id)
      if (result.success) {
        toast.success(result.billNumber ? `Patient discharged. Bill: ${result.billNumber}` : "Patient discharged successfully.")
        startTransition(() => router.refresh())
      }
    } catch (err: any) {
      toast.error(err.message || "Discharge failed")
    } finally {
      setDischargingId(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await updateCasualtyStatus(visit.id, newStatus as any)
      toast.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`)
      startTransition(() => router.refresh())
    } catch (err: any) {
      toast.error(err.message || "Failed to update status")
    }
  }

  async function handleDoctorAssign(doctorId: string) {
    try {
      await updateCasualtyStatus(visit.id, visit.status, doctorId)
      toast.success("Doctor assigned")
      startTransition(() => router.refresh())
    } catch (err: any) {
      toast.error(err.message || "Failed to assign doctor")
    }
  }

  return (
    <>
      {/* ═══════════════ BACK + HEADER ═══════════════ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/casualty"
            className="neo-button bg-[#e0e5ec] rounded-xl p-2.5 text-zinc-600 hover:text-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Bandage className="h-6 w-6 text-orange-600" />
              Casualty Visit Detail
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Visit ID: <span className="font-mono text-xs">{visit.id.slice(-8).toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {isActive && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setShowProcedureModal(true)}
              className="neo-button bg-[#e0e5ec] text-zinc-800 hover:bg-[#d5dae2] rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
            >
              <Syringe className="h-4 w-4 text-blue-500" />
              Add Procedure
            </Button>
            <Button
              onClick={() => setShowOPDModal(true)}
              className="neo-button bg-[#e0e5ec] text-zinc-800 hover:bg-[#d5dae2] rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-violet-500" />
              Book OPD
            </Button>
            <Button
              onClick={handleDischarge}
              disabled={dischargingId}
              className="neo-button bg-red-50 text-red-600 hover:bg-red-100 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border border-red-200"
            >
              {dischargingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Discharge
            </Button>
          </div>
        )}
      </div>

      {/* ═══════════════ PATIENT INFO CARD ═══════════════ */}
      <div className="neo-flat bg-[#e0e5ec] rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar + Info */}
          <div className="flex items-start gap-4 flex-1">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-orange-600 font-bold text-2xl flex-shrink-0">
              {visit.patient.user.name?.charAt(0) || "?"}
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-zinc-800">{visit.patient.user.name}</h2>
                <Badge className={`${status.bgClass} text-xs font-semibold border rounded-full px-3 py-1`}>
                  {status.label}
                </Badge>
              </div>

              <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-500">
                <span className="flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <User className="h-3 w-3" />
                  {visit.patient.patientId}
                </span>
                {visit.patient.gender && (
                  <span className="flex items-center gap-1">
                    {visit.patient.gender}
                  </span>
                )}
                {visit.patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {visit.patient.phone}
                  </span>
                )}
                {visit.patient.dateOfBirth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(visit.patient.dateOfBirth), "dd MMM yyyy")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Arrived {arrivalStr} ({format(new Date(visit.arrivalTime), "dd MMM yyyy, hh:mm a")})
                </span>
                {visit.assignedDoctor && (
                  <span className="flex items-center gap-1 font-medium text-zinc-700">
                    <Stethoscope className="h-3 w-3" />
                    Dr. {visit.assignedDoctor.user.name}
                  </span>
                )}
                {visit.dischargeTime && (
                  <span className="flex items-center gap-1 font-medium text-emerald-600">
                    <LogOut className="h-3 w-3" />
                    Discharged: {format(new Date(visit.dischargeTime), "dd MMM yyyy, hh:mm a")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick controls (if active) */}
          {isActive && (
            <div className="flex flex-col gap-3 min-w-[200px]">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Status</label>
                <Select value={visit.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMITTED">Admitted</SelectItem>
                    <SelectItem value="TREATING">Treating</SelectItem>
                    <SelectItem value="REFERRED_TO_OPD">Referred to OPD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Doctor</label>
                <Select value={visit.assignedDoctorId || ""} onValueChange={handleDoctorAssign}>
                  <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                    <SelectValue placeholder="Assign doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        Dr. {d.user.name} {d.specialization ? `(${d.specialization})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Chief Complaint */}
        {visit.chiefComplaint && (
          <div className="mt-5 neo-pressed bg-[#e0e5ec] rounded-xl p-4">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Chief Complaint</p>
            <p className="text-sm text-zinc-700 leading-relaxed">{visit.chiefComplaint}</p>
          </div>
        )}

        {/* Vitals */}
        {visit.vitals && (
          <div className="mt-3 neo-pressed bg-[#e0e5ec] rounded-xl p-4">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Vitals / Notes</p>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{visit.vitals}</p>
          </div>
        )}
      </div>

      {/* ═══════════════ STATS ROW ═══════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-3">
            <Syringe className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-800">{visit.procedures.length}</p>
            <p className="text-xs text-zinc-500 font-medium">Procedures</p>
          </div>
        </div>
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-800">₹{totalCharges.toLocaleString("en-IN")}</p>
            <p className="text-xs text-zinc-500 font-medium">Total Charges</p>
          </div>
        </div>
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-3">
            <FileText className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-800">{visit.appointments?.length || 0}</p>
            <p className="text-xs text-zinc-500 font-medium">OPD Bookings</p>
          </div>
        </div>
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3">
            <Receipt className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-800">{visit.billings?.length || 0}</p>
            <p className="text-xs text-zinc-500 font-medium">Bills Generated</p>
          </div>
        </div>
      </div>

      {/* ═══════════════ PROCEDURES LIST ═══════════════ */}
      <div className="neo-flat bg-[#e0e5ec] rounded-3xl overflow-hidden">
        <button
          onClick={() => setShowProcedures(!showProcedures)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-2.5">
              <Syringe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-800">Procedures ({visit.procedures.length})</h3>
              <p className="text-xs text-zinc-500">All procedures performed during this visit</p>
            </div>
          </div>
          {showProcedures ? <ChevronUp className="h-5 w-5 text-zinc-400" /> : <ChevronDown className="h-5 w-5 text-zinc-400" />}
        </button>

        {showProcedures && (
          <div className="px-6 pb-6">
            {visit.procedures.length === 0 ? (
              <div className="neo-pressed bg-[#e0e5ec] rounded-xl p-8 text-center">
                <AlertCircle className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm text-zinc-500 font-medium">No procedures recorded yet</p>
                {isActive && (
                  <Button
                    onClick={() => setShowProcedureModal(true)}
                    className="mt-3 neo-button bg-[#e0e5ec] text-blue-600 hover:bg-[#d5dae2] rounded-xl px-4 py-2 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add First Procedure
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {visit.procedures.map((proc: any, idx: number) => (
                  <div key={proc.id} className="neo-pressed bg-[#e0e5ec] rounded-xl p-4 flex items-start gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/60 text-lg flex-shrink-0">
                      {categoryIcons[proc.category] || "⚕️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-zinc-800">{proc.name}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            <span className="bg-white/60 px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-600">{proc.category}</span>
                            {proc.performedBy && (
                              <span className="ml-2">by {proc.performedBy}</span>
                            )}
                            <span className="ml-2">{format(new Date(proc.performedAt), "dd MMM, hh:mm a")}</span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm text-zinc-800">₹{(proc.unitPrice * proc.quantity).toLocaleString("en-IN")}</p>
                          {proc.quantity > 1 && (
                            <p className="text-[10px] text-zinc-500">{proc.quantity} × ₹{proc.unitPrice}</p>
                          )}
                        </div>
                      </div>
                      {proc.description && (
                        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{proc.description}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200/50">
                  <span className="text-sm font-bold text-zinc-600">Total Procedure Charges</span>
                  <span className="text-lg font-bold text-blue-600">₹{totalCharges.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ OPD APPOINTMENTS ═══════════════ */}
      {visit.appointments && visit.appointments.length > 0 && (
        <div className="neo-flat bg-[#e0e5ec] rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-2.5">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-800">OPD Appointments ({visit.appointments.length})</h3>
              <p className="text-xs text-zinc-500">Bookings made from this casualty visit</p>
            </div>
          </div>

          <div className="space-y-3">
            {visit.appointments.map((appt: any) => (
              <div key={appt.id} className="neo-pressed bg-[#e0e5ec] rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-violet-600 font-bold text-xs flex-shrink-0">
                    OPD
                  </div>
                  <div>
                    <p className="font-bold text-sm text-zinc-800">Dr. {appt.doctor?.user?.name || "—"}</p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>{format(new Date(appt.appointmentDate), "dd MMM yyyy")}</span>
                      <span>·</span>
                      <span>{appt.appointmentTime}</span>
                      {appt.reason && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[200px]">{appt.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                    appt.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    appt.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {appt.status}
                  </Badge>
                  {appt.billings?.some((b: any) => b.status === "PENDING") && (
                    <Link
                      href={`/dashboard/billing-counter/opd?appointmentId=${appt.id}`}
                      className="neo-button bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <CreditCard className="h-3 w-3" /> Pay at Counter
                    </Link>
                  )}
                  <PrintOPDButton
                    appointmentId={appt.id}
                    label="Print"
                    iconSize="h-3 w-3"
                    className="neo-button bg-[#e0e5ec] rounded-lg px-3 py-1.5 text-[11px] font-semibold text-violet-600 flex items-center gap-1 hover:bg-violet-50 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ BILLINGS ═══════════════ */}
      {visit.billings && visit.billings.length > 0 && (
        <div className="neo-flat bg-[#e0e5ec] rounded-3xl overflow-hidden">
          <button
            onClick={() => setShowBillings(!showBillings)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-2.5">
                <Receipt className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-800">Bills ({visit.billings.length})</h3>
                <p className="text-xs text-zinc-500">Generated bills for this casualty visit</p>
              </div>
            </div>
            {showBillings ? <ChevronUp className="h-5 w-5 text-zinc-400" /> : <ChevronDown className="h-5 w-5 text-zinc-400" />}
          </button>

          {showBillings && (
            <div className="px-6 pb-6 space-y-3">
              {visit.billings.map((bill: any) => (
                <div key={bill.id} className="neo-pressed bg-[#e0e5ec] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-sm text-zinc-800">{bill.billNumber}</p>
                      <p className="text-[11px] text-zinc-500">
                        {format(new Date(bill.createdAt), "dd MMM yyyy, hh:mm a")} · {bill.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                        bill.status === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        bill.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        {bill.status}
                      </Badge>
                      <p className="text-lg font-bold text-zinc-800 mt-1">₹{(bill.netAmount || 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  {/* Line items */}
                  {bill.items && bill.items.length > 0 && (
                    <div className="border-t border-zinc-200/50 pt-3 space-y-1.5">
                      {bill.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-600 truncate max-w-[60%]">{item.description}</span>
                          <span className="text-zinc-700 font-medium">
                            {item.quantity > 1 ? `${item.quantity} × ₹${item.unitPrice}` : ""} ₹{(item.totalAmount || item.amount || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Collect payment button for pending bills */}
                  {bill.status === "PENDING" && (
                    <div className="border-t border-zinc-200/50 mt-3 pt-3 flex justify-end">
                      <Link
                        href={
                          bill.type === "OPD"
                            ? `/dashboard/billing-counter/opd?appointmentId=${bill.appointmentId || ""}`
                            : `/dashboard/billing-counter/casualty?visitId=${visit.id}`
                        }
                        className="neo-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Collect Payment in Billing Counter ↗
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ MODALS ═══════════════ */}
      {showProcedureModal && (
        <AddProcedureModal
          isOpen={showProcedureModal}
          onClose={() => { setShowProcedureModal(false); startTransition(() => router.refresh()) }}
          visit={visit}
        />
      )}

      {showOPDModal && (
        <BookOPDModal
          isOpen={showOPDModal}
          onClose={() => { setShowOPDModal(false); startTransition(() => router.refresh()) }}
          visit={visit}
          doctors={doctors}
        />
      )}
    </>
  )
}
