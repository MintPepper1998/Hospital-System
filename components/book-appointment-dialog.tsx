"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createAppointment, revalidateOPDPage } from "@/lib/actions"
import { getActiveFeesForModule } from "@/lib/actions/hospital-fees"
import { sendBillNotification } from "@/lib/whatsapp"
import html2canvas from "html2canvas"
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
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Calendar, Loader2, Printer, CheckCircle2, IndianRupee, Receipt, FileText } from "lucide-react"
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

interface BookAppointmentDialogProps {
  patientId: string
  patientName: string
  doctors: Doctor[]
  patientPhone?: string | null
  hideTrigger?: boolean
}

export function BookAppointmentDialog({
  patientId,
  patientName,
  doctors,
  patientPhone,
  hideTrigger = false,
}: BookAppointmentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [reason, setReason] = useState("")
  const [appointmentDate, setAppointmentDate] = useState("")
  const [appointmentTime, setAppointmentTime] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [allergies, setAllergies] = useState("")
  const [currentMedications, setCurrentMedications] = useState("")
  const [medicalHistory, setMedicalHistory] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isSendingWa, setIsSendingWa] = useState(false)
  const billRef = useRef<HTMLDivElement>(null)

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

  // Get selected doctor details
  const selectedDoctorDetails = doctors.find((d) => d.id === selectedDoctor)
  const consultationFee = selectedDoctorDetails?.consultationFee || 500

  // Calculate total
  const totalHospitalFees = opdFees.reduce((sum, f) => sum + f.amount, 0)
  const grandTotal = consultationFee + totalHospitalFees

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDoctor || !reason || !appointmentDate || !appointmentTime || !paymentMethod) {
      toast.error("Please fill in all required fields")
      return
    }

    const dateTimeString = `${appointmentDate}T${appointmentTime}`
    const appointmentDateTime = new Date(dateTimeString)

    if (isNaN(appointmentDateTime.getTime())) {
      toast.error("Please select a valid date and time")
      return
    }

    startTransition(async () => {
      const result = await createAppointment(
        patientId,
        selectedDoctor,
        reason,
        appointmentDateTime,
        paymentMethod,
        allergies || undefined,
        currentMedications || undefined,
        medicalHistory || undefined
      )

      if (result.success) {
        toast.success("Appointment Booked & Bill Generated!", {
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

  const resetAndClose = async () => {
    setSelectedDoctor("")
    setReason("")
    setAppointmentDate("")
    setAppointmentTime("")
    setPaymentMethod("CASH")
    setAllergies("")
    setCurrentMedications("")
    setMedicalHistory("")
    setBillResult(null)
    setOpen(false)
    // Primary: server revalidation + client refresh
    try {
      await revalidateOPDPage()
      router.refresh()
    } catch {
      // Fallback: hard reload guarantees fresh data even if router.refresh() fails
      // (can happen silently on slow/unstable network connections on desktop clients)
      window.location.reload()
    }
  }

  const today = new Date()
  const minDate = today.toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        // Only allow closing if user explicitly clicks Close button
        // Don't auto-close when bill result is showing
        if (!billResult) {
          resetAndClose()
        }
      } else {
        setOpen(true)
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`text-[#0066CC] hover:text-[#0052A3] hover:bg-blue-50 ${hideTrigger ? "hidden" : ""}`}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Book
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        
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

            <div className="py-4 space-y-3" ref={billRef}>
              {/* Bill Items */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase flex justify-between">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                {/* Consultation fee */}
                <div className="flex justify-between items-center px-4 py-2.5 border-t text-sm">
                  <span>Consultation Fee - Dr. {selectedDoctorDetails?.user.name}</span>
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
                {paymentMethod === "CREDIT" ? (
                  <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                    ⏳ CREDIT — Payment Due
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    PAID via {paymentMethod}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="outline"
                className="text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                disabled={isSendingWa}
                onClick={async () => {
                  if (!patientPhone) {
                    toast.error("Patient phone number not found")
                    return
                  }
                  
                  setIsSendingWa(true)
                  try {
                    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
                    let mediaBase64 = ""

                    if (billRef.current) {
                      try {
                        const canvas = await html2canvas(billRef.current, {
                          scale: 2,
                          logging: false,
                          backgroundColor: "#ffffff",
                          onclone: (clonedDoc: Document) => {
                            const styles = clonedDoc.querySelectorAll("style")
                            styles.forEach((style) => {
                              if (style.textContent) {
                                style.textContent = style.textContent
                                  .replace(/lab\([^)]*\)/g, "#000000")
                                  .replace(/oklch\([^)]*\)/g, "#000000")
                              }
                            })
                          },
                        })
                        mediaBase64 = canvas.toDataURL("image/png")
                      } catch {
                        console.warn("Bill image capture failed, sending text-only")
                      }
                    }
                    
                    const result = await sendBillNotification({
                      phone: patientPhone,
                      patientName: patientName,
                      billNumber: billResult.billNumber,
                      amount: billResult.grandTotal.toFixed(2),
                      date: dateStr,
                      referenceId: billResult.billingId,
                      ...(mediaBase64 && { mediaBase64 })
                    })
                    
                    if (result.success) {
                      toast.success("Bill sent via WhatsApp!")
                    } else {
                      toast.error(result.message || "Failed to send WhatsApp message")
                    }
                  } catch (error: any) {
                    toast.error(error.message || "Failed to send WhatsApp message")
                  } finally {
                    setIsSendingWa(false)
                  }
                }}
              >
                {isSendingWa ? (
                  <div className="w-4 h-4 mr-2 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-4 h-4 mr-2" />
                )}
                {isSendingWa ? "Sending..." : "Send via WhatsApp"}
              </Button>
              <div className="flex gap-2">
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
              </div>
            </DialogFooter>
          </>
        ) : (
          /* ── BOOKING FORM VIEW ── */
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-[#0066CC]">Book Appointment</DialogTitle>
              <DialogDescription>
                Schedule an appointment for <span className="font-semibold">{patientName}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Doctor Selection */}
              <div className="space-y-2">
                <Label htmlFor="doctor">
                  Select Doctor <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No doctors available
                      </div>
                    ) : (
                      doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.user.name} - {doctor.department}
                          {doctor.specialization && ` (${doctor.specialization})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Fee Breakdown (shown when doctor selected) */}
              {selectedDoctorDetails && (
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-gray-50 px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase flex justify-between">
                    <span>Fee Breakdown</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 text-sm border-t">
                    <span className="text-gray-700">Consultation - Dr. {selectedDoctorDetails.user.name}</span>
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
              )}

              {/* Appointment Date */}
              <div className="space-y-2">
                <Label htmlFor="appointmentDate">
                  Appointment Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="appointmentDate"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={minDate}
                  required
                />
              </div>

              {/* Appointment Time */}
              <div className="space-y-2">
                <Label htmlFor="appointmentTime">
                  Appointment Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="appointmentTime"
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  required
                />
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

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Visit <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Brief description of the patient's concern..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {/* Medical Information */}
              <div className="rounded-lg border p-3 space-y-3 bg-blue-50/30">
                <p className="text-xs font-semibold text-[#0066CC] flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Medical Information <span className="text-muted-foreground font-normal">(optional but important)</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="allergies" className="text-xs">Chief Complaint</Label>
                    <Textarea
                      id="allergies"
                      placeholder="Primary symptoms or complaint..."
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="currentMedications" className="text-xs">Current Medications</Label>
                    <Textarea
                      id="currentMedications"
                      placeholder="Ongoing medications with dosage"
                      value={currentMedications}
                      onChange={(e) => setCurrentMedications(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="medicalHistory" className="text-xs">Past Medical History</Label>
                  <Textarea
                    id="medicalHistory"
                    placeholder="Previous surgeries, chronic conditions, hospitalizations..."
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
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
                disabled={isPending || !selectedDoctor}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : selectedDoctor ? (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    Collect ₹{grandTotal.toFixed(2)} & Book
                  </>
                ) : (
                  "Select Doctor First"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
