"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  IndianRupee,
  Loader2,
  CheckCircle2,
  Printer,
  Home,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
} from "lucide-react"
import { processDischarge } from "@/app/actions/discharge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
// import { PrintDischargeBill } from "./print-discharge-bill"

interface InvoiceData {
  billingId: string
  billNumber: string
  balanceDue: number
}

interface DischargeBillingFormProps {
  admissionId: string
  patientName: string
  subtotal: number
  advanceDeposit: number
  netPayable: number
  balanceDue: number
  patientLiability: number
  insuranceCoveredAmount: number
  pharmacyTax: number
  bedNumber: string
  wardName: string
  doctorName: string
  daysAdmitted: number
  admissionDate: string
  roomRent: number
  labTotal: number
  pharmacyTotal: number
  doctorFees: number
  hasInsuranceCoverage: boolean
  isBsky?: boolean
  dischargeTypes?: Array<{
    id: string; code: string; label: string; description: string | null
    templateSections: any[] | null; headerNote: string | null; footerNote: string | null
    requiresWitness: boolean; requiresPolice: boolean; showBilling: boolean
  }>
  initialData?: any
}

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "UPI", label: "UPI / QR Code", icon: Smartphone },
  { value: "CARD", label: "Card (Debit/Credit)", icon: CreditCard },
  { value: "BANK_TRANSFER", label: "Bank Transfer / NEFT", icon: CreditCard },
  { value: "INSURANCE", label: "Private Insurance / TPA", icon: CreditCard },
  { value: "BSKY", label: "BSKY (Government)", icon: CreditCard },
  { value: "CREDIT", label: "Credit (Pay Later)", icon: CreditCard },
]

