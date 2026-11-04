"use client"

import { useState, useEffect, useTransition } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { searchMedicinesForIPDSend, sendMedicineToIPDPatient } from "@/lib/actions/pharmacy"
import { toast } from "sonner"
import {
  Send,
  Pill,
  Minus,
  Plus,
  Search,
  Loader2,
  X,
  Package,
  BedDouble,
  User,
  Clock,
  Layers,
  ShieldCheck,
  Check,
} from "lucide-react"

interface BatchOption {
  id: string
  batchNumber: string
  quantity: number
  sellingPrice: number
  expiryDate: string | null
}

interface MedicineSearchResult {
  id: string
  name: string
  genericName?: string | null
  strength?: string | null
  type?: string | null
  totalStock: number
  sellingPrice: number
  batches: BatchOption[]
}

interface SendMedicineModalProps {
  isOpen: boolean
  onClose: () => void
  patientInfo: {
    admissionId: string
    patientName: string
    patientCode: string
    bedInfo: string
  } | null
  onSuccess?: (newMedicine: any) => void
}

const FREQUENCY_OPTIONS = [
  { label: "STAT (Immediate)", value: "STAT" },
  { label: "OD (Once a day)", value: "OD" },
  { label: "BD (Twice a day)", value: "BD" },
  { label: "TDS (Thrice a day)", value: "TDS" },
  { label: "QID (4 times a day)", value: "QID" },
  { label: "SOS (As required)", value: "SOS" },
]

