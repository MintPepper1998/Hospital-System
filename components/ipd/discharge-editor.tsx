"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  Save,
  Printer,
  Loader2,
  CheckCircle2,
  Stethoscope,
  ClipboardList,
  Pill,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  FileSignature,
  Upload,
} from "lucide-react"
import { saveDischargeSummary } from "@/app/actions/discharge-summary"
import { MedicineStockSearch } from "@/components/pharmacy/medicine-stock-search"
import { SignatureUploadDialog } from "@/components/ipd/signature-upload-dialog"
import { toast } from "sonner"
import Link from "next/link"

// Helper functions to resolve section fields dynamically across custom and standard configurations
function resolveDiagnosisField(dyn: Record<string, string>, fallback: string): string {
  if (dyn.finalDiagnosis?.trim()) return dyn.finalDiagnosis.trim()
  if (dyn.disease?.trim()) return dyn.disease.trim()
  if (dyn.DISEASE?.trim()) return dyn.DISEASE.trim()
  if (dyn.diagnosis?.trim()) return dyn.diagnosis.trim()
  if (dyn.provisionalDiagnosis?.trim()) return dyn.provisionalDiagnosis.trim()
  for (const [k, v] of Object.entries(dyn)) {
    const key = k.trim().toLowerCase()
    if ((key.includes("diag") || key.includes("disease")) && v?.trim()) {
      return v.trim()
    }
  }
  if (fallback?.trim()) return fallback.trim()
  for (const v of Object.values(dyn)) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return ""
}

function resolveTreatmentField(dyn: Record<string, string>, fallback: string): string {
  if (dyn.treatmentGiven?.trim()) return dyn.treatmentGiven.trim()
  for (const [k, v] of Object.entries(dyn)) {
    const key = k.trim().toLowerCase()
    if (key.includes("treat") && key.includes("given") && v?.trim()) {
      return v.trim()
    }
  }
  for (const [k, v] of Object.entries(dyn)) {
    const key = k.trim().toLowerCase()
    if (key.includes("treatment") && !key.includes("discharge") && v?.trim()) {
      return v.trim()
    }
  }
  return fallback?.trim() || ""
}

function resolveAdviceField(dyn: Record<string, string>, fallback: string): string {
  if (dyn.adviceOnDischarge?.trim()) return dyn.adviceOnDischarge.trim()
  for (const [k, v] of Object.entries(dyn)) {
    const key = k.trim().toLowerCase()
    if ((key.includes("advice") || (key.includes("treat") && key.includes("discharge"))) && v?.trim()) {
      return v.trim()
    }
  }
  return fallback?.trim() || ""
}

function resolveConditionField(dyn: Record<string, string>, fallback: string): string {
  if (dyn.conditionAtDischarge?.trim()) return dyn.conditionAtDischarge.trim()
  for (const [k, v] of Object.entries(dyn)) {
    const key = k.trim().toLowerCase()
    if (key.includes("condition") && v?.trim()) {
      return v.trim()
    }
  }
  return fallback?.trim() || ""
}

function resolveCourseField(dyn: Record<string, string>, fallback: string): string {
  if (dyn.courseInHospital?.trim()) return dyn.courseInHospital.trim()
  for (const [k, v] of Object.entries(dyn)) {
    const key = k.trim().toLowerCase()
    if (key.includes("course") && v?.trim()) {
      return v.trim()
    }
  }
  return fallback?.trim() || ""
}

function resolveProceduresField(dyn: Record<string, string>, fallback: string): string {
  if (dyn.proceduresDone?.trim()) return dyn.proceduresDone.trim()
  for (const [k, v] of Object.entries(dyn)) {
    const key = k.trim().toLowerCase()
    if ((key.includes("proc") || key.includes("surger")) && v?.trim()) {
      return v.trim()
    }
  }
  return fallback?.trim() || ""
}

interface DischargeMedicineRow {
  key: string // client-side React key
  dbId?: string // real DischargeMedicine id (undefined = new row)
  medicineId: string | null // pharmacy Medicine id — required for new/pending rows
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instruction: string
  pharmacyStatus: string // PENDING | DISPENSED | CANCELLED
  availableStock?: number // from last search selection (display only)
}

