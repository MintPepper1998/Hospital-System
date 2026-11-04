"use client"

import { useState } from "react"
import { PrintSettingsData } from "@/app/actions/print-settings"
import { updateTemplateSettings } from "@/app/actions/print-template-settings"
import { PrintTemplateSettingsData, TEMPLATE_TYPES, TemplateType } from "@/lib/print-template-types"
import { HospitalSettingsData } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Stethoscope, FlaskConical, Receipt, Pill } from "lucide-react"
import { LiveOPDPreview } from "./live-opd-preview"
import { LiveLabPreview } from "./live-lab-preview"
import { LiveBillingPreview } from "./live-billing-preview"
import { LiveMedicineBillPreview } from "./live-medicine-bill-preview"

// Template type config
const TEMPLATE_TABS = [
  { type: "OPD_PRESCRIPTION", label: "OPD Prescription", icon: Stethoscope, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { type: "LAB_RESULTS", label: "Lab Results", icon: FlaskConical, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { type: "PATIENT_BILLING", label: "Patient Billing", icon: Receipt, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { type: "MEDICINE_BILL", label: "Medicine Bill", icon: Pill, color: "text-purple-600 bg-purple-50 border-purple-200" },
] as const

const themeColors = [
  "#0066CC", "#E53E3E", "#DD6B20", "#D69E2E", "#38A169", "#319795",
  "#3182CE", "#805AD5", "#D53F8C", "#4A5568", "#000000", "#0077B6"
]

export function PrintSettingsClient({
  initialData,
  hospitalSettings,
  templateSettings: initialTemplateSettings,
  doctors = [],
}: {
  initialData: PrintSettingsData
  hospitalSettings: HospitalSettingsData
  templateSettings: Record<string, PrintTemplateSettingsData>
  doctors?: any[]
}) {
  const [activeTemplate, setActiveTemplate] = useState("OPD_PRESCRIPTION")
  const [templates, setTemplates] = useState<Record<string, PrintTemplateSettingsData>>(initialTemplateSettings)
  const [isSaving, setIsSaving] = useState(false)

  const currentSettings = templates[activeTemplate]

  const updateField = (field: keyof PrintTemplateSettingsData, value: any) => {
    setTemplates((prev) => ({
      ...prev,
      [activeTemplate]: { ...prev[activeTemplate], [field]: value },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateTemplateSettings(activeTemplate, currentSettings)
    setIsSaving(false)
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  // Render the correct preview for the active template
  const renderPreview = () => {
    switch (activeTemplate) {
      case "OPD_PRESCRIPTION":
        return <LiveOPDPreview settings={currentSettings} hospitalSettings={hospitalSettings} />
      case "LAB_RESULTS":
        return <LiveLabPreview settings={currentSettings} hospitalSettings={hospitalSettings} />
      case "PATIENT_BILLING":
        return <LiveBillingPreview settings={currentSettings} hospitalSettings={hospitalSettings} />
      case "MEDICINE_BILL":
        return <LiveMedicineBillPreview settings={currentSettings} hospitalSettings={hospitalSettings} />
      default:
        return null
    }
  }

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-gray-50 overflow-hidden min-h-0">

      {/* LEFT PANE - Settings Controls */}
      <div className="flex-1 w-full lg:w-[500px] xl:w-[600px] flex flex-col border-r border-gray-200 bg-white min-h-0 lg:max-w-[600px]">

        {/* Template Selector */}
        <div className="border-b bg-gray-50/50 px-4 py-3 shrink-0">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Select Template</p>
          <div className="grid grid-cols-4 gap-2">
            {TEMPLATE_TABS.map((tab) => {
              const isActive = activeTemplate === tab.type
              const Icon = tab.icon
              return (
                <button
                  key={tab.type}
                  onClick={() => setActiveTemplate(tab.type)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? `${tab.color} border-current shadow-sm scale-[1.02]`
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] leading-tight text-center">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sub-tabs: Layout vs Colors */}
        <div className="border-b px-4 pt-2 bg-white shrink-0">
          <Tabs defaultValue="layout">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 space-x-6">
              <TabsTrigger value="layout" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:text-pink-500 font-medium px-2 py-2 text-xs">
                CHANGE LAYOUT
              </TabsTrigger>
              <TabsTrigger value="colors" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:text-pink-500 font-medium px-2 py-2 text-xs text-gray-500">
                CHANGE COLORS
              </TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto h-[calc(100vh-16rem)] p-4 custom-scrollbar">
              
              {/* COLOR TAB */}
              <TabsContent value="colors" className="mt-0 space-y-6">
                <div>
                  <Label className="text-gray-500 font-bold mb-4 block">Select Theme Color</Label>
                  <div className="flex flex-wrap gap-3">
                    {themeColors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateField('themeColor', c)}
                        className={`w-8 h-8 rounded-full border-2 ${currentSettings.themeColor === c ? 'border-gray-800 scale-110 shadow-md' : 'border-gray-200'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* LAYOUT TAB */}
              <TabsContent value="layout" className="mt-0 space-y-8">

                {/* ═══ Shared Header Section ═══ */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-lg border-b pb-2">Print Company Info / Header</h3>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="repeat" checked={currentSettings.printHeaderRepeat} onCheckedChange={(c) => updateField('printHeaderRepeat', !!c)} />
                    <Label htmlFor="repeat">Print repeat header in all pages</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Paper Size</Label>
                      <Select value={currentSettings.paperSize || "A4"} onValueChange={(v) => updateField('paperSize', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="A5">A5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Orientation</Label>
                      <Select value={currentSettings.orientation || "Portrait"} onValueChange={(v) => updateField('orientation', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Portrait">Portrait</SelectItem>
                          <SelectItem value="Landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Company Name Size</Label>
                      <Select value={currentSettings.companyNameSize || "Large"} onValueChange={(v) => updateField('companyNameSize', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Small">Small</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Text Size</Label>
                      <Select value={currentSettings.invoiceTextSize || "Medium"} onValueChange={(v) => updateField('invoiceTextSize', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Small">Small</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="emerg" checked={currentSettings.showEmergencyBanner} onCheckedChange={(c) => updateField('showEmergencyBanner', !!c)} />
                      <Label htmlFor="emerg">Show Emergency Banner</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="accr" checked={currentSettings.showQualityAccreditations} onCheckedChange={(c) => updateField('showQualityAccreditations', !!c)} />
                      <Label htmlFor="accr">Show Quality Accreditation</Label>
                    </div>
                  </div>
                </div>

                {/* ═══ Template-Specific Section ═══ */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm border-b pb-2 text-blue-500">
                    {TEMPLATE_TABS.find(t => t.type === activeTemplate)?.label || activeTemplate} Settings
                  </h3>

                  {/* OPD PRESCRIPTION */}
                  {activeTemplate === "OPD_PRESCRIPTION" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">Prescription Layout</Label>
                        <Select value={currentSettings.prescriptionLayout} onValueChange={(v) => updateField('prescriptionLayout', v)}>
                          <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DETAILED">Detailed (Digital)</SelectItem>
                            <SelectItem value="COMPACT">Compact</SelectItem>
                            <SelectItem value="HANDWRITE_PAD">Handwrite Pad</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2"><Checkbox id="vitals" checked={currentSettings.showVitals} onCheckedChange={(c) => updateField('showVitals', !!c)} /><Label htmlFor="vitals">Show Vitals</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="diagnosis" checked={currentSettings.showDiagnosis} onCheckedChange={(c) => updateField('showDiagnosis', !!c)} /><Label htmlFor="diagnosis">Show Diagnosis</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="complaints" checked={currentSettings.showChiefComplaints} onCheckedChange={(c) => updateField('showChiefComplaints', !!c)} /><Label htmlFor="complaints">Show Chief Complaints</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="meds" checked={currentSettings.showMedicationTable} onCheckedChange={(c) => updateField('showMedicationTable', !!c)} /><Label htmlFor="meds">Show Medication Table</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="labTests" checked={currentSettings.showLabTests} onCheckedChange={(c) => updateField('showLabTests', !!c)} /><Label htmlFor="labTests">Show Lab Tests Ordered</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="advisory" checked={currentSettings.showDoctorAdvisory} onCheckedChange={(c) => updateField('showDoctorAdvisory', !!c)} /><Label htmlFor="advisory">Show Doctor Advisory</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="dosage" checked={currentSettings.showDosageSchedule} onCheckedChange={(c) => updateField('showDosageSchedule', !!c)} /><Label htmlFor="dosage">Show Dosage Schedule (M-N-E-N)</Label></div>
                      
                      <div className="pt-6 border-t mt-6">
                        <h4 className="font-bold text-sm text-gray-800 mb-2">Doctor-Specific OPD Letterheads</h4>
                        <p className="text-xs text-gray-500 mb-4">Upload a custom full-page background image (A4 size recommended) for specific doctors. This will override the standard header.</p>
                        <div className="space-y-3">
                          {doctors.map(doctor => (
                            <DoctorLetterheadUploader key={doctor.id} doctor={doctor} />
                          ))}
                          {doctors.length === 0 && <p className="text-xs text-gray-400">No doctors found.</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LAB RESULTS */}
                  {activeTemplate === "LAB_RESULTS" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">Report Layout</Label>
                        <Select value={currentSettings.labReportLayout} onValueChange={(v) => updateField('labReportLayout', v)}>
                          <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TABULAR">Tabular</SelectItem>
                            <SelectItem value="GROUPED">Grouped by Category</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2"><Checkbox id="refRange" checked={currentSettings.showReferenceRanges} onCheckedChange={(c) => updateField('showReferenceRanges', !!c)} /><Label htmlFor="refRange">Show Reference Ranges</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="abnormal" checked={currentSettings.showAbnormalFlags} onCheckedChange={(c) => updateField('showAbnormalFlags', !!c)} /><Label htmlFor="abnormal">Show Abnormal Flags (HIGH/LOW)</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="sample" checked={currentSettings.showSampleInfo} onCheckedChange={(c) => updateField('showSampleInfo', !!c)} /><Label htmlFor="sample">Show Sample Info (Date, Type)</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="labTech" checked={currentSettings.showLabTechSignature} onCheckedChange={(c) => updateField('showLabTechSignature', !!c)} /><Label htmlFor="labTech">Show Lab Technician Signature</Label></div>
                    </div>
                  )}

                  {/* PATIENT BILLING */}
                  {activeTemplate === "PATIENT_BILLING" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">Billing Layout Strategy</Label>
                        <Select value={currentSettings.billLayoutStrategy} onValueChange={(v) => updateField('billLayoutStrategy', v)}>
                          <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GROUPED_BY_CATEGORY">Grouped by Category (Apollo)</SelectItem>
                            <SelectItem value="FLAT_LIST">Continuous Flat List</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2"><Checkbox id="bQ" checked={currentSettings.showTotalQuantity} onCheckedChange={(c) => updateField('showTotalQuantity', !!c)} /><Label htmlFor="bQ">Total Item Quantity</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="bA" checked={currentSettings.showAmountDecimal} onCheckedChange={(c) => updateField('showAmountDecimal', !!c)} /><Label htmlFor="bA">Amount with Decimal (e.g. 0.00)</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="bR" checked={currentSettings.showReceivedAmount} onCheckedChange={(c) => updateField('showReceivedAmount', !!c)} /><Label htmlFor="bR">Received Amount (Payments)</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="bB" checked={currentSettings.showBalanceAmount} onCheckedChange={(c) => updateField('showBalanceAmount', !!c)} /><Label htmlFor="bB">Balance Amount / Due</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="bT" checked={currentSettings.showTaxDetails} onCheckedChange={(c) => updateField('showTaxDetails', !!c)} /><Label htmlFor="bT">Tax Details / GST</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="bD" checked={currentSettings.showDiscountDetails} onCheckedChange={(c) => updateField('showDiscountDetails', !!c)} /><Label htmlFor="bD">Discount Details / You Saved</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="bG" checked={currentSettings.printAmountGrouped} onCheckedChange={(c) => updateField('printAmountGrouped', !!c)} /><Label htmlFor="bG">Print Amount with Grouping (₹ 1,00,000)</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="bI" checked={currentSettings.showItemizedBreakdown} onCheckedChange={(c) => updateField('showItemizedBreakdown', !!c)} /><Label htmlFor="bI">Print multi-page breakdown</Label></div>
                      <div className="pt-2 w-1/2">
                        <Label className="text-xs text-gray-600 block mb-1">Amount in Words</Label>
                        <Select value={currentSettings.amountInWords} onValueChange={(v) => updateField('amountInWords', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Indian">Indian (Lakhs/Crores)</SelectItem>
                            <SelectItem value="English">English (Millions)</SelectItem>
                            <SelectItem value="None">Do not display</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* MEDICINE BILL */}
                  {activeTemplate === "MEDICINE_BILL" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">Medicine Bill Layout</Label>
                        <Select value={currentSettings.medicineBillLayout} onValueChange={(v) => updateField('medicineBillLayout', v)}>
                          <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ITEMIZED">Itemized (Detailed)</SelectItem>
                            <SelectItem value="SUMMARY">Summary Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2"><Checkbox id="mBatch" checked={currentSettings.showBatchNumber} onCheckedChange={(c) => updateField('showBatchNumber', !!c)} /><Label htmlFor="mBatch">Show Batch Number</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="mExpiry" checked={currentSettings.showExpiryDate} onCheckedChange={(c) => updateField('showExpiryDate', !!c)} /><Label htmlFor="mExpiry">Show Expiry Date</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="mMRP" checked={currentSettings.showMRP} onCheckedChange={(c) => updateField('showMRP', !!c)} /><Label htmlFor="mMRP">Show MRP</Label></div>
                      <div className="flex items-center space-x-2"><Checkbox id="mSign" checked={currentSettings.showPharmacistSign} onCheckedChange={(c) => updateField('showPharmacistSign', !!c)} /><Label htmlFor="mSign">Show Pharmacist Signature</Label></div>

                      {/* Reuse billing totals controls */}
                      <div className="pt-3 border-t border-gray-200 space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount Display</p>
                        <div className="flex items-center space-x-2"><Checkbox id="mAD" checked={currentSettings.showAmountDecimal} onCheckedChange={(c) => updateField('showAmountDecimal', !!c)} /><Label htmlFor="mAD">Amount with Decimal</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id="mTax" checked={currentSettings.showTaxDetails} onCheckedChange={(c) => updateField('showTaxDetails', !!c)} /><Label htmlFor="mTax">Tax Details / GST</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id="mDisc" checked={currentSettings.showDiscountDetails} onCheckedChange={(c) => updateField('showDiscountDetails', !!c)} /><Label htmlFor="mDisc">Discount Details</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id="mGrp" checked={currentSettings.printAmountGrouped} onCheckedChange={(c) => updateField('printAmountGrouped', !!c)} /><Label htmlFor="mGrp">Amount Grouping (₹ 1,00,000)</Label></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ═══ Footer Section ═══ */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-sm border-b pb-2 text-blue-500">Footer Options</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2"><Checkbox id="desc" checked={currentSettings.showPrintDescription} onCheckedChange={(c) => updateField('showPrintDescription', !!c)} /><Label htmlFor="desc">Print Description / Notes</Label></div>
                      {currentSettings.showPrintDescription && <Input value={currentSettings.printDescriptionText || ''} onChange={(e) => updateField('printDescriptionText', e.target.value)} placeholder="Wishing you a speedy recovery!" />}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2"><Checkbox id="tc" checked={currentSettings.showTermsAndConditions} onCheckedChange={(c) => updateField('showTermsAndConditions', !!c)} /><Label htmlFor="tc">Terms and Conditions</Label></div>
                      {currentSettings.showTermsAndConditions && <Input value={currentSettings.termsText || ''} onChange={(e) => updateField('termsText', e.target.value)} placeholder="Returns not accepted for pharmacy" />}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2"><Checkbox id="sig" checked={currentSettings.showSignature} onCheckedChange={(c) => updateField('showSignature', !!c)} /><Label htmlFor="sig">Print Signature Text</Label></div>
                      {currentSettings.showSignature && <Input value={currentSettings.signatureLabel} onChange={(e) => updateField('signatureLabel', e.target.value)} placeholder="Authorized Signatory" />}
                    </div>
                  </div>
                </div>

              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Save Button */}
        <div className="p-4 border-t bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex justify-between items-center shrink-0 sticky bottom-0 z-10">
          <p className="text-xs text-gray-500">Changes reflected live in preview</p>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700 px-8 font-semibold shadow-md">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : `💾 Save ${TEMPLATE_TABS.find(t => t.type === activeTemplate)?.label || activeTemplate}`}
          </Button>
        </div>
      </div>

      {/* RIGHT PANE - Live Preview */}
      <div className="flex-1 w-full bg-gray-200 overflow-y-auto p-4 md:p-[50px] flex items-start justify-center min-h-0">
        {renderPreview()}
      </div>
    </div>
  )
}

import { updateDoctorOpdLetterhead } from '@/app/actions/staff-settings';

function DoctorLetterheadUploader({ doctor }: { doctor: any }) {
  const [isUploading, setIsUploading] = useState(false);
  const [url, setUrl] = useState(doctor.opdCustomPaperUrl || null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const key = `letterheads/${doctor.id}_${Date.now()}_${file.name}`;
      const uploadRes = await fetch(`/api/s3-upload?key=${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const data = await uploadRes.json();

      const fileUrl = data.localUrl || `${process.env.NEXT_PUBLIC_S3_PUBLIC_URL || ''}/${key}`;
      
      const res = await updateDoctorOpdLetterhead(doctor.id, fileUrl);
      if (res.success) {
        setUrl(fileUrl);
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    const res = await updateDoctorOpdLetterhead(doctor.id, null);
    setIsUploading(false);
    if (res.success) {
      setUrl(null);
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full font-bold">
          {doctor.user?.name?.charAt(0) || 'D'}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Dr. {doctor.user?.name}</p>
          <p className="text-xs text-gray-500">{doctor.specialization || 'Doctor'}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {url ? (
          <>
            <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
              View Current
            </a>
            <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={handleRemove} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
            </Button>
          </>
        ) : (
          <div className="relative">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={isUploading}>
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Upload Background'}
            </Button>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={isUploading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
