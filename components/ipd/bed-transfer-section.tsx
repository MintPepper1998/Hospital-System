"use client"

import { useState, useTransition, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowRightLeft,
  ArrowRight,
  BedDouble,
  Clock,
  Loader2,
  MapPin,
  IndianRupee,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import { transferBed, getAvailableBeds, getBedTransferHistory } from "@/app/actions/bed-transfer"

// ── Types ─────────────────────────────────────

interface BedTransfer {
  id: string
  admissionId: string
  fromBedId: string
  toBedId: string
  transferDate: string
  reason: string | null
  authorizedBy: string | null
  notes: string | null
  fromBed: {
    bedNumber: string
    pricePerDay: number
    ward: { name: string; type: string; floor: string | null }
  }
  toBed: {
    bedNumber: string
    pricePerDay: number
    ward: { name: string; type: string; floor: string | null }
  }
}

interface AvailableBed {
  id: string
  bedNumber: string
  pricePerDay: number
  wardName: string
  wardType: string
  floor: string | null
}

// ── Main Component ────────────────────────────

export function BedTransferSection({
  admissionId,
  currentBedId,
  currentBedNumber,
  currentWardName,
  admissionStatus,
  doctorName,
}: {
  admissionId: string
  currentBedId: string
  currentBedNumber: string
  currentWardName: string
  admissionStatus: string
  doctorName: string
}) {
  const [transfers, setTransfers] = useState<BedTransfer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    try {
      const saved = localStorage.getItem(`ipd_section_Bed Transfer History`)
      if (saved !== null) {
        setIsCollapsed(saved === 'true')
      }
    } catch (e) {
      // Ignore
    }
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    try {
      localStorage.setItem(`ipd_section_Bed Transfer History`, String(newState))
    } catch (e) {
      // Ignore
    }
  }

  useEffect(() => {
    async function loadTransfers() {
      setIsLoading(true)
      const data = await getBedTransferHistory(admissionId)
      setTransfers(data as BedTransfer[])
      setIsLoading(false)
    }
    loadTransfers()
  }, [admissionId])

  const handleTransferComplete = async () => {
    const data = await getBedTransferHistory(admissionId)
    setTransfers(data as BedTransfer[])
  }

  return (
    <Card className="p-0 gap-0 border-t-[3px] border-t-orange-500 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader 
        className="pb-3 pt-4 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={toggleCollapse}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-orange-600" />
            Bed Transfer History
            {transfers.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {transfers.length} transfer{transfers.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            {admissionStatus === "ADMITTED" && (
              <div onClick={(e) => e.stopPropagation()}>
                <TransferBedDialog
                  admissionId={admissionId}
                  currentBedId={currentBedId}
                  currentBedNumber={currentBedNumber}
                  currentWardName={currentWardName}
                  doctorName={doctorName}
                  onTransferComplete={handleTransferComplete}
                />
              </div>
            )}
            {isMounted && (
              <div className="text-foreground transition-transform duration-200">
                {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0 pb-5">
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-40" />
            <p className="text-xs">Loading transfer history...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <BedDouble className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No bed transfers</p>
            <p className="text-xs">Patient has been in the same bed since admission.</p>
          </div>
        ) : (
          <div className="relative pl-5 space-y-4">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-orange-200" />

            {transfers.map((transfer, index) => (
              <div key={transfer.id} className="relative">
                {/* Timeline dot */}
                <div className={`absolute -left-[13px] top-1 w-3 h-3 rounded-full border-2 border-white shadow ${
                  index === 0 ? "bg-orange-500" : "bg-gray-400"
                }`} />

                <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3 space-y-2">
                  {/* Transfer direction */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm">
                      <BedDouble className="h-3.5 w-3.5 text-gray-500" />
                      <span className="font-medium">{transfer.fromBed.ward.name} — {transfer.fromBed.bedNumber}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <div className="flex items-center gap-1.5 text-sm">
                      <BedDouble className="h-3.5 w-3.5 text-orange-600" />
                      <span className="font-bold text-orange-700">{transfer.toBed.ward.name} — {transfer.toBed.bedNumber}</span>
                    </div>
                  </div>

                  {/* Rate change */}
                  {transfer.fromBed.pricePerDay !== transfer.toBed.pricePerDay && (
                    <div className="flex items-center gap-2 text-xs">
                      <IndianRupee className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Rate:</span>
                      <span className="line-through text-gray-400">₹{transfer.fromBed.pricePerDay}/day</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className={transfer.toBed.pricePerDay > transfer.fromBed.pricePerDay ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                        ₹{transfer.toBed.pricePerDay}/day
                      </span>
                    </div>
                  )}

                  {/* Reason */}
                  {transfer.reason && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Reason:</span> {transfer.reason}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(transfer.transferDate), "dd MMM yyyy, hh:mm a")}
                    </span>
                    {transfer.authorizedBy && (
                      <span>By: {transfer.authorizedBy}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
        </div>
      </div>
    </Card>
  )
}

// ── Transfer Bed Dialog ───────────────────────

function TransferBedDialog({
  admissionId,
  currentBedId,
  currentBedNumber,
  currentWardName,
  doctorName,
  onTransferComplete,
}: {
  admissionId: string
  currentBedId: string
  currentBedNumber: string
  currentWardName: string
  doctorName: string
  onTransferComplete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([])
  const [selectedBedId, setSelectedBedId] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoadingBeds, setIsLoadingBeds] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setIsLoadingBeds(true)
      getAvailableBeds(currentBedId).then((beds) => {
        setAvailableBeds(beds)
        setIsLoadingBeds(false)
      })
    }
  }, [open, currentBedId])

  const selectedBed = availableBeds.find((b) => b.id === selectedBedId)

  const handleTransfer = () => {
    if (!selectedBedId) {
      toast.error("Please select a bed to transfer to")
      return
    }

    startTransition(async () => {
      try {
        const result = await transferBed({
          admissionId,
          newBedId: selectedBedId,
          reason: reason || undefined,
          authorizedBy: doctorName,
          notes: notes || undefined,
        })

        if (result.success) {
          toast.success(`Patient transferred to ${selectedBed?.wardName} — ${selectedBed?.bedNumber}`)
          setOpen(false)
          setSelectedBedId("")
          setReason("")
          setNotes("")
          onTransferComplete()
        } else {
          toast.error(result.error || "Transfer failed")
        }
      } catch (error: any) {
        toast.error(error.message || "Transfer failed")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs border-orange-200 text-orange-700 hover:bg-orange-50">
          <ArrowRightLeft className="h-3 w-3 mr-1" />
          Transfer Bed
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-orange-600" />
            Transfer Patient Bed
          </DialogTitle>
          <DialogDescription>
            Transfer patient from <strong>{currentWardName} — {currentBedNumber}</strong> to a new bed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current Bed Info */}
          <div className="bg-gray-50 rounded-lg p-3 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Bed</p>
            <p className="font-bold text-sm">{currentWardName} — Bed {currentBedNumber}</p>
          </div>

          <Separator />

          {/* Target Bed Selection */}
          <div className="space-y-2">
            <Label>Transfer To *</Label>
            {isLoadingBeds ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available beds...
              </div>
            ) : availableBeds.length === 0 ? (
              <p className="text-sm text-red-600 py-2">No available beds found</p>
            ) : (
              <Select value={selectedBedId} onValueChange={setSelectedBedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bed..." />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.map((bed) => (
                    <SelectItem key={bed.id} value={bed.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{bed.wardName} — {bed.bedNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          ({bed.wardType} • ₹{bed.pricePerDay}/day{bed.floor ? ` • ${bed.floor}` : ""})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Bed Details */}
          {selectedBed && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-xs text-orange-700 uppercase tracking-wider mb-1">Transferring To</p>
              <p className="font-bold text-sm text-orange-800">{selectedBed.wardName} — Bed {selectedBed.bedNumber}</p>
              <div className="flex gap-3 mt-1 text-xs text-orange-600">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {selectedBed.wardType}
                </span>
                <span className="flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" /> ₹{selectedBed.pricePerDay}/day
                </span>
                {selectedBed.floor && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {selectedBed.floor}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Patient needs ICU care, Shifted to General Ward, Patient request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about the transfer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={isPending || !selectedBedId}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Confirm Transfer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
