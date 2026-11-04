"use client"

import { useState, useTransition, useEffect } from "react"
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
import { FileText, IndianRupee, Loader2, CheckCircle2, Printer, Home } from "lucide-react"
import { processDischarge } from "@/app/actions/discharge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PrintDischargeBill } from "./print-discharge-bill"

interface BillItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalAmount: number
}

interface InvoiceData {
  billNumber: string
  billDate: Date
  patientName: string
  patientAddress: string | null
  patientAge: number | null
  patientGender: string | null
  admissionDate: Date
  dischargeDate: Date
  daysAdmitted: number
  bedNumber: string
  wardName: string
  doctorName: string
  items: BillItem[]
  totalAmount: number
  discountAmount: number
  netAmount: number
  advancePaid: number
  balanceDue: number
  finalDiagnosis: string
}

interface TemplateSectionDef {
  sectionKey: string
  sectionLabel: string
  placeholder: string
  required: boolean
}

export interface DischargeTypeOption {
  id: string
  code: string
  label: string
  description: string | null
  templateSections: TemplateSectionDef[] | null
  headerNote: string | null
  footerNote: string | null
  requiresWitness: boolean
  requiresPolice: boolean
  showBilling: boolean
}

interface DischargeFormProps {
  admissionId: string
  patientName: string
  totalBedCharges: number
  totalLabCharges: number
  totalPharmacyCharges: number
  totalBillAmount: number
  amountPaid: number
  balanceDue: number
  existingReason: string
  existingDiagnosis: string
  dischargeTypes?: DischargeTypeOption[]
}

