"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Search, UserPlus, UserRoundPlus } from "lucide-react"
import { registerCasualtyPatient } from "@/app/actions/casualty"

const admitSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  chiefComplaint: z.string().optional(),
  assignedDoctorId: z.string().optional(),
})

interface CasualtyAdmitModalProps {
  isOpen: boolean
  onClose: () => void
  doctors: Array<{
    id: string
    user: { name: string | null }
    department: string | null
    specialization: string | null
  }>
  recentPatients: Array<{
    id: string
    patientId: string
    phone: string | null
    gender: string | null
    user: { name: string | null }
  }>
}

export function CasualtyAdmitModal({ isOpen, onClose, doctors, recentPatients }: CasualtyAdmitModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [patientSearch, setPatientSearch] = useState("")

  const form = useForm<z.infer<typeof admitSchema>>({
    resolver: zodResolver(admitSchema),
    defaultValues: {
      patientId: "",
      chiefComplaint: "",
      assignedDoctorId: "",
    },
  })

  const selectedPatientId = form.watch("patientId")

  const filteredPatients = useMemo(() => {
    if (!patientSearch || patientSearch.length < 2) return []
    const q = patientSearch.toLowerCase()
    return recentPatients
      .filter(
        (p) =>
          p.user.name?.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          p.phone?.includes(q)
      )
      .slice(0, 8)
  }, [patientSearch, recentPatients])

  async function onSubmit(values: z.infer<typeof admitSchema>) {
    try {
      setIsLoading(true)
      await registerCasualtyPatient({
        patientId: values.patientId,
        chiefComplaint: values.chiefComplaint,
        assignedDoctorId: values.assignedDoctorId || undefined,
      })
      toast.success("Patient admitted to Casualty")
      form.reset()
      setPatientSearch("")
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to admit patient")
    } finally {
      setIsLoading(false)
    }
  }

  function handleRegisterNew() {
    onClose()
    router.push("/dashboard/casualty/register")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] bg-[#e0e5ec] border-0 rounded-[2rem] shadow-[20px_20px_60px_#bec3c9,-20px_-20px_60px_#ffffff]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-orange-600 flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Admit to Casualty
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Patient search */}
            <div className="space-y-2">
              <FormLabel className="text-xs font-bold text-zinc-600">Search Existing Patient</FormLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Type name, UHID, or phone…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-10 bg-white/70 border-0 neo-pressed rounded-xl text-sm"
                />
              </div>
              {filteredPatients.length > 0 && (
                <div className="neo-pressed bg-[#e0e5ec] rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                  {filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        form.setValue("patientId", p.id, { shouldValidate: true })
                        setPatientSearch(p.user.name || p.patientId)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                        selectedPatientId === p.id
                          ? "bg-orange-100 text-orange-700 font-semibold"
                          : "hover:bg-white/60 text-zinc-700"
                      }`}
                    >
                      <span className="font-medium">{p.user.name}</span>
                      <span className="text-zinc-400 ml-2">{p.patientId}</span>
                      {p.phone && <span className="text-zinc-400 ml-2">· {p.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
              {patientSearch.length >= 2 && filteredPatients.length === 0 && (
                <p className="text-[11px] text-zinc-400 px-1">No patients found. Register a new patient below.</p>
              )}
            </div>

            {/* Chief Complaint */}
            <FormField
              control={form.control}
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Chief Complaint</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="e.g. Fracture left forearm, needs plaster…" rows={2} className="bg-white/70 border-0 neo-pressed rounded-xl text-sm resize-none" />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Assign Doctor */}
            <FormField
              control={form.control}
              name="assignedDoctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Assign Doctor (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          Dr. {d.user.name} {d.specialization ? `(${d.specialization})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="submit"
                disabled={isLoading || !selectedPatientId}
                className="w-full neo-button bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-semibold"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Admit to Casualty
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-zinc-300" />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase">or</span>
                <div className="flex-1 h-px bg-zinc-300" />
              </div>

              {/* Register New Patient */}
              <Button
                type="button"
                onClick={handleRegisterNew}
                className="w-full neo-button bg-[#e0e5ec] text-zinc-700 hover:bg-[#d5dae2] rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
              >
                <UserRoundPlus className="h-4 w-4 text-orange-500" />
                Register New Patient & Admit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
