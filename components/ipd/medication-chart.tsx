"use client"

import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pill,
  Plus,
  Loader2,
  OctagonX,
  Clock,
  CheckCircle2,
  Search,
} from "lucide-react"
import { addIPDPrescription, stopIPDPrescription } from "@/app/actions/prescription"
import { searchMedicines } from "@/app/actions/search"
import { returnDispensedIPDPrescription } from "@/lib/actions/pharmacy"
import { toast } from "sonner"

// ============================================
// TYPES
// ============================================

export interface SerializedIPDPrescription {
  id: string
  admissionId?: string
  emergencyVisitId?: string
  prescribedById: string
  prescribedByName: string | null
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  instruction: string | null
  requestedQuantity?: number | null
  status: string
  pharmacyStatus?: string
  dispensedQuantity?: number | null
  totalPrice?: number | null
  stoppedAt: string | null
  stoppedBy: string | null
  createdAt: string
  updatedAt: string
}

interface MedicationChartProps {
  admissionId?: string
  emergencyVisitId?: string
  admissionStatus: string
  doctorName: string
  prescriptions: SerializedIPDPrescription[]
  activeUserRole?: string
}

// Common frequency presets for Indian hospitals
const FREQUENCY_PRESETS = [
  { value: "1-0-0", label: "1-0-0 (Morning)" },
  { value: "0-0-1", label: "0-0-1 (Night)" },
  { value: "1-0-1", label: "1-0-1 (Morning & Night)" },
  { value: "1-1-1", label: "1-1-1 (TDS / Three times)" },
  { value: "1-1-1-1", label: "1-1-1-1 (QID / Four times)" },
  { value: "0-1-0", label: "0-1-0 (Afternoon)" },
  { value: "BD", label: "BD (Twice daily)" },
  { value: "OD", label: "OD (Once daily)" },
  { value: "SOS", label: "SOS (As needed)" },
  { value: "STAT", label: "STAT (Immediately)" },
]

// ============================================
// MAIN COMPONENT
// ============================================

