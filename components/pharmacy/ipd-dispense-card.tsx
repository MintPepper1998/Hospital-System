"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pill, Package, Check, Loader2, Trash2, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  dispenseIPDPrescription,
  cancelIPDPrescriptionFromQueue,
} from "@/lib/actions/pharmacy"

interface IPDRx {
  id: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  instruction: string | null
  unitPrice?: number
  calculatedQty?: number
}

interface IPDDispenseCardProps {
  admissionId?: string
  emergencyVisitId?: string
  patientName: string
  bedInfo: string
  prescriptions: IPDRx[]
}

// Parse frequency to get doses per day
function parseDailyDose(frequency: string): number {
  const f = frequency.trim().toUpperCase()
  if (f.includes("-")) {
    return f.split("-").reduce((sum, n) => sum + (parseInt(n) || 0), 0)
  }
  switch (f) {
    case "OD": return 1
    case "BD": return 2
    case "TDS": return 3
    case "QID": return 4
    case "SOS": return 1
    case "STAT": return 1
    default: return 1
  }
}

export function IPDDispenseCard({
  admissionId,
  emergencyVisitId,
  patientName,
  bedInfo,
  prescriptions,
}: IPDDispenseCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [dispensedIds, setDispensedIds] = useState<Set<string>>(new Set())

  // Track adjustable quantities for each prescription
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Initialize quantities when modal opens
  useEffect(() => {
    if (showModal) {
      const initQty: Record<string, number> = {}
      for (const rx of prescriptions) {
        if (rx.calculatedQty) {
          initQty[rx.id] = rx.calculatedQty
        } else {
          const dailyDose = parseDailyDose(rx.frequency)
          const days = parseInt(rx.duration) || 1
          initQty[rx.id] = dailyDose * days
        }
      }
      setQuantities(initQty)
    }
  }, [showModal, prescriptions])

  const updateQty = (rxId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [rxId]: Math.max(1, (prev[rxId] || 1) + delta)
    }))
  }

  const setQty = (rxId: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [rxId]: Math.max(1, value)
    }))
  }

  const handleDispenseOne = (rxId: string) => {
    setActiveAction(rxId)
    const rx = prescriptions.find(r => r.id === rxId)
    const qty = quantities[rxId] || 1
    const unitPrice = rx?.unitPrice

    startTransition(async () => {
      try {
        const result = await dispenseIPDPrescription(rxId, qty, unitPrice)
        if (result?.success === false) {
          toast.error(result.message || "Failed to dispense.")
          return
        }
        toast.success(`${rx?.medicineName} dispensed (Qty: ${qty})!`)
        setDispensedIds((prev) => new Set([...prev, rxId]))

        // If all dispensed, close modal and refresh
        const newDispensed = new Set([...dispensedIds, rxId])
        const allDone = prescriptions.every((r) => newDispensed.has(r.id))
        if (allDone) {
          setShowModal(false)
          toast.success("All medicines dispensed for this patient!")
          router.refresh()
        }
      } catch {
        toast.error("Failed to dispense.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  const handleDispenseAll = () => {
    setActiveAction("all")
    startTransition(async () => {
      try {
        const undispensed = prescriptions.filter((rx) => !dispensedIds.has(rx.id))
        for (const rx of undispensed) {
          const qty = quantities[rx.id] || 1
          await dispenseIPDPrescription(rx.id, qty, rx.unitPrice)
        }
        toast.success(`All ${undispensed.length} medicine(s) dispensed!`)
        setShowModal(false)
        setDispensedIds(new Set())
        router.refresh()
      } catch {
        toast.error("Failed to dispense all.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  const handleCancelAll = async () => {
    const confirmed = window.confirm(
      `Cancel all ${prescriptions.length} prescription(s) for ${patientName}?`
    )
    if (!confirmed) return

    setActiveAction("cancel")
    startTransition(async () => {
      try {
        for (const rx of prescriptions) {
          await cancelIPDPrescriptionFromQueue(rx.id)
        }
        toast.success("IPD prescriptions cancelled.")
        router.refresh()
      } catch {
        toast.error("Failed to cancel.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  return (
    <>
      <div className="flex w-full items-center gap-2">
        <Button
          onClick={() => {
            setShowModal(true)
            setDispensedIds(new Set())
          }}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Package className="mr-2 h-4 w-4" />
          Dispense ({prescriptions.length})
        </Button>
        <Button
          size="icon"
          variant="destructive"
          onClick={handleCancelAll}
          disabled={isPending && activeAction === "cancel"}
          className="bg-red-500 hover:bg-red-600"
          title="Cancel All IPD Prescriptions"
        >
          {isPending && activeAction === "cancel" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Dispense Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-3xl">
          <DialogHeader className="p-6 bg-white/5 border-b border-black/5">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Package className="h-6 w-6 text-purple-600" />
              Dispense IPD Medications
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground mt-1">
              {patientName} &bull; {bedInfo}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            {/* Header row */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1.5fr_auto] gap-4 px-4 pb-3 border-b border-black/5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
              <div>Medicine</div>
              <div>Frequency</div>
              <div>Days</div>
              <div className="text-center">Quantity</div>
              <div>Price</div>
              <div className="text-right">Action</div>
            </div>

            <div className="space-y-3 mt-4 max-h-[50vh] overflow-y-auto pr-2">
              {prescriptions.map((rx) => {
                const isDispensed = dispensedIds.has(rx.id)
                const qty = quantities[rx.id] || 1
                const price = rx.unitPrice || 0
                const total = qty * price
                const days = parseInt(rx.duration) || 1

                return (
                  <div
                    key={rx.id}
                    className={`grid grid-cols-[2fr_1fr_1fr_1.5fr_1.5fr_auto] gap-4 items-center p-2 pl-4 rounded-[1.5rem] border ring-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      isDispensed 
                        ? "bg-green-50/50 border-green-200 ring-green-100/50 opacity-60" 
                        : "bg-white border-black/5 ring-black/5 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Medicine name & dosage */}
                    <div className="min-w-0 pr-2">
                      <p className={`font-bold text-sm truncate ${isDispensed ? "line-through text-green-800" : "text-gray-900"}`}>
                        {rx.medicineName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                        {rx.dosage}
                        {rx.instruction && ` · ${rx.instruction}`}
                      </p>
                    </div>

                    {/* Frequency */}
                    <div className="text-sm font-medium text-gray-600">
                      <Badge variant="outline" className="text-[10px] bg-gray-50 border-gray-200 text-gray-600 shadow-none px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                        {rx.frequency || "—"}
                      </Badge>
                    </div>

                    {/* Duration */}
                    <div className="text-sm font-medium text-gray-600">
                      {days}d
                    </div>

                    {/* Quantity with +/- controls */}
                    <div className="flex justify-center">
                      {!isDispensed ? (
                        <div className="flex items-center gap-3 bg-gray-50/80 rounded-full px-2 py-1.5 border border-black/5">
                          <button
                            className="w-7 h-7 rounded-full bg-white border border-black/5 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-transform text-gray-500 shadow-sm disabled:opacity-50"
                            onClick={() => updateQty(rx.id, -1)}
                            disabled={qty <= 1}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          
                          <span className="w-8 text-center font-bold text-base text-blue-600 tracking-tight">
                            {qty}
                          </span>

                          <button
                            className="w-7 h-7 rounded-full bg-white border border-black/5 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-transform text-gray-500 shadow-sm disabled:opacity-50"
                            onClick={() => updateQty(rx.id, 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-semibold text-green-700">{qty}</span>
                      )}
                    </div>

                    {/* Unit price & total */}
                    <div className="text-[11px] font-medium text-gray-500 flex flex-col justify-center">
                      {price > 0 ? (
                        <>
                          <span className="text-gray-900 font-bold text-sm">₹{total.toLocaleString("en-IN")}</span>
                          <span>@₹{price}</span>
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-end pr-2">
                      {isDispensed ? (
                        <Badge className="bg-green-100 text-green-700 px-4 py-2 rounded-full border-0 font-semibold flex items-center gap-1.5 shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                          Dispensed
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full px-5 py-2 h-9 bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all duration-300 font-bold shadow-sm group"
                          onClick={() => handleDispenseOne(rx.id)}
                          disabled={isPending && activeAction === rx.id}
                        >
                          {isPending && activeAction === rx.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <div className="flex items-center">
                              Give
                              <div className="w-6 h-6 ml-2 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                                <Pill className="h-3 w-3 fill-current" />
                              </div>
                            </div>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Grand total */}
            {prescriptions.some(rx => (rx.unitPrice || 0) > 0) && (
              <div className="flex justify-end items-center gap-3 text-sm font-semibold mt-4 px-3 p-4 bg-gray-50 rounded-2xl border border-black/5">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Total Amount</span>
                <span className="text-xl font-bold text-gray-900">
                  ₹{prescriptions.reduce((sum, rx) => {
                    const qty = quantities[rx.id] || 1
                    return sum + qty * (rx.unitPrice || 0)
                  }, 0).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>

          {/* Dispense All Button */}
          <div className="flex gap-4 p-6 bg-gray-50/50 border-t border-black/5">
            <Button
              className="flex-1 rounded-full py-6 text-base font-bold bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-300 disabled:hover:scale-100 disabled:opacity-50"
              onClick={handleDispenseAll}
              disabled={
                isPending ||
                prescriptions.every((rx) => dispensedIds.has(rx.id))
              }
            >
              {isPending && activeAction === "all" ? (
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  Dispensing All...
                </div>
              ) : (
                <div className="flex items-center">
                  <Check className="h-5 w-5 mr-2" />
                  Dispense All Remaining
                </div>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full px-8 py-6 text-base font-semibold border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98] transition-all duration-300"
              onClick={() => setShowModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
