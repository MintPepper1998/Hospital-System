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
import { Pill, Package, Check, Loader2, Trash2, Minus, Plus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  dispenseDischargeMedicine,
  cancelDischargeMedicineFromQueue,
} from "@/lib/actions/pharmacy"

interface DischargeRx {
  id: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  instruction: string | null
  /** Display-only FEFO price; the server re-prices from the batches actually used. */
  unitPrice?: number
  /** Sellable (non-expired) stock of the linked pharmacy medicine. */
  availableStock?: number
  /** Whether the row is linked to a pharmacy Medicine id. */
  linked?: boolean
  quantity: number
}

interface DischargeDispenseCardProps {
  admissionId?: string
  patientName: string
  bedInfo: string
  prescriptions: DischargeRx[]
}

export function DischargeDispenseCard({
  admissionId,
  patientName,
  bedInfo,
  prescriptions,
}: DischargeDispenseCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [dispensedIds, setDispensedIds] = useState<Set<string>>(new Set())
  const [failed, setFailed] = useState<Record<string, string>>({})

  // Track adjustable quantities for each prescription
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Initialize quantities when modal opens
  useEffect(() => {
    if (showModal) {
      const initQty: Record<string, number> = {}
      for (const rx of prescriptions) {
        initQty[rx.id] = rx.quantity || 1
      }
      setQuantities(initQty)
      setFailed({})
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
      [rxId]: Math.max(1, Math.floor(value) || 1)
    }))
  }

  const finishIfAllDone = (done: Set<string>) => {
    if (prescriptions.every((r) => done.has(r.id))) {
      setShowModal(false)
      toast.success("All discharge medicines dispensed for this patient!")
      router.refresh()
    }
  }

  const handleDispenseOne = (rxId: string) => {
    setActiveAction(rxId)
    const rx = prescriptions.find(r => r.id === rxId)
    const qty = quantities[rxId] || 1

    startTransition(async () => {
      try {
        const result = await dispenseDischargeMedicine(rxId, qty)
        if (!result?.success) {
          const msg = result?.message || "Failed to dispense."
          setFailed((prev) => ({ ...prev, [rxId]: msg }))
          toast.error(msg)
          return
        }
        toast.success(`${rx?.medicineName} dispensed (Qty: ${qty})!`)
        setFailed((prev) => {
          const next = { ...prev }
          delete next[rxId]
          return next
        })
        const newDispensed = new Set([...dispensedIds, rxId])
        setDispensedIds(newDispensed)
        finishIfAllDone(newDispensed)
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
      const undispensed = prescriptions.filter((rx) => !dispensedIds.has(rx.id))
      const done = new Set(dispensedIds)
      const failures: Record<string, string> = {}

      // Sequential on purpose: each dispense is its own DB transaction,
      // and a failure on one medicine must not block the others.
      for (const rx of undispensed) {
        try {
          const result = await dispenseDischargeMedicine(rx.id, quantities[rx.id] || 1)
          if (result?.success) done.add(rx.id)
          else failures[rx.id] = result?.message || "Failed to dispense"
        } catch {
          failures[rx.id] = "Failed to dispense"
        }
      }

      setDispensedIds(done)
      setFailed(failures)
      setActiveAction(null)

      const okCount = undispensed.length - Object.keys(failures).length
      const failCount = Object.keys(failures).length
      if (failCount === 0) {
        toast.success(`All ${okCount} medicine(s) dispensed!`)
        setShowModal(false)
        setDispensedIds(new Set())
        router.refresh()
      } else {
        const firstFail = prescriptions.find((p) => failures[p.id])
        toast.error(
          `${okCount} dispensed, ${failCount} failed${firstFail ? ` — ${firstFail.medicineName}: ${failures[firstFail.id]}` : ""}`
        )
        if (okCount > 0) router.refresh()
      }
    })
  }

  const handleCancelAll = async () => {
    const confirmed = window.confirm(
      `Cancel all ${prescriptions.length} pending discharge medicine(s) for ${patientName}?`
    )
    if (!confirmed) return

    setActiveAction("cancel")
    startTransition(async () => {
      let failCount = 0
      for (const rx of prescriptions) {
        try {
          const res = await cancelDischargeMedicineFromQueue(rx.id)
          if (!res?.success) failCount++
        } catch {
          failCount++
        }
      }
      if (failCount === 0) toast.success("Discharge medicines cancelled.")
      else toast.error(`${failCount} medicine(s) could not be cancelled (already dispensed?)`)
      setActiveAction(null)
      router.refresh()
    })
  }

  if (prescriptions.length === 0) {
    return (
      <Badge className="w-full justify-center bg-green-100 text-green-700 py-2">
        <Check className="h-4 w-4 mr-1" /> All discharge medicines processed
      </Badge>
    )
  }

  const grandTotal = prescriptions.reduce((sum, rx) => {
    const qty = quantities[rx.id] || 1
    return sum + qty * (rx.unitPrice || 0)
  }, 0)

  return (
    <>
      <div className="flex w-full items-center gap-2">
        <Button
          onClick={() => {
            setShowModal(true)
            setDispensedIds(new Set())
          }}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Package className="mr-2 h-4 w-4" />
          Dispense ({prescriptions.length})
        </Button>
        <Button
          size="icon"
          variant="destructive"
          onClick={handleCancelAll}
          disabled={isPending}
          className="bg-red-500 hover:bg-red-600"
          title="Cancel All Discharge Medicines"
        >
          {isPending && activeAction === "cancel" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Dispense Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !isPending && setShowModal(open)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Dispense Discharge Medications
            </DialogTitle>
            <DialogDescription>
              {patientName} &bull; {bedInfo}
              {admissionId && <span className="ml-1 text-xs">&bull; Charges are added to the IPD bill</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-3 pb-1 border-b">
              <div className="col-span-4">Medicine</div>
              <div className="col-span-2 text-center">Frequency</div>
              <div className="col-span-1 text-center">Stock</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-1 text-center">Price</div>
              <div className="col-span-2 text-center">Action</div>
            </div>

            {prescriptions.map((rx) => {
              const isDispensed = dispensedIds.has(rx.id)
              const qty = quantities[rx.id] || 1
              const price = rx.unitPrice || 0
              const total = qty * price
              const stock = rx.availableStock
              const overStock = stock !== undefined && qty > stock
              const notLinked = rx.linked === false && stock === undefined
              const error = failed[rx.id]

              return (
                <div
                  key={rx.id}
                  className={`rounded-lg border p-3 ${
                    isDispensed ? "bg-green-50 border-green-200" : error ? "bg-red-50/50 border-red-200" : "bg-white"
                  }`}
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Medicine name & dosage */}
                    <div className="col-span-4 min-w-0">
                      <p className={`font-medium text-sm truncate ${isDispensed ? "line-through text-green-700" : ""}`}>
                        {rx.medicineName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {rx.dosage}
                        {rx.duration && ` · ${rx.duration}`}
                        {rx.instruction && ` · ${rx.instruction}`}
                      </p>
                    </div>

                    {/* Frequency */}
                    <div className="col-span-2 text-center">
                      {rx.frequency ? <Badge variant="outline" className="text-xs">{rx.frequency}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </div>

                    {/* Stock */}
                    <div className="col-span-1 text-center text-xs">
                      {stock === undefined ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={stock > 0 ? "text-green-700 font-medium" : "text-red-600 font-semibold"}>{stock}</span>
                      )}
                    </div>

                    {/* Quantity with +/- controls */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      {!isDispensed ? (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            onClick={() => updateQty(rx.id, -1)}
                            disabled={qty <= 1 || isPending}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(rx.id, parseInt(e.target.value) || 1)}
                            className={`w-12 h-7 text-center text-sm px-1 flex-shrink-0 ${overStock ? "border-red-400 text-red-600" : ""}`}
                            min={1}
                            step={1}
                            disabled={isPending}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            onClick={() => updateQty(rx.id, 1)}
                            disabled={isPending}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-green-700">{qty}</span>
                      )}
                    </div>

                    {/* Unit price & total */}
                    <div className="col-span-1 text-center text-xs">
                      {price > 0 ? (
                        <div>
                          <div className="font-semibold">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
                          <div className="text-muted-foreground">@₹{price.toFixed(2)}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Action */}
                    <div className="col-span-2 text-center">
                      {isDispensed ? (
                        <Badge className="bg-green-100 text-green-700 flex items-center gap-1 justify-center">
                          <Check className="h-3 w-3" />
                          Done
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0 text-xs"
                          onClick={() => handleDispenseOne(rx.id)}
                          disabled={isPending || overStock || notLinked}
                        >
                          {isPending && activeAction === rx.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Pill className="h-3.5 w-3.5 mr-1" />
                              Give
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {!isDispensed && (overStock || notLinked || error) && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      {error
                        ? error
                        : notLinked
                          ? "Not linked to a pharmacy medicine — ask the doctor to re-select it in the discharge summary."
                          : `Only ${stock} in stock — reduce the quantity.`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grand total (estimate — final price comes from batches actually used) */}
          {grandTotal > 0 && (
            <div className="flex justify-end text-sm font-semibold mt-2 px-3">
              Estimated Total: ₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
          )}

          {/* Dispense All Button */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleDispenseAll}
              disabled={
                isPending ||
                prescriptions.every((rx) => dispensedIds.has(rx.id))
              }
            >
              {isPending && activeAction === "all" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Dispensing All...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Dispense All Remaining
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={isPending}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
