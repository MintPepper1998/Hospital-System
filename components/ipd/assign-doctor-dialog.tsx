"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { assignIpdDoctor } from "@/lib/actions/ipd-doctors"
import { toast } from "sonner"
import { Plus } from "lucide-react"

export function AssignDoctorDialog({ admissionId, availableDoctors }: { admissionId: string, availableDoctors: any[] }) {
  const [open, setOpen] = useState(false)
  const [doctorId, setDoctorId] = useState("")
  const [role, setRole] = useState<"TREATING" | "VISITING">("VISITING")
  const [isLoading, setIsLoading] = useState(false)

  async function handleAssign() {
    if (!doctorId) {
      toast.error("Please select a doctor")
      return
    }

    setIsLoading(true)
    const result = await assignIpdDoctor({ admissionId, doctorId, role })
    setIsLoading(false)

    if (result.success) {
      toast.success("Doctor assigned successfully")
      setOpen(false)
      setDoctorId("")
      setRole("VISITING")
    } else {
      toast.error(result.error || "Failed to assign doctor")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100/50 rounded-full text-[11px] font-bold tracking-wide transition-colors">
          <Plus className="w-3 h-3 stroke-[2.5]" />
          Assign
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Doctor to Admission</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-3">
            <Label>Select Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {availableDoctors.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    Dr. {doc.user?.name} ({doc.specialization || 'General'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <Label>Doctor Role</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center space-x-3 border p-3 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="role" 
                  value="TREATING" 
                  checked={role === "TREATING"} 
                  onChange={() => setRole("TREATING")}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="font-semibold flex-1 text-sm">Treating Doctor</span>
              </label>
              <label className="flex items-center space-x-3 border p-3 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="role" 
                  value="VISITING" 
                  checked={role === "VISITING"} 
                  onChange={() => setRole("VISITING")}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="font-semibold flex-1 text-sm">Visiting Doctor</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={isLoading || !doctorId}>
            {isLoading ? "Assigning..." : "Assign Doctor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
