"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Ambulance as AmbulanceIcon,
  Plus,
  Wrench,
  Activity,
  MapPin,
  Users,
  Phone,
  Shield,
  Calendar,
  Fuel,
  ChevronDown,
  ChevronUp,
  Siren,
  Trash2,
  Settings,
  Package,
} from "lucide-react"

interface EquipmentData {
  id: string
  equipmentName: string
  category: string
  quantity: number
  condition: string
  lastCheckedAt: string | null
  notes: string | null
}

interface AmbulanceData {
  id: string
  vehicleNumber: string
  type: string
  status: string
  model: string | null
  manufacturer: string | null
  yearOfManufacture: number | null
  registrationExpiry: string | null
  insuranceExpiry: string | null
  insurancePolicyNo: string | null
  lastServiceDate: string | null
  nextServiceDue: string | null
  mileage: number
  fuelType: string | null
  capacity: number
  contactNumber: string | null
  notes: string | null
  equipment: EquipmentData[]
  staffAssignments: Array<{
    id: string
    role: string
    staff: { user: { name: string | null } }
    shift: { name: string; startTime: string; endTime: string }
  }>
  _count: { equipment: number; trips: number; staffAssignments: number }
}

const AMBULANCE_TYPES = [
  { value: "BASIC_LIFE_SUPPORT", label: "Basic Life Support (BLS)" },
  { value: "ADVANCED_LIFE_SUPPORT", label: "Advanced Life Support (ALS)" },
  { value: "PATIENT_TRANSPORT", label: "Patient Transport" },
  { value: "NEONATAL", label: "Neonatal" },
  { value: "MORTUARY", label: "Mortuary" },
]

const EQUIPMENT_CATEGORIES = [
  { value: "MEDICAL", label: "Medical" },
  { value: "SAFETY", label: "Safety" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "OTHER", label: "Other" },
]

const EQUIPMENT_CONDITIONS = [
  { value: "GOOD", label: "Good", color: "text-emerald-600 bg-emerald-50" },
  { value: "FAIR", label: "Fair", color: "text-amber-600 bg-amber-50" },
  { value: "NEEDS_REPAIR", label: "Needs Repair", color: "text-orange-600 bg-orange-50" },
  { value: "NON_FUNCTIONAL", label: "Non-Functional", color: "text-red-600 bg-red-50" },
]

function getStatusColor(status: string) {
  switch (status) {
    case "AVAILABLE": return "bg-emerald-100 text-emerald-700"
    case "ON_TRIP": return "bg-red-100 text-red-700"
    case "MAINTENANCE": return "bg-amber-100 text-amber-700"
    case "OUT_OF_SERVICE": return "bg-gray-100 text-gray-700"
    default: return "bg-gray-100 text-gray-700"
  }
}

function formatType(type: string) {
  return AMBULANCE_TYPES.find(t => t.value === type)?.label || type.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
}