export function DischargeBillingForm({
  admissionId,
  patientName,
  subtotal,
  advanceDeposit,
  netPayable,
  balanceDue,
  patientLiability,
  insuranceCoveredAmount,
  pharmacyTax,
  bedNumber,
  wardName,
  doctorName,
  daysAdmitted,
  admissionDate,
  roomRent,
  labTotal,
  pharmacyTotal,
  doctorFees,
  hasInsuranceCoverage,
  isBsky = false,
  dischargeTypes = [],
  initialData = {},
}: DischargeBillingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>(initialData?.dischargeTypeCode || dischargeTypes[0]?.code || "")
  const selectedType = dischargeTypes.find(dt => dt.code === selectedTypeCode)
  const [paymentMode, setPaymentMode] = useState(
    hasInsuranceCoverage && insuranceCoveredAmount > 0 ? "INSURANCE" : "CASH"
  )
  const [additionalDiscount, setAdditionalDiscount] = useState(0)
  const [filesHandedOver, setFilesHandedOver] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)

  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [dischargeDate, setDischargeDate] = useState<string>(() => toLocalISOString(new Date()))
  const minDischargeDate = admissionDate ? toLocalISOString(new Date(admissionDate)) : undefined
  const maxDischargeDate = toLocalISOString(new Date())

  const calculatedDays = Math.max(
    1,
    Math.ceil(
      (new Date(dischargeDate).getTime() - new Date(admissionDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  )

  // Use balanceDue (which accounts for insurance) instead of raw netPayable
  const effectivePayable = hasInsuranceCoverage && insuranceCoveredAmount > 0
    ? balanceDue  // Already accounts for insurance + deposit
    : netPayable  // No insurance: subtotal + tax - deposit
  const finalBalance = Math.max(0, effectivePayable - additionalDiscount)
  const isRefund = effectivePayable - additionalDiscount < 0
  const refundAmount = isRefund ? Math.abs(effectivePayable - additionalDiscount) : 0

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const dischargeType = formData.get("dischargeType") as string
    const followUpDate = formData.get("followUpDate") as string
    
    let summaryParts: string[] = []
    
    if (selectedType?.templateSections && selectedType.templateSections.length > 0) {
      selectedType.templateSections.forEach((section: any) => {
        const val = formData.get(section.sectionKey) as string
        if (val) summaryParts.push(`${section.sectionLabel}: ${val}`)
      })
      if (followUpDate) summaryParts.push(`Follow-up: ${followUpDate}`)
    } else {
      const finalDiagnosis = formData.get("finalDiagnosis") as string
      const courseInHospital = formData.get("courseInHospital") as string
      const conditionAtDischarge = formData.get("conditionAtDischarge") as string
      const adviceOnDischarge = formData.get("adviceOnDischarge") as string
      
      summaryParts = [
        `Diagnosis: ${finalDiagnosis}`,
        `Course: ${courseInHospital}`,
        `Condition: ${conditionAtDischarge}`,
        `Advice: ${adviceOnDischarge}`,
        followUpDate ? `Follow-up: ${followUpDate}` : "",
      ].filter(Boolean)
    }

    const summary = summaryParts.join("\n\n")

    startTransition(async () => {
      const result = await processDischarge(admissionId, {
        dischargeType: (dischargeType || "NORMAL") as any,
        dischargeDate: dischargeDate || undefined,
        summary,
        paymentMode,
        additionalDiscount,
      })

      if (result.success) {
        toast.success(result.message)

        const invoiceForPrint: InvoiceData = {
          billingId: result.data?.billingId || "",
          billNumber: result.data?.billNumber || `IPD-${Date.now()}`,
          balanceDue: finalBalance,
        }
        setInvoiceData(invoiceForPrint)
        setShowPrintModal(true)
      } else {
        toast.error(result.message || "Failed to process discharge")
      }
    })
  }

  function handlePrint() {
    if (invoiceData?.billingId) {
      router.push(`/dashboard/finance/billing/${invoiceData.billingId}?action=print`)
    }
  }

  function handleGoToDashboard() {
    router.push("/dashboard/ipd")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Section A: Clinical Summary */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-indigo-600" />
            Clinical Summary
          </CardTitle>
          <CardDescription>
            Discharge summary by the treating doctor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Discharge Type & Date/Time Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dischargeType">
                Discharge Type <span className="text-red-500">*</span>
              </Label>
              <Select name="dischargeType" required value={selectedTypeCode} onValueChange={setSelectedTypeCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discharge type" />
                </SelectTrigger>
                <SelectContent>
                  {dischargeTypes.length > 0 ? (
                    dischargeTypes.map(dt => (
                      <SelectItem key={dt.code} value={dt.code}>{dt.label}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="NORMAL">Normal Discharge</SelectItem>
                      <SelectItem value="LAMA">LAMA (Left Against Medical Advice)</SelectItem>
                      <SelectItem value="ABSCONDED">Absconded</SelectItem>
                      <SelectItem value="DEATH">Death</SelectItem>
                      <SelectItem value="REFERRED">Referred to Another Hospital</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {selectedType?.description && (
                <p className="text-xs text-muted-foreground">{selectedType.description}</p>
              )}
              {selectedType?.headerNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mt-1">
                  <p className="text-xs font-semibold text-amber-800">{selectedType.headerNote}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dischargeDate">
                  Discharge Date & Time <span className="text-red-500">*</span>
                </Label>
                <span className="text-xs text-indigo-700 bg-indigo-50 font-semibold px-2 py-0.5 rounded-full">
                  Stay: {isNaN(calculatedDays) ? daysAdmitted : calculatedDays} day{calculatedDays === 1 ? "" : "s"}
                </span>
              </div>
              <Input
                id="dischargeDate"
                name="dischargeDate"
                type="datetime-local"
                value={dischargeDate}
                min={minDischargeDate}
                max={maxDischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Backdating supported. Minimum date: {admissionDate ? new Date(admissionDate).toLocaleDateString("en-IN") : "Admission Date"}.
              </p>
            </div>
          </div>

          {selectedType?.templateSections && selectedType.templateSections.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {selectedType.templateSections.map((section: any) => (
                <div key={section.sectionKey} className="space-y-2">
                  <Label htmlFor={section.sectionKey}>
                    {section.sectionLabel} {section.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id={section.sectionKey}
                    name={section.sectionKey}
                    placeholder={section.placeholder || `Enter ${section.sectionLabel.toLowerCase()}...`}
                    rows={2}
                    required={section.required}
                    defaultValue={
                      initialData[section.sectionKey] || 
                      initialData.customDischargeData?.[section.sectionKey] || 
                      ""
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finalDiagnosis">
                  Final Diagnosis <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="finalDiagnosis"
                  name="finalDiagnosis"
                  placeholder="e.g., Pneumonia with pleural effusion"
                  defaultValue={initialData?.finalDiagnosis}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseInHospital">
                  Course in Hospital <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="courseInHospital"
                  name="courseInHospital"
                  placeholder="Treatment given during stay..."
                  defaultValue={initialData?.courseInHospital}
                  rows={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditionAtDischarge">
                  Condition at Discharge <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="conditionAtDischarge"
                  name="conditionAtDischarge"
                  placeholder="Patient condition, vitals stable..."
                  defaultValue={initialData?.conditionAtDischarge}
                  rows={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adviceOnDischarge">
                  Advice on Discharge <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="adviceOnDischarge"
                  name="adviceOnDischarge"
                  placeholder="Medications, diet, activity restrictions..."
                  defaultValue={initialData?.adviceOnDischarge}
                  rows={2}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="followUpDate">Follow-up Appointment</Label>
            <Input
              id="followUpDate"
              name="followUpDate"
              type="date"
              defaultValue={initialData?.followUpDate ? initialData.followUpDate.split("T")[0] : ""}
              min={new Date().toISOString().split("T")[0]}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section B: Settlement */}
      <Card className={`border-l-4 ${isBsky ? "border-l-green-500" : "border-l-emerald-500"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isBsky ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            )}
            {isBsky ? "BSKY Government Settlement" : "Settlement"}
          </CardTitle>
          <CardDescription>
            {isBsky
              ? "Cashless discharge — bill forwarded to Government Claims"
              : "Payment mode and final amount"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* BSKY Cashless Banner */}
          {isBsky && (
            <Alert className="border-green-300 bg-green-50">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>BSKY Beneficiary — Cashless Discharge.</strong> Bill will be forwarded to the Government. No payment required from the patient.
              </AlertDescription>
            </Alert>
          )}

          {/* Compact Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {hasInsuranceCoverage && insuranceCoveredAmount > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Less: Insurance Coverage</span>
                <span className="font-medium">-₹{insuranceCoveredAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-green-600">
              <span>Less: Advance Deposit</span>
              <span className="font-medium">-₹{advanceDeposit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {!isBsky && additionalDiscount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Less: Additional Discount</span>
                <span className="font-medium">-₹{additionalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>
                {isBsky
                  ? "Government Claim Amount"
                  : isRefund
                    ? "Refund to Patient"
                    : finalBalance === 0 && hasInsuranceCoverage
                      ? "Fully Covered by Insurance"
                      : "Amount to Collect"}
              </span>
              <span className={isBsky ? "text-green-700" : isRefund ? "text-green-700" : finalBalance === 0 ? "text-green-700" : "text-blue-900"}>
                ₹{(isBsky ? Math.max(0, netPayable) : isRefund ? refundAmount : finalBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Additional Discount & Payment Mode — hidden for BSKY and fully insured */}
          {!isBsky && !(finalBalance === 0 && hasInsuranceCoverage) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="additionalDiscount">Additional Discount (₹)</Label>
                <Input
                  id="additionalDiscount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotal}
                  value={additionalDiscount || ""}
                  onChange={(e) => setAdditionalDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Management discount or concession
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Payment Mode <span className="text-red-500">*</span>
                </Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex items-center gap-2">
                          <mode.icon className="h-4 w-4" />
                          {mode.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Separator />

          {/* File Handover Checkbox */}
          <div className="flex items-center space-x-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <Checkbox
              id="filesHandedOver"
              checked={filesHandedOver}
              onCheckedChange={(checked) => setFilesHandedOver(checked as boolean)}
            />
            <label
              htmlFor="filesHandedOver"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <span className="text-red-500">*</span> File Handover Completed
              <p className="text-xs text-muted-foreground font-normal mt-1">
                Confirm that all reports, X-rays, MRI films, and documents have been returned to the patient
              </p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !filesHandedOver}
          size="lg"
          className={`${isBsky ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"} px-8`}
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {!isPending && (isBsky ? <ShieldCheck className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />)}
          {isBsky ? "Discharge & Forward Claim" : "Settle & Discharge"}
        </Button>
      </div>

      {!filesHandedOver && (
        <p className="text-sm text-red-500 text-center -mt-3">
          Please confirm file handover before discharge
        </p>
      )}

      {/* Success Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              {isBsky ? "BSKY Discharge Successful!" : "Discharge Successful!"}
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              {isBsky
                ? `Patient has been discharged under BSKY. Bed ${bedNumber} is now available. Claim forwarded to Government.`
                : `Patient has been discharged. Bed ${bedNumber} is now available.`}
            </DialogDescription>
          </DialogHeader>

          {invoiceData && (
            <div className="space-y-4 my-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Bill Number:</span>
                  <span className="font-bold text-blue-900">{invoiceData.billNumber}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {isBsky ? "Settlement:" : "Payment Mode:"}
                  </span>
                  <span className="font-semibold">
                    {isBsky ? "BSKY Government Claim" : paymentMode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {isBsky
                      ? "Claim Amount:"
                      : invoiceData.balanceDue > 0
                        ? "Amount Collected:"
                        : "Refund Amount:"}
                  </span>
                  <span className={`text-xl font-bold ${
                    isBsky ? "text-green-600" : invoiceData.balanceDue > 0 ? "text-blue-600" : "text-green-600"
                  }`}>
                    ₹{(isBsky
                      ? subtotal
                      : invoiceData.balanceDue > 0
                        ? invoiceData.balanceDue
                        : Math.abs(invoiceData.balanceDue)
                    ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handlePrint}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Printer className="h-5 w-5 mr-2" />
                  Print Final Bill
                </Button>
                <Button
                  onClick={handleGoToDashboard}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Home className="h-5 w-5 mr-2" />
                  IPD Dashboard
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </form>
  )
}