export function SendMedicineModal({
  isOpen,
  onClose,
  patientInfo,
  onSuccess,
}: SendMedicineModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<MedicineSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineSearchResult | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [dosage, setDosage] = useState<string>("")
  const [frequency, setFrequency] = useState<string>("STAT")
  const [instruction, setInstruction] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setResults([])
      setSelectedMedicine(null)
      setSelectedBatchId("")
      setQuantity(1)
      setDosage("")
      setFrequency("STAT")
      setInstruction("")
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const found = await searchMedicinesForIPDSend(query)
        setResults(found as MedicineSearchResult[])
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  if (!patientInfo) return null

  // When medicine is chosen, preselect primary batch and default dosage
  const handleSelectMedicine = (med: MedicineSearchResult) => {
    setSelectedMedicine(med)
    setDosage(med.strength || "1 Unit")
    if (med.batches && med.batches.length > 0) {
      setSelectedBatchId(med.batches[0].id)
    } else {
      setSelectedBatchId("")
    }
    setQuantity(1)
  }

  const selectedBatch = selectedMedicine?.batches.find((b) => b.id === selectedBatchId)
  const maxAvailable = selectedBatch?.quantity ?? selectedMedicine?.totalStock ?? 1
  const unitPrice = selectedBatch?.sellingPrice ?? selectedMedicine?.sellingPrice ?? 0
  const totalPrice = Math.max(0, quantity * unitPrice)

  const handleQuantityChange = (val: number) => {
    const clamped = Math.max(1, Math.min(maxAvailable, Math.floor(val || 1)))
    setQuantity(clamped)
  }

  const handleConfirmSend = () => {
    if (!selectedMedicine) {
      toast.error("Please search and select a medicine")
      return
    }

    if (quantity < 1 || quantity > maxAvailable) {
      toast.error(`Please select a valid quantity between 1 and ${maxAvailable}`)
      return
    }

    startTransition(async () => {
      try {
        const res = await sendMedicineToIPDPatient({
          admissionId: patientInfo.admissionId,
          medicineId: selectedMedicine.id,
          medicineName: selectedMedicine.name,
          batchId: selectedBatchId || undefined,
          quantity,
          dosage: dosage || "1 Unit",
          frequency,
          instruction: instruction || "Directly issued by Pharmacy to admitted patient",
        })

        if (res.success && res.medicine) {
          toast.success("Medicine Sent Successfully", {
            description: `Issued ${quantity} unit(s) of ${selectedMedicine.name} to ${patientInfo.patientName}. Added to active medications.`,
          })
          onSuccess?.(res.medicine)
          onClose()
        } else {
          toast.error(res.message || "Failed to send medicine to patient")
        }
      } catch (err: any) {
        toast.error(err?.message || "An unexpected error occurred")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      {/* showCloseButton={false} strictly removes the duplicate outer X close icon */}
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[600px] p-0 border-0 bg-transparent shadow-none overflow-visible"
      >
        {/* Professional Clinical Container */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] overflow-hidden">
          
          {/* Header Bar */}
          <div className="p-5 md:p-6 bg-slate-50/80 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] uppercase tracking-[0.15em] font-bold">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                Ward Pharmacy Dispensing
              </div>
              <DialogTitle className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
                Send Medicine to Patient
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Directly deduct from hospital pharmacy inventory and charge to inpatient stay.
              </DialogDescription>
            </div>

            {/* Single definitive close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50 shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            {/* Patient Clinical Info Strip */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{patientInfo.patientName}</p>
                  <p className="font-mono text-[10px] text-slate-500">{patientInfo.patientCode}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[11px]">
                <BedDouble className="w-3.5 h-3.5 text-cyan-600" />
                <span>{patientInfo.bedInfo}</span>
              </div>
            </div>

            {/* Medicine Selector Area */}
            {!selectedMedicine ? (
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Search Hospital Pharmacy Stock
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search medicine name, generic, or brand..."
                    className="w-full h-10 pl-9 pr-9 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900 font-medium placeholder:text-slate-400"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 absolute right-3 top-3 text-slate-600 animate-spin" />
                  )}
                </div>

                {/* Search Results List */}
                {results.length > 0 && (
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm">
                    {results.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMedicine(m)}
                        className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <Pill className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                            <p className="text-xs font-bold text-slate-900 uppercase truncate">
                              {m.name}
                            </p>
                            {m.strength && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {m.strength}
                              </span>
                            )}
                          </div>
                          {m.genericName && (
                            <p className="text-[10px] text-slate-400 truncate pl-5">
                              {m.genericName}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            m.totalStock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>
                            Stock: {m.totalStock}
                          </span>
                          <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                            ₹{m.sellingPrice.toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {query.length >= 2 && !isSearching && results.length === 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400">
                    No active medicines found in pharmacy inventory matching &ldquo;{query}&rdquo;.
                  </div>
                )}
              </div>
            ) : (
              /* Selected Medicine Form */
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                      <Pill className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900 uppercase">
                        {selectedMedicine.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {selectedMedicine.strength || "Standard"} &bull; Unit Rate: <span className="font-mono font-bold text-slate-800">₹{unitPrice.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMedicine(null)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold hover:underline"
                  >
                    Change Medicine
                  </button>
                </div>

                {/* Batch Selector if multiple batches */}
                {selectedMedicine.batches.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-600" />
                      Select Inventory Batch
                    </label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-medium text-slate-900 font-mono"
                    >
                      {selectedMedicine.batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          Batch {b.batchNumber} (Stock: {b.quantity}) &bull; ₹{b.sellingPrice.toFixed(2)} &bull; Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString("en-IN") : "N/A"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quantity Stepper */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Quantity to Issue (Max: {maxAvailable})
                    </label>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      Charge: ₹{totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1 || isPending}
                      className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-40 border border-slate-200"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min={1}
                        max={maxAvailable}
                        value={quantity}
                        onChange={(e) => handleQuantityChange(Number(e.target.value))}
                        disabled={isPending}
                        className="w-full h-9 text-center font-mono font-bold text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900"
                      />
                      <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-medium pointer-events-none">
                        Units
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= maxAvailable || isPending}
                      className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-40 border border-slate-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Pills */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {[1, 2, 5, 10].filter((n) => n <= maxAvailable).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuantity(n)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                          quantity === n
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    {maxAvailable > 10 && (
                      <button
                        type="button"
                        onClick={() => setQuantity(maxAvailable)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                          quantity === maxAvailable
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        All ({maxAvailable})
                      </button>
                    )}
                  </div>
                </div>

                {/* Dosage & Frequency Form */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      placeholder="e.g. 1 Tablet, 10ml, 1 Inj"
                      className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900 font-semibold"
                    >
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Administration Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="e.g. IV Stat, After Food, Ward replenishment..."
                    className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900"
                  />
                </div>

                {/* Impact Preview */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">Immediate Ward Dispense</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      -{quantity} unit(s) from inventory &bull; Added to active patient regimen
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bill Charge</p>
                    <p className="text-sm font-extrabold text-slate-900 font-mono">
                      +₹{totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isPending || !selectedMedicine || quantity < 1}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Issuing Medicine...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Medicine ({quantity} Units)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
