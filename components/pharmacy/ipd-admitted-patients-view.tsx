"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Pill,
  BedDouble,
  User,
  Stethoscope,
  Clock,
  RotateCcw,
  ArrowRight,
  Send,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Inbox,
  AlertCircle,
} from "lucide-react"
import {
  TakeBackMedicineModal,
  type TakeBackPrescriptionData,
} from "@/components/pharmacy/take-back-medicine-modal"
import { SendMedicineModal } from "@/components/pharmacy/send-medicine-modal"
import { format } from "date-fns"

export interface AdmittedPatientMedicine {
  id: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  instruction: string | null
  requestedQuantity: number | null
  dispensedQuantity: number | null
  unitPrice: number | null
  totalPrice: number | null
  status: string
  pharmacyStatus: "PENDING" | "DISPENSED" | "CANCELLED"
  dispensedAt: string | null
  dispensedBy: string | null
  createdAt: string
}

export interface AdmittedPatientItem {
  admissionId: string
  patientId: string
  patientName: string
  patientCode: string
  gender?: string | null
  age?: number | null
  phone?: string | null
  bedNumber: string
  wardName: string
  wardType?: string | null
  doctorName: string
  doctorSpecialization?: string | null
  admissionDate: string
  daysAdmitted: number
  reason?: string | null
  diagnosis?: string | null
  medicines: AdmittedPatientMedicine[]
}

interface IPDAdmittedPatientsViewProps {
  admissions: AdmittedPatientItem[]
  searchQuery?: string
}

