"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Scissors,
  IndianRupee,
  Users,
  Pill,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
  Save,
  AlertTriangle,
  History,
  Info
} from "lucide-react"
import {
  getSurgeryOperationDetails,
  getAvailableStaffAndDoctors,
  searchMedicinesForOT,
  updateSurgeryCharges,
  updateSurgeryStaffing,
  dispenseMedicineToSurgery,
  returnMedicineFromSurgery,
  type SurgeryChargeItem,
  type SurgeryMedicineItem,
  type SurgeryMedicineReturnLog
} from "@/app/actions/ot-operation-management"

interface SurgeryManagerModalProps {
  surgeryId: string | null
  open?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  onSuccess?: () => void
  defaultTab?: string
  medicinesOnly?: boolean
}

const STANDARD_CHARGE_PRESETS = [
  { label: "OT Charges", type: "OT" },
  { label: "Surgeon Charges", type: "SURGEON" },
  { label: "Assistant Surgeon Charges", type: "ASST_SURGEON" },
  { label: "Anesthesia Charges", type: "ANESTHESIA" },
  { label: "OT Technician Charges", type: "OT_TECHNICIAN" },
  { label: "Nursing Charges", type: "NURSING" },
  { label: "Consumables & Disposables", type: "CONSUMABLES" },
  { label: "Implants & Prosthetics", type: "IMPLANTS" },
  { label: "Miscellaneous Charges", type: "MISCELLANEOUS" },
]

