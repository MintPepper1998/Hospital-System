"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Pill, Trash2, BedDouble, Stethoscope, Check, Loader2, Package, Pencil, Save, X, Minus, Plus } from "lucide-react"
import Link from "next/link"
import {
  cancelPrescription,
  dispenseIPDPrescription,
  cancelIPDPrescriptionFromQueue,
  updateIPDPrescriptionItem,
  updateOPDPrescriptionItem,
} from "@/lib/actions/pharmacy"
import { toast } from "sonner"

// ============================================
// TYPES
// ============================================

interface IPDRxDetail {
  id: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  instruction: string | null
  status?: string
  requestedQuantity?: number | null
}

interface OPDRxDetail {
  id: string
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions: string | null
}

interface QueueRow {
  id: string
  queueType: "OPD" | "IPD" | "EMERGENCY"
  patientName: string
  doctorName: string
  tokenOrBed: string
  medicineCount: number
  medicines: string[]
  createdAt: string
  ipdPrescriptionIds?: IPDRxDetail[]
  opdPrescriptionItems?: OPDRxDetail[]
}

interface PharmacyQueueClientProps {
  rows: QueueRow[]
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PharmacyQueueClient({ rows: initialRows }: PharmacyQueueClientProps) {
  const [rows, setRows] = useState(initialRows)
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<string | null>(null)

  // IPD dispense modal
  const [dispenseModalRow, setDispenseModalRow] = useState<QueueRow | null>(null)
  const [dispensedIds, setDispensedIds] = useState<Set<string>>(new Set())

  // OPD modal
  const [opdModalRow, setOpdModalRow] = useState<QueueRow | null>(null)

  // Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})

  // Filter state
  const [filter, setFilter] = useState<"ALL" | "OPD" | "IPD" | "EMERGENCY">("ALL")

  const filteredRows = rows.filter((r) => {
    if (filter === "ALL") return true
    return r.queueType === filter
  })

  // OPD: cancel
  const handleOPDCancel = (appointmentId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to cancel this OPD prescription?"
    )
    if (!confirmDelete) return

    setActiveAction(appointmentId)
    startTransition(async () => {
      try {
        const result = await cancelPrescription(appointmentId)
        if (result?.success === false) {
          toast.error(result.message || "Failed to cancel.")
          return
        }
        toast.success("OPD prescription cancelled.")
        setRows((prev) => prev.filter((r) => r.id !== appointmentId))
      } catch {
        toast.error("Failed to cancel.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  // IPD: cancel all prescriptions for an admission
  const handleIPDCancel = (row: QueueRow) => {
    const confirmDelete = window.confirm(
      `Cancel all ${row.medicineCount} active prescription(s) for ${row.patientName}?`
    )
    if (!confirmDelete) return

    setActiveAction(row.id)
    startTransition(async () => {
      try {
        const ids = row.ipdPrescriptionIds || []
        for (const rx of ids) {
          await cancelIPDPrescriptionFromQueue(rx.id)
        }
        toast.success("IPD prescriptions cancelled.")
        setRows((prev) => prev.filter((r) => r.id !== row.id))
      } catch {
        toast.error("Failed to cancel.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  // Editing functions
  const startEditing = (rx: any, type: "IPD" | "OPD") => {
    setEditingItemId(rx.id)
    if (type === "IPD") {
      setEditFormData({
        medicineName: rx.medicineName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        instruction: rx.instruction || "",
        quantity: rx.requestedQuantity || 1,
      })
    } else {
      setEditFormData({
        medicationName: rx.medicationName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        quantity: rx.quantity || 1,
        instructions: rx.instructions || "",
      })
    }
  }

  const handleEditSave = (type: "IPD" | "OPD", id: string) => {
    setActiveAction(`edit-${id}`)
    startTransition(async () => {
      try {
        let result
        // Convert quantity string to number if needed
        const dataToSave = {
          ...editFormData,
          quantity: typeof editFormData.quantity === 'string' ? parseInt(editFormData.quantity) || 1 : editFormData.quantity
        }
        
        if (type === "IPD") {
          result = await updateIPDPrescriptionItem(id, dataToSave)
        } else {
          result = await updateOPDPrescriptionItem(id, dataToSave)
        }
        
        if (result?.success) {
          toast.success("Prescription updated")
          setEditingItemId(null)
          
          setRows(prev => prev.map(row => {
            if (type === "IPD" && row.ipdPrescriptionIds) {
              return {
                ...row,
                ipdPrescriptionIds: row.ipdPrescriptionIds.map(rx => rx.id === id ? { ...rx, ...editFormData, requestedQuantity: dataToSave.quantity } : rx)
              }
            } else if (type === "OPD" && row.opdPrescriptionItems) {
              return {
                ...row,
                opdPrescriptionItems: row.opdPrescriptionItems.map(rx => rx.id === id ? { ...rx, ...editFormData, quantity: dataToSave.quantity } : rx)
              }
            }
            return row
          }))
          
          if (type === "IPD" && dispenseModalRow) {
             setDispenseModalRow(prev => prev ? ({
               ...prev,
               ipdPrescriptionIds: prev.ipdPrescriptionIds?.map(rx => rx.id === id ? { ...rx, ...editFormData, requestedQuantity: dataToSave.quantity } : rx)
             }) : prev)
          }
          if (type === "OPD" && opdModalRow) {
             setOpdModalRow(prev => prev ? ({
               ...prev,
               opdPrescriptionItems: prev.opdPrescriptionItems?.map(rx => rx.id === id ? { ...rx, ...editFormData } : rx)
             }) : prev)
          }
        } else {
          toast.error(result?.message || "Failed to update")
        }
      } catch (e) {
        toast.error("Failed to update prescription")
      } finally {
        setActiveAction(null)
      }
    })
  }

  // IPD: dispense individual medicine
  const handleDispenseOne = (rxId: string) => {
    setActiveAction(rxId)
    startTransition(async () => {
      try {
        const result = await dispenseIPDPrescription(rxId)
        if (result?.success === false) {
          toast.error(result.message || "Failed to dispense.")
          return
        }
        toast.success("Medicine dispensed!")
        setDispensedIds((prev) => new Set([...prev, rxId]))

        // Check if all meds for this admission are dispensed
        if (dispenseModalRow) {
          const allIds = dispenseModalRow.ipdPrescriptionIds?.map((r) => r.id) || []
          const newDispensed = new Set([...dispensedIds, rxId])
          const allDone = allIds.every((id) => newDispensed.has(id))
          if (allDone) {
            // Remove from queue
            setRows((prev) => prev.filter((r) => r.id !== dispenseModalRow.id))
            setDispenseModalRow(null)
            setDispensedIds(new Set())
            toast.success("All medicines dispensed for this patient!")
          }
        }
      } catch {
        toast.error("Failed to dispense.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  // IPD: dispense all at once
  const handleDispenseAll = (row: QueueRow) => {
    setActiveAction(`all-${row.id}`)
    startTransition(async () => {
      try {
        const ids = row.ipdPrescriptionIds || []
        const undispensed = ids.filter((rx) => !dispensedIds.has(rx.id))
        for (const rx of undispensed) {
          await dispenseIPDPrescription(rx.id)
        }
        toast.success(`All ${undispensed.length} medicine(s) dispensed!`)
        setRows((prev) => prev.filter((r) => r.id !== row.id))
        setDispenseModalRow(null)
        setDispensedIds(new Set())
      } catch {
        toast.error("Failed to dispense all.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(["ALL", "OPD", "IPD", "EMERGENCY"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? (f === "EMERGENCY" ? "destructive" : "default") : "outline"}
            onClick={() => setFilter(f)}
            className={filter === f ? (f === "EMERGENCY" ? "bg-red-600" : "bg-[#0066CC]") : (f === "EMERGENCY" ? "text-red-600 border-red-200 hover:bg-red-50" : "")}
          >
            {f === "ALL" ? `All (${rows.length})` : f === "OPD" ? `OPD (${rows.filter((r) => r.queueType === "OPD").length})` : f === "IPD" ? `IPD (${rows.filter((r) => r.queueType === "IPD").length})` : `EMERGENCY (${rows.filter((r) => r.queueType === "EMERGENCY").length})`}
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="w-28">Token / Bed</TableHead>
            <TableHead>Patient Name</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Medicines</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                No {filter === "ALL" ? "" : filter + " "}prescriptions pending.
              </TableCell>
            </TableRow>
          ) : (
            filteredRows.map((row) => (
              <TableRow 
                key={row.id} 
                className={`transition-colors ${row.queueType === "EMERGENCY" ? "bg-red-50/70 border-l-4 border-l-red-500 shadow-[inset_0_0_15px_rgba(239,68,68,0.15)] animate-pulse" : "hover:bg-gray-50"}`}
              >
                {/* Type Badge */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {row.queueType === "OPD" && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        OPD
                      </Badge>
                    )}
                    {row.queueType === "IPD" && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        IPD
                      </Badge>
                    )}
                    {row.queueType === "EMERGENCY" && (
                      <Badge variant="destructive" className="bg-red-600 animate-pulse shadow-md shadow-red-200">
                        EMERGENCY
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Token (OPD) / Bed (IPD) */}
                <TableCell className="font-mono font-semibold text-sm">
                  {row.tokenOrBed}
                </TableCell>

                {/* Patient */}
                <TableCell className="font-medium">{row.patientName}</TableCell>

                {/* Doctor */}
                <TableCell>Dr. {row.doctorName}</TableCell>

                {/* Medicine Count + tooltip-like preview */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{row.medicineCount}</Badge>
                    {row.medicines.length > 0 && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {row.medicines.slice(0, 2).join(", ")}
                        {row.medicines.length > 2 && ` +${row.medicines.length - 2} more`}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    Pending
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {row.queueType === "OPD" || row.queueType === "EMERGENCY" ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-[#0066CC] hover:bg-[#0052A3]"
                          onClick={() => setOpdModalRow(row)}
                        >
                          <Pill className="mr-1.5 h-4 w-4" />
                          View / Dispense
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleOPDCancel(row.id)}
                          disabled={isPending && activeAction === row.id}
                        >
                          {isPending && activeAction === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href={`/dashboard/pharmacy/ipd-dispense/${row.id}`}>
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Package className="mr-1.5 h-4 w-4" />
                            Dispense
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleIPDCancel(row)}
                          disabled={isPending && activeAction === row.id}
                        >
                          {isPending && activeAction === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>



      {/* OPD View/Edit Modal */}
      <Dialog open={!!opdModalRow} onOpenChange={(open) => !open && setOpdModalRow(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-blue-600" />
              View / Edit OPD Prescriptions
            </DialogTitle>
            <DialogDescription>
              {opdModalRow?.patientName} &bull; {opdModalRow?.tokenOrBed}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto pr-2">
            {opdModalRow?.opdPrescriptionItems?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No prescription items found.</p>
            )}
            {opdModalRow?.opdPrescriptionItems?.map((rx) => {
              return (
                <div
                  key={rx.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white"
                >
                  {editingItemId === rx.id ? (
                    <div className="flex-1 space-y-2 mr-2">
                      <Input
                        value={editFormData.medicationName}
                        onChange={(e) => setEditFormData({ ...editFormData, medicationName: e.target.value })}
                        placeholder="Medicine Name"
                        className="h-8"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={editFormData.dosage}
                          onChange={(e) => setEditFormData({ ...editFormData, dosage: e.target.value })}
                          placeholder="Dosage"
                          className="h-8 w-1/4"
                        />
                        <Input
                          value={editFormData.frequency}
                          onChange={(e) => setEditFormData({ ...editFormData, frequency: e.target.value })}
                          placeholder="Frequency"
                          className="h-8 w-1/4"
                        />
                        <Input
                          value={editFormData.duration}
                          onChange={(e) => setEditFormData({ ...editFormData, duration: e.target.value })}
                          placeholder="Duration"
                          className="h-8 w-1/4"
                        />
                        <Input
                          type="number"
                          value={editFormData.quantity}
                          onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                          placeholder="Qty"
                          className="h-8 w-1/4"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {rx.medicationName}
                        </p>
                        <Badge variant="secondary" className="text-xs px-1.5">Qty: {rx.quantity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rx.dosage} &bull; {rx.frequency} &bull; {rx.duration}
                        {rx.instructions && ` &bull; ${rx.instructions}`}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {editingItemId === rx.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingItemId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleEditSave("OPD", rx.id)}
                          disabled={isPending && activeAction === `edit-${rx.id}`}
                        >
                          {isPending && activeAction === `edit-${rx.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => startEditing(rx, "OPD")}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {opdModalRow && (
            <div className="flex gap-2 mt-4 pt-4 border-t justify-end">
              <Button variant="outline" onClick={() => setOpdModalRow(null)}>
                Close
              </Button>
              <Link href="/dashboard/pharmacy/pos" passHref>
                <Button className="bg-[#0066CC] hover:bg-[#0052A3]">
                  Go to POS Billing
                </Button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
