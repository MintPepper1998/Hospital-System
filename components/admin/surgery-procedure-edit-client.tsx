"use client"

import { useState, useTransition, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft, Save, Scissors, Plus, Trash2, Search, Pill, GripVertical,
  Clock, X, AlertTriangle
} from "lucide-react"
import {
  updateSurgeryProcedure, searchMedicines,
  type MedicineInput
} from "@/app/actions/surgery-procedures"

type MedicineSearchResult = {
  id: string; name: string; genericName: string; strength: string | null; unitPrice: number; type: string
}

type ProcedureMedicine = MedicineInput & {
  unitPrice?: number; strength?: string | null; type?: string
}

type Procedure = {
  id: string; name: string; code: string | null; category: string | null
  description: string | null; estimatedDuration: number | null; theaterType: string | null
  totalCharge: number; isActive: boolean
  chargeComponents: { id: string; chargeLabel: string; chargeType: string; amount: number; isOptional: boolean; requiresAssignment: boolean; sortOrder: number }[]
  medicines: { id: string; medicineId: string; medicineName: string; quantity: number; dosage: string | null; notes: string | null; sortOrder: number; medicine: { unitPrice: number; strength: string | null; type: string; inventoryBatches?: { sellingPrice: number }[] } }[]
}

// ─────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────
export function SurgeryProcedureEditClient({ procedure, categories }: { procedure: Procedure; categories: string[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Basic Info
  const [name, setName] = useState(procedure.name)
  const [code, setCode] = useState(procedure.code || "")
  const [category, setCategory] = useState(procedure.category || "")
  const [description, setDescription] = useState(procedure.description || "")
  const [estimatedDuration, setEstimatedDuration] = useState(String(procedure.estimatedDuration || ""))
  const [theaterType, setTheaterType] = useState(procedure.theaterType || "")
  const [isActive, setIsActive] = useState(procedure.isActive)

  // OT Pharmacy Medicines (Standard procedure template recommendations)
  const [medicines, setMedicines] = useState<ProcedureMedicine[]>(
    procedure.medicines.map(m => ({
      medicineId: m.medicineId,
      medicineName: m.medicineName,
      quantity: m.quantity,
      dosage: m.dosage || "",
      notes: m.notes || "",
      sortOrder: m.sortOrder,
      unitPrice: m.medicine.inventoryBatches?.[0]?.sellingPrice || m.medicine.unitPrice,
      strength: m.medicine.strength,
      type: m.medicine.type,
    }))
  )

  // Save
  const handleSave = () => {
    if (!name.trim()) { toast.error("Procedure name is required"); return }
    startTransition(async () => {
      const result = await updateSurgeryProcedure(procedure.id, {
        name, code, category, description,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
        theaterType: theaterType || undefined,
        isActive,
        chargeComponents: [],
        medicines: medicines.map((m, i) => ({
          medicineId: m.medicineId,
          medicineName: m.medicineName,
          quantity: m.quantity,
          dosage: m.dosage,
          notes: m.notes,
          sortOrder: i,
        })),
      })
      if (result.success) {
        toast.success(result.message)
        router.push("/dashboard/admin/surgery-procedures")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/admin/surgery-procedures")}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Procedure</h1>
            <p className="text-sm text-gray-400 mt-0.5">{procedure.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            {isActive ? "Active" : "Inactive"}
          </div>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0066CC] text-white rounded-full font-semibold text-sm hover:bg-[#0052A3] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Basic Information ── */}
        <div className="space-y-6">
          <SectionCard title="Basic Information" icon={<Scissors size={16} />}>
            <div className="space-y-4">
              <Field label="Procedure Name" required>
                <input value={name} onChange={e => setName(e.target.value)} className="field-input" placeholder="e.g. Cholecystectomy" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code">
                  <input value={code} onChange={e => setCode(e.target.value)} className="field-input" placeholder="CHT" />
                </Field>
                <Field label="Duration (min)">
                  <input type="number" value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)} className="field-input" placeholder="60" />
                </Field>
              </div>
              <Field label="Category">
                <select value={category} onChange={e => setCategory(e.target.value)} className="field-input">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new">+ New Category</option>
                </select>
                {category === "__new" && (
                  <input
                    className="field-input mt-2" placeholder="Enter new category"
                    onChange={e => setCategory(e.target.value)} autoFocus
                  />
                )}
              </Field>
              <Field label="Theater Type">
                <select value={theaterType} onChange={e => setTheaterType(e.target.value)} className="field-input">
                  <option value="">Select type</option>
                  <option value="MAJOR">Major</option>
                  <option value="MINOR">Minor</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="DAY_CARE">Day Care</option>
                </select>
              </Field>
              <Field label="Description">
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="field-input min-h-[90px] resize-none" placeholder="Brief procedure description..." />
              </Field>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">Active Status</span>
                <button onClick={() => setIsActive(!isActive)} className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isActive ? "bg-emerald-500" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isActive ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Standard Procedure Medicines (Template / Recommended) ── */}
        <div className="space-y-6">
          <SectionCard 
            title="Recommended OT Medicines" 
            icon={<Pill size={16} />} 
            subtitle={`${medicines.length} standard items for this procedure template`}
          >
            <OTPharmacyBuilder medicines={medicines} onChange={setMedicines} />
          </SectionCard>
        </div>
      </div>

      <style jsx global>{`
        .field-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #E5E7EB;
          background: #FAFAFA;
          font-size: 14px;
          color: #111827;
          outline: none;
          transition: all 0.15s;
        }
        .field-input:focus {
          border-color: #0066CC;
          background: #FFF;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.08);
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS
// ─────────────────────────────────────────────────────
function SectionCard({ title, icon, subtitle, children }: {
  title: string; icon: React.ReactNode; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066CC] flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// OT PHARMACY BUILDER (Standard Template Medicines)
// ─────────────────────────────────────────────────────
function OTPharmacyBuilder({ medicines, onChange }: { medicines: ProcedureMedicine[]; onChange: (m: ProcedureMedicine[]) => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<MedicineSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (query.length < 2) { setSearchResults([]); setShowDropdown(false); return }
    
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchMedicines(query)
        const filtered = results.filter((r: MedicineSearchResult) => !medicines.some(m => m.medicineId === r.id))
        setSearchResults(filtered)
        setShowDropdown(true)
      } catch { setSearchResults([]) }
      setIsSearching(false)
    }, 300)
  }, [medicines])

  const addMedicine = (med: MedicineSearchResult) => {
    onChange([...medicines, {
      medicineId: med.id,
      medicineName: med.name,
      quantity: 1,
      dosage: "",
      notes: "",
      sortOrder: medicines.length,
      unitPrice: med.unitPrice,
      strength: med.strength,
      type: med.type,
    }])
    setSearchQuery("")
    setSearchResults([])
    setShowDropdown(false)
  }

  const updateMedicine = (i: number, field: string, value: any) => {
    const next = [...medicines]
    ;(next[i] as any)[field] = value
    onChange(next)
  }

  const removeMedicine = (i: number) => {
    onChange(medicines.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-blue-700">
        <Pill className="w-4 h-4 shrink-0 text-blue-600" />
        <span>Pre-define standard template medicines alerted to OT for this procedure. Actual medicine dispensing and patient billing happen per scheduled operation.</span>
      </div>

      {/* Search Input */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="field-input !pl-10 !py-2.5 text-sm"
            placeholder="Search medicines by name or generic name..."
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setShowDropdown(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {searchResults.map(med => (
              <div
                key={med.id}
                onClick={() => addMedicine(med)}
                className="flex items-center justify-between p-3 hover:bg-blue-50/50 cursor-pointer transition-colors border-b border-gray-50 last:border-none"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                  <p className="text-xs text-gray-400">{med.genericName} {med.strength && `· ${med.strength}`}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-blue-600">+ Add</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Medicines List */}
      {medicines.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
          <Pill size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs">No recommended medicines added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {medicines.map((m, i) => (
            <div key={m.medicineId} className="flex items-center gap-3 p-3 bg-gray-50/70 border border-gray-100 rounded-xl group hover:border-gray-200 transition-colors">
              <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.medicineName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">{m.type}</span>
                  {m.strength && <span className="text-[10px] text-gray-400">· {m.strength}</span>}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Qty:</span>
                <input
                  type="number"
                  min="1"
                  value={m.quantity}
                  onChange={e => updateMedicine(i, "quantity", parseInt(e.target.value) || 1)}
                  className="w-14 p-1 text-center bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>

              {/* Notes */}
              <input
                value={m.notes || ""}
                onChange={e => updateMedicine(i, "notes", e.target.value)}
                placeholder="Dosage / notes..."
                className="w-36 p-1 bg-white border border-gray-200 rounded-lg text-xs hidden sm:block"
              />

              <button onClick={() => removeMedicine(i)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
