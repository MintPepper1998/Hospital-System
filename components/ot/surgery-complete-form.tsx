"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { completeSurgery, type WHOSignOutData, type PostOpData } from "@/app/actions/ot-workflow"
import {
  ArrowLeft, CheckCircle2, Loader2, ClipboardCheck, FileText,
  AlertTriangle, Activity, Scissors, Droplets
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

export function SurgeryCompleteForm({ surgery }: { surgery: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  const existingSignOut = (surgery.whoSignOut || {}) as WHOSignOutData
  const existingPostOp = (surgery.postOpNotes || {}) as PostOpData

  // Sign-Out state
  const [signOut, setSignOut] = useState<WHOSignOutData>({
    procedureRecorded: existingSignOut.procedureRecorded || false,
    instrumentCountCorrect: existingSignOut.instrumentCountCorrect || false,
    specimenLabeled: existingSignOut.specimenLabeled || false,
    specimenDetails: existingSignOut.specimenDetails || "",
    equipmentIssues: existingSignOut.equipmentIssues || "",
    recoveryPlan: existingSignOut.recoveryPlan || "",
  })

  // Post-Op state
  const [postOp, setPostOp] = useState<PostOpData>({
    findings: existingPostOp.findings || surgery.findings || "",
    procedurePerformed: existingPostOp.procedurePerformed || "",
    complications: existingPostOp.complications || surgery.complications || "",
    estimatedBloodLoss: existingPostOp.estimatedBloodLoss || undefined,
    bloodProductsUsed: existingPostOp.bloodProductsUsed || "",
    drainInserted: existingPostOp.drainInserted || false,
    drainDetails: existingPostOp.drainDetails || "",
    sutureType: existingPostOp.sutureType || "",
    postOpInstructions: existingPostOp.postOpInstructions || "",
    nextReview: existingPostOp.nextReview || "",
  })

  const isNotInProgress = surgery.status !== "IN_PROGRESS"
  const canComplete = signOut.procedureRecorded && signOut.instrumentCountCorrect

  const handleComplete = () => {
    startTransition(async () => {
      const res = await completeSurgery(surgery.id, signOut, postOp)
      if (res.success) {
        toast.success(res.message)
        router.push(`/dashboard/ot/schedule?surgeryId=${surgery.id}`)
      } else {
        toast.error(res.message)
      }
    })
  }

  if (isNotInProgress) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Surgery Not In Progress</h2>
        <p className="text-gray-500 mb-6">The surgery must be started first before it can be completed. Current status: <strong>{surgery.status}</strong></p>
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
            <h1 className="text-2xl font-bold text-gray-900">Complete Surgery</h1>
            <p className="text-sm text-gray-500 font-medium">{surgery.patient.user.name} · {surgery.procedureName}</p>
          </div>
        </div>
        {surgery.actualStartTime && (
          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">In progress since</div>
            <div className="text-sm font-bold text-blue-600">{new Date(surgery.actualStartTime).toLocaleTimeString()}</div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* WHO Sign Out */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">WHO Sign Out</h3>
              <p className="text-xs text-gray-500">Before patient leaves the operating room</p>
            </div>
          </div>
          <div className="space-y-3">
            <ChecklistItem label="Procedure name recorded" description="Confirmed the procedure performed matches documentation" checked={signOut.procedureRecorded} onChange={v => setSignOut(p => ({ ...p, procedureRecorded: v }))} />
            <ChecklistItem label="Instrument, sponge & needle counts correct" description="All counts verified and reconciled" checked={signOut.instrumentCountCorrect} onChange={v => setSignOut(p => ({ ...p, instrumentCountCorrect: v }))} />
            <ChecklistItem label="Specimens labeled correctly" description="All tissue specimens properly identified" checked={signOut.specimenLabeled} onChange={v => setSignOut(p => ({ ...p, specimenLabeled: v }))} required={false} />
            {signOut.specimenLabeled && (
              <div className="ml-9">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Specimen Details</label>
                <textarea value={signOut.specimenDetails || ""} onChange={e => setSignOut(p => ({ ...p, specimenDetails: e.target.value }))}
                  placeholder="Describe specimens, site of origin, destination..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              </div>
            )}
            <div className="p-4 rounded-xl border-2 border-gray-100 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Equipment Issues</label>
                <textarea value={signOut.equipmentIssues || ""} onChange={e => setSignOut(p => ({ ...p, equipmentIssues: e.target.value }))}
                  placeholder="Any equipment problems to flag..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Key Recovery Concerns</label>
                <textarea value={signOut.recoveryPlan || ""} onChange={e => setSignOut(p => ({ ...p, recoveryPlan: e.target.value }))}
                  placeholder="Key concerns for the recovery team..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
              </div>
            </div>
          </div>
        </div>

        {/* Surgical Summary */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Surgical Summary</h3>
              <p className="text-xs text-gray-500">Document the procedure details and outcome</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Procedure Performed</label>
              <textarea value={postOp.procedurePerformed || ""} onChange={e => setPostOp(p => ({ ...p, procedurePerformed: e.target.value }))}
                placeholder="Actual procedure performed (may differ from planned)..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Intraoperative Findings</label>
              <textarea value={postOp.findings || ""} onChange={e => setPostOp(p => ({ ...p, findings: e.target.value }))}
                placeholder="Describe intraoperative findings..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={3} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Complications</label>
              <textarea value={postOp.complications || ""} onChange={e => setPostOp(p => ({ ...p, complications: e.target.value }))}
                placeholder="Any complications during the procedure..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> Est. Blood Loss (ml)
                </label>
                <input type="number" value={postOp.estimatedBloodLoss ?? ""} onChange={e => setPostOp(p => ({ ...p, estimatedBloodLoss: parseInt(e.target.value) || undefined }))}
                  placeholder="ml" className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Blood Products Used</label>
                <input value={postOp.bloodProductsUsed || ""} onChange={e => setPostOp(p => ({ ...p, bloodProductsUsed: e.target.value }))}
                  placeholder="e.g., 2 units PRBC" className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Scissors className="w-3 h-3" /> Suture / Closure
                </label>
                <input value={postOp.sutureType || ""} onChange={e => setPostOp(p => ({ ...p, sutureType: e.target.value }))}
                  placeholder="e.g., Vicryl 3-0" className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>

            {/* Drain */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input type="checkbox" checked={postOp.drainInserted || false} onChange={e => setPostOp(p => ({ ...p, drainInserted: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm font-medium text-gray-700">Drain Inserted</span>
              </label>
              {postOp.drainInserted && (
                <input value={postOp.drainDetails || ""} onChange={e => setPostOp(p => ({ ...p, drainDetails: e.target.value }))}
                  placeholder="Type, site, and details..." className="flex-1 h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600" />
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Post-Op Instructions</label>
              <textarea value={postOp.postOpInstructions || ""} onChange={e => setPostOp(p => ({ ...p, postOpInstructions: e.target.value }))}
                placeholder="Post-operative orders, recovery instructions, medications..." className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 resize-none" rows={3} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button onClick={() => router.back()} className="px-6 py-3 rounded-full text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Cancel
          </button>
          <button onClick={() => setShowConfirm(true)} disabled={!canComplete} className={`px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer ${
            canComplete ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700" : "bg-gray-100 text-gray-300 cursor-not-allowed"
          }`}>
            <CheckCircle2 className="w-5 h-5" /> Complete Surgery
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirm Surgery Completion</h3>
              <p className="text-sm text-gray-500 mt-2">
                You are about to mark <strong>{surgery.procedureName}</strong> as completed. The current time will be recorded as the surgery end time.
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center">
              <button onClick={() => setShowConfirm(false)} className="px-6 py-3 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleComplete} disabled={isPending} className="px-8 py-3 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 flex items-center gap-2 cursor-pointer">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Confirm Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