export function IPDAdmittedPatientsView({
  admissions: initialAdmissions,
  searchQuery = "",
}: IPDAdmittedPatientsViewProps) {
  const [admissions, setAdmissions] = useState<AdmittedPatientItem[]>(initialAdmissions)
  const [selectedForTakeBack, setSelectedForTakeBack] = useState<TakeBackPrescriptionData | null>(null)
  const [isTakeBackOpen, setIsTakeBackOpen] = useState(false)
  const [selectedForSend, setSelectedForSend] = useState<{
    admissionId: string
    patientName: string
    patientCode: string
    bedInfo: string
  } | null>(null)
  const [isSendOpen, setIsSendOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<"ALL" | "WITH_MEDS" | "PENDING_DISPENSE">("ALL")

  // Handle successful direct medicine send to update UI immediately
  const handleSendSuccess = (newMedicine: any) => {
    if (!selectedForSend) return
    const targetAdmissionId = selectedForSend.admissionId

    setAdmissions((prev) =>
      prev.map((adm) => {
        if (adm.admissionId === targetAdmissionId) {
          const formattedMed: AdmittedPatientMedicine = {
            id: newMedicine.id,
            medicineName: newMedicine.medicineName,
            dosage: newMedicine.dosage,
            frequency: newMedicine.frequency,
            duration: newMedicine.duration || "1 Day",
            instruction: newMedicine.instruction,
            requestedQuantity: newMedicine.requestedQuantity,
            dispensedQuantity: newMedicine.dispensedQuantity,
            unitPrice: newMedicine.unitPrice,
            totalPrice: newMedicine.totalPrice,
            status: newMedicine.status || "ACTIVE",
            pharmacyStatus: "DISPENSED",
            dispensedAt: newMedicine.dispensedAt || new Date().toISOString(),
            dispensedBy: newMedicine.dispensedBy || "Pharmacy Staff",
            createdAt: newMedicine.createdAt || new Date().toISOString(),
          }

          return {
            ...adm,
            medicines: [formattedMed, ...adm.medicines],
          }
        }
        return adm
      })
    )
  }

  // Handle successful take-back to update UI immediately
  const handleTakeBackSuccess = ({
    prescriptionId,
    newDispensedQty,
  }: {
    prescriptionId: string
    newDispensedQty: number
  }) => {
    setAdmissions((prev) =>
      prev.map((adm) => ({
        ...adm,
        medicines: adm.medicines.map((m) => {
          if (m.id === prescriptionId) {
            const unitPrice = m.unitPrice || 0
            return {
              ...m,
              dispensedQuantity: newDispensedQty,
              totalPrice: newDispensedQty * unitPrice,
              pharmacyStatus: newDispensedQty === 0 ? "CANCELLED" : "DISPENSED",
            }
          }
          return m
        }),
      }))
    )
  }

  // Filter admissions based on local filter tabs
  const filteredAdmissions = admissions.filter((adm) => {
    const hasDispensed = adm.medicines.some((m) => m.pharmacyStatus === "DISPENSED" && (m.dispensedQuantity || 0) > 0)
    const hasPending = adm.medicines.some((m) => m.pharmacyStatus === "PENDING")

    if (filterMode === "WITH_MEDS") return hasDispensed || hasPending
    if (filterMode === "PENDING_DISPENSE") return hasPending
    return true
  })

  const totalAdmitted = admissions.length
  const totalWithMeds = admissions.filter((a) =>
    a.medicines.some((m) => (m.dispensedQuantity || 0) > 0 || m.pharmacyStatus === "PENDING")
  ).length
  const totalPendingDispense = admissions.filter((a) =>
    a.medicines.some((m) => m.pharmacyStatus === "PENDING")
  ).length

  return (
    <div className="space-y-6">
      {/* Sub-Header & Segmented Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Admitted Inpatients & Active Regimens
            </h3>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {totalAdmitted} Admitted
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Monitor in-use medications, issue new ward supplies, and process returns for unused hospital doses.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterMode === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All ({totalAdmitted})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("WITH_MEDS")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterMode === "WITH_MEDS"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            With Meds ({totalWithMeds})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("PENDING_DISPENSE")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterMode === "PENDING_DISPENSE"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Pending Orders ({totalPendingDispense})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredAdmissions.length === 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Inpatient Records Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterMode === "PENDING_DISPENSE"
              ? "No admitted patients currently have pending prescriptions waiting to be fulfilled."
              : "No active admissions match the selected filter."}
          </p>
        </div>
      )}

      {/* Admitted Patient Cards Grid */}
      <div className="grid grid-cols-1 gap-5">
        {filteredAdmissions.map((adm) => {
          const dispensedMeds = adm.medicines.filter(
            (m) => m.pharmacyStatus === "DISPENSED" && (m.dispensedQuantity || 0) > 0
          )
          const pendingMeds = adm.medicines.filter((m) => m.pharmacyStatus === "PENDING")
          const totalDispensedValue = dispensedMeds.reduce((sum, m) => sum + (m.totalPrice || 0), 0)

          return (
            <div
              key={adm.admissionId}
              className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.03)] hover:border-slate-300 transition-colors overflow-hidden"
            >
              {/* Patient Top Header Bar */}
              <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm">
                    {adm.patientName.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 tracking-tight">
                        {adm.patientName}
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-700">
                        {adm.patientCode}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ADMITTED
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <BedDouble className="w-3.5 h-3.5 text-slate-600" />
                        {adm.wardName} &bull; Bed {adm.bedNumber}
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                        Dr. {adm.doctorName}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Day {adm.daysAdmitted} ({format(new Date(adm.admissionDate), "dd MMM yyyy")})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Right Action: Single + Send Medicine Button */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedForSend({
                        admissionId: adm.admissionId,
                        patientName: adm.patientName,
                        patientCode: adm.patientCode,
                        bedInfo: `${adm.wardName} - Bed ${adm.bedNumber}`,
                      })
                      setIsSendOpen(true)
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Send Medicine</span>
                  </button>

                  {pendingMeds.length > 0 && (
                    <Link
                      href={`/dashboard/pharmacy/ipd-dispense/${adm.admissionId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                    >
                      <span>Dispense Order ({pendingMeds.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Diagnosis / Admission Reason */}
              {adm.reason && (
                <div className="px-5 py-2 bg-white border-b border-slate-100 flex items-center gap-2 text-xs">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Reason:
                  </span>
                  <span className="text-slate-700 font-medium truncate">{adm.reason}</span>
                </div>
              )}

              {/* Patient Active Medications Container */}
              <div className="p-4 md:p-5 space-y-4">
                {/* Category 1: Active Dispensed Medications (In use & Returnable) */}
                {dispensedMeds.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                          Active Dispensed Medications ({dispensedMeds.length})
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          &bull; In-use by patient
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        Value: ₹{totalDispensedValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden divide-y divide-slate-100">
                      {dispensedMeds.map((med) => (
                        <div
                          key={med.id}
                          className="p-3 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                              <Pill className="w-3.5 h-3.5" />
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-slate-900 uppercase truncate">
                                  {med.medicineName}
                                </p>
                                <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                                  {med.dispensedQuantity} Units
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {med.dosage} &bull; {med.frequency} {med.duration ? `(${med.duration})` : ""}
                                {med.instruction ? ` &bull; ${med.instruction}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="text-left sm:text-right font-mono">
                              <p className="text-xs font-bold text-slate-900">
                                ₹{med.totalPrice?.toFixed(2) || "0.00"}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                @ ₹{med.unitPrice?.toFixed(2) || "0.00"}/u
                              </p>
                            </div>

                            {/* Take Back Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForTakeBack({
                                  id: med.id,
                                  medicineName: med.medicineName,
                                  dosage: med.dosage,
                                  frequency: med.frequency,
                                  duration: med.duration,
                                  dispensedQuantity: med.dispensedQuantity || 1,
                                  unitPrice: med.unitPrice || 0,
                                  totalPrice: med.totalPrice || 0,
                                  patientName: adm.patientName,
                                  patientId: adm.patientCode,
                                  bedInfo: `${adm.wardName} - Bed ${adm.bedNumber}`,
                                })
                                setIsTakeBackOpen(true)
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors active:scale-95"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              <span>Take Back</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category 2: Pending Doctor Prescriptions */}
                {pendingMeds.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Pending Orders ({pendingMeds.length})
                      </span>
                      <span className="text-amber-700 text-[11px] font-medium">
                        &bull; Awaiting pharmacy dispensing
                      </span>
                    </div>

                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 overflow-hidden divide-y divide-amber-100">
                      {pendingMeds.map((med) => (
                        <div
                          key={med.id}
                          className="p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <Pill className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900 uppercase">
                                {med.medicineName}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {med.dosage} &bull; {med.frequency} &bull; {med.duration}
                              </p>
                            </div>
                          </div>

                          <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-mono font-bold uppercase tracking-wider">
                            PENDING ORDER
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State when patient has no medicines recorded */}
                {dispensedMeds.length === 0 && pendingMeds.length === 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
                    <p className="text-xs font-medium text-slate-600">
                      No active medications currently on record for this patient.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Use the &ldquo;+ Send Medicine&rdquo; button above to issue medicines from stock directly to this patient.
                    </p>
                  </div>
                )}
              </div>

              {/* Patient Footer */}
              <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Regimen: <strong className="text-slate-800 font-mono">{adm.medicines.length}</strong> items</span>
                  <span>&bull;</span>
                  <span className="text-emerald-700 font-medium font-mono">{dispensedMeds.length} Dispensed</span>
                  <span>&bull;</span>
                  <span className="text-amber-700 font-medium font-mono">{pendingMeds.length} Pending</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Inpatient Active Care</span>
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* Take-Back Modal Dialog */}
      <TakeBackMedicineModal
        isOpen={isTakeBackOpen}
        onClose={() => {
          setIsTakeBackOpen(false)
          setSelectedForTakeBack(null)
        }}
        prescription={selectedForTakeBack}
        onSuccess={handleTakeBackSuccess}
      />

      {/* Send Medicine Modal Dialog */}
      <SendMedicineModal
        isOpen={isSendOpen}
        onClose={() => {
          setIsSendOpen(false)
          setSelectedForSend(null)
        }}
        patientInfo={selectedForSend}
        onSuccess={handleSendSuccess}
      />
    </div>
  )
}