export function FleetManagementClient({ ambulances: initialAmbulances }: { ambulances: AmbulanceData[] }) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [equipOpen, setEquipOpen] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Add ambulance form
  const [form, setForm] = useState({
    vehicleNumber: "", type: "BASIC_LIFE_SUPPORT", model: "", manufacturer: "",
    yearOfManufacture: "", registrationExpiry: "", insuranceExpiry: "", insurancePolicyNo: "",
    fuelType: "Diesel", capacity: "1", contactNumber: "", notes: "",
  })

  // Add equipment form
  const [eqForm, setEqForm] = useState({
    equipmentName: "", category: "MEDICAL", quantity: "1", condition: "GOOD", notes: "",
  })

  async function handleAddAmbulance() {
    if (!form.vehicleNumber.trim()) { toast.error("Vehicle number is required"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/ambulance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      toast.success("Ambulance registered successfully!")
      setAddOpen(false)
      setForm({ vehicleNumber: "", type: "BASIC_LIFE_SUPPORT", model: "", manufacturer: "", yearOfManufacture: "", registrationExpiry: "", insuranceExpiry: "", insurancePolicyNo: "", fuelType: "Diesel", capacity: "1", contactNumber: "", notes: "" })
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to register ambulance")
    } finally {
      setLoading(false)
    }
  }

  async function handleAddEquipment(ambulanceId: string) {
    if (!eqForm.equipmentName.trim()) { toast.error("Equipment name is required"); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/ambulance/${ambulanceId}/equipment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eqForm) })
      if (!res.ok) throw new Error("Failed to add equipment")
      toast.success("Equipment added!")
      setEquipOpen(null)
      setEqForm({ equipmentName: "", category: "MEDICAL", quantity: "1", condition: "GOOD", notes: "" })
      router.refresh()
    } catch {
      toast.error("Failed to add equipment")
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/ambulance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`)
      router.refresh()
    } catch {
      toast.error("Failed to update status")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this ambulance?")) return
    try {
      const res = await fetch(`/api/ambulance/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Ambulance removed")
      router.refresh()
    } catch {
      toast.error("Failed to remove ambulance")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
            <Siren className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
            <p className="text-sm text-gray-500">{initialAmbulances.length} ambulances registered</p>
          </div>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="h-4 w-4" /> Register Ambulance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Ambulance</DialogTitle>
              <DialogDescription>Add a new ambulance to the fleet</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="col-span-2">
                <Label>Vehicle Number *</Label>
                <Input placeholder="OD-02-AB-1234" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AMBULANCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fuel Type</Label>
                <Select value={form.fuelType} onValueChange={(v) => setForm({ ...form, fuelType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Petrol">Petrol</SelectItem>
                    <SelectItem value="CNG">CNG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Input placeholder="Force Traveller" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div>
                <Label>Manufacturer</Label>
                <Input placeholder="Force Motors" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" placeholder="2024" value={form.yearOfManufacture} onChange={(e) => setForm({ ...form, yearOfManufacture: e.target.value })} />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input type="number" placeholder="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input placeholder="Phone on ambulance" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
              </div>
              <div>
                <Label>Insurance Policy #</Label>
                <Input placeholder="Policy number" value={form.insurancePolicyNo} onChange={(e) => setForm({ ...form, insurancePolicyNo: e.target.value })} />
              </div>
              <div>
                <Label>Registration Expiry</Label>
                <Input type="date" value={form.registrationExpiry} onChange={(e) => setForm({ ...form, registrationExpiry: e.target.value })} />
              </div>
              <div>
                <Label>Insurance Expiry</Label>
                <Input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleAddAmbulance} disabled={loading} className="w-full mt-3">
              {loading ? "Registering..." : "Register Ambulance"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ambulance Cards */}
      {initialAmbulances.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="pt-12 pb-12 text-center">
            <AmbulanceIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No ambulances registered yet</p>
            <p className="text-sm text-gray-400 mt-1">Click &quot;Register Ambulance&quot; to add your first vehicle</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {initialAmbulances.map((amb) => {
            const isExpanded = expandedId === amb.id
            return (
              <Card key={amb.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                {/* Main row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : amb.id)}
                >
                  <div className="p-2 rounded-lg bg-gray-100">
                    <AmbulanceIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{amb.vehicleNumber}</p>
                      <Badge className={`text-[10px] ${getStatusColor(amb.status)}`}>{amb.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">{formatType(amb.type)} {amb.model ? `• ${amb.model}` : ""}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {amb._count.equipment}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {amb._count.staffAssignments}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {amb._count.trips}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select value={amb.status} onValueChange={(v) => { handleStatusChange(amb.id, v) }}>
                      <SelectTrigger className="h-7 text-xs w-auto min-w-[110px]" onClick={(e) => e.stopPropagation()}>
                        <Settings className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(amb.id) }}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Vehicle Details */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle Details</h4>
                        <div className="space-y-1.5 text-xs">
                          {amb.manufacturer && <div className="flex justify-between"><span className="text-gray-500">Manufacturer</span><span className="font-medium">{amb.manufacturer}</span></div>}
                          {amb.yearOfManufacture && <div className="flex justify-between"><span className="text-gray-500">Year</span><span className="font-medium">{amb.yearOfManufacture}</span></div>}
                          <div className="flex justify-between"><span className="text-gray-500">Mileage</span><span className="font-medium">{amb.mileage.toLocaleString()} km</span></div>
                          {amb.fuelType && <div className="flex justify-between items-center"><span className="text-gray-500"><Fuel className="h-3 w-3 inline mr-1" />Fuel</span><span className="font-medium">{amb.fuelType}</span></div>}
                          {amb.contactNumber && <div className="flex justify-between items-center"><span className="text-gray-500"><Phone className="h-3 w-3 inline mr-1" />Phone</span><span className="font-medium">{amb.contactNumber}</span></div>}
                          {amb.registrationExpiry && <div className="flex justify-between items-center"><span className="text-gray-500"><Calendar className="h-3 w-3 inline mr-1" />Reg. Expiry</span><span className="font-medium">{new Date(amb.registrationExpiry).toLocaleDateString("en-IN")}</span></div>}
                          {amb.insuranceExpiry && <div className="flex justify-between items-center"><span className="text-gray-500"><Shield className="h-3 w-3 inline mr-1" />Ins. Expiry</span><span className="font-medium">{new Date(amb.insuranceExpiry).toLocaleDateString("en-IN")}</span></div>}
                        </div>
                      </div>

                      {/* Equipment */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipment ({amb.equipment.length})</h4>
                          <Dialog open={equipOpen === amb.id} onOpenChange={(open) => setEquipOpen(open ? amb.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5">
                                <Plus className="h-3 w-3" /> Add
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                              <DialogHeader>
                                <DialogTitle>Add Equipment</DialogTitle>
                                <DialogDescription>Add equipment to {amb.vehicleNumber}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3">
                                <div><Label>Equipment Name *</Label><Input placeholder="e.g., Oxygen Cylinder" value={eqForm.equipmentName} onChange={(e) => setEqForm({ ...eqForm, equipmentName: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label>Category</Label>
                                    <Select value={eqForm.category} onValueChange={(v) => setEqForm({ ...eqForm, category: v })}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>{EQUIPMENT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div><Label>Quantity</Label><Input type="number" value={eqForm.quantity} onChange={(e) => setEqForm({ ...eqForm, quantity: e.target.value })} /></div>
                                </div>
                                <div>
                                  <Label>Condition</Label>
                                  <Select value={eqForm.condition} onValueChange={(v) => setEqForm({ ...eqForm, condition: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{EQUIPMENT_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={() => handleAddEquipment(amb.id)} disabled={loading} className="w-full">
                                  {loading ? "Adding..." : "Add Equipment"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        {amb.equipment.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">No equipment listed</p>
                        ) : (
                          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                            {amb.equipment.map((eq) => {
                              const cond = EQUIPMENT_CONDITIONS.find(c => c.value === eq.condition)
                              return (
                                <div key={eq.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50 text-xs">
                                  <div>
                                    <span className="font-medium">{eq.equipmentName}</span>
                                    <span className="text-gray-400 ml-1">×{eq.quantity}</span>
                                  </div>
                                  <Badge className={`text-[9px] ${cond?.color || ""}`}>{eq.condition.replace(/_/g, " ")}</Badge>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Today's Staff */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Staff Assignments</h4>
                        {amb.staffAssignments.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">No staff assigned</p>
                        ) : (
                          <div className="space-y-1.5">
                            {amb.staffAssignments.map((sa) => (
                              <div key={sa.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-gray-400" />
                                  <span className="font-medium">{sa.staff.user.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge className="text-[9px] bg-blue-50 text-blue-600">{sa.role}</Badge>
                                  <span className="text-gray-400">{sa.shift.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
