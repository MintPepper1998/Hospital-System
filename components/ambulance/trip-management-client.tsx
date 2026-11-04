"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  MapPin, Plus, Clock, IndianRupee, Ambulance as AmbulanceIcon,
  ArrowRight, Phone, CheckCircle2, XCircle, Siren, Truck,
} from "lucide-react"

interface TripData {
  id: string
  tripNumber: string
  patientName: string
  patientPhone: string | null
  patientAge: number | null
  patientGender: string | null
  pickupLocation: string
  dropLocation: string
  distanceKm: number | null
  status: string
  driverName: string | null
  paramedicName: string | null
  requestedAt: string
  dispatchedAt: string | null
  arrivedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  chiefComplaint: string | null
  notes: string | null
  ambulance: { vehicleNumber: string; type: string }
  billing: { totalAmount: number; paymentStatus: string; bookingFee: number; distanceCharge: number; equipmentCharge: number; nightSurcharge: number } | null
}

interface AvailableAmbulance {
  id: string
  vehicleNumber: string
  type: string
}

const TRIP_STATUSES = [
  { value: "DISPATCHED", label: "Dispatched", color: "bg-blue-100 text-blue-700", icon: "🚑" },
  { value: "EN_ROUTE", label: "En Route", color: "bg-indigo-100 text-indigo-700", icon: "🛣️" },
  { value: "ARRIVED", label: "Arrived", color: "bg-purple-100 text-purple-700", icon: "📍" },
  { value: "PATIENT_LOADED", label: "Patient Loaded", color: "bg-orange-100 text-orange-700", icon: "👤" },
  { value: "RETURNING", label: "Returning", color: "bg-amber-100 text-amber-700", icon: "🔙" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: "✅" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700", icon: "❌" },
]

function getTripStatusInfo(status: string) {
  return TRIP_STATUSES.find(s => s.value === status) || { value: status, label: status, color: "bg-gray-100 text-gray-700", icon: "?" }
}

function getNextStatus(current: string): string | null {
  const flow = ["DISPATCHED", "EN_ROUTE", "ARRIVED", "PATIENT_LOADED", "RETURNING", "COMPLETED"]
  const idx = flow.indexOf(current)
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null
}

export function TripManagementClient({ trips: initialTrips, availableAmbulances }: { trips: TripData[]; availableAmbulances: AvailableAmbulance[] }) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const [form, setForm] = useState({
    ambulanceId: "", patientName: "", patientPhone: "", patientAge: "", patientGender: "",
    pickupLocation: "", dropLocation: "Hospital", distanceKm: "",
    driverName: "", driverPhone: "", paramedicName: "", chiefComplaint: "", notes: "",
  })

  const filteredTrips = statusFilter === "ALL" ? initialTrips : initialTrips.filter(t => t.status === statusFilter)

  async function handleCreateTrip() {
    if (!form.ambulanceId) { toast.error("Select an ambulance"); return }
    if (!form.patientName.trim()) { toast.error("Patient name is required"); return }
    if (!form.pickupLocation.trim()) { toast.error("Pickup location is required"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/ambulance/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      toast.success("Trip dispatched!")
      setAddOpen(false)
      setForm({ ambulanceId: "", patientName: "", patientPhone: "", patientAge: "", patientGender: "", pickupLocation: "", dropLocation: "Hospital", distanceKm: "", driverName: "", driverPhone: "", paramedicName: "", chiefComplaint: "", notes: "" })
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create trip")
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusUpdate(tripId: string, newStatus: string, cancelReason?: string) {
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (cancelReason) body.cancelReason = cancelReason
      const res = await fetch(`/api/ambulance/trips/${tripId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(`Status → ${newStatus.replace(/_/g, " ")}`)
      router.refresh()
    } catch {
      toast.error("Failed to update status")
    }
  }

  async function handleDistanceUpdate(tripId: string, distanceKm: string) {
    try {
      const res = await fetch(`/api/ambulance/trips/${tripId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ distanceKm }) })
      if (!res.ok) throw new Error("Failed to update")
      toast.success("Distance updated & billing recalculated")
      router.refresh()
    } catch {
      toast.error("Failed to update distance")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trip Management</h1>
            <p className="text-sm text-gray-500">{initialTrips.length} total trips</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Trips</SelectItem>
              {TRIP_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600">
                <Plus className="h-4 w-4" /> New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Siren className="h-5 w-5 text-red-500" /> Dispatch Ambulance</DialogTitle>
                <DialogDescription>Create a new ambulance trip</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="col-span-2">
                  <Label>Ambulance *</Label>
                  <Select value={form.ambulanceId} onValueChange={(v) => setForm({ ...form, ambulanceId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select ambulance" /></SelectTrigger>
                    <SelectContent>
                      {availableAmbulances.length === 0 ? (
                        <SelectItem value="none" disabled>No ambulances available</SelectItem>
                      ) : (
                        availableAmbulances.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.vehicleNumber} ({a.type.split("_").map(w => w[0]).join("")})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Patient Name *</Label>
                  <Input placeholder="Full name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
                </div>
                <div>
                  <Label>Patient Phone</Label>
                  <Input placeholder="Phone number" value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value })} />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input type="number" placeholder="Age" value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.patientGender} onValueChange={(v) => setForm({ ...form, patientGender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Pickup Location *</Label>
                  <Input placeholder="Address / Landmark" value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} />
                </div>
                <div>
                  <Label>Drop Location</Label>
                  <Input placeholder="Hospital" value={form.dropLocation} onChange={(e) => setForm({ ...form, dropLocation: e.target.value })} />
                </div>
                <div>
                  <Label>Distance (km)</Label>
                  <Input type="number" step="0.1" placeholder="Est. distance" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} />
                </div>
                <div>
                  <Label>Driver Name</Label>
                  <Input placeholder="Driver" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
                </div>
                <div>
                  <Label>Paramedic</Label>
                  <Input placeholder="Paramedic" value={form.paramedicName} onChange={(e) => setForm({ ...form, paramedicName: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Chief Complaint</Label>
                  <Input placeholder="Reason for ambulance call" value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleCreateTrip} disabled={loading} className="w-full mt-3 bg-gradient-to-r from-red-500 to-rose-600">
                {loading ? "Dispatching..." : "🚑 Dispatch Now"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Trip List */}
      {filteredTrips.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="pt-12 pb-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No trips found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => {
            const statusInfo = getTripStatusInfo(trip.status)
            const nextStatus = getNextStatus(trip.status)
            const isActive = !["COMPLETED", "CANCELLED"].includes(trip.status)

            return (
              <Card key={trip.id} className={`border-0 shadow-sm ${isActive ? "ring-1 ring-blue-100" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Trip info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-gray-500">{trip.tripNumber}</span>
                        <Badge className={`text-[10px] ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</Badge>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <AmbulanceIcon className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="text-sm font-semibold">{trip.ambulance.vehicleNumber}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{trip.patientName}</span>
                        {trip.patientPhone && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Phone className="h-3 w-3" />{trip.patientPhone}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{trip.pickupLocation}</span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{trip.dropLocation}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        <span><Clock className="h-3 w-3 inline mr-0.5" />{new Date(trip.requestedAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
                        {trip.distanceKm && <span><Truck className="h-3 w-3 inline mr-0.5" />{trip.distanceKm} km</span>}
                        {trip.driverName && <span>Driver: {trip.driverName}</span>}
                      </div>
                    </div>

                    {/* Billing */}
                    <div className="flex items-center gap-4">
                      {trip.billing && (
                        <div className="text-right min-w-[100px]">
                          <p className="text-sm font-bold text-gray-900 flex items-center justify-end gap-0.5">
                            <IndianRupee className="h-3.5 w-3.5" />{trip.billing.totalAmount.toLocaleString("en-IN")}
                          </p>
                          <Badge className={`text-[9px] ${trip.billing.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-700" : trip.billing.paymentStatus === "WAIVED" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>
                            {trip.billing.paymentStatus}
                          </Badge>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {isActive && trip.status !== "CANCELLED" && (
                          <>
                            {/* Update distance */}
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="km"
                              className="h-7 w-16 text-xs"
                              defaultValue={trip.distanceKm || ""}
                              onBlur={(e) => {
                                if (e.target.value && parseFloat(e.target.value) !== trip.distanceKm) {
                                  handleDistanceUpdate(trip.id, e.target.value)
                                }
                              }}
                            />
                            {nextStatus && (
                              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleStatusUpdate(trip.id, nextStatus)}>
                                <CheckCircle2 className="h-3 w-3" /> {getTripStatusInfo(nextStatus).label}
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => {
                              const reason = prompt("Reason for cancellation?")
                              if (reason !== null) handleStatusUpdate(trip.id, "CANCELLED", reason)
                            }}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
