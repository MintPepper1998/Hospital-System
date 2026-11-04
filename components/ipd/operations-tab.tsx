"use client"

import React, { useState, useEffect } from "react"
import { getPatientSurgeries } from "@/app/actions/operations"
import { cancelSurgery } from "@/app/actions/ot-schedule"
import { 
  Loader2, Scissors, Calendar, Clock, MapPin, UserSquare2, ArrowRight, 
  ShieldCheck, FileText, CheckCircle2, Activity, ShieldAlert, Trash2, 
  IndianRupee, Pill, Users, Settings2
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { SurgeryOperationManagerModal } from "@/components/ot/surgery-operation-manager-modal"

export function OperationsTab({ admission }: { admission: any }) {
  const [surgeries, setSurgeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [managerSurgeryId, setManagerSurgeryId] = useState<string | null>(null)
  const [managerModalOpen, setManagerModalOpen] = useState(false)
  const [managerDefaultTab, setManagerDefaultTab] = useState("charges")

  useEffect(() => {
    loadSurgeries()
  }, [admission.patientId])

  async function loadSurgeries() {
    const data = await getPatientSurgeries(admission.patientId)
    setSurgeries(data.filter((s: any) => s.status !== 'CANCELLED'))
    setLoading(false)
  }

  const handleCancel = async (surgeryId: string) => {
    const reason = window.prompt("Reason for cancellation:")
    if (reason === null) return

    const res = await cancelSurgery(surgeryId, reason)
    if (res.success) {
      toast.success("Operation cancelled")
      loadSurgeries()
    } else {
      toast.error(res.error || "Failed to cancel")
    }
  }

  const handleOpenManager = (surgeryId: string, tab: string = "charges") => {
    setManagerSurgeryId(surgeryId)
    setManagerDefaultTab(tab)
    setManagerModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED": return "bg-blue-50 text-blue-600 border-blue-100"
      case "ONGOING": return "bg-orange-50 text-orange-600 border-orange-100"
      case "COMPLETED": return "bg-emerald-50 text-emerald-600 border-emerald-100"
      case "CANCELLED": return "bg-red-50 text-red-600 border-red-100"
      default: return "bg-gray-50 text-gray-600 border-gray-100"
    }
  }

  const getPacStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-amber-50 text-amber-600 border-amber-100"
      case "CLEARED": return "bg-emerald-50 text-emerald-600 border-emerald-100"
      case "REJECTED": return "bg-red-50 text-red-600 border-red-100"
      default: return "bg-gray-50 text-gray-600 border-gray-100"
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-500">Loading operations history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100/50 flex items-center justify-center shrink-0">
            <Scissors className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Operations & Surgeries</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Track scheduled procedures, charges, assigned staff, and OT medicines for {admission.patient.user.name}</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.href = `/dashboard/ot/schedule?patientId=${admission.patientId}`}
          className="group relative flex items-center justify-between bg-black text-white px-6 py-4 rounded-full text-sm font-bold tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-xl hover:shadow-black/20 shrink-0 cursor-pointer"
        >
          <span className="pr-4">Schedule Operation</span>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>

      {/* OPERATIONS LIST */}
      {surgeries.length === 0 ? (
        <div className="p-12 bg-gray-50 border border-gray-200 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">No Operations Scheduled</h3>
            <p className="text-sm font-medium text-gray-500 mt-1 max-w-sm mx-auto">This patient has no past or upcoming operations recorded in the system.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {surgeries.map((surgery) => {
            const consumables = (surgery.consumables as any) || {}
            const otPharmacy = consumables.otPharmacy || []
            const medsCount = otPharmacy.length
            const staffCount = (surgery.staffAssignments?.length || 0) + (surgery.leadSurgeon ? 1 : 0)
            const totalCost = surgery.surgeryCharge || 0

            return (
              <div 
                key={surgery.id}
                className="group p-1 bg-white border border-gray-100 rounded-[2rem] hover:shadow-2xl hover:shadow-indigo-500/5 hover:border-indigo-100/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                <div className="p-6 h-full flex flex-col bg-gray-50/50 rounded-[calc(2rem-0.25rem)] group-hover:bg-white transition-colors duration-500">
                  
                  {/* Top Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{surgery.procedureName}</h3>
                      {surgery.diagnosis && (
                        <p className="text-sm font-medium text-gray-500 mt-1 line-clamp-1">{surgery.diagnosis}</p>
                      )}
                    </div>
                    <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-widest uppercase ${getStatusColor(surgery.status)}`}>
                      {surgery.status}
                    </div>
                  </div>

                  {/* Operational Summary Pill Bar (Charges, Staff, Meds) */}
                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-bold font-mono">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      <span>₹{totalCost.toLocaleString("en-IN")} Total</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>{staffCount} Staff Assigned</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200/60 text-purple-700 text-xs font-semibold">
                      <Pill className="w-3.5 h-3.5 text-purple-600" />
                      <span>{medsCount} Medicines</span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</div>
                        <div className="text-sm font-bold text-gray-900 truncate">{format(new Date(surgery.scheduledDate), "dd MMM yyyy")}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time (Est)</div>
                        <div className="text-sm font-bold text-gray-900 truncate">{format(new Date(surgery.scheduledDate), "hh:mm a")} ({surgery.durationMinutes}m)</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                        <UserSquare2 className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lead Surgeon</div>
                        <div className="text-sm font-bold text-gray-900 truncate">{surgery.leadSurgeon?.user?.name || "Unassigned"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Theater</div>
                        <div className="text-sm font-bold text-gray-900 truncate">{surgery.theater?.name || "TBD"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Operation Management Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                    <button
                      type="button"
                      onClick={() => handleOpenManager(surgery.id, "medicines")}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-purple-600/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Pill className="w-4 h-4" />
                      <span>+ Add / Dispense OT Medicine</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenManager(surgery.id, "charges")}
                      className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4 text-slate-500" />
                      <span>Manage Charges & Staff</span>
                    </button>
                  </div>

                  {/* OT Medicines Quick Summary Table */}
                  <div className="mb-4 bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-purple-600" />
                        OT Medicines & Consumables ({otPharmacy.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenManager(surgery.id, "medicines")}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        + Add / Manage
                      </button>
                    </div>

                    {otPharmacy.length === 0 ? (
                      <div className="py-2 px-3 text-center text-xs text-slate-400 bg-slate-50/60 rounded-lg border border-dashed border-slate-200">
                        No OT medicines recorded yet. Click &quot;+ Add / Dispense OT Medicine&quot; to issue from pharmacy.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {otPharmacy.map((med: any, idx: number) => {
                          const netQty = med.netQuantity !== undefined ? med.netQuantity : (med.quantity || 1)
                          const retQty = med.quantityReturned || 0
                          const unitPrice = med.unitPrice || 0
                          const total = med.netTotal !== undefined ? med.netTotal : netQty * unitPrice
                          const isReturned = med.status === "RETURNED" || (med.quantityIssued > 0 && netQty === 0)
                          const isPending = med.status === "PENDING"
                          return (
                            <div
                              key={med.id || idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100 text-xs"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {isReturned ? (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-500 border-slate-200">
                                    Returned
                                  </Badge>
                                ) : retQty > 0 ? (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                                    Dispensed ({retQty} ret)
                                  </Badge>
                                ) : isPending ? (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                    Pending
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Dispensed
                                  </Badge>
                                )}
                                <span className="font-semibold text-slate-800 truncate" title={med.medicineName || med.name}>
                                  {med.medicineName || med.name}
                                </span>
                                {med.batchNumber && (
                                  <span className="text-[10px] text-slate-400 font-mono">({med.batchNumber})</span>
                                )}
                                <span className="text-slate-500 text-[11px]">
                                  Qty: {netQty}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  ₹{total.toLocaleString("en-IN")}
                                </span>
                                {netQty > 0 && !isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenManager(surgery.id, "medicines")}
                                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
                                    title="Return unused medicines to inventory"
                                  >
                                    Return
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer Section (PAC Status / Actions) */}
                  <div className="mt-auto pt-4 border-t border-gray-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PAC:</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 ${getPacStatusColor(surgery.pacStatus)}`}>
                        {surgery.pacStatus === "CLEARED" ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {surgery.pacStatus}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {surgery.status !== 'CANCELLED' && (
                        <button 
                          onClick={() => handleCancel(surgery.id)}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
                      <button 
                        onClick={() => window.location.href = `/dashboard/ot/schedule?surgeryId=${surgery.id}`}
                        className="text-[11px] font-bold text-slate-700 hover:text-black hover:bg-slate-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        OT Profile
                      </button>
                    </div>
                  </div>
                  
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Surgery Operation Management Modal */}
      <SurgeryOperationManagerModal
        surgeryId={managerSurgeryId}
        open={managerModalOpen}
        onOpenChange={setManagerModalOpen}
        defaultTab={managerDefaultTab}
        onSuccess={loadSurgeries}
      />
    </div>
  )
}
