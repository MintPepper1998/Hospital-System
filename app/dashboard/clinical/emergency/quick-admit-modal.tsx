"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { TriageLevel } from "@prisma/client"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { registerEmergencyPatient } from "@/app/actions/emergency"

const quickAdmitSchema = z.object({
  unknownName: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  ageStr: z.string().optional(),
  triageLevel: z.nativeEnum(TriageLevel),
  chiefComplaint: z.string().optional(),
  vitalsRecorded: z.string().optional(),
  bedId: z.string().optional(),
  assignedDoctorId: z.string().optional(),
})

interface QuickAdmitModalProps {
  isOpen: boolean
  onClose: () => void
  activeShifts: any[]
  erWards: any[]
}

export function QuickAdmitModal({ isOpen, onClose, activeShifts, erWards }: QuickAdmitModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const availableBeds = erWards.flatMap(w => w.beds.filter((b: any) => b.status === "AVAILABLE").map((b: any) => ({ ...b, wardName: w.name })))

  const form = useForm<z.infer<typeof quickAdmitSchema>>({
    resolver: zodResolver(quickAdmitSchema),
    defaultValues: {
      triageLevel: "EMERGENT",
      unknownName: "",
      ageStr: "",
      chiefComplaint: "",
      vitalsRecorded: "",
    },
  })

  async function onSubmit(values: z.infer<typeof quickAdmitSchema>) {
    try {
      setIsLoading(true)
      await registerEmergencyPatient(values)
      toast.success("Emergency patient registered successfully")
      onClose()
      form.reset()
    } catch (error: any) {
      toast.error(error.message || "Failed to register emergency patient")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-[#e0e5ec] border-0 rounded-[2rem] shadow-[20px_20px_60px_#bec3c9,-20px_-20px_60px_#ffffff]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600">Quick ER Admission</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unknownName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-zinc-600">Patient Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Leave blank if unknown" className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ageStr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-zinc-600">Approx. Age</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 45" className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-zinc-600">Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#e0e5ec] border-0 shadow-[8px_8px_16px_#bec3c9,-8px_-8px_16px_#ffffff] rounded-xl">
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="triageLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-zinc-600">Triage Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl font-semibold">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#e0e5ec] border-0 shadow-[8px_8px_16px_#bec3c9,-8px_-8px_16px_#ffffff] rounded-xl">
                        <SelectItem value="RESUSCITATION" className="text-red-600 font-bold">Resuscitation</SelectItem>
                        <SelectItem value="EMERGENT" className="text-orange-500 font-bold">Emergent</SelectItem>
                        <SelectItem value="URGENT" className="text-yellow-600 font-bold">Urgent</SelectItem>
                        <SelectItem value="LESS_URGENT" className="text-green-600 font-bold">Less Urgent</SelectItem>
                        <SelectItem value="NON_URGENT" className="text-blue-600 font-bold">Non Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bedId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-zinc-600">Assign ER Bed</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl">
                          <SelectValue placeholder="Select a bed" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#e0e5ec] border-0 shadow-[8px_8px_16px_#bec3c9,-8px_-8px_16px_#ffffff] rounded-xl max-h-[200px]">
                        {availableBeds.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.bedNumber} ({b.wardName})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assignedDoctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-zinc-600">Assign ER Doctor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl">
                          <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#e0e5ec] border-0 shadow-[8px_8px_16px_#bec3c9,-8px_-8px_16px_#ffffff] rounded-xl max-h-[200px]">
                        {activeShifts.length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground text-center">No doctors on duty</div>
                        )}
                        {activeShifts.map(shift => (
                          <SelectItem key={shift.doctor.id} value={shift.doctor.id}>
                            Dr. {shift.doctor.user?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Chief Complaint</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of the emergency" className="bg-[#e0e5ec] border-0 neo-pressed rounded-xl resize-none" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold neo-flat shadow-none">
                {isLoading ? "Admitting..." : "Admit Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