const newKey = () => Math.random().toString(36).substring(2, 9)

interface DischargeEditorProps {
  admissionId?: string
  emergencyVisitId?: string
  admissionStatus: string
  doctorName: string
  // Pre-filled values (from saved draft)
  initialData?: {
    finalDiagnosis?: string | null
    proceduresDone?: string | null
    courseInHospital?: string | null
    treatmentGiven?: string | null
    conditionAtDischarge?: string | null
    adviceOnDischarge?: string | null
    followUpDate?: string | null
    dischargeDoctorId?: string | null
    dischargeSignatoryId?: string | null
    dischargeTypeCode?: string | null
    customDischargeData?: any
    dischargeMedicines?: {
      id?: string
      medicineId?: string | null
      medicineName: string
      dosage: string
      frequency: string
      duration: string
      quantity: number
      instruction?: string | null
      pharmacyStatus?: string
    }[]
  }
  // Medications list for auto-populating treatment
  activeMedications?: {
    medicineName: string
    dosage: string
    frequency: string
    duration: string
    instruction: string | null
  }[]
  dischargeTypes?: any[]
  assignedDoctors?: {
    id: string
    name: string
    department?: string | null
    specialization?: string | null
    signatureUrl?: string | null
    isPrimary?: boolean
    roleLabel?: string
  }[]
  ipdSignatories?: {
    id: string
    name: string
    department?: string | null
    designation?: string | null
    signatureUrl?: string | null
    hasSignature?: boolean
  }[]
}