export function MedicationChart({
  admissionId,
  emergencyVisitId,
  admissionStatus,
  doctorName,
  prescriptions: initialPrescriptions,
  activeUserRole,
}: MedicationChartProps) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions)
  const [isPending, startTransition] = useTransition()
  const [isStoppingId, setIsStoppingId] = useState<string | null>(null)
  const [isReturningId, setIsReturningId] = useState<string | null>(null)
  
  const [returnDialogItem, setReturnDialogItem] = useState<SerializedIPDPrescription | null>(null)
  const [returnQuantity, setReturnQuantity] = useState<number | "">("")

  // Form state
  const [medicineName, setMedicineName] = useState("")
  const [dosage, setDosage] = useState("")
  const [frequency, setFrequency] = useState("")
  const [duration, setDuration] = useState("")
  const [instruction, setInstruction] = useState("")
  const [quantity, setQuantity] = useState("")

  // Autocomplete state
  const [medSuggestions, setMedSuggestions] = useState<
    { id: string; name: string; genericName: string; strength: string | null; label: string; currentStock?: number }[]
  >([])
  const [showMedDropdown, setShowMedDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const medInputRef = useRef<HTMLInputElement>(null)
  const medDropdownRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced medicine search
  const handleMedicineSearch = useCallback((query: string) => {
    setMedicineName(query)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (query.trim().length < 2) {
      setMedSuggestions([])
      setShowMedDropdown(false)
      return
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchMedicines(query)
        setMedSuggestions(results)
        setShowMedDropdown(results.length > 0)
      } catch {
        setMedSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [])

  const selectMedicine = (item: typeof medSuggestions[0]) => {
    setMedicineName(item.name)
    if (item.strength && !dosage) setDosage(item.strength)
    setShowMedDropdown(false)
    setMedSuggestions([])
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        medDropdownRef.current &&
        !medDropdownRef.current.contains(e.target as Node) &&
        medInputRef.current &&
        !medInputRef.current.contains(e.target as Node)
      ) {
        setShowMedDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleOpenReturnDialog = (rx: SerializedIPDPrescription) => {
    setReturnDialogItem(rx)
    setReturnQuantity(rx.dispensedQuantity || 1)
  }

  const submitReturn = () => {
    if (!returnDialogItem) return
    const qty = Number(returnQuantity)
    if (!qty || qty <= 0 || qty > (returnDialogItem.dispensedQuantity || 0)) {
      toast.error("Invalid return quantity")
      return
    }
    
    setIsReturningId(returnDialogItem.id)
    startTransition(async () => {
      try {
        const result = await returnDispensedIPDPrescription(returnDialogItem.id, qty)
        if (result.success) {
          toast.success("Medication returned to pharmacy successfully")
          // Optimistically update UI
          setPrescriptions((prev) => 
            prev.map((r) => {
              if (r.id === returnDialogItem.id) {
                const newQty = (r.dispensedQuantity || 0) - qty
                return {
                  ...r,
                  dispensedQuantity: newQty,
                  pharmacyStatus: newQty === 0 ? "CANCELLED" : "DISPENSED",
                }
              }
              return r
            })
          )
          setReturnDialogItem(null)
        } else {
          toast.error(result.message || "Failed to return medication")
        }
      } catch (err) {
        toast.error("An error occurred")
      } finally {
        setIsReturningId(null)
      }
    })
  }

  const activePrescriptions = prescriptions.filter((p) => p.status === "ACTIVE")
  const stoppedPrescriptions = prescriptions.filter((p) => p.status === "STOPPED")

  const handleAdd = () => {
    if (!medicineName.trim()) {
      toast.error("Please fill in the medicine name")
      return
    }

    startTransition(async () => {
      try {
        const parsedQty = quantity ? parseInt(quantity) : undefined
        
        const result = await addIPDPrescription({
          admissionId,
          emergencyVisitId,
          prescribedById: "current-user", // TODO: Replace with actual auth user
          prescribedByName: doctorName,
          medicineName,
          dosage,
          frequency,
          duration,
          instruction: instruction || undefined,
          quantity: parsedQty,
        })

        if (result.success) {
          toast.success(`${medicineName} added to medication chart`)

          // Optimistic update
          const newRx: SerializedIPDPrescription = {
            id: result.prescriptionId,
            admissionId,
            emergencyVisitId,
            prescribedById: "current-user",
            prescribedByName: doctorName,
            medicineName,
            dosage,
            frequency,
            duration,
            instruction: instruction || null,
            requestedQuantity: parsedQty || null,
            status: "ACTIVE",
            stoppedAt: null,
            stoppedBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setPrescriptions((prev) => [newRx, ...prev])

          // Reset form
          setMedicineName("")
          setDosage("")
          setFrequency("")
          setDuration("")
          setInstruction("")
          setQuantity("")
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to add prescription")
      }
    })
  }

  const handleStop = (prescriptionId: string) => {
    setIsStoppingId(prescriptionId)
    startTransition(async () => {
      try {
        const result = await stopIPDPrescription({
          prescriptionId,
          stoppedBy: doctorName,
        })

        if (result.success) {
          toast.success("Medication stopped")
          setPrescriptions((prev) =>
            prev.map((p) =>
              p.id === prescriptionId
                ? { ...p, status: "STOPPED", stoppedAt: new Date().toISOString(), stoppedBy: doctorName }
                : p
            )
          )
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to stop medication")
      } finally {
        setIsStoppingId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Add Prescription Form */}
      {(admissionStatus === "ADMITTED" || admissionStatus === "ACTIVE" || admissionStatus === "TRIAGE" || admissionStatus === "OBSERVATION" || activeUserRole === "DOCTOR" || activeUserRole === "SUPER_ADMIN" || activeUserRole === "ADMIN") && admissionStatus !== "DISCHARGED" && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-600" />
              Add Medication
            </CardTitle>
            <CardDescription>Prescribe a new medication for this patient</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Medicine Name (Autocomplete) */}
              <div className="space-y-1 md:col-span-2 relative">
                <Label htmlFor="medicineName" className="text-xs">
                  Medicine Name *
                </Label>
                <div className="relative">
                  <Input
                    ref={medInputRef}
                    id="medicineName"
                    placeholder="Type 2+ characters to search medicines..."
                    value={medicineName}
                    onChange={(e) => handleMedicineSearch(e.target.value)}
                    onFocus={() => {
                      if (medSuggestions.length > 0) setShowMedDropdown(true)
                    }}
                    className="bg-white pr-8"
                    autoComplete="off"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!isSearching && medicineName.length >= 2 && (
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {/* Autocomplete Dropdown */}
                {showMedDropdown && medSuggestions.length > 0 && (
                  <div
                    ref={medDropdownRef}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {medSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b last:border-b-0 text-sm flex items-center justify-between"
                        onClick={() => selectMedicine(item)}
                      >
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.genericName !== item.name && (
                            <span className="text-muted-foreground ml-1">
                              ({item.genericName})
                            </span>
                          )}
                          {item.strength && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {item.strength}
                            </Badge>
                          )}
                        </div>
                        {item.currentStock !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${item.currentStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700 font-bold"}`}>
                            {item.currentStock > 0 ? `${item.currentStock} in stock` : "Out of Stock"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dosage */}
              <div className="space-y-1">
                <Label htmlFor="dosage" className="text-xs">
                  Dosage (Optional)
                </Label>
                <Input
                  id="dosage"
                  placeholder="e.g., 500mg, 1 tab, 5ml"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Frequency */}
              <div className="space-y-1">
                <Label htmlFor="frequency" className="text-xs">
                  Frequency (Optional)
                </Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_PRESETS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-1">
                <Label htmlFor="duration" className="text-xs">
                  Duration (Optional)
                </Label>
                <Input
                  id="duration"
                  placeholder="e.g., 5 days, 7 days, Until discharge"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <Label htmlFor="quantity" className="text-xs">
                  Quantity (Optional)
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g., 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Instruction */}
              <div className="space-y-1">
                <Label htmlFor="instruction" className="text-xs">
                  Instructions (Optional)
                </Label>
                <Input
                  id="instruction"
                  placeholder="e.g., After food, Before sleep, With warm water"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            <Button
              onClick={handleAdd}
              disabled={isPending || !medicineName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending && !isStoppingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Chart
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Medications Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Pill className="h-4 w-4 text-blue-500" />
            Active Medications
            <Badge variant="default" className="ml-auto bg-green-600">
              {activePrescriptions.length} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePrescriptions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Pill className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No active medications</p>
              <p className="text-sm">Add a medication using the form above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Req. Qty</TableHead>
                    <TableHead>Instructions</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePrescriptions.map((rx) => (
                    <TableRow key={rx.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rx.medicineName}</p>
                          <p className="text-xs text-muted-foreground">
                            by {rx.prescribedByName} &bull;{" "}
                            {format(new Date(rx.createdAt), "dd MMM, HH:mm")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rx.dosage || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{rx.frequency || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {rx.duration || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {rx.requestedQuantity ? `${rx.requestedQuantity} qty` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {rx.instruction || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {admissionStatus === "ADMITTED" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => handleStop(rx.id)}
                            disabled={isPending && isStoppingId === rx.id}
                          >
                            {isPending && isStoppingId === rx.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <OctagonX className="h-3 w-3 mr-1" />
                                Stop
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stopped Medications (History) */}
      {stoppedPrescriptions.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <OctagonX className="h-4 w-4" />
              Stopped Medications
              <Badge variant="secondary" className="ml-auto text-xs">
                {stoppedPrescriptions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Req. Qty</TableHead>
                    <TableHead>Stopped</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stoppedPrescriptions.map((rx) => (
                    <TableRow key={rx.id} className="opacity-60">
                      <TableCell>
                        <div>
                          <p className="font-medium line-through">{rx.medicineName}</p>
                          <p className="text-xs text-muted-foreground">
                            by {rx.prescribedByName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="opacity-60">{rx.dosage || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{rx.frequency || "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm">{rx.duration || "—"}</TableCell>
                      <TableCell className="text-sm">{rx.requestedQuantity ? `${rx.requestedQuantity} qty` : "—"}</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {rx.stoppedAt && format(new Date(rx.stoppedAt), "dd MMM, HH:mm")}
                          {rx.stoppedBy && <span className="block">by {rx.stoppedBy}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {rx.pharmacyStatus === "DISPENSED" ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {rx.dispensedQuantity} units available to return
                            </span>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[11px] text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 whitespace-nowrap px-2"
                              onClick={() => handleOpenReturnDialog(rx)}
                              disabled={isPending && isReturningId === rx.id}
                            >
                              {isPending && isReturningId === rx.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                              Return to Pharmacy
                            </Button>
                          </div>
                        ) : rx.pharmacyStatus === "CANCELLED" ? (
                          <Badge variant="secondary" className="text-[10px]">Returned</Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Dialog */}
      <Dialog open={!!returnDialogItem} onOpenChange={(open) => !open && setReturnDialogItem(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Return Medication</DialogTitle>
            <DialogDescription>
              Specify how many units of {returnDialogItem?.medicineName} you want to return to the pharmacy.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Quantity to Return (Max {returnDialogItem?.dispensedQuantity || 0})</Label>
              <Input 
                type="number" 
                min={1} 
                max={returnDialogItem?.dispensedQuantity || 1}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="bg-orange-50 text-orange-800 text-sm p-3 rounded-md border border-orange-200">
              Returning medications will immediately restore the stock in the pharmacy inventory and deduct the cost from the patient's bill.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogItem(null)} disabled={isPending && isReturningId === returnDialogItem?.id}>Cancel</Button>
            <Button onClick={submitReturn} disabled={isPending && isReturningId === returnDialogItem?.id} className="bg-orange-600 hover:bg-orange-700 text-white">
              {isPending && isReturningId === returnDialogItem?.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
