"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { returnDispensedIPDPrescription } from "@/lib/actions/pharmacy"
import { toast } from "sonner"
import {
  RotateCcw,
  Pill,
  Minus,
  Plus,
  PackagePlus,
  Loader2,
  X,
  BedDouble,
  User,
  ShieldCheck,
} from "lucide-react"

export interface TakeBackPrescriptionData {
  id: string
  medicineName: string
  dosage: string
  frequency: string
  duration?: string
  dispensedQuantity: number
  unitPrice: number
  totalPrice: number
  patientName: string
  patientId: string
  bedInfo: string
}

interface TakeBackMedicineModalProps {
  isOpen: boolean
  onClose: () => void
  prescription: TakeBackPrescriptionData | null
  onSuccess?: (result: { prescriptionId: string; newDispensedQty: number }) => void
}

const QUICK_REASONS = [
  "Doctor stopped medication",
  "Treatment completed early",
  "Unopened excess doses returned",
  "Dosage revised by physician",
  "Patient discharge return",
]

export function TakeBackMedicineModal({
  isOpen,
  onClose,
  prescription,
  onSuccess,
}: TakeBackMedicineModalProps) {
  const [returnQty, setReturnQty] = useState<number>(1)
  const [reason, setReason] = useState<string>("")
  const [customReason, setCustomReason] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  if (!prescription) return null

  const maxQty = prescription.dispensedQuantity || 1
  const effectiveReason = reason === "Other" ? customReason : (reason || "Unused medicine returned")
  const returnCredit = Math.max(0, returnQty * (prescription.unitPrice || 0))
  const remainingQty = Math.max(0, maxQty - returnQty)

  const handleQtyChange = (val: number) => {
    const clamped = Math.max(1, Math.min(maxQty, Math.floor(val || 1)))
    setReturnQty(clamped)
  }

  const handleConfirmReturn = () => {
    if (returnQty < 1 || returnQty > maxQty) {
      toast.error(`Please select a valid quantity between 1 and ${maxQty}`)
      return
    }

    startTransition(async () => {
      try {
        const res = await returnDispensedIPDPrescription(
          prescription.id,
          returnQty,
          effectiveReason
        )

        if (res.success) {
          toast.success("Medicine Restocked Successfully", {
            description: `Returned ${returnQty} unit(s) of ${prescription.medicineName}. ₹${returnCredit.toFixed(2)} deducted from patient bill.`,
          })
          onSuccess?.({
            prescriptionId: prescription.id,
            newDispensedQty: remainingQty,
          })
          onClose()
        } else {
          toast.error(res.message || "Failed to return medicine")
        }
      } catch (err: any) {
        toast.error(err?.message || "An unexpected error occurred during return")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      {/* showCloseButton={false} strictly removes the duplicate outer X close icon */}
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[560px] p-0 border-0 bg-transparent shadow-none overflow-visible"
      >
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] overflow-hidden">
          
          {/* Header Bar */}
          <div className="p-5 md:p-6 bg-slate-50/80 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-800 border border-amber-300/40 text-[10px] uppercase tracking-[0.15em] font-bold">
                <RotateCcw className="w-3 h-3 text-amber-600" />
                Pharmacy Take-Back & Restock
              </div>
              <DialogTitle className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
                Return Unused Medication
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Restores unused hospital doses to inventory and updates patient liability.
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
            {/* Patient & Medication Context */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{prescription.patientName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{prescription.patientId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium">
                  <BedDouble className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{prescription.bedInfo}</span>
                </div>
              </div>

              <div className="flex items-start justify-between pt-0.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-extrabold text-slate-900 uppercase">
                      {prescription.medicineName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    {prescription.dosage} &bull; {prescription.frequency}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-medium">Total Dispensed</p>
                  <p className="text-xs font-mono font-bold text-slate-900">
                    {prescription.dispensedQuantity} Units
                  </p>
                </div>
              </div>
            </div>

            {/* Quantity Stepper & Quick Percentage Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Quantity to Take Back (Max: {maxQty})
                </label>
                <span className="text-xs text-slate-500 font-medium font-mono">
                  Remaining: <strong className="text-slate-800 font-semibold">{remainingQty} units</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQtyChange(returnQty - 1)}
                  disabled={returnQty <= 1 || isPending}
                  className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-40 border border-slate-200"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={returnQty}
                    onChange={(e) => handleQtyChange(Number(e.target.value))}
                    disabled={isPending}
                    className="w-full h-9 text-center font-mono font-bold text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900"
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-medium pointer-events-none">
                    Units
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleQtyChange(returnQty + 1)}
                  disabled={returnQty >= maxQty || isPending}
                  className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-40 border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Chips */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setReturnQty(1)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    returnQty === 1
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  1 Unit
                </button>
                {maxQty > 2 && (
                  <button
                    type="button"
                    onClick={() => setReturnQty(Math.max(1, Math.floor(maxQty / 2)))}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                      returnQty === Math.floor(maxQty / 2)
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Half ({Math.floor(maxQty / 2)})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReturnQty(maxQty)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    returnQty === maxQty
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({maxQty})
                </button>
              </div>
            </div>

            {/* Impact Preview */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Restock to Pharmacy Inventory</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    +{returnQty} unit(s) restored in original batch
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Bill Deduction
                </p>
                <p className="text-sm font-extrabold text-emerald-700 font-mono">
                  -₹{returnCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Return Reason
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setReason(r)
                      setCustomReason("")
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                      reason === r
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setReason("Other")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                    reason === "Other"
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Other Reason
                </button>
              </div>

              {reason === "Other" && (
                <input
                  type="text"
                  placeholder="Specify return reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900 mt-2"
                />
              )}
            </div>

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
                onClick={handleConfirmReturn}
                disabled={isPending || returnQty < 1}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Restocking...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Return ({returnQty} Units)</span>
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
