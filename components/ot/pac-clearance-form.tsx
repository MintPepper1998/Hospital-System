"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { savePACAssessment, type PACAssessmentData } from "@/app/actions/ot-workflow"
import {
  ArrowLeft, Save, CheckCircle2, Loader2, Heart, Wind, Brain, Stethoscope,
  Pill, AlertTriangle, ClipboardCheck, Activity, User, ChevronDown, ChevronUp
} from "lucide-react"

type Surgery = {
  id: string
  pacAssessment: any
  pacStatus: string
  pacNotes: string | null
  pacCheckedBy: string | null
  pacCheckedAt: string | null
  status: string
  procedureName: string
  patient: { user: { name: string } }
  leadSurgeon: { user: { name: string } }
}

const ASA_OPTIONS = [
  { value: "I", label: "ASA I", desc: "Normal healthy patient" },
  { value: "II", label: "ASA II", desc: "Mild systemic disease" },
  { value: "III", label: "ASA III", desc: "Severe systemic disease" },
  { value: "IV", label: "ASA IV", desc: "Constant threat to life" },
  { value: "V", label: "ASA V", desc: "Moribund patient" },
]

const MALLAMPATI_OPTIONS = [
  { value: "I", label: "Class I", desc: "Soft palate, fauces, uvula, pillars visible" },
  { value: "II", label: "Class II", desc: "Soft palate, fauces, uvula visible" },
  { value: "III", label: "Class III", desc: "Soft palate, base of uvula visible" },
  { value: "IV", label: "Class IV", desc: "Hard palate only visible" },
]

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, statusColor }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; statusColor?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColor || 'bg-blue-50'}`}>
            <Icon className={`w-5 h-5 ${statusColor ? 'text-white' : 'text-blue-600'}`} />
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-50">{children}</div>}
    </div>
  )
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function FieldInput({ type = "text", value, onChange, placeholder, className = "" }: any) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 ${className}`}
    />
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  )
}