export function SurgeryOperationManagerModal({
  surgeryId,
  open,
  isOpen,
  onOpenChange,
  onClose,
  onSuccess,
  defaultTab,
  medicinesOnly = false,
}: SurgeryManagerModalProps) {
  const isModalOpen = open ?? isOpen ?? false
  const handleOpenChange = (val: boolean) => {
    onOpenChange?.(val)
    if (!val) {
      onClose?.()
    }
  }

  const [activeTab, setActiveTab] = useState(medicinesOnly ? "medicines" : (defaultTab || "charges"))
  const [loading, setLoading] = useState(true)
  const [surgery, setSurgery] = useState<any>(null)

  // Staff lists
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([])
  const [allStaffList, setAllStaffList] = useState<any[]>([])

  // Tab 1: Charges
  const [charges, setCharges] = useState<SurgeryChargeItem[]>([])
  const [isSavingCharges, setIsSavingCharges] = useState(false)

  // Tab 2: Staffing
  const [leadSurgeonId, setLeadSurgeonId] = useState("")
  const [assistantSurgeons, setAssistantSurgeons] = useState("")
  const [anesthetistName, setAnesthetistName] = useState("")
  const [staffAssignments, setStaffAssignments] = useState<any[]>([])
  const [newStaffId, setNewStaffId] = useState("")
  const [newRole, setNewRole] = useState("Scrub Nurse")
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0)
  const [isSavingStaff, setIsSavingStaff] = useState(false)

  // Tab 3: Medicines
  const [medicines, setMedicines] = useState<SurgeryMedicineItem[]>([])
  const [returnsLog, setReturnsLog] = useState<SurgeryMedicineReturnLog[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearchingMeds, setIsSearchingMeds] = useState(false)
  const [selectedMed, setSelectedMed] = useState<any | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [dispenseQty, setDispenseQty] = useState<number>(1)
  const [dispenseNotes, setDispenseNotes] = useState("")
  const [isDispensing, setIsDispensing] = useState(false)

  // Return modal
  const [returnItem, setReturnItem] = useState<SurgeryMedicineItem | null>(null)
  const [returnQty, setReturnQty] = useState<number>(1)
  const [returnReason, setReturnReason] = useState("")
  const [isReturning, setIsReturning] = useState(false)
  const [showReturnsHistory, setShowReturnsHistory] = useState(false)

  const searchDebounce = useRef<NodeJS.Timeout | null>(null)

  // Load all surgery details
  const loadSurgeryData = useCallback(async () => {
    if (!surgeryId) return
    setLoading(true)
    try {
      const [res, staffRes] = await Promise.all([
        getSurgeryOperationDetails(surgeryId),
        getAvailableStaffAndDoctors()
      ])

      if (res.success && res.data) {
        setSurgery(res.data)
        setCharges(res.data.chargeBreakdown || [])
        setLeadSurgeonId(res.data.leadSurgeonId || "")
        setAssistantSurgeons(res.data.assistantSurgeons || "")
        setAnesthetistName(res.data.anesthetistName || "")
        setStaffAssignments(res.data.staffAssignments || [])
        setMedicines(res.data.otPharmacy || [])
        setReturnsLog(res.data.returnsLog || [])
      } else {
        toast.error(res.message || "Failed to load surgery")
      }

      if (staffRes.success) {
        setAvailableDoctors(staffRes.doctors || [])
        setAllStaffList(staffRes.allStaff || [])
      }
    } catch (err: any) {
      toast.error(err.message || "Error loading surgery data")
    } finally {
      setLoading(false)
    }
  }, [surgeryId])

  useEffect(() => {
    if (isModalOpen && surgeryId) {
      if (medicinesOnly) {
        setActiveTab("medicines")
      } else if (defaultTab) {
        setActiveTab(defaultTab)
      }
      loadSurgeryData()
    }
  }, [isModalOpen, surgeryId, defaultTab, medicinesOnly, loadSurgeryData])

  // ── CHARGE HELPERS ──
  const serviceChargesTotal = charges
    .filter(c => c.chargeType !== "OT_PHARMACY")
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const pharmacyMedicinesTotal = medicines.reduce((sum, m) => sum + (m.netTotal || 0), 0)
  const grandTotalCost = serviceChargesTotal + pharmacyMedicinesTotal

  const handleAddChargePreset = (preset: typeof STANDARD_CHARGE_PRESETS[number]) => {
    if (charges.some(c => c.chargeLabel === preset.label)) {
      toast.info(`"${preset.label}" is already added`)
      return
    }
    setCharges(prev => [...prev, { chargeLabel: preset.label, chargeType: preset.type, amount: 0 }])
  }

  const handleAddCustomCharge = () => {
    setCharges(prev => [...prev, { chargeLabel: "", chargeType: "CUSTOM", amount: 0 }])
  }

  const handleUpdateCharge = (idx: number, field: keyof SurgeryChargeItem, val: any) => {
    setCharges(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const handleRemoveCharge = (idx: number) => {
    setCharges(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSaveCharges = async () => {
    if (!surgeryId) return
    setIsSavingCharges(true)
    try {
      const res = await updateSurgeryCharges(surgeryId, charges)
      if (res.success) {
        toast.success("Surgery charges saved successfully")
        loadSurgeryData()
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message || "Failed to save charges")
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving charges")
    } finally {
      setIsSavingCharges(false)
    }
  }

  // ── STAFFING HELPERS ──
  const handleAddStaffAssignment = () => {
    if (!newStaffId) {
      toast.error("Please select a staff member")
      return
    }
    const staffObj = allStaffList.find(s => s.id === newStaffId)
    setStaffAssignments(prev => [
      ...prev,
      {
        staffId: newStaffId,
        staff: { user: { name: staffObj?.name || "Staff" } },
        role: newRole,
        paymentAmount: newPaymentAmount || 0,
      }
    ])
    setNewStaffId("")
    setNewPaymentAmount(0)
  }

  const handleRemoveStaffAssignment = (idx: number) => {
    setStaffAssignments(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSaveStaffing = async () => {
    if (!surgeryId) return
    setIsSavingStaff(true)
    try {
      const formattedAssignments = staffAssignments.map(s => ({
        staffId: s.staffId,
        role: s.role,
        paymentAmount: s.paymentAmount || 0,
        notes: s.notes || null
      }))

      const res = await updateSurgeryStaffing(surgeryId, {
        leadSurgeonId,
        assistantSurgeons,
        anesthetistName,
        staffAssignments: formattedAssignments
      })

      if (res.success) {
        toast.success("Staff assignments updated")
        loadSurgeryData()
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message || "Failed to update staff")
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving staff")
    } finally {
      setIsSavingStaff(false)
    }
  }

  // ── MEDICINES SEARCH & DISPENSE ──
  const handleSearchMedicines = (q: string) => {
    setSearchQuery(q)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }

    searchDebounce.current = setTimeout(async () => {
      setIsSearchingMeds(true)
      try {
        const results = await searchMedicinesForOT(q)
        setSearchResults(results)
      } catch (err) {
        setSearchResults([])
      } finally {
        setIsSearchingMeds(false)
      }
    }, 300)
  }

  const handleSelectMedicine = (med: any) => {
    setSelectedMed(med)
    setSearchQuery("")
    setSearchResults([])
    if (med.batches && med.batches.length > 0) {
      setSelectedBatchId(med.batches[0].id)
    } else {
      setSelectedBatchId("")
    }
    setDispenseQty(1)
  }

  const handleDispenseMedicine = async () => {
    if (!surgeryId || !selectedMed) return
    if (dispenseQty <= 0) {
      toast.error("Please enter a valid quantity")
      return
    }

    setIsDispensing(true)
    try {
      const res = await dispenseMedicineToSurgery(surgeryId, {
        medicineId: selectedMed.id,
        batchId: selectedBatchId || undefined,
        quantity: dispenseQty,
        notes: dispenseNotes.trim() || undefined
      })

      if (res.success) {
        toast.success(res.message || "Medicine dispensed to surgery")
        setSelectedMed(null)
        setSelectedBatchId("")
        setDispenseQty(1)
        setDispenseNotes("")
        loadSurgeryData()
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message || "Failed to dispense medicine")
      }
    } catch (err: any) {
      toast.error(err.message || "Error dispensing medicine")
    } finally {
      setIsDispensing(false)
    }
  }

  // ── RETURN MEDICINE ──
  const handleOpenReturn = (item: SurgeryMedicineItem) => {
    setReturnItem(item)
    setReturnQty(1)
    setReturnReason("")
  }

  const handleConfirmReturn = async () => {
    if (!surgeryId || !returnItem) return
    if (returnQty <= 0 || returnQty > returnItem.netQuantity) {
      toast.error(`Return quantity must be between 1 and ${returnItem.netQuantity}`)
      return
    }

    setIsReturning(true)
    try {
      const res = await returnMedicineFromSurgery(surgeryId, {
        itemId: returnItem.id,
        quantity: returnQty,
        reason: returnReason.trim() || "Unused in surgery"
      })

      if (res.success) {
        toast.success(res.message)
        setReturnItem(null)
        loadSurgeryData()
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message || "Failed to return medicine")
      }
    } catch (err: any) {
      toast.error(err.message || "Error returning medicine")
    } finally {
      setIsReturning(false)
    }
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <Scissors className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{surgery?.procedureName || "Operation Management"}</span>
                  {medicinesOnly && (
                    <Badge variant="outline" className="text-[10px] bg-indigo-500/30 text-indigo-200 border-indigo-400/40">
                      OT Pharmacy
                    </Badge>
                  )}
                  {surgery?.status && (
                    <Badge variant="outline" className="text-[10px] bg-white/10 text-white border-white/20">
                      {surgery.status}
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-indigo-200 mt-1">
                  Patient: <span className="font-semibold text-white">{surgery?.patient?.user?.name || "Patient"}</span>
                  {surgery?.patient?.patientId && ` (${surgery.patient.patientId})`}
                  {surgery?.theater?.name && ` · ${surgery.theater.name}`}
                </p>
              </div>
            </div>

            {/* Total Cost Badge */}
            <div className="bg-white/10 border border-white/15 px-4 py-2 rounded-xl text-right shrink-0">
              {medicinesOnly ? (
                <>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-200">OT Pharmacy Cost</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    ₹{pharmacyMedicinesTotal.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    {medicines.length} {medicines.length === 1 ? "item" : "items"} dispensed
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-200">Total Surgery Cost</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    ₹{grandTotalCost.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Services: ₹{serviceChargesTotal.toLocaleString("en-IN")} + Meds: ₹{pharmacyMedicinesTotal.toLocaleString("en-IN")}
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Loading surgery details...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            {!medicinesOnly && (
              <div className="border-b px-6 bg-slate-50 shrink-0">
                <TabsList className="bg-transparent h-12 p-0 gap-6">
                  <TabsTrigger
                    value="charges"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none rounded-none text-xs font-semibold px-1 py-3 gap-2"
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>Charges & Billing</span>
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      ₹{serviceChargesTotal.toLocaleString("en-IN")}
                    </Badge>
                  </TabsTrigger>

                  <TabsTrigger
                    value="staff"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none rounded-none text-xs font-semibold px-1 py-3 gap-2"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Doctors & Staff</span>
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {staffAssignments.length + (leadSurgeonId ? 1 : 0)}
                    </Badge>
                  </TabsTrigger>

                  <TabsTrigger
                    value="medicines"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none rounded-none text-xs font-semibold px-1 py-3 gap-2"
                  >
                    <Pill className="w-3.5 h-3.5" />
                    <span>OT Medicines (Add & Return)</span>
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {medicines.length} items (₹{pharmacyMedicinesTotal.toLocaleString("en-IN")})
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {!medicinesOnly && (
                <>
                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* TAB 1: CHARGES BREAKDOWN */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <TabsContent value="charges" className="m-0 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Operation Service Charges</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add doctor fees, theater fees, and procedural costs for this specific operation. These charges feed directly into the patient's IPD final bill.
                  </p>
                </div>

                {/* Quick Add Presets */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Add Standard Charges</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDARD_CHARGE_PRESETS.map(preset => (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => handleAddChargePreset(preset)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 transition-colors"
                      >
                        + {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddCustomCharge}
                      className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
                    >
                      + Custom Charge
                    </button>
                  </div>
                </div>

                {/* Charges List Table */}
                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Charge Description</th>
                        <th className="py-2.5 px-4 text-left font-semibold w-40">Category</th>
                        <th className="py-2.5 px-4 text-right font-semibold w-40">Amount (₹)</th>
                        <th className="py-2.5 px-3 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {charges.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No service charges added yet. Click a preset above to add charges.
                          </td>
                        </tr>
                      )}
                      {charges.map((charge, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-4">
                            <Input
                              value={charge.chargeLabel}
                              onChange={e => handleUpdateCharge(idx, "chargeLabel", e.target.value)}
                              placeholder="e.g. Surgeon Charges, OT Charges"
                              className="h-8 text-xs font-medium"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {charge.chargeType}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                              <Input
                                type="number"
                                min="0"
                                value={charge.amount}
                                onChange={e => handleUpdateCharge(idx, "amount", parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs font-bold text-right pl-6 font-mono"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveCharge(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                              title="Delete charge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Display Synchronized OT Pharmacy Medicines Total */}
                      {pharmacyMedicinesTotal > 0 && (
                        <tr className="bg-emerald-50/60 font-semibold border-t">
                          <td className="py-2.5 px-4 text-emerald-900">
                            OT Pharmacy Medicines <span className="font-normal text-[11px] text-emerald-700">(auto-synced from dispensed medicines tab)</span>
                          </td>
                          <td className="py-2.5 px-4 text-emerald-700 font-mono text-[11px]">OT_PHARMACY</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                            ₹{pharmacyMedicinesTotal.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs text-emerald-600">Synced</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t">
                      <tr>
                        <td colSpan={2} className="py-3 px-4 font-bold text-slate-800 text-right">
                          Total Surgery Cost:
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-sm text-indigo-700">
                          ₹{grandTotalCost.toLocaleString("en-IN")}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveCharges}
                    disabled={isSavingCharges}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-5 shadow-sm"
                  >
                    {isSavingCharges ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Charges
                  </Button>
                </div>
              </TabsContent>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 2: DOCTORS & STAFF ASSIGNMENTS */}
              {/* ───────────────────────────────────────────────────────────── */}
              <TabsContent value="staff" className="m-0 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Surgical Team & Staff Assignments</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign lead surgeon, assistant surgeons, anesthetist, and OT team members to this operation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border rounded-xl">
                  {/* Lead Surgeon */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Lead Surgeon *</Label>
                    <select
                      value={leadSurgeonId}
                      onChange={e => setLeadSurgeonId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="">Select Lead Surgeon</option>
                      {availableDoctors.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          Dr. {doc.name} {doc.department ? `(${doc.department})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assistant Surgeon */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Assistant Surgeon(s)</Label>
                    <Input
                      value={assistantSurgeons}
                      onChange={e => setAssistantSurgeons(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Kumar, Dr. Sneha"
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Anesthetist */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Anesthetist</Label>
                    <Input
                      value={anesthetistName}
                      onChange={e => setAnesthetistName(e.target.value)}
                      placeholder="e.g. Dr. A. K. Mohapatra"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Additional OT Staff Assignments */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      OT Nurses, Technicians & Support Staff
                    </h4>
                  </div>

                  {/* Add Staff Row */}
                  <div className="flex flex-wrap items-end gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <Label className="text-[11px] text-slate-600 font-semibold">Staff Member</Label>
                      <select
                        value={newStaffId}
                        onChange={e => setNewStaffId(e.target.value)}
                        className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none"
                      >
                        <option value="">Select Hospital Staff</option>
                        {allStaffList.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-48 space-y-1">
                      <Label className="text-[11px] text-slate-600 font-semibold">Role in Operation</Label>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none"
                      >
                        <option value="Scrub Nurse">Scrub Nurse</option>
                        <option value="Circulating Nurse">Circulating Nurse</option>
                        <option value="OT Technician">OT Technician</option>
                        <option value="Assistant Surgeon">Assistant Surgeon</option>
                        <option value="Anesthetist">Anesthetist</option>
                        <option value="Support Staff">Support Staff</option>
                      </select>
                    </div>

                    <div className="w-32 space-y-1">
                      <Label className="text-[11px] text-slate-600 font-semibold">Remuneration (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newPaymentAmount}
                        onChange={e => setNewPaymentAmount(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-mono text-right"
                      />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddStaffAssignment}
                      className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Staff
                    </Button>
                  </div>

                  {/* Assigned Staff Table */}
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b">
                        <tr>
                          <th className="py-2 px-4 text-left font-semibold">Staff Name</th>
                          <th className="py-2 px-4 text-left font-semibold">Role</th>
                          <th className="py-2 px-4 text-right font-semibold">Fee / Payment (₹)</th>
                          <th className="py-2 px-3 text-center w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffAssignments.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              No additional OT staff assigned yet. Select staff above and click "Add Staff".
                            </td>
                          </tr>
                        )}
                        {staffAssignments.map((assignment, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-4 font-semibold text-slate-800">
                              {assignment.staff?.user?.name || "Staff"}
                            </td>
                            <td className="py-2 px-4">
                              <Badge variant="outline" className="text-[10px]">
                                {assignment.role}
                              </Badge>
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-slate-700">
                              ₹{(assignment.paymentAmount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveStaffAssignment(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveStaffing}
                    disabled={isSavingStaff}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-5 shadow-sm"
                  >
                    {isSavingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Staff Assignments
                  </Button>
                </div>
              </TabsContent>
            </>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: OPEN MEDICINE DISPENSING & RETURNS */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="medicines" className="m-0 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Operation Medicines & Pharmacy Dispensing</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Open medicine dispensing from hospital pharmacy stock. When surgery is finished, any unused medicines can be returned to restore inventory and deduct charges from the bill.
                  </p>
                </div>

                {/* In-Progress Real-Time Notice */}
                {(surgery?.status === "IN_PROGRESS" || surgery?.status === "ONGOING") && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                      <span className="font-bold">Surgery In Progress:</span>
                      <span>Intra-operative medicines and surgical consumables can be given and recorded in real-time.</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                      Live Dispensing
                    </Badge>
                  </div>
                )}

                {/* Open Medicine Search Box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Search Pharmacy Inventory</span>
                  </Label>

                  <div className="relative">
                    <Input
                      value={searchQuery}
                      onChange={e => handleSearchMedicines(e.target.value)}
                      placeholder="Type medicine name or generic name (e.g., Propofol, Ceftriaxone, Bupivacaine)..."
                      className="bg-white text-xs h-9"
                    />
                    {isSearchingMeds && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      </div>
                    )}

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.map(med => (
                          <div
                            key={med.id}
                            onClick={() => handleSelectMedicine(med)}
                            className="p-3 hover:bg-indigo-50/60 cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-800">{med.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {med.genericName} {med.strength && `· ${med.strength}`} · <span className="font-semibold text-emerald-600">{med.totalStock} in stock</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-xs font-bold text-indigo-600">
                                ₹{med.sellingPrice}
                              </span>
                              <div className="text-[10px] text-indigo-500 font-semibold">+ Select</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Medicine Dispense Controls */}
                  {selectedMed && (
                    <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-indigo-900">{selectedMed.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {selectedMed.genericName} · {selectedMed.strength} · Available Stock: <span className="font-bold text-emerald-600">{selectedMed.totalStock}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMed(null)}
                          className="text-xs h-7 text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        {/* Batch Selector */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-600 font-semibold">Select Batch</Label>
                          <select
                            value={selectedBatchId}
                            onChange={e => setSelectedBatchId(e.target.value)}
                            className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none"
                          >
                            {selectedMed.batches?.map((b: any) => (
                              <option key={b.id} value={b.id}>
                                Batch {b.batchNumber} (Stock: {b.quantity}) · ₹{b.sellingPrice}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-600 font-semibold">Quantity to Dispense</Label>
                          <Input
                            type="number"
                            min="1"
                            max={selectedMed.totalStock}
                            value={dispenseQty}
                            onChange={e => setDispenseQty(parseInt(e.target.value) || 1)}
                            className="h-8 text-xs font-bold text-center"
                          />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-600 font-semibold">Administration Notes</Label>
                          <Input
                            value={dispenseNotes}
                            onChange={e => setDispenseNotes(e.target.value)}
                            placeholder="e.g. Pre-op IV, Intra-operative"
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Dispense Button */}
                        <Button
                          type="button"
                          onClick={handleDispenseMedicine}
                          disabled={isDispensing}
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                        >
                          {isDispensing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Issue to Surgery
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Issued Medicines Table with Return Action */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Dispensed Medicines for this Operation
                    </h4>
                    {returnsLog.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowReturnsHistory(!showReturnsHistory)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>{showReturnsHistory ? "Hide Return Logs" : `View Return Logs (${returnsLog.length})`}</span>
                      </button>
                    )}
                  </div>

                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b">
                        <tr>
                          <th className="py-2.5 px-4 text-left font-semibold">Medicine Name</th>
                          <th className="py-2.5 px-3 text-center font-semibold">Batch</th>
                          <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                          <th className="py-2.5 px-3 text-center font-semibold">Issued</th>
                          <th className="py-2.5 px-3 text-center font-semibold">Returned</th>
                          <th className="py-2.5 px-3 text-center font-semibold">Net Used</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Unit Price</th>
                          <th className="py-2.5 px-4 text-right font-semibold">Net Total (₹)</th>
                          <th className="py-2.5 px-3 text-center w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {medicines.length === 0 && (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400">
                              No medicines dispensed for this operation yet. Search and dispense medicines above.
                            </td>
                          </tr>
                        )}
                        {medicines.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-800">{item.medicineName}</div>
                              {item.notes && <div className="text-[10px] text-slate-400">{item.notes}</div>}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                              {item.batchNumber || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.status === "RETURNED" || (item.quantityIssued > 0 && item.netQuantity === 0) ? (
                                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                                  Returned
                                </Badge>
                              ) : item.quantityReturned > 0 ? (
                                <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                  Dispensed ({item.quantityReturned} ret)
                                </Badge>
                              ) : item.status === "PENDING" ? (
                                <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                  Pending
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Dispensed
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                              {item.quantityIssued}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-rose-600">
                              {item.quantityReturned > 0 ? `-${item.quantityReturned}` : "0"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-indigo-700 bg-indigo-50/40">
                              {item.netQuantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              ₹{item.unitPrice}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                              ₹{item.netTotal.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.netQuantity > 0 ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReturn(item)}
                                  className="h-7 px-2 text-[11px] font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Return
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] text-slate-400">
                                  Fully Returned
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {medicines.length > 0 && (
                        <tfoot className="bg-slate-50 border-t">
                          <tr>
                            <td colSpan={7} className="py-2.5 px-4 font-bold text-slate-800 text-right">
                              Total Pharmacy Medicines Charge:
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                              ₹{pharmacyMedicinesTotal.toLocaleString("en-IN")}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* Returns Audit Log (Expandable) */}
                {showReturnsHistory && returnsLog.length > 0 && (
                  <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <h5 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>Returned Medicines Audit History</span>
                    </h5>
                    <div className="divide-y divide-rose-100 text-xs">
                      {returnsLog.map((ret) => (
                        <div key={ret.id} className="py-1.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-rose-900">{ret.medicineName}</span>
                            <span className="text-[11px] text-rose-600 ml-2">× {ret.quantityReturned} returned</span>
                            {ret.reason && <span className="text-[10px] text-slate-500 ml-2">({ret.reason})</span>}
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-semibold text-rose-700">-₹{ret.refundAmount.toLocaleString("en-IN")}</span>
                            <div className="text-[10px] text-slate-400">{new Date(ret.returnedAt).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Return Medicine Confirmation Sub-Modal */}
        {returnItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Return Medicine to Pharmacy</h4>
                  <p className="text-xs text-slate-500">Restores stock in inventory and deducts bill</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div>Medicine: <span className="font-bold text-slate-800">{returnItem.medicineName}</span></div>
                <div>Issued Quantity: <span className="font-semibold">{returnItem.quantityIssued}</span></div>
                <div>Currently Used / Net: <span className="font-bold text-indigo-700">{returnItem.netQuantity}</span></div>
                <div>Unit Price: <span className="font-mono font-semibold">₹{returnItem.unitPrice}</span></div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Quantity to Return (Max {returnItem.netQuantity})</Label>
                <Input
                  type="number"
                  min="1"
                  max={returnItem.netQuantity}
                  value={returnQty}
                  onChange={e => setReturnQty(parseInt(e.target.value) || 1)}
                  className="text-sm font-bold text-center"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Reason for Return</Label>
                <Input
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="e.g. Unused ampoules, procedure completed"
                  className="text-xs"
                />
              </div>

              <div className="text-xs text-slate-500 flex justify-between font-semibold pt-1">
                <span>Refund from Bill:</span>
                <span className="font-mono font-bold text-rose-600">
                  ₹{(returnQty * returnItem.unitPrice).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReturnItem(null)}
                  disabled={isReturning}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmReturn}
                  disabled={isReturning}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5"
                >
                  {isReturning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Confirm Return
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
