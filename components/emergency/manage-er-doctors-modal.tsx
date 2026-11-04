"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { clockInERDoctor, clockOutERDoctor } from "@/lib/actions/emergency"
import { toast } from "sonner"
import { Clock, Stethoscope, UserX } from "lucide-react"

interface ManageERDoctorsModalProps {
  isOpen: boolean
  onClose: () => void
  doctors: any[]
  activeShifts: any[]
}

export function ManageERDoctorsModal({ isOpen, onClose, doctors, activeShifts }: ManageERDoctorsModalProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter out doctors who are already clocked in
  const availableDoctors = doctors.filter(
    doc => !activeShifts.some(shift => shift.doctorId === doc.id)
  )

  const handleClockIn = async () => {
    if (!selectedDoctorId) return
    setIsSubmitting(true)
    const result = await clockInERDoctor(selectedDoctorId)
    setIsSubmitting(false)
    
    if (result.success) {
      toast.success(result.message)
      setSelectedDoctorId("")
    } else {
      toast.error(result.message)
    }
  }

  const handleClockOut = async (shiftId: string) => {
    if (confirm("Are you sure you want to clock out this doctor?")) {
      const result = await clockOutERDoctor(shiftId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            Manage ER Doctors on Duty
          </DialogTitle>
          <DialogDescription>
            Assign doctors to the ER or clock them out when their shift ends.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          {/* Clock In Section */}
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm">Assign Doctor to ER</h4>
            <div className="flex gap-2">
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select an available doctor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">No available doctors</div>
                  ) : (
                    availableDoctors.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        Dr. {doc.user?.name} ({doc.specialization || "General"})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleClockIn} 
                disabled={!selectedDoctorId || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Clock In
              </Button>
            </div>
          </div>
          
          {/* Currently On Duty Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center justify-between">
              Currently On Duty
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                {activeShifts.length} Active
              </span>
            </h4>
            
            {activeShifts.length === 0 ? (
              <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground flex flex-col items-center">
                <UserX className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No doctors currently assigned to the ER.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activeShifts.map(shift => (
                  <div key={shift.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">Dr. {shift.doctor?.user?.name}</p>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        Clocked in at {new Date(shift.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleClockOut(shift.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      Clock Out
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
