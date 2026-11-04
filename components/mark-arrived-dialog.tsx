"use client"

import { useState, useTransition, useEffect } from "react"
import { billAndMarkArrived } from "@/lib/actions"
import { getActiveFeesForModule } from "@/lib/actions/hospital-fees"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Printer, CheckCircle2, IndianRupee, Receipt, UserCheck } from "lucide-react"
import { toast } from "sonner"

interface Doctor {
  id: string
  user: {
    name: string
  }
  department: string
  specialization: string | null
  consultationFee: number
}

interface HospitalFee {
  id: string
  name: string
  amount: number
}

interface MarkArrivedDialogProps {
  patientId: string
  patientName: string
  appointmentId: string
  doctor: Doctor
}

export function MarkArrivedDialog({
  patientId,
  patientName,
  appointmentId,
  doctor,
}: MarkArrivedDialogProps) {
  const [open, setOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [isPending, startTransition] = useTransition()

  // Hospital fees state
  const [opdFees, setOpdFees] = useState<HospitalFee[]>([])

  // Bill result state (after successful booking)
  const [billResult, setBillResult] = useState<{
    billingId: string
    billNumber: string
    consultationFee: number
    hospitalFees: { name: string; amount: number }[]
    grandTotal: number
  } | null>(null)

  // Fetch OPD fees when dialog opens (filtered by patient's billing history)
  useEffect(() => {
    if (open) {
      getActiveFeesForModule("OPD", patientId).then((res) => {
        if (res.success && res.data) {
          setOpdFees(res.data as HospitalFee[])
        }
      })
    }
  }, [open, patientId])

  const consultationFee = doctor?.consultationFee || 500

  // Calculate total
  const totalHospitalFees = opdFees.reduce((sum, f) => sum + f.amount, 0)
  const grandTotal = consultationFee + totalHospitalFees

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!paymentMethod) {
      toast.error("Please select a payment method")
      return
    }

    startTransition(async () => {
      const result = await billAndMarkArrived(appointmentId, paymentMethod)

      if (result.success) {
        toast.success("Patient Arrived & Bill Generated!", {
          description: result.message,
        })

        // Show bill summary
        setBillResult({
          billingId: result.billingId || "",
          billNumber: result.billNumber || "",
          consultationFee: result.consultationFee || 0,
          hospitalFees: result.hospitalFees || [],
          grandTotal: result.grandTotal || 0,
        })
      } else {
        toast.error(result.message)
      }
    })
  }

  const resetAndClose = () => {
    setPaymentMethod("CASH")
    setBillResult(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        if (!billResult) {
          resetAndClose()
        }
      } else {
        setOpen(true)
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <UserCheck className="mr-2 h-4 w-4" />
          Mark Arrived & Collect
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        
        {/* ── BILL RESULT VIEW ── */}
        {billResult ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Bill Generated Successfully
              </DialogTitle>
              <DialogDescription>
                Bill <span className="font-semibold font-mono">{billResult.billNumber}</span> for <span className="font-semibold">{patientName}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              {/* Bill Items */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase flex justify-between">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                {/* Consultation fee */}
                <div className="flex justify-between items-center px-4 py-2.5 border-t text-sm">
                  <span>Consultation Fee - Dr. {doctor?.user?.name}</span>
                  <span className="font-semibold">₹{billResult.consultationFee.toFixed(2)}</span>
                </div>
                {/* Hospital fees */}
                {billResult.hospitalFees.map((fee, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-2.5 border-t text-sm bg-gray-50/50">
                    <span>{fee.name}</span>
                    <span className="font-semibold">₹{fee.amount.toFixed(2)}</span>
                  </div>
                ))}
                {/* Total */}
                <div className="flex justify-between items-center px-4 py-3 border-t-2 border-[#0066CC] bg-blue-50 text-sm font-bold">
                  <span className="text-[#0066CC]">Total Collected</span>
                  <span className="text-lg text-[#0066CC]">₹{billResult.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  PAID via {paymentMethod}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetAndClose}>
                Close
              </Button>
              <Button
                className="bg-[#0066CC] hover:bg-[#0052A3]"
                onClick={() => {
                  window.location.href = `/dashboard/clinical/opd/bill/${billResult.billingId}`
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Bill
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ── PAYMENT FORM VIEW ── */
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-[#0066CC]">Confirm Arrival & Collect Payment</DialogTitle>
              <DialogDescription>
                Collect OPD fee before sending <span className="font-semibold">{patientName}</span> to vitals queue.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Fee Breakdown */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase flex justify-between">
                  <span>Fee Breakdown</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2 text-sm border-t">
                  <span className="text-gray-700">Consultation - Dr. {doctor?.user?.name}</span>
                  <span className="font-semibold">₹{consultationFee.toFixed(2)}</span>
                </div>
                {opdFees.map((fee) => (
                  <div key={fee.id} className="flex justify-between items-center px-3 py-2 text-sm border-t bg-gray-50/50">
                    <span className="text-gray-700">{fee.name}</span>
                    <span className="font-semibold">₹{fee.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-3 py-2 text-sm bg-[#0066CC] text-white font-bold border-t">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-3.5 w-3.5" />
                    Total to Collect
                  </span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI / QR Code</SelectItem>
                    <SelectItem value="CARD">Card (Debit/Credit)</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                    <SelectItem value="INSURANCE">Private Insurance / TPA</SelectItem>
                    <SelectItem value="BSKY">BSKY (Government)</SelectItem>
                    <SelectItem value="CREDIT">Credit (Pay Later)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetAndClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#0066CC] hover:bg-[#0052A3]"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    Collect ₹{grandTotal.toFixed(2)} & Send to Vitals
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
