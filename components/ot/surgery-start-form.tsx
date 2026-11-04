"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { startSurgery, type WHOSignInData, type WHOTimeOutData } from "@/app/actions/ot-workflow"
import {
  ArrowLeft, PlayCircle, Loader2, ShieldCheck, Clock, CheckCircle2,
  AlertTriangle, Syringe, Users, Activity
} from "lucide-react"

function ChecklistItem({ label, description, checked, onChange, required = true }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; required?: boolean
}) {
  return (
    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
      checked ? "border-emerald-300 bg-emerald-50/50" : "border-gray-100 hover:border-gray-200 bg-white"
    }`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 mt-0.5 accent-emerald-600 rounded shrink-0" />
      <div>
        <div className={`text-sm font-bold ${checked ? "text-emerald-800" : "text-gray-700"}`}>
          {label} {required && <span className="text-red-400">*</span>}
        </div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
      {checked && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />}
    </label>
  )
}

export function SurgeryStartForm({ surgery }: { surgery: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<"signIn" | "timeOut" | "confirm">("signIn")
  const [showConfirm, setShowConfirm] = useState(false)

  // Existing data if any
  const existingSignIn = (surgery.whoSignIn || {}) as WHOSignInData
  const existingTimeOut = (surgery.whoTimeOut || {}) as WHOTimeOutData

  // Sign-In state
  const [signIn, setSignIn] = useState<WHOSignInData>({
    patientIdentityConfirmed: existingSignIn.patientIdentityConfirmed || false,
    surgicalSiteMarked: existingSignIn.surgicalSiteMarked || false,
    procedureConfirmed: existingSignIn.procedureConfirmed || false,
    consentSigned: existingSignIn.consentSigned || false,
    pulseOximeterAttached: existingSignIn.pulseOximeterAttached || false,
    knownAllergiesReviewed: existingSignIn.knownAllergiesReviewed || false,
    airwayRiskAssessed: existingSignIn.airwayRiskAssessed || false,
    bloodLossRisk: existingSignIn.bloodLossRisk || "Low",
    ivAccessEstablished: existingSignIn.ivAccessEstablished || false,
  })

  // Time-Out state
  const [timeOut, setTimeOut] = useState<WHOTimeOutData>({
    teamIntroduced: existingTimeOut.teamIntroduced || false,
    patientNameProcedureSite: existingTimeOut.patientNameProcedureSite || false,
    antibioticGiven: existingTimeOut.antibioticGiven || false,
    antibioticTime: existingTimeOut.antibioticTime || "",
    essentialImagingDisplayed: existingTimeOut.essentialImagingDisplayed || false,
    criticalEventsSurgeon: existingTimeOut.criticalEventsSurgeon || "",
    criticalEventsAnesthesia: existingTimeOut.criticalEventsAnesthesia || "",
    criticalEventsNursing: existingTimeOut.criticalEventsNursing || "",
    sterilityConcerns: existingTimeOut.sterilityConcerns || false,
  })

  const signInCount = Object.values(signIn).filter(v => v === true).length
  const signInTotal = 8 // boolean fields count
  const timeOutBooleans = [timeOut.teamIntroduced, timeOut.patientNameProcedureSite, timeOut.antibioticGiven, timeOut.essentialImagingDisplayed, timeOut.sterilityConcerns]
  const timeOutCount = timeOutBooleans.filter(Boolean).length
  const timeOutTotal = 5

  const canProceedToTimeOut = signInCount === signInTotal
  const canStart = timeOutCount === timeOutTotal

  const isPACCleared = surgery.pacStatus === "FIT" || surgery.pacStatus === "CONDITIONAL"
  const isAlreadyStarted = surgery.status !== "SCHEDULED"

  const handleStart = () => {
    startTransition(async () => {
      const res = await startSurgery(surgery.id, signIn, timeOut)
      if (res.success) {
        toast.success(res.message)
        router.push(`/dashboard/ot/schedule?surgeryId=${surgery.id}`)
      } else {
        toast.error(res.message)
      }
    })
  }

  if (!isPACCleared) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">PAC Clearance Required</h2>
        <p className="text-gray-500 mb-6">The patient must be cleared by the anesthesia team before surgery can begin.</p>
        <button onClick={() => router.push(`/dashboard/ot/pac/${surgery.id}`)} className="px-6 py-3 bg-blue-600 text-white rounded-full text-sm font-bold shadow-md cursor-pointer">
          Go to PAC Assessment
        </button>
      </div>
    )
  }

  if (isAlreadyStarted) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Surgery Already {surgery.status}</h2>
        <p className="text-gray-500 mb-6">This surgery has already been started or completed.</p>
        <button onClick={() => router.back()} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full text-sm font-bold cursor-pointer">
          Go Back
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Start Surgery</h1>
            <p className="text-sm text-gray-500 font-medium">{surgery.patient.user.name} · {surgery.procedureName}</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setStep("signIn")} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer ${
          step === "signIn" ? "bg-blue-600 text-white shadow-md" : signInCount === signInTotal ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
        }`}>
          <ShieldCheck className="w-4 h-4" /> Sign In ({signInCount}/{signInTotal})
        </button>
        <div className="w-8 h-0.5 bg-gray-200" />
        <button onClick={() => canProceedToTimeOut && setStep("timeOut")} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer ${
          step === "timeOut" ? "bg-blue-600 text-white shadow-md" : timeOutCount === timeOutTotal ? "bg-emerald-100 text-emerald-700" : canProceedToTimeOut ? "bg-gray-100 text-gray-600" : "bg-gray-50 text-gray-300"
        }`}>
          <Clock className="w-4 h-4" /> Time Out ({timeOutCount}/{timeOutTotal})
        </button>
      </div>

      {/* Sign In */}
      {step === "signIn" && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">WHO Sign In</h3>
              <p className="text-xs text-gray-500">Before induction of anesthesia</p>
            </div>
          </div>
          <div className="space-y-3">
            <ChecklistItem label="Patient identity confirmed" description="Name, ID band, and verbal confirmation" checked={signIn.patientIdentityConfirmed} onChange={v => setSignIn(p => ({ ...p, patientIdentityConfirmed: v }))} />
            <ChecklistItem label="Surgical site marked" description="Correct site/side marked by surgeon" checked={signIn.surgicalSiteMarked} onChange={v => setSignIn(p => ({ ...p, surgicalSiteMarked: v }))} />
            <ChecklistItem label="Procedure confirmed" description="Planned procedure verified with patient" checked={signIn.procedureConfirmed} onChange={v => setSignIn(p => ({ ...p, procedureConfirmed: v }))} />
            <ChecklistItem label="Consent form signed" description="Written informed consent on file" checked={signIn.consentSigned} onChange={v => setSignIn(p => ({ ...p, consentSigned: v }))} />
            <ChecklistItem label="Pulse oximeter attached & functioning" checked={signIn.pulseOximeterAttached} onChange={v => setSignIn(p => ({ ...p, pulseOximeterAttached: v }))} />
            <ChecklistItem label="Known allergies reviewed" description="Drug and food allergies verified" checked={signIn.knownAllergiesReviewed} onChange={v => setSignIn(p => ({ ...p, knownAllergiesReviewed: v }))} />
            <ChecklistItem label="Airway risk assessed" description="Difficult airway plan in place if needed" checked={signIn.airwayRiskAssessed} onChange={v => setSignIn(p => ({ ...p, airwayRiskAssessed: v }))} />
            <ChecklistItem label="IV access established" description="Intravenous line secured" checked={signIn.ivAccessEstablished} onChange={v => setSignIn(p => ({ ...p, ivAccessEstablished: v }))} />
            <div className="p-4 rounded-xl border-2 border-gray-100 bg-white">
              <label className="text-sm font-bold text-gray-700 mb-2 block">Anticipated Blood Loss</label>
              <div className="flex gap-3">
                {["Low", "High"].map(v => (
                  <button key={v} onClick={() => setSignIn(p => ({ ...p, bloodLossRisk: v }))} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    signIn.bloodLossRisk === v
                      ? v === "Low" ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300" : "bg-red-100 text-red-700 border-2 border-red-300"
                      : "bg-gray-50 text-gray-500 border-2 border-gray-100"
                  }`}>
                    {v === "Low" ? "< 500ml (Low)" : "≥ 500ml (High)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={() => setStep("timeOut")} disabled={!canProceedToTimeOut} className={`px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer ${
              canProceedToTimeOut ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}>
              Proceed to Time Out →
            </button>
          </div>
        </div>
      )}

      {/* Time Out */}
      {step === "timeOut" && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">WHO Time Out</h3>
              <p className="text-xs text-gray-500">Before skin incision — entire team pauses</p>
            </div>
          </div>
          <div className="space-y-3">
            <ChecklistItem label="All team members introduced" description="Name and role confirmed by each member" checked={timeOut.teamIntroduced} onChange={v => setTimeOut(p => ({ ...p, teamIntroduced: v }))} />
            <ChecklistItem label="Patient, procedure & site re-verified" description="Final verbal confirmation by team" checked={timeOut.patientNameProcedureSite} onChange={v => setTimeOut(p => ({ ...p, patientNameProcedureSite: v }))} />
            <ChecklistItem label="Prophylactic antibiotic administered" description="Within last 60 minutes" checked={timeOut.antibioticGiven} onChange={v => setTimeOut(p => ({ ...p, antibioticGiven: v }))} />
            {timeOut.antibioticGiven && (
              <div className="ml-9">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Time Administered</label>
                <input type="time" value={timeOut.antibioticTime || ""} onChange={e => setTimeOut(p => ({ ...p, antibioticTime: e.target.value }))}
                  className="h-11 bg-gray-50 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600" />
              </div>
            )}
            <ChecklistItem label="Essential imaging displayed" description="Relevant scans/images available in OT" checked={timeOut.essentialImagingDisplayed} onChange={v => setTimeOut(p => ({ ...p, essentialImagingDisplayed: v }))} />
            <ChecklistItem label="Equipment sterility confirmed" description="All instruments properly sterilized" checked={timeOut.sterilityConcerns} onChange={v => setTimeOut(p => ({ ...p, sterilityConcerns: v }))} />

            {/* Critical Events */}
            <div className="p-4 rounded-xl border-2 border-gray-100 bg-white space-y-3">
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Anticipated Critical Events
              </h4>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Surgeon&apos;s Concerns</label>
                <textarea value={timeOut.criticalEventsSurgeon || ""} onChange={e => setTimeOut(p => ({ ...p, criticalEventsSurgeon: e.target.value }))}
                  placeholder="Critical steps, expected blood loss, special equipment..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Anesthesia Concerns</label>
                <textarea value={timeOut.criticalEventsAnesthesia || ""} onChange={e => setTimeOut(p => ({ ...p, criticalEventsAnesthesia: e.target.value }))}
                  placeholder="Patient-specific concerns, difficult airway plan..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nursing Concerns</label>
                <textarea value={timeOut.criticalEventsNursing || ""} onChange={e => setTimeOut(p => ({ ...p, criticalEventsNursing: e.target.value }))}
                  placeholder="Special equipment, instruments, prep..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep("signIn")} className="px-6 py-3 rounded-full text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer">
              ← Back to Sign In
            </button>
            <button onClick={() => setShowConfirm(true)} disabled={!canStart} className={`px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer ${
              canStart ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700" : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}>
              <PlayCircle className="w-5 h-5" /> Start Surgery
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirm Surgery Start</h3>
              <p className="text-sm text-gray-500 mt-2">
                You are about to mark <strong>{surgery.procedureName}</strong> for patient <strong>{surgery.patient.user.name}</strong> as started. This action records the current time as the surgery start time.
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center">
              <button onClick={() => setShowConfirm(false)} className="px-6 py-3 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleStart} disabled={isPending} className="px-8 py-3 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 flex items-center gap-2 cursor-pointer">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                Confirm & Start
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
