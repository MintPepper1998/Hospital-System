"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Save, Loader2, FileText, Activity, Clock, BedDouble, Scissors,
  AlertTriangle, ChevronDown, ChevronUp, Stethoscope, ExternalLink, FileCheck
} from "lucide-react"
import { toast } from "sonner"
import { saveConsultation } from "@/lib/actions"
import { useRouter } from "next/navigation"
import PrescriptionWriter, { type Medication } from "@/components/clinical/prescription-writer"
import LabTestSelector, { type LabTest } from "@/components/clinical/lab-test-selector"
import { LabResultsViewer, type LabRequestWithResults } from "@/components/clinical/lab-results-viewer"
import { PaperOPDDialog } from "@/components/clinical/paper-opd-dialog"

interface ConsultationManagerProps {
  appointmentId: string
  patientName?: string
  patientPhone?: string | null
  isPaperConsultation?: boolean
  scannedPaperUrl?: string | null
  initialData?: {
    chiefComplaint?: string
    diagnosis?: string
    symptoms?: string
    notes?: string
    bloodPressure?: string
    pulse?: string
    temperature?: string
    weight?: string
    height?: string
    spo2?: string
    vitalsTakenBy?: string
  }
  initialMedicines?: Medication[]
  availableLabTests?: LabTest[]
  labResults?: LabRequestWithResults[]
  appointmentStatus?: string
}

