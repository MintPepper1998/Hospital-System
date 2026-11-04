"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogOut, ArrowRight, Activity } from "lucide-react"
import { admitToIPDFromER, dischargeFromER } from "@/app/actions/emergency"

interface ERActionButtonsProps {
  visit: any
  doctors: any[]
  ipdWards: any[]
}

export function ERActionButtons({ visit, doctors, ipdWards }: ERActionButtonsProps) {
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false)
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false)
  
  const [selectedIpdBed, setSelectedIpdBed] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [initialDeposit, setInitialDeposit] = useState("")
  const [reason, setReason] = useState("")
  
  const [isLoading, setIsLoading] = useState(false)

  const availableIpdBeds = ipdWards.flatMap(w => w.beds.map((b: any) => ({ ...b, wardName: w.name })))

  const handleAdmitToIPD = async () => {
    if (!selectedIpdBed || !selectedDoctor) {
      toast.error("Please select a bed and a primary doctor")
      return
    }

    try {
      setIsLoading(true)
      await admitToIPDFromER({
        visitId: visit.id,
        ipdBedId: selectedIpdBed,
        primaryDoctorId: selectedDoctor,
        initialDeposit: parseFloat(initialDeposit) || 0,
        reason: reason || visit.chiefComplaint || "Emergency Admission",
      })
      toast.success("Patient successfully admitted to IPD")
      setIsAdmitModalOpen(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to admit to IPD")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDischarge = async () => {
    try {
      setIsLoading(true)
      // ER Base Fee = 1500 (configurable)
      await dischargeFromER(visit.id, 1500)
      toast.success("Patient discharged. ER Bill generated.")
      setIsDischargeModalOpen(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to discharge")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button 
          onClick={() => setIsAdmitModalOpen(true)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs shadow-none neo-flat"
        >
          <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
          Admit to IPD
        </Button>
        <Button 
          onClick={() => setIsDischargeModalOpen(true)}
          className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold h-9 text-xs shadow-none neo-flat"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Discharge
        </Button>
      </div>

      {/* Admit to IPD Modal */}
      <Dialog open={isAdmitModalOpen} onOpenChange={setIsAdmitModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#e0e5ec] border-0 rounded-[2rem] shadow-[20px_20px_60px_#bec3c9,-20px_-20px_60px_#ffffff]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-800">Convert to IPD Admission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-600">Assign IPD Bed</Label>
              <Select onValueChange={setSelectedIpdBed}>
                <SelectTrigger className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl">
                  <SelectValue placeholder="Select Bed" />
                </SelectTrigger>
                <SelectContent className="bg-[#e0e5ec] border-0 shadow-[8px_8px_16px_#bec3c9,-8px_-8px_16px_#ffffff] rounded-xl max-h-[200px]">
                  {availableIpdBeds.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.bedNumber} ({b.wardName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-600">Primary Doctor</Label>
              <Select onValueChange={setSelectedDoctor}>
                <SelectTrigger className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl">
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent className="bg-[#e0e5ec] border-0 shadow-[8px_8px_16px_#bec3c9,-8px_-8px_16px_#ffffff] rounded-xl max-h-[200px]">
                  {doctors.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-600">Initial Deposit (₹)</Label>
              <Input 
                type="number" 
                value={initialDeposit} 
                onChange={e => setInitialDeposit(e.target.value)}
                placeholder="e.g. 5000" 
                className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-600">Admission Reason</Label>
              <Input 
                value={reason} 
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for IPD" 
                className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdmitModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button disabled={isLoading} onClick={handleAdmitToIPD} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold neo-flat shadow-none">
              {isLoading ? "Admitting..." : "Confirm Admission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discharge Modal */}
      <Dialog open={isDischargeModalOpen} onOpenChange={setIsDischargeModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#e0e5ec] border-0 rounded-[2rem] shadow-[20px_20px_60px_#bec3c9,-20px_-20px_60px_#ffffff]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-800">Discharge ER Patient</DialogTitle>
            <DialogDescription className="font-semibold text-zinc-500">
              This will free the ER bed and generate an EMERGENCY bill for the patient.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsDischargeModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button disabled={isLoading} onClick={handleDischarge} className="bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl font-bold neo-flat shadow-none">
              {isLoading ? "Processing..." : "Discharge & Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