export function DischargeForm({
  admissionId,
  patientName,
  totalBedCharges,
  totalLabCharges,
  totalPharmacyCharges,
  totalBillAmount,
  amountPaid,
  balanceDue,
  existingReason,
  existingDiagnosis,
  dischargeTypes = [],
}: DischargeFormProps) {
  const router = useRouter()
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>("")
  const selectedType = dischargeTypes.find(dt => dt.code === selectedTypeCode)
  const [isPending, startTransition] = useTransition()
  const [additionalDiscount, setAdditionalDiscount] = useState(0)
  const [filesHandedOver, setFilesHandedOver] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)

  const finalBalance = Math.max(0, balanceDue - additionalDiscount)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Extract form fields
    const dischargeType = formData.get("dischargeType") as string
    const finalDiagnosis = formData.get("finalDiagnosis") as string
    const courseInHospital = formData.get("courseInHospital") as string
    const conditionAtDischarge = formData.get("conditionAtDischarge") as string
    const adviceOnDischarge = formData.get("adviceOnDischarge") as string
    const followUpDate = formData.get("followUpDate") as string

    const summary = [
      `Diagnosis: ${finalDiagnosis}`,
      `Course: ${courseInHospital}`,
      `Condition: ${conditionAtDischarge}`,
      `Advice: ${adviceOnDischarge}`,
      followUpDate ? `Follow-up: ${followUpDate}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")

    startTransition(async () => {
      const result = await processDischarge(admissionId, {
        dischargeType: (dischargeType || "NORMAL") as any,
        summary,
      })

      if (result.success) {
        toast.success(result.message)
        // Build minimal invoice data for the print modal from the result
        const invoiceDataForPrint = {
          billNumber: result.data?.billNumber || `IPD-${Date.now()}`,
          billDate: new Date(),
          patientName: patientName,
          patientAddress: null,
          patientAge: null,
          patientGender: null,
          admissionDate: new Date(),
          dischargeDate: new Date(),
          daysAdmitted: 0,
          bedNumber: "",
          wardName: "",
          doctorName: "",
          items: [],
          totalAmount: totalBillAmount,
          discountAmount: additionalDiscount,
          netAmount: totalBillAmount - additionalDiscount,
          advancePaid: amountPaid,
          balanceDue: finalBalance,
          finalDiagnosis,
        }
        setInvoiceData(invoiceDataForPrint as any)
        setShowPrintModal(true)
      } else {
        toast.error(result.message || "Failed to process discharge")
      }
    })
  }

  function handlePrint() {
    window.print()
  }

  function handleGoToDashboard() {
    router.push("/dashboard/ipd")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Section A: Clinical Summary */}
      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Section A: Clinical Summary (Doctor's Part)
          </CardTitle>
          <CardDescription>
            Complete discharge summary and follow-up instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Discharge Type */}
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

          {/* Final Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="finalDiagnosis">
              Final Diagnosis <span className="text-red-500">*</span>
            </Label>
            <Input
              id="finalDiagnosis"
              name="finalDiagnosis"
              placeholder="e.g., Pneumonia with pleural effusion, resolved"
              defaultValue={existingDiagnosis}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reason for Admission */}
            <div className="space-y-2">
              <Label htmlFor="reasonForAdmission">Reason for Admission</Label>
              <Textarea
                id="reasonForAdmission"
                name="reasonForAdmission"
                placeholder="Why was the patient admitted?"
                rows={3}
                defaultValue={existingReason}
              />
            </div>

            {/* Course in Hospital */}
            <div className="space-y-2">
              <Label htmlFor="courseInHospital">
                Course in Hospital <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="courseInHospital"
                name="courseInHospital"
                placeholder="Treatment given during stay, investigations performed..."
                rows={3}
                required
              />
            </div>

            {/* Condition at Discharge */}
            <div className="space-y-2">
              <Label htmlFor="conditionAtDischarge">
                Condition at Discharge <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="conditionAtDischarge"
                name="conditionAtDischarge"
                placeholder="Patient's current condition, vitals stable, able to walk..."
                rows={3}
                required
              />
            </div>

            {/* Advice on Discharge */}
            <div className="space-y-2">
              <Label htmlFor="adviceOnDischarge">
                Advice on Discharge <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="adviceOnDischarge"
                name="adviceOnDischarge"
                placeholder="Medications to continue, diet advice, activity restrictions..."
                rows={3}
                required
              />
            </div>
          </div>

          {/* Follow-up Date */}
          <div className="space-y-2">
            <Label htmlFor="followUpDate">Follow-up Appointment Date</Label>
            <Input
              id="followUpDate"
              name="followUpDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              Schedule next appointment for review
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Bill Settlement */}
      <Card>
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Section B: Bill Settlement (Accountant's Part)
          </CardTitle>
          <CardDescription>
            Final billing and payment details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Bill Breakdown (Read-only) */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bed Charges:</span>
              <span className="font-semibold">₹{totalBedCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lab Charges:</span>
              <span className="font-semibold">₹{totalLabCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pharmacy Charges:</span>
              <span className="font-semibold">₹{totalPharmacyCharges.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-bold">Subtotal:</span>
              <span className="font-bold">₹{totalBillAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Less: Initial Deposit:</span>
              <span className="font-semibold">-₹{amountPaid.toFixed(2)}</span>
            </div>
          </div>

          {/* Additional Discount */}
          <div className="space-y-2">
            <Label htmlFor="additionalDiscount">Additional Discount (Optional)</Label>
            <Input
              id="additionalDiscount"
              name="additionalDiscount"
              type="number"
              step="0.01"
              min="0"
              max={totalBillAmount}
              value={additionalDiscount}
              onChange={(e) => setAdditionalDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Management discount or concession
            </p>
          </div>

          {/* Final Balance Display */}
          <div className="bg-blue-100 p-4 rounded-lg border-2 border-blue-500">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-blue-900">Final Balance to Pay:</span>
              <span className="text-2xl font-bold text-blue-900">
                ₹{finalBalance.toFixed(2)}
              </span>
            </div>
            {balanceDue < 0 && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Deposit exceeds charges. Refund ₹{Math.abs(balanceDue).toFixed(2)} to patient.
              </p>
            )}
          </div>

          <Separator />

          {/* Indian Context: File Handover */}
          <div className="flex items-center space-x-2 bg-yellow-50 p-4 rounded-lg">
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

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
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
          className="bg-green-600 hover:bg-green-700"
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {!isPending && <CheckCircle2 className="h-4 w-4 mr-2" />}
          Generate Discharge & Release Bed
        </Button>
      </div>

      {!filesHandedOver && (
        <p className="text-sm text-red-500 text-center">
          ⚠️ Please confirm file handover before discharge
        </p>
      )}

      {/* Success Modal with Print Option */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Discharge Successful!
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Patient has been successfully discharged. The bed has been released and is now available for new admissions.
            </DialogDescription>
          </DialogHeader>

          {invoiceData && (
            <div className="space-y-4 my-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Bill Number:</span>
                  <span className="font-bold text-blue-900">{invoiceData.billNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {invoiceData.balanceDue > 0 ? 'Amount Due:' : 'Refund Amount:'}
                  </span>
                  <span className={`text-xl font-bold ${
                    invoiceData.balanceDue > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ₹{Math.abs(invoiceData.balanceDue).toFixed(2)}
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
                  Go to Dashboard
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                💡 Tip: You can also print this bill later from the patient's billing history.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden Print Component */}
      {invoiceData && (
        <PrintDischargeBill
          billNumber={invoiceData.billNumber}
          billDate={invoiceData.billDate}
          patientName={invoiceData.patientName}
          patientAddress={invoiceData.patientAddress}
          patientAge={invoiceData.patientAge}
          patientGender={invoiceData.patientGender}
          admissionDate={invoiceData.admissionDate}
          dischargeDate={invoiceData.dischargeDate}
          daysAdmitted={invoiceData.daysAdmitted}
          bedNumber={invoiceData.bedNumber}
          wardName={invoiceData.wardName}
          doctorName={invoiceData.doctorName}
          items={invoiceData.items}
          totalAmount={invoiceData.totalAmount}
          discountAmount={invoiceData.discountAmount}
          netAmount={invoiceData.netAmount}
          advancePaid={invoiceData.advancePaid}
          balanceDue={invoiceData.balanceDue}
          finalDiagnosis={invoiceData.finalDiagnosis}
        />
      )}
    </form>
  )
}