export function PACClearanceForm({ surgery }: { surgery: Surgery }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const existing = (surgery.pacAssessment || {}) as PACAssessmentData

  // ── State ──
  const [data, setData] = useState<PACAssessmentData>({
    height: existing.height,
    weight: existing.weight,
    bmi: existing.bmi,
    bloodPressureSystolic: existing.bloodPressureSystolic,
    bloodPressureDiastolic: existing.bloodPressureDiastolic,
    pulse: existing.pulse,
    spo2: existing.spo2,
    temperature: existing.temperature,
    respiratoryRate: existing.respiratoryRate,
    asaClass: existing.asaClass || "",
    isEmergencyASA: existing.isEmergencyASA || false,
    mallampatiClass: existing.mallampatiClass || "",
    mouthOpening: existing.mouthOpening,
    neckMobility: existing.neckMobility || "Normal",
    thyromental: existing.thyromental,
    dentition: existing.dentition || "",
    predictedDifficulty: existing.predictedDifficulty || "Easy",
    cardiovascular: existing.cardiovascular || {},
    respiratory: existing.respiratory || {},
    neurological: existing.neurological || {},
    endocrine: existing.endocrine || {},
    hepatic: existing.hepatic || {},
    renal: existing.renal || {},
    hematologic: existing.hematologic || {},
    previousSurgeries: existing.previousSurgeries || "",
    adverseReactions: existing.adverseReactions || "",
    difficultIntubationHistory: existing.difficultIntubationHistory || false,
    currentMedications: existing.currentMedications || "",
    drugAllergies: existing.drugAllergies || "",
    foodAllergies: existing.foodAllergies || "",
    investigations: existing.investigations || {},
    anesthesiaType: existing.anesthesiaType || "",
    specialPrecautions: existing.specialPrecautions || "",
    preOpOrders: existing.preOpOrders || "",
    decision: existing.decision || "",
    conditions: existing.conditions || "",
    reviewNotes: existing.reviewNotes || "",
  })

  const update = (field: string, value: any) => {
    setData(prev => {
      const next = { ...prev, [field]: value }
      // Auto-calculate BMI
      if ((field === "height" || field === "weight") && next.height && next.weight) {
        const heightM = (next.height as number) / 100
        next.bmi = Math.round(((next.weight as number) / (heightM * heightM)) * 10) / 10
      }
      return next
    })
  }

  const updateNested = (section: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: { ...(prev as any)[section], [field]: value }
    }))
  }

  const handleSave = (isDraft: boolean) => {
    if (!isDraft && !data.decision) {
      toast.error("Please select a PAC decision (FIT / UNFIT / CONDITIONAL)")
      return
    }
    startTransition(async () => {
      const res = await savePACAssessment(surgery.id, data, isDraft)
      if (res.success) {
        toast.success(res.message)
        if (!isDraft) router.push(`/dashboard/ot/schedule?surgeryId=${surgery.id}`)
      } else {
        toast.error(res.message)
      }
    })
  }

  const isCompleted = surgery.pacStatus === "FIT" || surgery.pacStatus === "UNFIT" || surgery.pacStatus === "CONDITIONAL"

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PAC Assessment</h1>
            <p className="text-sm text-gray-500 font-medium">{surgery.patient.user.name} · {surgery.procedureName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCompleted && (
            <div className={`px-4 py-2 rounded-full text-xs font-bold ${
              surgery.pacStatus === "FIT" ? "bg-emerald-100 text-emerald-700" :
              surgery.pacStatus === "UNFIT" ? "bg-red-100 text-red-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {surgery.pacStatus}
            </div>
          )}
          <button onClick={() => handleSave(true)} disabled={isPending} className="px-5 py-2.5 rounded-full bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 cursor-pointer">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button onClick={() => handleSave(false)} disabled={isPending} className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-colors flex items-center gap-2 cursor-pointer">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Complete PAC
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Section 1: Vitals ── */}
        <CollapsibleSection title="Patient Vitals" icon={Activity}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div>
              <FieldLabel label="Height (cm)" />
              <FieldInput type="number" value={data.height} onChange={(e: any) => update("height", parseFloat(e.target.value) || undefined)} placeholder="170" />
            </div>
            <div>
              <FieldLabel label="Weight (kg)" />
              <FieldInput type="number" value={data.weight} onChange={(e: any) => update("weight", parseFloat(e.target.value) || undefined)} placeholder="70" />
            </div>
            <div>
              <FieldLabel label="BMI" />
              <div className="h-11 bg-gray-100 rounded-xl px-4 flex items-center text-sm font-bold text-gray-700">
                {data.bmi || "—"}
              </div>
            </div>
            <div>
              <FieldLabel label="Temperature (°F)" />
              <FieldInput type="number" value={data.temperature} onChange={(e: any) => update("temperature", parseFloat(e.target.value) || undefined)} placeholder="98.6" />
            </div>
            <div>
              <FieldLabel label="BP Systolic" />
              <FieldInput type="number" value={data.bloodPressureSystolic} onChange={(e: any) => update("bloodPressureSystolic", parseInt(e.target.value) || undefined)} placeholder="120" />
            </div>
            <div>
              <FieldLabel label="BP Diastolic" />
              <FieldInput type="number" value={data.bloodPressureDiastolic} onChange={(e: any) => update("bloodPressureDiastolic", parseInt(e.target.value) || undefined)} placeholder="80" />
            </div>
            <div>
              <FieldLabel label="Pulse (bpm)" />
              <FieldInput type="number" value={data.pulse} onChange={(e: any) => update("pulse", parseInt(e.target.value) || undefined)} placeholder="72" />
            </div>
            <div>
              <FieldLabel label="SpO₂ (%)" />
              <FieldInput type="number" value={data.spo2} onChange={(e: any) => update("spo2", parseInt(e.target.value) || undefined)} placeholder="98" />
            </div>
            <div>
              <FieldLabel label="Resp. Rate (/min)" />
              <FieldInput type="number" value={data.respiratoryRate} onChange={(e: any) => update("respiratoryRate", parseInt(e.target.value) || undefined)} placeholder="16" />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Section 2: ASA Classification ── */}
        <CollapsibleSection title="ASA Physical Status" icon={User}>
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {ASA_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update("asaClass", opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    data.asaClass === opt.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="text-sm font-bold text-gray-900">{opt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
            <CheckItem label="Emergency (+E)" checked={data.isEmergencyASA || false} onChange={v => update("isEmergencyASA", v)} />
          </div>
        </CollapsibleSection>

        {/* ── Section 3: Airway Assessment ── */}
        <CollapsibleSection title="Airway Assessment" icon={Wind}>
          <div className="pt-4 space-y-4">
            <div>
              <FieldLabel label="Mallampati Classification" required />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {MALLAMPATI_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update("mallampatiClass", opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      data.mallampatiClass === opt.value
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="text-sm font-bold text-gray-900">{opt.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <FieldLabel label="Mouth Opening (cm)" />
                <FieldInput type="number" value={data.mouthOpening} onChange={(e: any) => update("mouthOpening", parseFloat(e.target.value) || undefined)} placeholder="4" />
              </div>
              <div>
                <FieldLabel label="Neck Mobility" />
                <select value={data.neckMobility} onChange={e => update("neckMobility", e.target.value)} className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600">
                  <option value="Normal">Normal</option>
                  <option value="Limited">Limited</option>
                  <option value="Fixed">Fixed</option>
                </select>
              </div>
              <div>
                <FieldLabel label="Thyromental (cm)" />
                <FieldInput type="number" value={data.thyromental} onChange={(e: any) => update("thyromental", parseFloat(e.target.value) || undefined)} placeholder="6.5" />
              </div>
              <div>
                <FieldLabel label="Predicted Difficulty" />
                <select value={data.predictedDifficulty} onChange={e => update("predictedDifficulty", e.target.value)} className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600">
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Difficult">Difficult</option>
                </select>
              </div>
            </div>
            <div>
              <FieldLabel label="Dentition Notes" />
              <FieldInput value={data.dentition} onChange={(e: any) => update("dentition", e.target.value)} placeholder="e.g., Loose teeth, dentures..." />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Section 4: Medical History ── */}
        <CollapsibleSection title="Medical History" icon={Heart} defaultOpen={false}>
          <div className="pt-4 space-y-5">
            {/* Cardiovascular */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cardiovascular</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <CheckItem label="Hypertension" checked={data.cardiovascular?.htn || false} onChange={v => updateNested("cardiovascular", "htn", v)} />
                <CheckItem label="MI" checked={data.cardiovascular?.mi || false} onChange={v => updateNested("cardiovascular", "mi", v)} />
                <CheckItem label="Arrhythmia" checked={data.cardiovascular?.arrhythmia || false} onChange={v => updateNested("cardiovascular", "arrhythmia", v)} />
                <CheckItem label="Heart Failure" checked={data.cardiovascular?.heartFailure || false} onChange={v => updateNested("cardiovascular", "heartFailure", v)} />
              </div>
              <textarea value={data.cardiovascular?.notes || ""} onChange={e => updateNested("cardiovascular", "notes", e.target.value)} placeholder="Additional cardiovascular notes..." className="w-full mt-2 p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
            </div>
            {/* Respiratory */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Respiratory</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <CheckItem label="Asthma" checked={data.respiratory?.asthma || false} onChange={v => updateNested("respiratory", "asthma", v)} />
                <CheckItem label="COPD" checked={data.respiratory?.copd || false} onChange={v => updateNested("respiratory", "copd", v)} />
                <CheckItem label="Sleep Apnea" checked={data.respiratory?.sleepApnea || false} onChange={v => updateNested("respiratory", "sleepApnea", v)} />
                <CheckItem label="Recent URI" checked={data.respiratory?.recentURI || false} onChange={v => updateNested("respiratory", "recentURI", v)} />
              </div>
              <textarea value={data.respiratory?.notes || ""} onChange={e => updateNested("respiratory", "notes", e.target.value)} placeholder="Additional respiratory notes..." className="w-full mt-2 p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
            </div>
            {/* Neurological */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Neurological</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <CheckItem label="Seizures" checked={data.neurological?.seizures || false} onChange={v => updateNested("neurological", "seizures", v)} />
                <CheckItem label="Stroke" checked={data.neurological?.stroke || false} onChange={v => updateNested("neurological", "stroke", v)} />
                <CheckItem label="Neuropathy" checked={data.neurological?.neuropathy || false} onChange={v => updateNested("neurological", "neuropathy", v)} />
              </div>
            </div>
            {/* Endocrine */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Endocrine</p>
              <div className="grid grid-cols-2 gap-2">
                <CheckItem label="Diabetes" checked={data.endocrine?.diabetes || false} onChange={v => updateNested("endocrine", "diabetes", v)} />
                <CheckItem label="Thyroid Disorder" checked={data.endocrine?.thyroid || false} onChange={v => updateNested("endocrine", "thyroid", v)} />
              </div>
            </div>
            {/* Other */}
            <div className="grid grid-cols-3 gap-2">
              <CheckItem label="Hepatic Issues" checked={data.hepatic?.issues || false} onChange={v => updateNested("hepatic", "issues", v)} />
              <CheckItem label="Renal Issues" checked={data.renal?.issues || false} onChange={v => updateNested("renal", "issues", v)} />
              <CheckItem label="Bleeding Disorder" checked={data.hematologic?.bleedingDisorder || false} onChange={v => updateNested("hematologic", "bleedingDisorder", v)} />
            </div>
            {/* Previous Anesthesia */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Previous Anesthesia History</p>
              <textarea value={data.previousSurgeries} onChange={e => update("previousSurgeries", e.target.value)} placeholder="Previous surgeries and anesthesia details..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              <textarea value={data.adverseReactions} onChange={e => update("adverseReactions", e.target.value)} placeholder="Any adverse reactions to anesthesia..." className="w-full mt-2 p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              <div className="mt-2">
                <CheckItem label="History of difficult intubation" checked={data.difficultIntubationHistory || false} onChange={v => update("difficultIntubationHistory", v)} />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Section 5: Medications & Allergies ── */}
        <CollapsibleSection title="Medications & Allergies" icon={Pill} defaultOpen={false}>
          <div className="pt-4 space-y-4">
            <div>
              <FieldLabel label="Current Medications" />
              <textarea value={data.currentMedications} onChange={e => update("currentMedications", e.target.value)} placeholder="List all current medications, supplements, anticoagulants..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel label="Drug Allergies" />
                <textarea value={data.drugAllergies} onChange={e => update("drugAllergies", e.target.value)} placeholder="Known drug allergies..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              </div>
              <div>
                <FieldLabel label="Food Allergies" />
                <textarea value={data.foodAllergies} onChange={e => update("foodAllergies", e.target.value)} placeholder="Known food allergies..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Section 6: Investigations ── */}
        <CollapsibleSection title="Investigations Review" icon={ClipboardCheck} defaultOpen={false}>
          <div className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: "cbc", label: "CBC / Hemoglobin" },
              { key: "bloodGrouping", label: "Blood Grouping & Rh" },
              { key: "coagulation", label: "Coagulation (PT/INR)" },
              { key: "bloodSugar", label: "Blood Sugar" },
              { key: "kidneyFunction", label: "Kidney Function" },
              { key: "liverFunction", label: "Liver Function" },
              { key: "ecg", label: "ECG" },
              { key: "chestXray", label: "Chest X-Ray" },
              { key: "other", label: "Other" },
            ].map(inv => (
              <div key={inv.key}>
                <FieldLabel label={inv.label} />
                <select
                  value={(data.investigations as any)?.[inv.key] || ""}
                  onChange={e => updateNested("investigations", inv.key, e.target.value)}
                  className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Not Done</option>
                  <option value="Normal">Normal</option>
                  <option value="Abnormal">Abnormal</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* ── Section 7: Anesthesia Plan ── */}
        <CollapsibleSection title="Anesthesia Plan" icon={Stethoscope}>
          <div className="pt-4 space-y-4">
            <div>
              <FieldLabel label="Anesthesia Type" required />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {["General", "Spinal", "Epidural", "Local", "MAC"].map(t => (
                  <button
                    key={t}
                    onClick={() => update("anesthesiaType", t)}
                    className={`p-3 rounded-xl border-2 text-center text-sm font-bold transition-all cursor-pointer ${
                      data.anesthesiaType === t
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-100 text-gray-600 hover:border-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel label="Special Precautions" />
              <textarea value={data.specialPrecautions} onChange={e => update("specialPrecautions", e.target.value)} placeholder="Any special precautions for this patient..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
            </div>
            <div>
              <FieldLabel label="Pre-Op Orders (NPO, Pre-medication)" />
              <textarea value={data.preOpOrders} onChange={e => update("preOpOrders", e.target.value)} placeholder="NPO instructions, pre-medications..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Section 8: PAC Decision ── */}
        <CollapsibleSection title="PAC Decision" icon={AlertTriangle} statusColor={data.decision === "FIT" ? "bg-emerald-500" : data.decision === "UNFIT" ? "bg-red-500" : data.decision === "CONDITIONAL" ? "bg-amber-500" : "bg-gray-200"}>
          <div className="pt-4 space-y-4">
            <div>
              <FieldLabel label="Decision" required />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "FIT", label: "FIT for Surgery", color: "emerald" },
                  { value: "CONDITIONAL", label: "CONDITIONAL", color: "amber" },
                  { value: "UNFIT", label: "UNFIT for Surgery", color: "red" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update("decision", opt.value)}
                    className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                      data.decision === opt.value
                        ? `border-${opt.color}-600 bg-${opt.color}-50`
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className={`text-sm font-bold ${data.decision === opt.value ? `text-${opt.color}-700` : "text-gray-600"}`}>{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>
            {data.decision === "CONDITIONAL" && (
              <div>
                <FieldLabel label="Conditions" required />
                <textarea value={data.conditions} onChange={e => update("conditions", e.target.value)} placeholder="Specify conditions that must be met..." className="w-full p-3 bg-amber-50 rounded-xl text-sm outline-none ring-2 ring-amber-300 focus:ring-amber-500 resize-none" rows={3} />
              </div>
            )}
            <div>
              <FieldLabel label="Review Notes" />
              <textarea value={data.reviewNotes} onChange={e => update("reviewNotes", e.target.value)} placeholder="Additional notes for the surgical team..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={3} />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </>
  )
}