export function DischargeEditor({
  admissionId,
  emergencyVisitId,
  admissionStatus,
  doctorName,
  initialData,
  activeMedications = [],
  dischargeTypes = [],
  assignedDoctors = [],
  ipdSignatories = [],
}: DischargeEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // Form state — pre-filled from saved draft
  const [finalDiagnosis, setFinalDiagnosis] = useState(initialData?.finalDiagnosis || "")
  const [proceduresDone, setProceduresDone] = useState(initialData?.proceduresDone || "")
  const [courseInHospital, setCourseInHospital] = useState(initialData?.courseInHospital || "")
  const [treatmentGiven, setTreatmentGiven] = useState(initialData?.treatmentGiven || "")
  const [conditionAtDischarge, setConditionAtDischarge] = useState(initialData?.conditionAtDischarge || "")
  const [adviceOnDischarge, setAdviceOnDischarge] = useState(initialData?.adviceOnDischarge || "")
  const [followUpDate, setFollowUpDate] = useState(
    initialData?.followUpDate ? initialData.followUpDate.split("T")[0] : ""
  )
  
  // Dynamic doctor and signatory state to reflect live signature uploads
  const [doctorsList, setDoctorsList] = useState(assignedDoctors)
  const [signatoriesList, setSignatoriesList] = useState(ipdSignatories)

  // Upload dialog state
  const [uploadTarget, setUploadTarget] = useState<{
    open: boolean
    staffId?: string
    name: string
    roleLabel: string
    currentSig?: string | null
    type: "DOCTOR" | "SIGNATORY"
  }>({
    open: false,
    name: "",
    roleLabel: "",
    type: "DOCTOR",
  })

  // Dynamic Configuration
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>(
    initialData?.dischargeTypeCode || dischargeTypes[0]?.code || "NORMAL"
  )
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>(
    initialData?.customDischargeData || {}
  )

  // Signatures configuration
  const defaultDocId =
    initialData?.dischargeDoctorId && doctorsList.some((d) => d.id === initialData.dischargeDoctorId)
      ? initialData.dischargeDoctorId
      : doctorsList[0]?.id || ""

  const defaultSigId =
    initialData?.dischargeSignatoryId && signatoriesList.some((s) => s.id === initialData.dischargeSignatoryId)
      ? initialData.dischargeSignatoryId
      : signatoriesList[0]?.id || "none"

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(defaultDocId)
  const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>(defaultSigId)

  const curDoc = doctorsList.find((d) => d.id === selectedDoctorId) || doctorsList[0] || null
  const curSig = selectedSignatoryId === "none" ? null : signatoriesList.find((s) => s.id === selectedSignatoryId) || null
  const selectedType = dischargeTypes.find(dt => dt.code === selectedTypeCode)

  // Discharge Medicines State (keeps the real DB id so saves never duplicate rows)
  const [dischargeMedicines, setDischargeMedicines] = useState<DischargeMedicineRow[]>(
    (initialData?.dischargeMedicines || []).map((m) => ({
      key: newKey(),
      dbId: m.id,
      medicineId: m.medicineId ?? null,
      medicineName: m.medicineName,
      dosage: m.dosage || "",
      frequency: m.frequency || "",
      duration: m.duration || "",
      quantity: m.quantity || 1,
      instruction: m.instruction || "",
      pharmacyStatus: m.pharmacyStatus || "PENDING",
    }))
  )

  // Once discharged, the medicine list is locked (pharmacy charges must be final before payment)
  const medicinesLocked = admissionStatus === "DISCHARGED"
  const isRowEditable = (m: DischargeMedicineRow) => !medicinesLocked && m.pharmacyStatus === "PENDING"

  const addDischargeMedicine = () => {
    setDischargeMedicines((prev) => [...prev, {
      key: newKey(),
      medicineId: null,
      medicineName: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: 1,
      instruction: "",
      pharmacyStatus: "PENDING",
    }])
  }

  const removeDischargeMedicine = (key: string) => {
    setDischargeMedicines((prev) => prev.filter(m => m.key !== key))
  }

  const updateDischargeMedicine = (key: string, patch: Partial<DischargeMedicineRow>) => {
    setDischargeMedicines((prev) => prev.map(m =>
      m.key === key ? { ...m, ...patch } : m
    ))
  }

  const pendingRows = dischargeMedicines.filter(m => m.pharmacyStatus === "PENDING")
  const unselectedRow = pendingRows.find(m => !m.medicineId)
  const invalidQtyRow = pendingRows.find(m => !Number.isInteger(m.quantity) || m.quantity < 1)

  // Auto-populate treatment from active medications
  const handleAutoFillTreatment = () => {
    if (activeMedications.length === 0) {
      toast.info("No active medications found for this patient")
      return
    }
    const medSummary = activeMedications
      .map(
        (m, i) =>
          `${i + 1}. ${m.medicineName} ${m.dosage} — ${m.frequency} for ${m.duration}${
            m.instruction ? ` (${m.instruction})` : ""
          }`
      )
      .join("\n")
    setTreatmentGiven(medSummary)
    toast.success("Treatment summary auto-filled from active medications")
  }

  // Resolve dynamic section value across aliases and fallback standard fields
  const getSectionValue = (sectionKey: string): string => {
    if (dynamicValues[sectionKey] !== undefined) return dynamicValues[sectionKey]
    const trimmed = sectionKey.trim()
    if (dynamicValues[trimmed] !== undefined) return dynamicValues[trimmed]

    const lower = trimmed.toLowerCase()
    if (lower.includes("diag") || lower.includes("disease")) {
      return dynamicValues.disease || dynamicValues.finalDiagnosis || finalDiagnosis || ""
    }
    if (lower.includes("treat") && lower.includes("given")) {
      return dynamicValues["treatement given "] || dynamicValues.treatmentGiven || treatmentGiven || ""
    }
    if (lower.includes("treat") && lower.includes("discharge")) {
      return dynamicValues["treatement on discharge "] || dynamicValues.treatmentOnDischarge || dynamicValues.adviceOnDischarge || adviceOnDischarge || ""
    }
    if (lower.includes("advice")) {
      return dynamicValues.adviceOnDischarge || adviceOnDischarge || ""
    }
    if (lower.includes("condition")) {
      return dynamicValues.conditionAtDischarge || conditionAtDischarge || ""
    }
    if (lower.includes("course")) {
      return dynamicValues.courseInHospital || courseInHospital || ""
    }
    if (lower.includes("proc") || lower.includes("surger")) {
      return dynamicValues.proceduresDone || proceduresDone || ""
    }
    return ""
  }

  const handleSaveDraft = () => {
    const resolvedDiag = resolveDiagnosisField(dynamicValues, finalDiagnosis)
    const resolvedTreatment = resolveTreatmentField(dynamicValues, treatmentGiven)
    const resolvedAdvice = resolveAdviceField(dynamicValues, adviceOnDischarge)
    const resolvedCondition = resolveConditionField(dynamicValues, conditionAtDischarge)
    const resolvedCourse = resolveCourseField(dynamicValues, courseInHospital)
    const resolvedProcedures = resolveProceduresField(dynamicValues, proceduresDone)

    // Ensure dynamicValues also has standard keys synced
    const payloadDynamic = selectedType?.templateSections ? { ...dynamicValues } : undefined
    if (payloadDynamic) {
      if (!payloadDynamic.finalDiagnosis && resolvedDiag) payloadDynamic.finalDiagnosis = resolvedDiag
      if (payloadDynamic.disease && !payloadDynamic.finalDiagnosis) payloadDynamic.finalDiagnosis = payloadDynamic.disease
      if (!payloadDynamic.treatmentGiven && resolvedTreatment) payloadDynamic.treatmentGiven = resolvedTreatment
      if (!payloadDynamic.adviceOnDischarge && resolvedAdvice) payloadDynamic.adviceOnDischarge = resolvedAdvice
      if (!payloadDynamic.conditionAtDischarge && resolvedCondition) payloadDynamic.conditionAtDischarge = resolvedCondition
      if (!payloadDynamic.courseInHospital && resolvedCourse) payloadDynamic.courseInHospital = resolvedCourse
      if (!payloadDynamic.proceduresDone && resolvedProcedures) payloadDynamic.proceduresDone = resolvedProcedures
    }

    setSaved(false)
    startTransition(async () => {
      const result = await saveDischargeSummary({ admissionId, emergencyVisitId }, {
        dischargeTypeCode: selectedTypeCode,
        customDischargeData: payloadDynamic,
        finalDiagnosis: resolvedDiag || finalDiagnosis || "Discharged in stable condition",
        proceduresDone: resolvedProcedures || undefined,
        courseInHospital: resolvedCourse || undefined,
        treatmentGiven: resolvedTreatment || undefined,
        conditionAtDischarge: resolvedCondition || undefined,
        adviceOnDischarge: resolvedAdvice || undefined,
        followUpDate: followUpDate || null,
        dischargeDoctorId: selectedDoctorId || null,
        dischargeSignatoryId: selectedSignatoryId === "none" ? null : selectedSignatoryId,
        // Only send medicines for IPD, and only when not locked. Dispensed/cancelled rows are
        // sent with their id so the server knows they still exist, but it never modifies them.
        dischargeMedicines: admissionId && !medicinesLocked
          ? dischargeMedicines.map((m) => ({
              id: m.dbId,
              medicineId: m.medicineId,
              medicineName: m.medicineName,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              quantity: m.quantity,
              instruction: m.instruction || undefined,
            }))
          : undefined,
      })

      if (result.success) {
        toast.success(result.message)
        setSaved(true)
        // Replace local rows with the server's saved rows so every row now carries its real DB id.
        if (result.dischargeMedicines) {
          setDischargeMedicines(result.dischargeMedicines.map((m) => ({
            key: newKey(),
            dbId: m.id,
            medicineId: m.medicineId,
            medicineName: m.medicineName,
            dosage: m.dosage || "",
            frequency: m.frequency || "",
            duration: m.duration || "",
            quantity: m.quantity || 1,
            instruction: m.instruction || "",
            pharmacyStatus: m.pharmacyStatus,
          })))
        }
        setTimeout(() => setSaved(false), 3000)
      } else {
        toast.error(result.message || "Failed to save")
      }
    })
  }

  const hasDraft = !!(initialData?.finalDiagnosis)

  const isDynamic = selectedType?.templateSections && selectedType.templateSections.length > 0;
  let isSaveDisabled = false;
  let saveDisabledMessage = "";

  if (isDynamic) {
    const missingRequired = selectedType.templateSections.find((sec: any) => sec.required && !getSectionValue(sec.sectionKey)?.trim());
    if (missingRequired) {
      isSaveDisabled = true;
      saveDisabledMessage = `Fill the required field: ${missingRequired.sectionLabel} to save`;
    }
  } else {
    if (!finalDiagnosis.trim()) {
      isSaveDisabled = true;
      saveDisabledMessage = "Enter a final diagnosis to enable save and print";
    }
  }

  // Medicine problems block Save only (Print still works with the last saved draft)
  let medicineError = "";
  if (admissionId && !medicinesLocked) {
    if (unselectedRow) {
      medicineError = unselectedRow.medicineName.trim()
        ? `Select "${unselectedRow.medicineName}" from the pharmacy list (or remove the row) to save`
        : "Select a medicine from the pharmacy list for every discharge medicine row to save";
    } else if (invalidQtyRow) {
      medicineError = `Enter a quantity of at least 1 for "${invalidQtyRow.medicineName}" to save`;
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {hasDraft && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span>A draft discharge summary exists for this patient. You can edit and save again.</span>
        </div>
      )}

      {admissionStatus === "DISCHARGED" && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
          <AlertCircle className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span>This patient has been discharged. Summary can still be edited for record-keeping.</span>
        </div>
      )}

      {/* Editor Form */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                Discharge Summary Editor
              </CardTitle>
              <CardDescription className="mt-1">
                Prepare the medical discharge report — Dr. {doctorName}
              </CardDescription>
            </div>
            {saved && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Saved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {dischargeTypes.length > 0 && (
            <div className="space-y-2 mb-6">
              <Label className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-500" />
                Discharge Type Configuration
              </Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedTypeCode} 
                onChange={(e) => setSelectedTypeCode(e.target.value)}
              >
                {dischargeTypes.map(dt => (
                  <option key={dt.code} value={dt.code}>{dt.label}</option>
                ))}
              </select>
            </div>
          )}

          {selectedType?.templateSections && selectedType.templateSections.length > 0 ? (
            <div className="space-y-5">
              {selectedType.templateSections.map((section: any) => (
                <div key={section.sectionKey} className="space-y-2">
                  <Label htmlFor={section.sectionKey} className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    {section.sectionLabel} {section.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id={section.sectionKey}
                    placeholder={section.placeholder || `Enter ${section.sectionLabel.toLowerCase()}...`}
                    value={getSectionValue(section.sectionKey)}
                    onChange={(e) => setDynamicValues({
                      ...dynamicValues,
                      [section.sectionKey]: e.target.value
                    })}
                    rows={4}
                    className="resize-y"
                  />
                  {section.sectionKey === "treatmentGiven" && activeMedications.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const medSummary = activeMedications.map((m, i) => `${i + 1}. ${m.medicineName} ${m.dosage} — ${m.frequency} for ${m.duration}${m.instruction ? ` (${m.instruction})` : ""}`).join("\n");
                        setDynamicValues({ ...dynamicValues, treatmentGiven: medSummary });
                        toast.success("Treatment summary auto-filled");
                      }}
                      className="mt-2 text-xs h-7"
                    >
                      <Pill className="h-3 w-3 mr-1" />
                      Auto-fill from Rx ({activeMedications.length})
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Fallback to old hardcoded fields */}
              <div className="space-y-2">
                <Label htmlFor="finalDiagnosis" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-500" />
                  Final Diagnosis <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="finalDiagnosis"
                  placeholder="e.g., Acute appendicitis with localized peritonitis, post appendectomy"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  rows={3}
                  className="resize-y"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proceduresDone" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  Procedures / Surgeries Done
                </Label>
                <Textarea
                  id="proceduresDone"
                  placeholder="e.g., Emergency open appendectomy under spinal anesthesia on 15-Jan-2026"
                  value={proceduresDone}
                  onChange={(e) => setProceduresDone(e.target.value)}
                  rows={3}
                  className="resize-y"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="courseInHospital" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-orange-500" />
                  Clinical Course / Case Summary
                </Label>
                <Textarea
                  id="courseInHospital"
                  placeholder="Patient was admitted with complaints of... On examination..."
                  value={courseInHospital}
                  onChange={(e) => setCourseInHospital(e.target.value)}
                  rows={6}
                  className="resize-y"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="treatmentGiven" className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-green-500" />
                    Treatment Given / Medications
                  </Label>
                  {activeMedications.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={handleAutoFillTreatment} className="text-xs h-7">
                      <Pill className="h-3 w-3 mr-1" /> Auto-fill from Rx ({activeMedications.length})
                    </Button>
                  )}
                </div>
                <Textarea
                  id="treatmentGiven"
                  placeholder="1. Tab Amoxicillin 500mg..."
                  value={treatmentGiven}
                  onChange={(e) => setTreatmentGiven(e.target.value)}
                  rows={5}
                  className="resize-y"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditionAtDischarge" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-purple-500" />
                  Condition at Discharge
                </Label>
                <Textarea
                  id="conditionAtDischarge"
                  placeholder="Patient condition, vitals stable..."
                  value={conditionAtDischarge}
                  onChange={(e) => setConditionAtDischarge(e.target.value)}
                  rows={2}
                  className="resize-y"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adviceOnDischarge" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Advice on Discharge
                </Label>
                <Textarea
                  id="adviceOnDischarge"
                  placeholder="Medications, diet, activity restrictions..."
                  value={adviceOnDischarge}
                  onChange={(e) => setAdviceOnDischarge(e.target.value)}
                  rows={2}
                  className="resize-y"
                />
              </div>
            </>
          )}

          <Separator />

          {/* Discharge Medicines Table (IPD only — ER visits have no pharmacy discharge queue) */}
          {admissionId && (
          <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2 text-base">
                  <Pill className="h-5 w-5 text-indigo-500" />
                  Discharge Medicines
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {medicinesLocked
                    ? "Patient is discharged — discharge medicines are locked."
                    : "Search the pharmacy stock. Saved medicines appear in the pharmacy queue for dispensing."}
                </p>
              </div>
              {!medicinesLocked && (
                <Button type="button" variant="outline" size="sm" onClick={addDischargeMedicine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Medicine
                </Button>
              )}
            </div>

            {dischargeMedicines.length > 0 ? (
              <div className="border rounded-md overflow-visible">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-[28%]">Medicine Name *</th>
                      <th className="px-3 py-2 text-left font-medium w-24">Dosage</th>
                      <th className="px-3 py-2 text-left font-medium w-32">Frequency</th>
                      <th className="px-3 py-2 text-left font-medium w-24">Duration</th>
                      <th className="px-3 py-2 text-left font-medium w-20">Qty *</th>
                      <th className="px-3 py-2 text-left font-medium">Instructions</th>
                      <th className="px-3 py-2 text-right font-medium w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dischargeMedicines.map((med) => {
                      const editable = isRowEditable(med)
                      const overStock = editable && med.availableStock !== undefined && med.quantity > med.availableStock
                      return (
                      <tr key={med.key} className={editable ? "" : "bg-gray-50/70"}>
                        <td className="p-2 align-top">
                          {editable ? (
                            <>
                              <MedicineStockSearch
                                value={med.medicineName}
                                invalid={!med.medicineId && med.medicineName.trim().length > 0}
                                className="h-8 text-xs"
                                onTextChange={(text) =>
                                  // Typing invalidates any previous pharmacy selection
                                  updateDischargeMedicine(med.key, { medicineName: text, medicineId: null, availableStock: undefined })
                                }
                                onSelect={(m) =>
                                  updateDischargeMedicine(med.key, {
                                    medicineId: m.id,
                                    medicineName: m.name,
                                    availableStock: m.availableStock,
                                    dosage: med.dosage || m.strength || "",
                                  })
                                }
                              />
                              {!med.medicineId && med.medicineName.trim().length > 0 && (
                                <p className="text-[11px] text-red-600 mt-1">Select from pharmacy list</p>
                              )}
                              {med.medicineId && med.availableStock === 0 && (
                                <p className="text-[11px] text-red-600 mt-1">Out of stock in pharmacy</p>
                              )}
                            </>
                          ) : (
                            <span className="text-xs font-medium">{med.medicineName}</span>
                          )}
                        </td>
                        <td className="p-2 align-top">
                          <Input 
                            value={med.dosage}
                            disabled={!editable}
                            onChange={(e) => updateDischargeMedicine(med.key, { dosage: e.target.value })}
                            placeholder="650mg"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2 align-top">
                          <Input 
                            value={med.frequency}
                            disabled={!editable}
                            onChange={(e) => updateDischargeMedicine(med.key, { frequency: e.target.value })}
                            placeholder="SOS"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2 align-top">
                          <Input 
                            value={med.duration}
                            disabled={!editable}
                            onChange={(e) => updateDischargeMedicine(med.key, { duration: e.target.value })}
                            placeholder="3 days"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2 align-top">
                          <Input 
                            type="number"
                            min="1"
                            step="1"
                            disabled={!editable}
                            value={med.quantity || ""}
                            onChange={(e) => updateDischargeMedicine(med.key, { quantity: parseInt(e.target.value) || 0 })}
                            className={`h-8 text-xs ${overStock ? "border-amber-400" : ""}`}
                          />
                          {overStock && (
                            <p className="text-[11px] text-amber-600 mt-1">Only {med.availableStock} in stock</p>
                          )}
                        </td>
                        <td className="p-2 align-top">
                          <Input 
                            value={med.instruction || ""}
                            disabled={!editable}
                            onChange={(e) => updateDischargeMedicine(med.key, { instruction: e.target.value })}
                            placeholder="After food"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2 text-right align-top">
                          {med.pharmacyStatus === "DISPENSED" ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Dispensed</Badge>
                          ) : med.pharmacyStatus === "CANCELLED" ? (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">Cancelled</Badge>
                          ) : editable ? (
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeDischargeMedicine(med.key)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>
                          )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 bg-gray-50 border rounded-md text-sm text-gray-500">
                {medicinesLocked
                  ? "No discharge medicines were prescribed."
                  : "No discharge medicines added. Click \"Add Medicine\" to prescribe from pharmacy stock."}
              </div>
            )}
          </div>

          <Separator />
          </>
          )}

          {/* Condition at Discharge */}
          <div className="space-y-2">
            <Label htmlFor="conditionAtDischarge">
              Condition at Discharge
            </Label>
            <Textarea
              id="conditionAtDischarge"
              placeholder="Patient is afebrile, vitals stable, wound healthy, tolerating oral feeds well, ambulatory"
              value={conditionAtDischarge}
              onChange={(e) => setConditionAtDischarge(e.target.value)}
              rows={2}
              className="resize-y"
            />
          </div>

          {/* Advice on Discharge */}
          <div className="space-y-2">
            <Label htmlFor="adviceOnDischarge">
              Advice on Discharge (Home Instructions)
            </Label>
            <Textarea
              id="adviceOnDischarge"
              placeholder="- Wound care: Keep dry for 7 days&#10;- Diet: Soft, bland food for 3 days&#10;- Review in OPD after 7 days with reports&#10;- Report immediately if fever, vomiting, or wound discharge"
              value={adviceOnDischarge}
              onChange={(e) => setAdviceOnDischarge(e.target.value)}
              rows={5}
              className="resize-y"
            />
          </div>

          {/* Follow-up Date */}
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="followUpDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Follow-up Date
            </Label>
            <Input
              id="followUpDate"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Discharge Signatures Configuration */}
      <Card className="border-indigo-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <FileSignature className="h-4 w-4 text-indigo-600" />
            Discharge Summary Signatures
          </CardTitle>
          <CardDescription className="text-xs">
            Choose the treating doctor and authorized signatory for this patient&apos;s discharge summary report.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Treating Doctor Column */}
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <Label htmlFor="discharge-treating-doctor" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                  Treating Doctor (Assigned to Patient)
                </Label>
                {curDoc?.signatureUrl ? (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                    ✓ Signature on file
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0">
                    Manual sign line
                  </Badge>
                )}
              </div>

              {doctorsList.length > 0 ? (
                <select
                  id="discharge-treating-doctor"
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ""} {doc.signatureUrl ? "• Has Signature" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-500 italic">No assigned doctors for this admission.</p>
              )}

              {curDoc && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-32 border border-dashed border-slate-200 bg-slate-50/60 rounded flex items-center justify-center p-1 flex-shrink-0">
                      {curDoc.signatureUrl ? (
                        <img src={curDoc.signatureUrl} alt={curDoc.name} className="max-h-10 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No digital sig</span>
                      )}
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-semibold text-slate-800 truncate">Dr. {curDoc.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{curDoc.specialization || curDoc.department || "Treating Doctor"}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadTarget({
                        open: true,
                        staffId: curDoc.id,
                        name: `Dr. ${curDoc.name}`,
                        roleLabel: curDoc.specialization || curDoc.department || "Treating Doctor",
                        currentSig: curDoc.signatureUrl,
                        type: "DOCTOR",
                      })
                    }}
                    className="h-7 px-2.5 text-[11px] text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0 gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    {curDoc.signatureUrl ? "Change Sig" : "Upload Sig"}
                  </Button>
                </div>
              )}
            </div>

            {/* Authorized Signatory Column */}
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <Label htmlFor="discharge-signatory" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileSignature className="h-3.5 w-3.5 text-indigo-600" />
                  Authorized Signatory (Hospital Opt-In)
                </Label>
                {curSig?.signatureUrl ? (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                    ✓ Signature on file
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] py-0">
                    Manual sign line
                  </Badge>
                )}
              </div>

              <select
                id="discharge-signatory"
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={selectedSignatoryId}
                onChange={(e) => setSelectedSignatoryId(e.target.value)}
              >
                <option value="none">None / Blank Signature Line</option>
                {signatoriesList.map((sig) => (
                  <option key={sig.id} value={sig.id}>
                    {sig.name} ({sig.designation || sig.department || "Staff"}) {sig.hasSignature ? "• Has Signature" : ""}
                  </option>
                ))}
              </select>

              {curSig ? (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-32 border border-dashed border-slate-200 bg-slate-50/60 rounded flex items-center justify-center p-1 flex-shrink-0">
                      {curSig.signatureUrl ? (
                        <img src={curSig.signatureUrl} alt={curSig.name} className="max-h-10 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No digital sig</span>
                      )}
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-semibold text-slate-800 truncate">{curSig.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{curSig.designation || "Authorized Signatory"} • Shree Kamal Hospital</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadTarget({
                        open: true,
                        staffId: curSig.id,
                        name: curSig.name,
                        roleLabel: curSig.designation || curSig.department || "Authorized Signatory",
                        currentSig: curSig.signatureUrl,
                        type: "SIGNATORY",
                      })
                    }}
                    className="h-7 px-2.5 text-[11px] text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex-shrink-0 gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    {curSig.signatureUrl ? "Change Sig" : "Upload Sig"}
                  </Button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 text-xs text-muted-foreground italic">
                  A blank dotted line for physical Authorized Signatory will be printed.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Upload Dialog */}
      <SignatureUploadDialog
        open={uploadTarget.open}
        onOpenChange={(open) => setUploadTarget((prev) => ({ ...prev, open }))}
        targetStaffId={uploadTarget.staffId}
        personName={uploadTarget.name}
        roleLabel={uploadTarget.roleLabel}
        currentSignatureUrl={uploadTarget.currentSig}
        onSuccess={(newSigUrl) => {
          if (uploadTarget.type === "DOCTOR") {
            setDoctorsList((prev) =>
              prev.map((d) => (d.id === uploadTarget.staffId ? { ...d, signatureUrl: newSigUrl } : d))
            )
          } else {
            setSignatoriesList((prev) =>
              prev.map((s) => (s.id === uploadTarget.staffId ? { ...s, signatureUrl: newSigUrl, hasSignature: Boolean(newSigUrl) } : s))
            )
          }
        }}
      />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSaveDraft}
          disabled={isPending || isSaveDisabled || !!medicineError}
          className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </>
          )}
        </Button>

        <Link href={admissionId ? `/dashboard/ipd/print/summary/${admissionId}` : `/dashboard/clinical/emergency/print/summary/${emergencyVisitId}`}>
          <Button
            type="button"
            variant="outline"
            disabled={isSaveDisabled}
            className="w-full sm:w-auto"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Summary
          </Button>
        </Link>

        {(isSaveDisabled || medicineError) && (
          <p className="text-xs text-muted-foreground self-center">
            {isSaveDisabled ? saveDisabledMessage : medicineError}
          </p>
        )}
      </div>
    </div>
  )
}
