"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Users, Plus, Ambulance as AmbulanceIcon, Calendar, Clock, Siren,
} from "lucide-react"

interface AssignmentData {
  id: string
  role: string
  assignmentDate: string
  notes: string | null
  ambulance: { vehicleNumber: string; type: string }
  staff: { id: string; user: { name: string | null; email: string | null; phone: string | null } }
  shift: { id: string; name: string; startTime: string; endTime: string; color: string | null }
}

interface AmbulanceOption { id: string; vehicleNumber: string; type: string }
interface StaffOption { id: string; user: { name: string | null; role: string } }
interface ShiftOption { id: string; name: string; startTime: string; endTime: string; color: string | null }

const STAFF_ROLES = [
  { value: "DRIVER", label: "Driver", color: "bg-blue-100 text-blue-700" },
  { value: "PARAMEDIC", label: "Paramedic", color: "bg-purple-100 text-purple-700" },
  { value: "EMT", label: "EMT", color: "bg-orange-100 text-orange-700" },
  { value: "NURSE", label: "Nurse", color: "bg-pink-100 text-pink-700" },
]

export function StaffAssignmentClient({
  assignments: initialAssignments,
  ambulances,
  staffList,
  shifts,
}: {
  assignments: AssignmentData[]
  ambulances: AmbulanceOption[]
  staffList: StaffOption[]
  shifts: ShiftOption[]
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    ambulanceId: "", staffId: "", shiftId: "", role: "DRIVER",
    assignmentDate: new Date().toISOString().split("T")[0], notes: "",
  })

  async function handleAssign() {
    if (!form.ambulanceId || !form.staffId || !form.shiftId) {
      toast.error("Please fill ambulance, staff, and shift"); return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/ambulance/${form.ambulanceId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      toast.success("Staff assigned!")
      setAddOpen(false)
      setForm({ ambulanceId: "", staffId: "", shiftId: "", role: "DRIVER", assignmentDate: new Date().toISOString().split("T")[0], notes: "" })
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign")
    } finally {
      setLoading(false)
    }
  }

  // Group assignments by ambulance
  const byAmbulance: Record<string, AssignmentData[]> = {}
  initialAssignments.forEach(a => {
    const key = a.ambulance.vehicleNumber
    if (!byAmbulance[key]) byAmbulance[key] = []
    byAmbulance[key].push(a)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Assignments</h1>
            <p className="text-sm text-gray-500">Manage ambulance crew schedules</p>
          </div>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-gradient-to-r from-teal-600 to-cyan-600">
              <Plus className="h-4 w-4" /> Assign Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Staff to Ambulance</DialogTitle>
              <DialogDescription>Schedule a staff member for a shift</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Ambulance *</Label>
                <Select value={form.ambulanceId} onValueChange={(v) => setForm({ ...form, ambulanceId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select ambulance" /></SelectTrigger>
                  <SelectContent>
                    {ambulances.map(a => <SelectItem key={a.id} value={a.id}>{a.vehicleNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Staff Member *</Label>
                <Select value={form.staffId} onValueChange={(v) => setForm({ ...form, staffId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.user.name || "—"} ({s.user.role})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Shift *</Label>
                  <Select value={form.shiftId} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>
                      {shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.assignmentDate} onChange={(e) => setForm({ ...form, assignmentDate: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={handleAssign} disabled={loading} className="w-full">
                {loading ? "Assigning..." : "Assign Staff"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assignments grouped by ambulance */}
      {Object.keys(byAmbulance).length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="pt-12 pb-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No staff assignments yet</p>
            <p className="text-sm text-gray-400 mt-1">Assign staff to ambulances using the button above</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byAmbulance).map(([vehicleNumber, assignments]) => (
            <Card key={vehicleNumber} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-gray-100">
                    <AmbulanceIcon className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">{vehicleNumber}</h3>
                  <Badge className="text-[10px] bg-gray-100 text-gray-600">{assignments.length} staff</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {assignments.map((a) => {
                    const roleInfo = STAFF_ROLES.find(r => r.value === a.role)
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.staff.user.name || "—"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={`text-[9px] ${roleInfo?.color || "bg-gray-100 text-gray-600"}`}>{a.role}</Badge>
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {a.shift.name} ({a.shift.startTime}–{a.shift.endTime})
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" /> {new Date(a.assignmentDate).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
