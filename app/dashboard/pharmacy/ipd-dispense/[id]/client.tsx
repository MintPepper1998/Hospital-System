"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pill, Package, Check, Loader2, ArrowLeft, Minus, Plus, Replace, Search, X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  dispenseIPDPrescription,
  updateIPDPrescriptionItem,
  cancelIPDPrescriptionItem
} from "@/lib/actions/pharmacy"
import { searchMedicines } from "@/app/actions/search"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface IPDRx {
  id: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  instruction: string | null
  unitPrice?: number
  quantity?: number
  status: string
}

interface IPDDispensePageClientProps {
  admissionId?: string
  emergencyVisitId?: string
  patientName: string
  bedInfo: string
  prescriptions: IPDRx[]
}

export default function IPDDispensePageClient({
  admissionId,
  emergencyVisitId,
  patientName,
  bedInfo,
  prescriptions,
}: IPDDispensePageClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Track quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  
  // Track dispensed status locally to update UI immediately
  const [dispensedIds, setDispensedIds] = useState<Set<string>>(
    new Set(prescriptions.filter(rx => rx.status === "COMPLETED").map(rx => rx.id))
  )
  
  const [activeAction, setActiveAction] = useState<string | null>(null)

  // Substitute modal state
  const [substituteRx, setSubstituteRx] = useState<IPDRx | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Initialize quantities
  useEffect(() => {
    const initialQty: Record<string, number> = {}
    prescriptions.forEach((rx) => {
      initialQty[rx.id] = rx.quantity || 1
    })
    setQuantities(initialQty)
  }, [prescriptions])

  // Debounced search for substitute medicines
  useEffect(() => {
    if (!substituteRx) return
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        try {
          const results = await searchMedicines(searchQuery)
          setSearchResults(results)
        } catch (error) {
          console.error(error)
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, substituteRx])

  const handleSubstitute = (newMedicine: any) => {
    if (!substituteRx) return
    setActiveAction(`sub-${substituteRx.id}`)
    startTransition(async () => {
      try {
        const result = await updateIPDPrescriptionItem(substituteRx.id, {
          medicineName: newMedicine.name,
          dosage: newMedicine.strength || substituteRx.dosage,
          frequency: substituteRx.frequency,
          duration: substituteRx.duration,
          instruction: substituteRx.instruction || undefined,
          quantity: quantities[substituteRx.id]
        })
        if (result?.success) {
          toast.success("Medicine substituted successfully!")
          setSubstituteRx(null)
          setSearchQuery("")
          router.refresh()
        } else {
          toast.error(result?.message || "Failed to substitute medicine")
        }
      } catch (e) {
        toast.error("Failed to substitute prescription")
      } finally {
        setActiveAction(null)
      }
    })
  }

  const handleCancel = (rxId: string) => {
    setActiveAction(`cancel-${rxId}`)
    startTransition(async () => {
      try {
        const result = await cancelIPDPrescriptionItem(rxId)
        if (result?.success) {
          toast.success("Medicine cancelled successfully.")
          router.refresh()
        } else {
          toast.error(result?.message || "Failed to cancel medicine")
        }
      } catch {
        toast.error("Failed to cancel medicine.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  const updateQty = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 1
      const next = current + delta
      return { ...prev, [id]: next < 1 ? 1 : next }
    })
  }

  const handleDispenseOne = async (rxId: string) => {
    const rx = prescriptions.find(r => r.id === rxId)
    if (!rx) return

    setActiveAction(rxId)
    const finalQty = quantities[rxId] || 1

    startTransition(async () => {
      try {
        await dispenseIPDPrescription(rxId, finalQty)
        setDispensedIds(prev => {
          const next = new Set(prev)
          next.add(rxId)
          return next
        })
        toast.success("Medication dispensed.")
        router.refresh()
      } catch {
        toast.error("Failed to dispense medication.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  const handleDispenseAll = async () => {
    const remaining = prescriptions.filter((rx) => !dispensedIds.has(rx.id))
    if (remaining.length === 0) {
      toast.info("All medications are already dispensed.")
      return
    }

    setActiveAction("all")
    startTransition(async () => {
      try {
        for (const rx of remaining) {
          const finalQty = quantities[rx.id] || 1
          await dispenseIPDPrescription(rx.id, finalQty)
        }
        
        setDispensedIds(new Set(prescriptions.map(rx => rx.id)))
        toast.success("All remaining medications dispensed.")
        router.refresh()
      } catch {
        toast.error("Failed to dispense all.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-white/50 backdrop-blur-xl rounded-[2rem] border border-black/5 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 sm:p-8 bg-white/50 border-b border-black/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/pharmacy/pos" className="shrink-0 group">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-black/10 shadow-sm group-hover:scale-105 group-hover:bg-gray-50 transition-all">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </div>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
              <Package className="h-7 w-7 text-purple-600" />
              Dispense IPD Medications
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1.5 flex items-center gap-2">
              <span className="text-gray-900 font-semibold">{patientName}</span> 
              <span className="text-gray-400">&bull;</span> 
              <span>{bedInfo}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-[2.5fr_1fr_1fr_1.5fr_1.5fr_auto] gap-6 px-6 pb-4 border-b border-black/5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          <div>Medicine</div>
          <div>Frequency</div>
          <div>Days</div>
          <div className="text-center">Quantity</div>
          <div>Price</div>
          <div className="text-right">Action</div>
        </div>

        <div className="space-y-4">
          {prescriptions.map((rx) => {
            const isDispensed = dispensedIds.has(rx.id)
            const qty = quantities[rx.id] || 1
            const price = rx.unitPrice || 0
            const total = qty * price
            const days = parseInt(rx.duration) || 1

            return (
              <div
                key={rx.id}
                className={`flex flex-col sm:grid sm:grid-cols-[2.5fr_1fr_1fr_1.5fr_1.5fr_auto] gap-4 sm:gap-6 items-center p-4 sm:p-3 sm:pl-6 rounded-[1.5rem] border ring-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isDispensed 
                    ? "bg-green-50/50 border-green-200 ring-green-100/50 opacity-60" 
                    : "bg-white border-black/5 ring-black/5 shadow-sm hover:shadow-md"
                }`}
              >
                {/* Medicine name & dosage */}
                <div className="w-full sm:w-auto min-w-0 pr-2">
                  <p className={`font-bold text-base truncate ${isDispensed ? "line-through text-green-800" : "text-gray-900"}`}>
                    {rx.medicineName}
                  </p>
                  <p className="text-[13px] text-muted-foreground truncate mt-1 font-medium">
                    {rx.dosage}
                    {rx.instruction && ` · ${rx.instruction}`}
                  </p>
                </div>

                {/* Frequency */}
                <div className="w-full sm:w-auto flex sm:block justify-between items-center text-sm font-medium text-gray-600">
                  <span className="sm:hidden text-xs uppercase tracking-wider text-muted-foreground font-semibold">Frequency</span>
                  <Badge variant="outline" className="text-[11px] bg-gray-50 border-gray-200 text-gray-600 shadow-none px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                    {rx.frequency || "—"}
                  </Badge>
                </div>

                {/* Duration */}
                <div className="w-full sm:w-auto flex sm:block justify-between items-center text-sm font-medium text-gray-600">
                  <span className="sm:hidden text-xs uppercase tracking-wider text-muted-foreground font-semibold">Days</span>
                  {days}d
                </div>

                {/* Quantity with +/- controls */}
                <div className="w-full sm:w-auto flex sm:justify-center justify-between items-center">
                  <span className="sm:hidden text-xs uppercase tracking-wider text-muted-foreground font-semibold">Quantity</span>
                  {!isDispensed ? (
                    <div className="flex items-center gap-4 bg-gray-50/80 rounded-full px-3 py-2 border border-black/5">
                      <button
                        className="w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-transform text-gray-500 shadow-sm disabled:opacity-50"
                        onClick={() => updateQty(rx.id, -1)}
                        disabled={qty <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="w-10 text-center font-bold text-lg text-blue-600 tracking-tight">
                        {qty}
                      </span>

                      <button
                        className="w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-transform text-gray-500 shadow-sm disabled:opacity-50"
                        onClick={() => updateQty(rx.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-semibold text-green-700 text-lg">{qty}</span>
                  )}
                </div>

                {/* Unit price & total */}
                <div className="w-full sm:w-auto flex sm:flex-col sm:justify-center justify-between items-center text-[12px] font-medium text-gray-500">
                  <span className="sm:hidden text-xs uppercase tracking-wider text-muted-foreground font-semibold">Price</span>
                  {price > 0 ? (
                    <>
                      <span className="text-gray-900 font-bold text-base">₹{total.toLocaleString("en-IN")}</span>
                      <span>@₹{price}</span>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>

                {/* Action */}
                <div className="w-full sm:w-auto flex items-center justify-end sm:pr-2 pt-2 sm:pt-0">
                  {isDispensed ? (
                    <Badge className="bg-green-100 text-green-700 px-5 py-2.5 rounded-full border-0 font-semibold flex items-center gap-2 shadow-sm">
                      <Check className="h-4 w-4" />
                      Dispensed
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full h-10 w-10 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border-black/10 shadow-sm shrink-0"
                        onClick={() => {
                          setSubstituteRx(rx)
                          setSearchQuery(rx.medicineName) // Initialize search
                        }}
                        disabled={isPending && activeAction !== `sub-${rx.id}`}
                      >
                        <Replace className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full h-10 w-10 text-gray-500 hover:text-red-600 hover:bg-red-50 border-black/10 shadow-sm shrink-0"
                        onClick={() => {
                          if(confirm("Are you sure you want to cancel this medication?")) {
                            handleCancel(rx.id)
                          }
                        }}
                        disabled={isPending && activeAction !== `cancel-${rx.id}`}
                      >
                        {isPending && activeAction === `cancel-${rx.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 h-10 shadow-sm transition-all shadow-purple-200"
                        onClick={() => handleDispenseOne(rx.id)}
                        disabled={isPending && activeAction === rx.id}
                      >
                        {isPending && activeAction === rx.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Dispense"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Grand total */}
        {prescriptions.some(rx => (rx.unitPrice || 0) > 0) && (
          <div className="flex justify-between sm:justify-end items-center gap-4 text-sm font-semibold mt-8 px-4 p-5 bg-gray-50 rounded-2xl border border-black/5">
            <span className="text-muted-foreground uppercase tracking-widest text-[11px]">Total Amount</span>
            <span className="text-2xl font-bold text-gray-900">
              ₹{prescriptions.reduce((sum, rx) => {
                const qty = quantities[rx.id] || 1
                return sum + qty * (rx.unitPrice || 0)
              }, 0).toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>

      {/* Dispense All Button */}
      <div className="flex flex-col sm:flex-row gap-4 p-6 sm:p-8 bg-gray-50/80 border-t border-black/5 mt-auto">
        <Button
          className="flex-1 rounded-full py-7 h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-300 disabled:hover:scale-100 disabled:opacity-50"
          onClick={handleDispenseAll}
          disabled={
            isPending ||
            prescriptions.every((rx) => dispensedIds.has(rx.id))
          }
        >
          {isPending && activeAction === "all" ? (
            <div className="flex items-center">
              <Loader2 className="h-6 w-6 mr-3 animate-spin" />
              Dispensing All...
            </div>
          ) : (
            <div className="flex items-center">
              <Check className="h-6 w-6 mr-2" />
              Dispense All Remaining
            </div>
          )}
        </Button>
        <Link href="/dashboard/pharmacy/pos" className="contents">
          <Button 
            variant="outline" 
            className="rounded-full px-10 py-7 h-14 text-lg font-bold border-gray-200 text-gray-700 hover:bg-white hover:text-gray-900 active:scale-[0.98] transition-all duration-300 shadow-sm w-full sm:w-auto"
          >
            Close
          </Button>
        </Link>
      </div>

      {/* Substitute Modal */}
      <Dialog open={!!substituteRx} onOpenChange={(open) => !open && setSubstituteRx(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl">
          <div className="p-6 pb-4 bg-gray-50/50 border-b border-black/5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Replace className="h-5 w-5 text-blue-600" />
                Substitute Medicine
              </DialogTitle>
              <DialogDescription>
                Find an alternative for <span className="font-semibold text-gray-900">{substituteRx?.medicineName}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by composition or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white text-base shadow-inner-sm"
              />
              {isSearching && (
                <div className="absolute right-4 top-3.5">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No alternatives found in inventory.
                </div>
              )}
              {searchResults.map((med) => {
                const stock = med.currentStock || 0
                const isOutOfStock = stock === 0
                return (
                  <button
                    key={med.id}
                    onClick={() => !isOutOfStock && handleSubstitute(med)}
                    disabled={isOutOfStock || (isPending && activeAction === `sub-${substituteRx?.id}`)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                      isOutOfStock 
                        ? "bg-gray-50/50 border-gray-100 opacity-60 cursor-not-allowed" 
                        : "bg-white border-black/5 hover:border-blue-200 hover:shadow-md hover:ring-2 hover:ring-blue-100"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-gray-900">{med.name} <span className="text-muted-foreground font-medium text-sm ml-1">{med.strength}</span></p>
                      <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-1">{med.genericName}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isOutOfStock ? 'text-red-500 border-red-200 bg-red-50' : 'text-green-600 border-green-200 bg-green-50'}`}>
                        {stock} in stock
                      </Badge>
                      <span className="text-xs font-semibold text-gray-700">₹{med.unitPrice}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