export function ConsultationManager({
  appointmentId,
  patientName = "Patient",
  patientPhone,
  isPaperConsultation = false,
  scannedPaperUrl,
  initialData,
  initialMedicines,
  availableLabTests,
  labResults,
  appointmentStatus,
}: ConsultationManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Vitals State
  const [bloodPressure, setBloodPressure] = useState(initialData?.bloodPressure || "")
  const [pulse, setPulse] = useState(initialData?.pulse || "")
  const [temperature, setTemperature] = useState(initialData?.temperature || "")
  const [weight, setWeight] = useState(initialData?.weight || "")
  const [height, setHeight] = useState(initialData?.height || "")
  const [spo2, setSpo2] = useState(initialData?.spo2 || "")

  const vitalsPreFilled = !!(initialData?.vitalsTakenBy)

  // Clinical State
  const [chiefComplaint, setChiefComplaint] = useState(initialData?.chiefComplaint || "")
  const [diagnosis, setDiagnosis] = useState(initialData?.diagnosis || "")
  const [symptoms, setSymptoms] = useState(initialData?.symptoms || "")
  const [notes, setNotes] = useState(initialData?.notes || "")

  // Medicines State - controlled by this component
  const [medicines, setMedicines] = useState<Medication[]>(initialMedicines || [])

  // SEPARATE Lab Tests State - Pathology and Radiology
  const [pathologyTests, setPathologyTests] = useState<LabTest[]>([])
  const [radiologyTests, setRadiologyTests] = useState<LabTest[]>([])

  // Hold for reports
  const [waitingForReports, setWaitingForReports] = useState(false)

  // ── Doctor's Advisory State ──
  const [advisedAdmission, setAdvisedAdmission] = useState(false)
  const [admissionReason, setAdmissionReason] = useState("")
  const [admissionNotes, setAdmissionNotes] = useState("")

  const [advisedSurgery, setAdvisedSurgery] = useState(false)
  const [advisedSurgeryName, setAdvisedSurgeryName] = useState("")
  const [surgeryUrgency, setSurgeryUrgency] = useState("ELECTIVE")
  const [surgeryNotes, setSurgeryNotes] = useState("")

  const [advisoryExpanded, setAdvisoryExpanded] = useState(false)

  // Handle Save - calls the server action
  const handleSave = async () => {
    // Validation
    if (!diagnosis.trim()) {
      toast.error("Please enter a diagnosis before saving.")
      return
    }

    // Validate advisory fields
    if (advisedAdmission && !admissionReason.trim()) {
      toast.error("Please provide a reason for IPD admission recommendation.")
      return
    }
    if (advisedSurgery && !advisedSurgeryName.trim()) {
      toast.error("Please specify the recommended surgery/procedure name.")
      return
    }

    // Filter out empty medicine rows
    const validMedicines = medicines.filter(m => m.medicationName.trim())

    startTransition(async () => {
      try {
        const result = await saveConsultation({
          appointmentId,
          // Vitals
          bloodPressure,
          pulse,
          temperature,
          weight,
          spo2,
          // Clinical
          chiefComplaint,
          symptoms,
          diagnosis,
          notes,
          // Medicines
          medications: validMedicines.map(m => ({
            medicationName: m.medicationName,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            quantity: m.quantity,
            instructions: m.instructions
          })),
          // SEPARATE Lab Tests arrays - include full test info for reliable creation
          pathologyTests: pathologyTests.map(t => ({
            id: t.id,
            name: t.name,
            code: t.code,
            price: t.price,
          })),
          radiologyTests: radiologyTests.map(t => ({
            id: t.id,
            name: t.name,
            code: t.code,
            price: t.price,
          })),
          waitingForReports,
          // Doctor's Advisory — IPD Admission
          advisedAdmission,
          admissionReason: advisedAdmission ? admissionReason : undefined,
          admissionNotes: advisedAdmission ? admissionNotes : undefined,
          // Doctor's Advisory — Surgery
          advisedSurgery,
          advisedSurgeryName: advisedSurgery ? advisedSurgeryName : undefined,
          surgeryUrgency: advisedSurgery ? surgeryUrgency : undefined,
          surgeryNotes: advisedSurgery ? surgeryNotes : undefined,
        })

        if (result.success) {
          if (waitingForReports) {
            toast.success("Consultation saved — patient held for reports.")
            router.push("/dashboard/clinical/emr")
          } else {
            toast.success("Consultation saved!")
            router.push(`/dashboard/clinical/emr/${appointmentId}/print`)
          }
        } else {
          toast.error(result.message || "Failed to save consultation")
        }
      } catch (error) {
        console.error("Error saving consultation:", error)
        toast.error("An error occurred while saving. Please try again.")
      }
    })
  }

  // Calculate totals for display
  const pathologyTotal = pathologyTests.reduce((sum, t) => sum + t.price, 0)
  const radiologyTotal = radiologyTests.reduce((sum, t) => sum + t.price, 0)
  const totalLabCost = pathologyTotal + radiologyTotal

  return (
    <div className="space-y-6">
      {/* Treated on Paper Option Banner */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-zinc-800">
                  {isPaperConsultation ? "Consultation Conducted on Physical OPD Paper" : "Treated on Physical OPD Paper?"}
                </h4>
                <Badge variant="outline" className="text-[10px] bg-amber-100/70 text-amber-800 border-amber-300">
                  {isPaperConsultation ? "Paper Record Attached" : "Alternative Workflow"}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {isPaperConsultation
                  ? "This consultation was completed using physical paper prescription notes."
                  : "If you examined this patient and wrote the prescription on paper, upload the scanned sheet and complete directly without typing digital prescriptions."}
              </p>
              {scannedPaperUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={scannedPaperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-zinc-50 text-blue-600 border border-zinc-200 rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Scanned Paper
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <PaperOPDDialog
              appointmentId={appointmentId}
              patientName={patientName}
              patientPhone={patientPhone}
              existingScanUrl={scannedPaperUrl}
              isCompleted={isPaperConsultation}
              triggerLabel={isPaperConsultation ? "Update Paper Scan" : "Done on Paper"}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold border-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vitals Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Vitals
            {vitalsPreFilled && (
              <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                ✓ Recorded by {initialData?.vitalsTakenBy}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bp" className="text-xs">Blood Pressure</Label>
              <Input
                id="bp"
                placeholder="120/80"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pulse" className="text-xs">Pulse (bpm)</Label>
              <Input
                id="pulse"
                placeholder="72"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temp" className="text-xs">Temp (°F)</Label>
              <Input
                id="temp"
                placeholder="98.6"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-xs">Weight (kg)</Label>
              <Input
                id="weight"
                placeholder="70"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height" className="text-xs">Height (cm)</Label>
              <Input
                id="height"
                placeholder="170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spo2" className="text-xs">SpO2 (%)</Label>
              <Input
                id="spo2"
                placeholder="99"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lab Results Section — shown when reports are available */}
      {labResults && labResults.length > 0 && (
        <LabResultsViewer labResults={labResults} />
      )}

      {/* Clinical Assessment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Clinical Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="complaint">Chief Complaint</Label>
            <Textarea
              id="complaint"
              placeholder="e.g., Fever since last night, headache for 3 days"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="symptoms">Symptoms</Label>
            <Textarea
              id="symptoms"
              placeholder="List of symptoms observed..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis *</Label>
            <Input
              id="diagnosis"
              placeholder="e.g., Upper Respiratory Tract Infection"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Doctor's Notes</Label>
            <Textarea
              id="notes"
              placeholder="Private notes for future reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prescription Writer - passes state down */}
      <PrescriptionWriter
        medications={medicines}
        onMedicationsChange={setMedicines}
      />

      {/* Lab Tests - TWO SEPARATE SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pathology Tests (Blood, Urine, etc.) */}
        <LabTestSelector
          selectedTests={pathologyTests}
          onTestsChange={setPathologyTests}
          availableTests={availableLabTests?.filter(t => t.type === "PATHOLOGY")}
          filterType="PATHOLOGY"
          icon="pathology"
        />

        {/* Radiology Tests (X-Ray, CT, MRI, Ultrasound) */}
        <LabTestSelector
          selectedTests={radiologyTests}
          onTestsChange={setRadiologyTests}
          availableTests={availableLabTests?.filter(t => t.type === "RADIOLOGY")}
          filterType="RADIOLOGY"
          icon="radiology"
        />
      </div>

      {/* Total Lab Cost Summary */}
      {totalLabCost > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-dashed">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-6">
                {pathologyTotal > 0 && (
                  <span className="text-sm text-blue-700">
                    🔬 Pathology: ₹{pathologyTotal.toLocaleString()}
                  </span>
                )}
                {radiologyTotal > 0 && (
                  <span className="text-sm text-purple-700">
                    ☢️ Radiology: ₹{radiologyTotal.toLocaleString()}
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-green-600">
                Total Lab Cost: ₹{totalLabCost.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Doctor's Advisory — IPD Admission & Surgery Recommendation ── */}
      <Card className={`transition-all duration-300 ${(advisedAdmission || advisedSurgery) ? "border-amber-300 ring-1 ring-amber-200 bg-amber-50/30" : "border-dashed"}`}>
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setAdvisoryExpanded(!advisoryExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-5 w-5 text-amber-600" />
              Doctor&apos;s Advisory
              {(advisedAdmission || advisedSurgery) && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                  {[advisedAdmission && "IPD", advisedSurgery && "OT"].filter(Boolean).join(" + ")} ADVISED
                </Badge>
              )}
            </CardTitle>
            {advisoryExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {!advisoryExpanded && (
            <p className="text-xs text-muted-foreground mt-1 ml-7">
              Recommend IPD admission or operation/surgery if needed
            </p>
          )}
        </CardHeader>

        {advisoryExpanded && (
          <CardContent className="space-y-6 pt-0">
            {/* Toggle Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IPD Admission Toggle Card */}
              <div className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${advisedAdmission ? "border-blue-400 bg-blue-50/80 shadow-md shadow-blue-100" : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"}`}
                onClick={() => setAdvisedAdmission(!advisedAdmission)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${advisedAdmission ? "bg-blue-500 shadow-lg shadow-blue-200" : "bg-gray-100"}`}>
                      <BedDouble className={`h-5 w-5 ${advisedAdmission ? "text-white" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${advisedAdmission ? "text-blue-900" : "text-gray-700"}`}>
                        Admit to IPD
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Recommend in-patient admission
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={advisedAdmission}
                    onCheckedChange={setAdvisedAdmission}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* OT / Surgery Toggle Card */}
              <div className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${advisedSurgery ? "border-rose-400 bg-rose-50/80 shadow-md shadow-rose-100" : "border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50/30"}`}
                onClick={() => setAdvisedSurgery(!advisedSurgery)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${advisedSurgery ? "bg-rose-500 shadow-lg shadow-rose-200" : "bg-gray-100"}`}>
                      <Scissors className={`h-5 w-5 ${advisedSurgery ? "text-white" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${advisedSurgery ? "text-rose-900" : "text-gray-700"}`}>
                        Recommend Surgery
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Advise operation / procedure
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={advisedSurgery}
                    onCheckedChange={setAdvisedSurgery}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>

            {/* ── IPD Admission Details Form ── */}
            {advisedAdmission && (
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-5 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <BedDouble className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-blue-900">IPD Admission Details</h4>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[9px] ml-auto">REQUIRED</Badge>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admissionReason" className="text-xs font-semibold text-blue-800">
                    Reason for Admission *
                  </Label>
                  <Textarea
                    id="admissionReason"
                    placeholder="e.g., Patient requires IV antibiotics for severe pneumonia, needs monitoring for respiratory distress..."
                    value={admissionReason}
                    onChange={(e) => setAdmissionReason(e.target.value)}
                    rows={2}
                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admissionNotes" className="text-xs font-semibold text-blue-800">
                    Additional Notes
                  </Label>
                  <Textarea
                    id="admissionNotes"
                    placeholder="Treatment plan, expected duration of stay, special instructions, ward preference (ICU/General/Private), diet restrictions..."
                    value={admissionNotes}
                    onChange={(e) => setAdmissionNotes(e.target.value)}
                    rows={3}
                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-100/60 text-blue-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    This will flag the patient for IPD admission. The reception/IPD desk will see this advisory and can proceed with bed assignment and formal admission.
                  </p>
                </div>
              </div>
            )}

            {/* ── Surgery / Operation Details Form ── */}
            {advisedSurgery && (
              <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/80 to-white p-5 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <Scissors className="h-4 w-4 text-rose-600" />
                  <h4 className="text-sm font-bold text-rose-900">Surgery / Procedure Details</h4>
                  <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[9px] ml-auto">REQUIRED</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surgeryName" className="text-xs font-semibold text-rose-800">
                      Surgery / Procedure Name *
                    </Label>
                    <Input
                      id="surgeryName"
                      placeholder="e.g., Appendectomy, Hernia Repair, CABG"
                      value={advisedSurgeryName}
                      onChange={(e) => setAdvisedSurgeryName(e.target.value)}
                      className="border-rose-200 focus:border-rose-400 focus:ring-rose-400/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surgeryUrgency" className="text-xs font-semibold text-rose-800">
                      Urgency Level
                    </Label>
                    <select
                      id="surgeryUrgency"
                      value={surgeryUrgency}
                      onChange={(e) => setSurgeryUrgency(e.target.value)}
                      className="w-full h-10 rounded-md border border-rose-200 bg-white px-3 text-sm focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20 outline-none"
                    >
                      <option value="ELECTIVE">Elective (Planned)</option>
                      <option value="URGENT">Urgent (Within 24-48 hours)</option>
                      <option value="EMERGENCY">Emergency (Immediate)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgeryNotes" className="text-xs font-semibold text-rose-800">
                    Procedure Details & Pre-operative Instructions
                  </Label>
                  <Textarea
                    id="surgeryNotes"
                    placeholder="Describe the procedure, pre-operative investigations needed, anesthesia type, estimated duration, special equipment required, patient preparation instructions..."
                    value={surgeryNotes}
                    onChange={(e) => setSurgeryNotes(e.target.value)}
                    rows={4}
                    className="border-rose-200 focus:border-rose-400 focus:ring-rose-400/20"
                  />
                </div>
                {surgeryUrgency === "EMERGENCY" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-100/80 text-red-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
                    <p className="text-[11px] leading-relaxed font-medium">
                      ⚠️ EMERGENCY: This case will be flagged as high-priority for the OT scheduling team. Immediate preparation will begin upon consultation completion.
                    </p>
                  </div>
                )}
                {surgeryUrgency !== "EMERGENCY" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-100/60 text-rose-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      The OT scheduling team will receive this recommendation and can schedule the procedure accordingly. Pre-Anaesthetic Checkup (PAC) will be initiated before surgery.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 justify-end flex-wrap">
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2 border transition-colors ${waitingForReports ? "bg-amber-50 border-amber-300" : "bg-muted/30 border-transparent"}`}>
          <Switch
            id="waitingForReports"
            checked={waitingForReports}
            onCheckedChange={setWaitingForReports}
          />
          <Label htmlFor="waitingForReports" className="cursor-pointer text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-600" />
            Patient will return with test reports today
          </Label>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.back()}
        >
          Cancel
        </Button>

        <PaperOPDDialog
          appointmentId={appointmentId}
          patientName={patientName}
          patientPhone={patientPhone}
          existingScanUrl={scannedPaperUrl}
          isCompleted={isPaperConsultation}
          triggerLabel={isPaperConsultation ? "Update Paper Scan" : "Done on Paper"}
          className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        />

        <Button
          onClick={handleSave}
          disabled={isPending}
          className={`min-w-[180px] text-white ${waitingForReports ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}`}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : waitingForReports ? (
            <>
              <Clock className="mr-2 h-4 w-4" />
              Save & Hold for Reports
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save & Complete
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default ConsultationManager
