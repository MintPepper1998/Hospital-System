"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { PrintOPDButton } from "@/components/print-opd-button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, FileText, Printer, CheckCircle2 } from "lucide-react"
import { bookOPDFromCasualty } from "@/app/actions/casualty"

const PAYMENT_METHODS = [
  { value: "CASH", label: "💵 Cash" },
  { value: "UPI", label: "📱 UPI" },
  { value: "CARD", label: "💳 Card" },
  { value: "CREDIT", label: "📋 Credit (Pay Later)" },
]

const opdSchema = z.object({
  doctorId: z.string().min(1, "Select a doctor"),
  reason: z.string().min(1, "Reason is required"),
  paymentMethod: z.string().min(1, "Select payment method"),
})

interface BookOPDModalProps {
  isOpen: boolean
  onClose: () => void
  visit: {
    id: string
    patientId: string
    chiefComplaint: string | null
    patient: {
      id: string
      patientId: string
      user: { name: string | null }
    }
  }
  doctors: Array<{
    id: string
    consultationFee: number
    department: string | null
    specialization: string | null
    user: { name: string | null }
  }>
}

export function BookOPDModal({ isOpen, onClose, visit, doctors }: BookOPDModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ appointmentId: string; billingId: string; billNumber: string } | null>(null)

  const form = useForm<z.infer<typeof opdSchema>>({
    resolver: zodResolver(opdSchema),
    defaultValues: {
      doctorId: "",
      reason: visit.chiefComplaint || "",
      paymentMethod: "CASH",
    },
  })

  const selectedDoctor = doctors.find((d) => d.id === form.watch("doctorId"))

  async function onSubmit(values: z.infer<typeof opdSchema>) {
    try {
      setIsLoading(true)
      const res = await bookOPDFromCasualty({
        casualtyVisitId: visit.id,
        patientId: visit.patient.id,
        doctorId: values.doctorId,
        reason: values.reason,
        paymentMethod: values.paymentMethod,
      })
      if (res.success) {
        setResult({
          appointmentId: res.appointmentId,
          billingId: res.billingId,
          billNumber: res.billNumber,
        })
        toast.success("OPD appointment booked successfully")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to book OPD")
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setResult(null)
    form.reset()
    onClose()
  }

  // Success state with print link
  if (result) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[420px] bg-[#e0e5ec] border-0 rounded-[2rem] shadow-[20px_20px_60px_#bec3c9,-20px_-20px_60px_#ffffff]">
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-800">OPD Booked Successfully</h3>
              <p className="text-sm text-zinc-500 mt-1">Bill #{result.billNumber}</p>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <PrintOPDButton
                appointmentId={result.appointmentId}
                label="Print OPD Paper"
                className="neo-button bg-violet-500 hover:bg-violet-600 text-white rounded-xl py-3 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              />
              <Button
                variant="outline"
                onClick={handleClose}
                className="neo-button bg-[#e0e5ec] rounded-xl py-3 text-sm font-semibold text-zinc-600"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px] bg-[#e0e5ec] border-0 rounded-[2rem] shadow-[20px_20px_60px_#bec3c9,-20px_-20px_60px_#ffffff]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-violet-600 flex items-center gap-2">
            <FileText className="h-5 w-5" /> Book OPD from Casualty
          </DialogTitle>
          <p className="text-xs text-zinc-500 mt-0.5">
            Patient: <span className="font-semibold text-zinc-700">{visit.patient.user.name}</span> ({visit.patient.patientId})
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Doctor selection */}
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Doctor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          Dr. {d.user.name} {d.specialization ? `(${d.specialization})` : ""} — ₹{d.consultationFee}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fee display */}
            {selectedDoctor && (
              <div className="neo-pressed bg-[#e0e5ec] rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-zinc-500 font-medium">Consultation Fee</span>
                <span className="text-lg font-bold text-violet-600">₹{selectedDoctor.consultationFee}</span>
              </div>
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Reason / Complaint</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="e.g. Fracture management follow-up…" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                        <SelectValue placeholder="Select payment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full neo-button bg-violet-500 hover:bg-violet-600 text-white rounded-xl py-3 font-semibold"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Book OPD & Generate Bill
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
