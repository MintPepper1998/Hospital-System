"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ChevronRight, ChevronDown, User, Pill, FlaskConical, DollarSign, Activity, FileText, CheckCircle2, AlertCircle, Phone, MapPin, Bed, Scissors, HeartPulse, Percent, Tag, Printer, X as XIcon, Plus, Monitor, Trash2, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ProcessPaymentDialog } from "./process-payment-dialog"
import { applyDiscount, addCustomCharge, removeCustomCharge } from "@/app/actions/billing"
import { assignNurse } from "@/app/actions/ipd-nursing"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { AddonsSection } from "./addons-section"

function NursingChargeSection({ admissionId, assignments, nurses, onRefresh }: { admissionId: string, assignments: any[], nurses?: any[], onRefresh: () => void }) {
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.append("admissionId", admissionId)
    
    const res = await assignNurse(formData)
    setLoading(false)
    if (res.success) {
      toast.success("Nurse assignment added")
      setIsAdding(false)
      onRefresh()
    } else {
      toast.error(res.message || "Failed to add nurse assignment")
    }
  }

  return (
    <div className="space-y-4 text-sm" onClick={(e) => e.stopPropagation()}>
      {assignments?.length > 0 ? assignments.map((n: any, i: number) => (
        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
          <div>
            <div className="font-semibold text-gray-900">{n.nurseName}</div>
            <div className="text-xs text-gray-400">Shift: {n.shift} • ₹{n.cost?.toLocaleString("en-IN")}/day × {n.days} days</div>
          </div>
          <span className="font-bold text-gray-900">₹{n.totalCost?.toLocaleString("en-IN")}</span>
        </div>
      )) : <p className="text-gray-400 text-center py-2">No nurse assignments</p>}

      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Nursing Charge
        </button>
      ) : (
        <form onSubmit={handleAdd} className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Select Nurse</label>
            <select name="nurseId" required className="w-full text-sm p-2 rounded border border-gray-200">
              <option value="">-- Select --</option>
              {nurses?.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Shift</label>
              <select name="shift" required className="w-full text-sm p-2 rounded border border-gray-200">
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Charge per day (₹)</label>
              <input type="number" name="cost" required defaultValue={500} className="w-full text-sm p-2 rounded border border-gray-200" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {loading ? "Adding..." : "Add Charge"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export function BillingDashboardClient({ admissions, nurses }: { admissions: any[], nurses?: any[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  
  // Discount state
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENTAGE">("FLAT")
  const [discountValue, setDiscountValue] = useState("")
  const [discountReason, setDiscountReason] = useState("")
  const [applyingDiscount, setApplyingDiscount] = useState(false)

  // Manual charge modal state
  const [chargeModalOpen, setChargeModalOpen] = useState(false)
  const [chargeCategory, setChargeCategory] = useState<"BED" | "DOCTOR" | "NURSING" | "EQUIPMENT" | "PHARMACY" | "LAB" | "SURGERY" | "ADDON">("BED")
  const [chargeCategoryTitle, setChargeCategoryTitle] = useState("Room / Bed Charge")
  const [chargeName, setChargeName] = useState("")
  const [chargeAmount, setChargeAmount] = useState("")
  const [chargeQuantity, setChargeQuantity] = useState("1")
  const [chargeDiscount, setChargeDiscount] = useState("0")
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split("T")[0])
  const [savingCharge, setSavingCharge] = useState(false)

  const openAddChargeModal = (
    category: "BED" | "DOCTOR" | "NURSING" | "EQUIPMENT" | "PHARMACY" | "LAB" | "SURGERY" | "ADDON",
    categoryTitle: string,
    defaultName: string = "",
    defaultAmount: number = 0,
    defaultQty: number = 1
  ) => {
    setChargeCategory(category)
    setChargeCategoryTitle(categoryTitle)
    setChargeName(defaultName)
    setChargeAmount(defaultAmount > 0 ? String(defaultAmount) : "")
    setChargeQuantity(String(defaultQty || 1))
    setChargeDiscount("0")
    setChargeDate(new Date().toISOString().split("T")[0])
    setChargeModalOpen(true)
  }

  const handleSaveManualCharge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAdmission) return

    const amt = parseFloat(chargeAmount)
    const qty = parseInt(chargeQuantity) || 1
    const disc = parseFloat(chargeDiscount) || 0

    if (!chargeName.trim() || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid description and positive amount")
      return
    }

    setSavingCharge(true)
    try {
      const res = await addCustomCharge({
        admissionId: selectedAdmission.id,
        category: chargeCategory,
        name: chargeName.trim(),
        amount: amt,
        quantity: qty,
        discountAmount: disc,
        date: chargeDate || new Date().toISOString(),
      })

      if (res.success) {
        toast.success(res.message || "Charge added successfully")
        setChargeModalOpen(false)
        refreshPage()
      } else {
        toast.error(res.message || "Failed to add charge")
      }
    } catch (err: any) {
      toast.error(err.message || "Error adding charge")
    } finally {
      setSavingCharge(false)
    }
  }

  const handleRemoveCharge = async (chargeId: string) => {
    if (!confirm("Are you sure you want to remove this charge?")) return
    try {
      const res = await removeCustomCharge(chargeId)
      if (res.success) {
        toast.success(res.message || "Charge removed successfully")
        refreshPage()
      } else {
        toast.error(res.message || "Failed to remove charge")
      }
    } catch (err: any) {
      toast.error(err.message || "Error removing charge")
    }
  }

  // Sync selectedAdmission when admissions prop refreshes (e.g. after adding custom charges)
  useEffect(() => {
    if (selectedAdmission) {
      const updated = admissions.find((a) => a.id === selectedAdmission.id)
      if (updated) {
        setSelectedAdmission(updated)
      }
    }
  }, [admissions])

  const filteredAdmissions = admissions.filter(
    (adm) =>
      adm.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.patientDisplayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.bedNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const refreshPage = () => {
    router.refresh()
  }

  const handleApplyDiscount = async () => {
    if (!selectedAdmission) return
    const val = parseFloat(discountValue)
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid discount amount")
      return
    }
    setApplyingDiscount(true)
    const res = await applyDiscount(selectedAdmission.id, discountType, val, discountReason || undefined)
    if (res.success) {
      toast.success("Discount applied successfully")
      refreshPage()
    } else {
      toast.error(res.message || "Failed to apply discount")
    }
    setApplyingDiscount(false)
  }

  const bd = selectedAdmission?.billBreakdown

  // Card data for the billing categories (Fully Manual with Date & Remove)
  const billingCards = bd ? [
    {
      id: "room",
      title: "Room / Bed",
      subtitle: bd.bedCharges && bd.bedCharges.length > 0 
        ? `${bd.bedCharges.length} manual bed charge(s)` 
        : `Bed: ${bd.bedNumber} (Standard: ₹${bd.bedRatePerDay?.toLocaleString("en-IN")}/day)`,
      amount: bd.roomRent || 0,
      icon: Bed,
      color: "orange",
      details: (
        <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-100 flex flex-wrap justify-between items-center text-xs text-orange-950 gap-2">
            <div>
              <span className="font-semibold text-gray-700">Assigned Bed:</span> {bd.wardName} ({bd.wardType}) — Bed {bd.bedNumber}
            </div>
            <div className="text-gray-500">
              Bed Price: <span className="font-mono font-bold text-gray-800">₹{bd.bedRatePerDay?.toLocaleString("en-IN")}/day</span>
            </div>
          </div>

          {bd.bedCharges && bd.bedCharges.length > 0 ? (
            <div className="space-y-2">
              {bd.bedCharges.map((bc: any) => (
                <div key={bc.id} className="flex justify-between items-center py-2 px-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{bc.name}</span>
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100/70 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(bc.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      ₹{bc.ratePerDay?.toLocaleString("en-IN")}/day × {bc.days} day(s)
                      {bc.discountAmount > 0 && ` · Disc: -₹${bc.discountAmount?.toLocaleString("en-IN")}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">₹{bc.total?.toLocaleString("en-IN")}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCharge(bc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove Bed Charge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
              No bed charges added yet. Click below to add manual bed charges with date.
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddChargeModal("BED", "Room / Bed Charge", `${bd.wardName} - Bed ${bd.bedNumber} Charge`, bd.bedRatePerDay, 1)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Room / Bed Charge
          </button>
        </div>
      )
    },
    {
      id: "pharmacy",
      title: "Pharmacy",
      subtitle: `${bd.medicines?.length || 0} items prescribed / added`,
      amount: bd.pharmacyTotal || 0,
      icon: Pill,
      color: "blue",
      details: (
        <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
          {bd.medicines?.length > 0 ? (
            <div className="space-y-2">
              {bd.medicines.map((m: any, i: number) => (
                <div key={m.id || i} className="flex justify-between items-center py-2 px-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{m.name}</span>
                      {m.date ? (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(m.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      ) : m.dosage && m.dosage !== "—" ? (
                        <span className="text-xs text-gray-400">{m.dosage} · {m.frequency}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Qty: {m.quantity} × ₹{Number(m.unitPrice).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">
                      ₹{Number(m.totalPrice).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                    {m.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(m.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove Medicine Charge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
              No medicines prescribed or recorded yet.
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddChargeModal("PHARMACY", "Pharmacy / Medicine Charge", "", 0, 1)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Manual Pharmacy Charge
          </button>
        </div>
      )
    },
    {
      id: "lab",
      title: "Laboratory",
      subtitle: `${bd.labTests?.length || 0} tests ordered / added`,
      amount: bd.labTotal || 0,
      icon: FlaskConical,
      color: "purple",
      details: (
        <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
          {bd.labTests?.length > 0 ? (
            <div className="space-y-2">
              {bd.labTests.map((t: any, i: number) => (
                <div key={t.id || i} className="flex justify-between items-center py-2 px-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{t.name}</span>
                      {t.date && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.type} · {t.status}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">₹{t.price?.toLocaleString("en-IN")}</span>
                    {t.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(t.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove Lab Charge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
              No lab tests ordered or added yet.
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddChargeModal("LAB", "Lab Investigation Charge", "", 0, 1)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Manual Lab Charge
          </button>
        </div>
      )
    },
    {
      id: "doctor",
      title: "Doctor Fees",
      subtitle: bd.doctorVisits?.length > 0 
        ? `${bd.doctorVisits.length} consultation(s)` 
        : `Dr. ${selectedAdmission?.doctorName} (No charges added)`,
      amount: bd.doctorFees || 0,
      icon: User,
      color: "green",
      details: (
        <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
          {bd.doctorVisits?.length > 0 ? (
            <div className="space-y-2">
              {bd.doctorVisits.map((d: any, i: number) => (
                <div key={d.id || i} className="flex justify-between items-center py-2 px-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{d.doctorName.startsWith("Dr.") ? d.doctorName : `Dr. ${d.doctorName}`}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(d.date || d.assignedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {d.visits ? `${d.visits} visit(s) × ₹${d.rate?.toLocaleString("en-IN")}` : "Doctor consultation"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">₹{d.fee?.toLocaleString("en-IN")}</span>
                    {d.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(d.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove Doctor Fee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
              No doctor consultation fees added yet. Click below to add manual doctor fees with date.
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddChargeModal("DOCTOR", "Doctor Fee", `Dr. ${selectedAdmission?.doctorName || "Doctor"} - Consultation`, 500, 1)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Doctor Fee
          </button>
        </div>
      )
    },
    {
      id: "surgery",
      title: "Surgery",
      subtitle: `${bd.surgeries?.length || 0} procedures / charges`,
      amount: bd.surgeryTotal || 0,
      icon: Scissors,
      color: "rose",
      details: (
        <div className="space-y-4 text-sm" onClick={(e) => e.stopPropagation()}>
          {bd.surgeries?.length > 0 ? (
            <div className="space-y-3">
              {bd.surgeries.map((s: any, i: number) => (
                <div key={s.id || i} className="p-3 bg-white border border-gray-100 rounded-xl shadow-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{s.procedureName}</span>
                        {s.date && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Surgeon / Info: {s.surgeonName}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 font-mono text-base">₹{s.charge?.toLocaleString("en-IN")}</span>
                      {s.id && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCharge(s.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove Surgery Charge"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Charge Breakdown if any */}
                  {s.chargeBreakdown?.length > 0 && (
                    <div className="ml-2 space-y-1 pt-1 border-t border-gray-50">
                      {s.chargeBreakdown.map((cb: any, j: number) => (
                        <div key={j} className="flex justify-between items-center py-1 px-2.5 bg-gray-50 rounded-lg text-xs">
                          <span className="text-gray-600 font-medium">{cb.chargeLabel} ({cb.chargeType})</span>
                          <span className="font-semibold text-gray-800">₹{cb.amount?.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* OT Pharmacy Medicines if any */}
                  {s.otMedicines?.length > 0 && (
                    <div className="ml-2 space-y-1 pt-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OT Pharmacy</div>
                      {s.otMedicines.map((med: any, j: number) => (
                        <div key={j} className="flex justify-between items-center py-1 px-2.5 bg-emerald-50/50 rounded-lg text-xs">
                          <span className="text-gray-600">{med.name} ×{med.quantity}</span>
                          <span className="font-semibold text-gray-800">₹{med.total?.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
              No surgeries or procedure charges recorded yet.
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddChargeModal("SURGERY", "Surgery / OT Charge", "Minor OT Procedure / Dressing", 1000, 1)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Manual Surgery / OT Charge
          </button>
        </div>
      )
    },
    {
      id: "nursing",
      title: "Nursing",
      subtitle: bd.nurseAssignments?.length > 0 
        ? `${bd.nurseAssignments.length} nursing charge(s)` 
        : "No nursing charges added",
      amount: bd.nursingTotal || 0,
      icon: HeartPulse,
      color: "teal",
      details: (
        <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
          {bd.nurseAssignments?.length > 0 ? (
            <div className="space-y-2">
              {bd.nurseAssignments.map((n: any, i: number) => (
                <div key={n.id || i} className="flex justify-between items-center py-2 px-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{n.nurseName}</span>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-100/70 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(n.date || n.assignedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Shift: {n.shift} • ₹{n.cost?.toLocaleString("en-IN")}/day × {n.days} day(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">₹{n.totalCost?.toLocaleString("en-IN")}</span>
                    {n.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(n.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove Nursing Charge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
              No nursing charges added yet. Click below to add nursing charges manually with date.
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddChargeModal("NURSING", "Nursing Charge", "General Nursing Care", 500, 1)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Nursing Charge
          </button>
        </div>
      )
    },
    {
      id: "equipment",
      title: "Equipment",
      subtitle: bd.equipments?.length > 0 
        ? `${bd.equipments.length} equipment item(s)` 
        : "No equipment charges added",
      amount: bd.equipmentTotal || 0,
      icon: Monitor,
      color: "cyan",
      details: (
        <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
          {bd.equipments?.length > 0 ? (
            <div className="space-y-2">
              {bd.equipments.map((e: any, i: number) => (
                <div key={e.id || i} className="flex justify-between items-center py-2 px-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{e.name}</span>
                      {e.date && (
                        <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100/70 border border-cyan-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Qty: {e.quantity} · Rate: ₹{Number(e.ratePerUnit).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">
                      ₹{Number(e.totalCharge).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {e.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(e.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove Equipment Charge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
              No equipment charges added yet. Click below to add equipment charges manually with date.
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddChargeModal("EQUIPMENT", "Equipment Charge", "Medical Equipment Usage", 500, 1)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-xl hover:bg-cyan-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Equipment Charge
          </button>
        </div>
      )
    },
  ] : []

  const iconColors: Record<string, string> = {
    orange: "bg-orange-50 text-orange-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    rose: "bg-rose-50 text-rose-600",
    teal: "bg-teal-50 text-teal-600",
    cyan: "bg-cyan-50 text-cyan-600",
  }

  return (
    <div className="flex-1 px-4 py-8 md:px-8 md:py-16 max-w-[1600px] mx-auto w-full relative">
      
      {/* Header section */}
      <div className="mb-12 md:mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Link
              href="/dashboard/billing-counter"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-[11px] font-semibold text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Billing Counter
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/5 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">
              <DollarSign className="w-3 h-3" />
              Finance Operations
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4 leading-tight">
            IPD Billing & Accounts
          </h1>
          <p className="text-lg text-gray-500 font-medium">
            Monitor patient liabilities, process live payments, and manage financial discharges in real-time.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-0 bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-500" />
          <div className="relative flex items-center p-2 border border-gray-100 rounded-[1.5rem] bg-white/50 backdrop-blur-xl">
            <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-[1rem] text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by patient, ID, or bed..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 px-3 text-sm font-semibold placeholder:text-gray-400 placeholder:font-medium text-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column: Patient List */}
        <div className={`col-span-12 ${selectedAdmission ? 'lg:col-span-4' : 'lg:col-span-12'} transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            <AnimatePresence>
              {filteredAdmissions.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="col-span-full p-12 text-center bg-white rounded-[2rem] border border-gray-100 shadow-sm"
                >
                  <p className="text-gray-500 font-medium">No active billing profiles found.</p>
                </motion.div>
              ) : (
                filteredAdmissions.map((adm, index) => {
                  const isSelected = selectedAdmission?.id === adm.id;
                  return (
                    <motion.div
                      key={adm.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.32, 0.72, 0, 1] }}
                      onClick={() => { setSelectedAdmission(adm); setExpandedCard(null) }}
                      className={`group cursor-pointer p-1.5 rounded-[2.25rem] transition-all duration-500 
                        ${isSelected ? 'bg-black shadow-xl ring-4 ring-black/5' : 'bg-white/40 hover:bg-white border border-gray-100 hover:shadow-lg hover:border-gray-200'}`}
                    >
                      <div className={`p-6 rounded-[calc(2.25rem-0.375rem)] transition-colors duration-500
                        ${isSelected ? 'bg-black text-white' : 'bg-white'}`}>
                        
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={adm.patientPhoto || "/placeholder-avatar.jpg"} alt={adm.patientName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                {adm.patientName}
                              </h3>
                              <p className={`text-sm font-medium ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                                {adm.patientDisplayId} &bull; Bed {adm.bedNumber}
                              </p>
                            </div>
                          </div>
                          
                          {adm.balanceDue > 0 ? (
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isSelected ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                              Due: ₹{adm.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                          ) : (
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isSelected ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                              Settled
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="space-y-1">
                            <div className={`text-[10px] uppercase tracking-wider font-bold ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
                              Total Liability
                            </div>
                            <div className={`font-semibold ${isSelected ? 'text-gray-200' : 'text-gray-700'}`}>
                              ₹{adm.patientLiability.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className={`text-[10px] uppercase tracking-wider font-bold ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
                              Status
                            </div>
                            <div className="font-semibold flex items-center gap-1.5">
                              {adm.status === "ADMITTED" ? (
                                <><span className="w-2 h-2 rounded-full bg-blue-500" /> <span className={isSelected ? 'text-gray-200' : 'text-gray-700'}>Admitted</span></>
                              ) : (
                                <><span className="w-2 h-2 rounded-full bg-gray-400" /> <span className={isSelected ? 'text-gray-200' : 'text-gray-700'}>Discharged</span></>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Expanded Detail */}
        <AnimatePresence mode="wait">
          {selectedAdmission && (
            <motion.div
              key={selectedAdmission.id}
              initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className="col-span-12 lg:col-span-8 lg:sticky lg:top-8 h-max"
            >
              {/* Double-Bezel Main Card */}
              <div className="p-2 rounded-[2.5rem] bg-white border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
                
                <div className="p-8 md:p-10 bg-[#FAFAFA] rounded-[calc(2.5rem-0.5rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,1)] relative z-10">
                  
                  {/* Bill Header */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 pb-8 border-b border-gray-200/60">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Detailed Invoice Breakdown</h2>
                      <p className="text-gray-500 font-medium text-sm">
                        Admission Date: {new Date(selectedAdmission.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} &bull; Days: {bd?.daysAdmitted}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/dashboard/ipd/print/bill?admissionId=${selectedAdmission.id}`)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        Print Bill
                      </button>
                      <button
                        onClick={() => setSelectedAdmission(null)}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Billing Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
                    {billingCards.map((card) => {
                      const Icon = card.icon
                      const isExpanded = expandedCard === card.id
                      return (
                        <div key={card.id} className={`${isExpanded ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                          <div 
                            onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                            className={`p-5 bg-white rounded-[1.25rem] border border-gray-100 shadow-sm cursor-pointer transition-all duration-500 
                              ${isExpanded ? 'ring-2 ring-black/5 shadow-lg' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg ${iconColors[card.color]} flex items-center justify-center`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 text-sm">{card.title}</h4>
                                  <p className="text-[11px] text-gray-400 font-medium">{card.subtitle}</p>
                                </div>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                              ₹{Number(card.amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </div>
                            
                            {/* Expanded Detail */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    {card.details}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Addons / Custom Charges Section */}
                  <div className="mt-8">
                    <AddonsSection 
                      admissionId={selectedAdmission.id} 
                      customCharges={bd?.customCharges || []} 
                      total={bd?.customChargesTotal || 0} 
                    />
                  </div>

                  {/* Discount Section */}
                  <div className="mt-8 p-6 bg-white rounded-[1.5rem] border border-gray-100">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Apply Discount</h4>
                        <p className="text-[11px] text-gray-400 font-medium">
                          {bd?.discountAmount > 0 || bd?.discountPercent > 0 
                            ? `Current: ${bd.discountType === "PERCENTAGE" ? `${bd.discountPercent}%` : `₹${bd.discountAmount?.toLocaleString("en-IN")}`}${bd.discountReason ? ` — ${bd.discountReason}` : ""}`
                            : "No discount applied"
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-end gap-3">
                      {/* Type Toggle */}
                      <div className="flex bg-gray-100 rounded-xl p-1">
                        <button 
                          onClick={() => setDiscountType("FLAT")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${discountType === "FLAT" ? "bg-black text-white" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          ₹ Flat
                        </button>
                        <button 
                          onClick={() => setDiscountType("PERCENTAGE")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${discountType === "PERCENTAGE" ? "bg-black text-white" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          <Percent className="w-3 h-3 inline mr-1" />
                          Percentage
                        </button>
                      </div>

                      {/* Value Input */}
                      <div className="relative flex-1 min-w-[120px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                          {discountType === "FLAT" ? "₹" : "%"}
                        </span>
                        <input 
                          type="number" 
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder="0"
                          className="w-full h-10 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-black focus:border-black transition-all"
                        />
                      </div>

                      {/* Reason */}
                      <input 
                        type="text"
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="flex-1 min-w-[140px] h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-black focus:border-black transition-all"
                      />

                      <button 
                        onClick={handleApplyDiscount}
                        disabled={applyingDiscount}
                        className="h-10 px-5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {applyingDiscount ? "Applying..." : "Apply"}
                      </button>
                    </div>
                  </div>

                  {/* Summary Totals */}
                  <div className="mt-8 bg-white rounded-[1.5rem] p-6 border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
                        <span>Gross Total</span>
                        <span>₹{selectedAdmission.totalBillAmount.toLocaleString('en-IN')}</span>
                      </div>
                      
                      {(bd?.discountAmount > 0) && (
                        <div className="flex justify-between items-center text-sm font-semibold text-amber-600">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            <span>Discount ({bd.discountType === "PERCENTAGE" ? `${bd.discountPercent}%` : "Flat"})</span>
                          </div>
                          <span>- ₹{bd.discountAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      {selectedAdmission.hasInsuranceCoverage && (
                        <div className="flex justify-between items-center text-sm font-semibold text-emerald-600">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Insurance / Scheme Coverage</span>
                          </div>
                          <span>- ₹{(selectedAdmission.totalBillAmount - selectedAdmission.patientLiability).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
                        <span>Advance / Paid Amount</span>
                        <span>- ₹{selectedAdmission.amountPaid.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Payment History */}
                      {bd?.payments?.length > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2">Payment History</div>
                          {bd.payments.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center py-1.5 text-xs font-medium text-gray-500">
                              <span>{new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {p.mode}</span>
                              <span className="text-green-600 font-semibold">₹{p.amount.toLocaleString("en-IN")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-lg font-black text-gray-900 uppercase tracking-wide">Net Balance Due</span>
                        <span className={`text-3xl font-black ${selectedAdmission.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{selectedAdmission.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-8 flex justify-end gap-3">
                    {selectedAdmission.balanceDue > 0 ? (
                      <button 
                        onClick={() => setPaymentDialogOpen(true)}
                        className="group relative flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-[1.25rem] font-bold tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-2xl hover:shadow-black/20"
                      >
                        <span>Process Payment</span>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                          <ChevronRight className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-6 py-4 bg-green-50 text-green-600 rounded-[1.25rem] font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        Bill Settled
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <ProcessPaymentDialog 
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        admission={selectedAdmission}
        onSuccess={refreshPage}
      />

      {/* Universal Manual Charge Modal with Date */}
      {chargeModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setChargeModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Add {chargeCategoryTitle}</h3>
              <button
                type="button"
                onClick={() => setChargeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualCharge} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Charge Date *</label>
                <input
                  type="date"
                  required
                  value={chargeDate}
                  min={selectedAdmission?.admissionDate ? new Date(selectedAdmission.admissionDate).toISOString().split("T")[0] : undefined}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setChargeDate(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Description / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bed Charge, Consultation, Dressing"
                  value={chargeName}
                  onChange={(e) => setChargeName(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-black focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Rate / Unit Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-black focus:border-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Quantity / Days *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={chargeQuantity}
                    onChange={(e) => setChargeQuantity(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-black focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Discount Amount (₹) - Optional</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={chargeDiscount}
                  onChange={(e) => setChargeDiscount(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-black focus:border-black"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Calculated Total:</span>
                <span className="font-mono text-base font-bold text-gray-900">
                  ₹{Math.max(0, ((parseFloat(chargeAmount) || 0) * (parseInt(chargeQuantity) || 1)) - (parseFloat(chargeDiscount) || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChargeModalOpen(false)}
                  disabled={savingCharge}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCharge}
                  className="px-5 py-2 text-xs font-bold text-white bg-black rounded-xl hover:bg-gray-800 disabled:opacity-50"
                >
                  {savingCharge ? "Adding..." : "Add Charge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
