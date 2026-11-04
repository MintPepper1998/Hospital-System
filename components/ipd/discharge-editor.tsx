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
} from "lucide-react"
import { saveDischargeSummary } from "@/app/actions/discharge-summary"
import { MedicineStockSearch } from "@/components/pharmacy/medicine-stock-search"
import { toast } from "sonner"
import Link from "next/link"

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
}

export function DischargeEditor({
  admissionId,
  emergencyVisitId,
  admissionStatus,
  doctorName,
  initialData,
  activeMedications = [],
  dischargeTypes = [],
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
  
  // Dynamic Configuration
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>(
    initialData?.dischargeTypeCode || dischargeTypes[0]?.code || "NORMAL"
  )
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>(
    initialData?.customDischargeData || {}
  )
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

  const handleSaveDraft = () => {
    const isDynamic = selectedType?.templateSections && selectedType.templateSections.length > 0;
    const finalDiagVal = isDynamic ? (dynamicValues.finalDiagnosis || "") : finalDiagnosis;
    
    if (!finalDiagVal.trim()) {
      toast.error("Final Diagnosis is required (or ensure a value for the corresponding field)")
      // Note: If finalDiagnosis isn't a required field in the dynamic config, this might block save. 
      // Assuming it is usually mapped or we just warn. For now, let's bypass if dynamic and it doesn't exist in config.
    }

    setSaved(false)
    startTransition(async () => {
      const result = await saveDischargeSummary({ admissionId, emergencyVisitId }, {
        dischargeTypeCode: selectedTypeCode,
        customDischargeData: selectedType?.templateSections ? dynamicValues : undefined,
        finalDiagnosis: selectedType?.templateSections ? dynamicValues.finalDiagnosis || finalDiagnosis : finalDiagnosis,
        proceduresDone: selectedType?.templateSections ? (dynamicValues.proceduresDone || proceduresDone || undefined) : (proceduresDone || undefined),
        courseInHospital: selectedType?.templateSections ? (dynamicValues.courseInHospital || courseInHospital || undefined) : (courseInHospital || undefined),
        treatmentGiven: selectedType?.templateSections ? (dynamicValues.treatmentGiven || treatmentGiven || undefined) : (treatmentGiven || undefined),
        conditionAtDischarge: selectedType?.templateSections ? (dynamicValues.conditionAtDischarge || conditionAtDischarge || undefined) : (conditionAtDischarge || undefined),
        adviceOnDischarge: selectedType?.templateSections ? (dynamicValues.adviceOnDischarge || adviceOnDischarge || undefined) : (adviceOnDischarge || undefined),
        followUpDate: followUpDate || null,
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
        // Without this, a second save would re-create rows that were just inserted.
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
        // Reset saved indicator after a few seconds
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
    const missingRequired = selectedType.templateSections.find((sec: any) => sec.required && !dynamicValues[sec.sectionKey]?.trim());
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
                    value={
                      dynamicValues[section.sectionKey] !== undefined 
                      ? dynamicValues[section.sectionKey] 
                      : (
                        section.sectionKey === 'finalDiagnosis' ? finalDiagnosis :
                        section.sectionKey === 'proceduresDone' ? proceduresDone :
                        section.sectionKey === 'courseInHospital' ? courseInHospital :
                        section.sectionKey === 'treatmentGiven' ? treatmentGiven :
                        section.sectionKey === 'conditionAtDischarge' ? conditionAtDischarge :
                        section.sectionKey === 'adviceOnDischarge' ? adviceOnDischarge : ""
                      )
                    }
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
