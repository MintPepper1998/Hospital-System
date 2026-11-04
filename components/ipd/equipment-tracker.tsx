"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog"
import {
  Plus, Clock, CalendarDays, Package, RotateCcw, XCircle, Loader2,
  Monitor, Timer,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow, format } from "date-fns"
import {
  getActiveEquipmentItems, assignEquipment, returnEquipment,
  cancelEquipmentUsage, getEquipmentUsages,
} from "@/app/actions/ipd-equipment"

interface EquipmentUsage {
  id: string
  admissionId: string
  equipmentId: string
  startTime: string
  endTime: string | null
  quantity: number
  chargeType: "HOURLY" | "PER_DAY"
  ratePerUnit: number
  computedCharge: number
  notes: string | null
  status: "ACTIVE" | "RETURNED" | "CANCELLED"
  equipment: {
    id: string
    name: string
    code: string | null
    category: string | null
    chargeType: "HOURLY" | "PER_DAY"
    ratePerUnit: number
  }
}

interface EquipmentItem {
  id: string
  name: string
  code: string | null
  category: string | null
  chargeType: "HOURLY" | "PER_DAY"
  ratePerUnit: number
  depositAmount: number
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`

export function IPDEquipmentTracker({
  admissionId,
  emergencyVisitId,
  admissionStatus,
}: {
  admissionId?: string
  emergencyVisitId?: string
  admissionStatus: string
}) {
  const [usages, setUsages] = useState<EquipmentUsage[]>([])
  const [availableItems, setAvailableItems] = useState<EquipmentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [notes, setNotes] = useState("")

  // Live timer tick (updates every 60s for running charges)
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const [usageResult, itemsResult] = await Promise.all([
      getEquipmentUsages(admissionId, emergencyVisitId),
      getActiveEquipmentItems(),
    ])
    if (usageResult.success) setUsages(usageResult.data as any)
    if (itemsResult.success) setAvailableItems(itemsResult.data as any)
    setIsLoading(false)
  }, [admissionId])

  useEffect(() => { fetchData() }, [fetchData])

  const activeUsages = usages.filter(u => u.status === "ACTIVE")
  const pastUsages = usages.filter(u => u.status !== "ACTIVE")

  const computeLiveCharge = (u: EquipmentUsage): number => {
    if (u.status !== "ACTIVE") return u.computedCharge
    const ms = Date.now() - new Date(u.startTime).getTime()
    if (ms <= 0) return 0
    if (u.chargeType === "HOURLY") {
      return Math.ceil(ms / (1000 * 60 * 60)) * u.ratePerUnit * u.quantity
    }
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))) * u.ratePerUnit * u.quantity
  }

  const totalActiveCharges = activeUsages.reduce((sum, u) => sum + computeLiveCharge(u), 0)
  const totalPastCharges = pastUsages
    .filter(u => u.status === "RETURNED")
    .reduce((sum, u) => sum + u.computedCharge, 0)

  const handleAssign = () => {
    if (!selectedEquipment) { toast.error("Select an equipment"); return }
    startTransition(async () => {
        const result = await assignEquipment({
          admissionId,
          emergencyVisitId,
          equipmentId: selectedEquipment,
          quantity: Number(quantity) || 1,
          notes: notes.trim() || undefined,
        })
      if (result.success) {
        toast.success("Equipment assigned")
        setAssignOpen(false)
        setSelectedEquipment("")
        setQuantity("1")
        setNotes("")
        fetchData()
      } else toast.error(result.message)
    })
  }

  const handleReturn = (usageId: string) => {
    startTransition(async () => {
      const result = await returnEquipment(usageId)
      if (result.success) {
        toast.success(`Equipment returned. Charge: ${fmt(result.charge || 0)}`)
        fetchData()
      } else toast.error(result.message)
    })
  }

  const handleCancel = (usageId: string) => {
    if (!confirm("Cancel this usage? No charges will apply.")) return
    startTransition(async () => {
      const result = await cancelEquipmentUsage(usageId)
      if (result.success) {
        toast.success("Usage cancelled")
        fetchData()
      } else toast.error(result.message)
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading equipment...</span>
      </div>
    )
  }

  const isAdmitted = admissionStatus !== "DISCHARGED"

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Equipment</p>
                <p className="text-2xl font-bold">{activeUsages.length}</p>
              </div>
              <Monitor className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Running Charges</p>
                <p className="text-2xl font-bold text-amber-600">{fmt(totalActiveCharges)}</p>
              </div>
              <Timer className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Returned Charges</p>
                <p className="text-2xl font-bold text-emerald-600">{fmt(totalPastCharges)}</p>
              </div>
              <Package className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Button */}
      {isAdmitted && (
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" /> Assign Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Equipment to Patient</DialogTitle>
              <DialogDescription>Select equipment and it will start tracking charges immediately.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Equipment *</Label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger><SelectValue placeholder="Choose equipment..." /></SelectTrigger>
                  <SelectContent>
                    {availableItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {fmt(item.ratePerUnit)}/{item.chargeType === "HOURLY" ? "hr" : "day"}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEquipment && (() => {
                  const sel = availableItems.find(i => i.id === selectedEquipment)
                  if (!sel) return null
                  return (
                    <div className="bg-blue-50 rounded-md p-2 text-xs space-y-0.5 mt-1">
                      <p><span className="font-medium">Rate:</span> {fmt(sel.ratePerUnit)} / {sel.chargeType === "HOURLY" ? "hour" : "day"}</p>
                      {sel.depositAmount > 0 && <p><span className="font-medium">Deposit:</span> {fmt(sel.depositAmount)}</p>}
                      {sel.category && <p><span className="font-medium">Category:</span> {sel.category}</p>}
                    </div>
                  )
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Bed 5, left side..." rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
                <Button onClick={handleAssign} disabled={isPending}>
                  {isPending ? "Assigning..." : "Assign Now"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Active Equipment */}
      {activeUsages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4 text-blue-500" />
              Currently Assigned ({activeUsages.length})
            </CardTitle>
            <CardDescription>These items are being tracked and charges are accumulating in real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeUsages.map(u => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/50 gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{u.equipment.name}</span>
                      {u.quantity > 1 && <Badge variant="secondary" className="text-xs">×{u.quantity}</Badge>}
                      <Badge variant="outline" className="text-xs">
                        {u.chargeType === "HOURLY" ? <><Clock className="h-3 w-3 mr-0.5 inline" />Hourly</> : <><CalendarDays className="h-3 w-3 mr-0.5 inline" />Daily</>}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Started: {format(new Date(u.startTime), "dd MMM, h:mm a")}</span>
                      <span>•</span>
                      <span>Running: {formatDistanceToNow(new Date(u.startTime))}</span>
                      <span>•</span>
                      <span>Rate: {fmt(u.ratePerUnit)}/{u.chargeType === "HOURLY" ? "hr" : "day"}</span>
                    </div>
                    {u.notes && <p className="text-xs italic text-muted-foreground">{u.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Running charge</p>
                      <p className="text-lg font-bold text-amber-600">{fmt(computeLiveCharge(u))}</p>
                    </div>
                    {isAdmitted && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => handleReturn(u.id)} disabled={isPending}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Return
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => handleCancel(u.id)} disabled={isPending}>
                          <XCircle className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Usage History */}
      {pastUsages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              Usage History ({pastUsages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">Equipment</th>
                  <th className="text-left py-2 font-medium">Duration</th>
                  <th className="text-center py-2 font-medium">Qty</th>
                  <th className="text-right py-2 font-medium">Charge</th>
                  <th className="text-center py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pastUsages.map(u => (
                  <tr key={u.id} className="border-b hover:bg-muted/30">
                    <td className="py-2">
                      <span className="font-medium">{u.equipment.name}</span>
                      {u.equipment.code && <span className="text-xs text-muted-foreground ml-1">({u.equipment.code})</span>}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {format(new Date(u.startTime), "dd MMM h:mm a")}
                      {u.endTime && <> → {format(new Date(u.endTime), "dd MMM h:mm a")}</>}
                    </td>
                    <td className="py-2 text-center">{u.quantity}</td>
                    <td className="py-2 text-right font-mono font-semibold">
                      {u.status === "CANCELLED" ? "—" : fmt(u.computedCharge)}
                    </td>
                    <td className="py-2 text-center">
                      <Badge variant={u.status === "RETURNED" ? "secondary" : "destructive"} className="text-xs">
                        {u.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {usages.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No equipment assigned yet</p>
          {isAdmitted && <p className="text-sm mt-1">Click "Assign Equipment" to track supplies for this patient</p>}
        </div>
      )}
    </div>
  )
}
