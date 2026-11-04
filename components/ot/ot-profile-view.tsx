"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { updateSurgeryDetails, cancelSurgery } from "@/app/actions/ot-schedule"
import { Loader2, Calendar, Clock, MapPin, UserSquare2, ShieldAlert, FileText, Upload, Printer, Activity, CheckCircle2, AlertCircle, Trash2, Edit, X, Coins, Pill } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { OTStaffAssignments } from "./ot-staff-assignments"
import { SurgeryOperationManagerModal } from "./surgery-operation-manager-modal"

export function OTProfileView({
  surgery,
  schedulingData,
  onUpdate,
  onEdit
}: {
  surgery: any
  schedulingData: any
  onUpdate: (s: any) => void
  onEdit?: () => void
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showManagerModal, setShowManagerModal] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(fieldName)
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      
      if (!uploadRes.ok) throw new Error("Upload failed")
      
      const { url } = await uploadRes.json()
      
      const updateRes = await updateSurgeryDetails(surgery.id, { [fieldName]: url })
      if (updateRes.success) {
        toast.success("Document uploaded successfully")
        onUpdate({ ...surgery, [fieldName]: url })
      }
    } catch (error) {
      toast.error("Failed to upload document")
    } finally {
      setUploading(null)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation")
      return
    }

    setCancelling(true)
    const res = await cancelSurgery(surgery.id, cancelReason)
    if (res.success) {
      toast.success("Operation cancelled")
      setShowCancelModal(false)
      onUpdate({ ...surgery, status: "CANCELLED", cancellationReason: cancelReason })
    } else {
      toast.error(res.error || "Failed to cancel")
    }
    setCancelling(false)
  }

  const handlePrint = (formType: string) => {
    let route = ""
    if (formType === "Patient Consent Form") route = `/dashboard/ot/print/consent/${surgery.id}`
    else if (formType === "Pre-Anesthesia Record") route = `/dashboard/ot/print/anesthesia/${surgery.id}`
    else if (formType === "Operation Notes") route = `/dashboard/ot/print/notes/${surgery.id}`
    
    if (route) {
      router.push(route)
    } else {
      window.print()
    }
  }

  // Generate Timeline
  const timeline = [
    { title: "Operation Scheduled", time: surgery.createdAt, completed: true, desc: `Scheduled by ${surgery.leadSurgeon?.user?.name}`, link: null },
    { title: "PAC Clearance", time: surgery.pacCheckedAt, completed: !!surgery.pacCheckedAt, desc: surgery.pacStatus === "FIT" ? "Patient cleared for surgery" : surgery.pacStatus === "CONDITIONAL" ? "Cleared with conditions" : surgery.pacStatus === "UNFIT" ? "Patient unfit for surgery" : "Pending Anesthesia clearance", link: `/dashboard/ot/pac/${surgery.id}` },
    { title: "Consent Forms Uploaded", time: null, completed: !!surgery.consentFormUrl, desc: "Patient/Guardian consent", link: null },
    { title: "Surgery Started", time: surgery.actualStartTime, completed: !!surgery.actualStartTime, desc: surgery.actualStartTime ? "Patient entered OT" : "WHO Sign-In & Time-Out required", link: `/dashboard/ot/start/${surgery.id}` },
    { title: "Surgery Completed", time: surgery.actualEndTime, completed: !!surgery.actualEndTime, desc: surgery.actualEndTime ? "Patient shifted to recovery" : "WHO Sign-Out & Post-Op summary", link: `/dashboard/ot/complete/${surgery.id}` },
  ]

  const FormItem = ({ title, fieldName, url }: { title: string, fieldName: string, url: string | null }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${url ? 'bg-emerald-50' : 'bg-gray-50'}`}>
          {url ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <FileText className="w-5 h-5 text-gray-400" />}
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{url ? "Uploaded securely" : "Pending upload"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full text-xs font-bold transition-colors">
            View
          </a>
        )}
        <button onClick={() => handlePrint(title)} className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <Printer className="w-4 h-4" />
        </button>
        <div className="relative">
          <button disabled={uploading === fieldName} className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-full transition-colors overflow-hidden">
            {uploading === fieldName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <input 
              type="file" 
              accept="application/pdf,image/*" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => handleFileUpload(e, fieldName)}
            />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="w-full flex flex-col lg:flex-row gap-6">
      
      {/* Left Column: Details & Forms */}
      <div className="flex-1 space-y-6">
        
        {/* Banner */}
        <div className="p-8 bg-blue-600 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-blue-600/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase ${surgery.status === 'CANCELLED' ? 'bg-red-500/20 text-red-100' : 'bg-white/20 text-white'}`}>
                  {surgery.status}
                </span>
                {surgery.isEmergency && (
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-red-500 text-white animate-pulse">
                    EMERGENCY
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{surgery.procedureName}</h2>
              {surgery.diagnosis && <p className="text-blue-100 mt-2 font-medium">{surgery.diagnosis}</p>}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {surgery.status !== 'CANCELLED' && (
                <button
                  onClick={() => setShowManagerModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-full text-sm font-bold shadow-lg shadow-black/10 transition-colors"
                >
                  <Coins className="w-4 h-4 text-emerald-600" />
                  Manage Charges, Staff & Meds
                </button>
              )}
              {surgery.status !== 'CANCELLED' && surgery.status !== 'COMPLETED' && (
                <>
                  <button 
                    onClick={onEdit}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit OT
                  </button>
                  <button 
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500/80 hover:bg-red-500 rounded-full text-sm font-bold transition-colors"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          
          {surgery.cancellationReason && (
             <div className="mt-6 p-4 bg-red-500/20 rounded-2xl border border-red-400/30">
               <span className="text-xs font-bold text-red-200 uppercase tracking-widest block mb-1">Cancellation Reason</span>
               <p className="text-sm font-medium text-white">{surgery.cancellationReason}</p>
             </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <Calendar className="w-5 h-5 text-indigo-500 mb-3" />
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date & Time</div>
            <div className="text-sm font-bold text-gray-900">{format(new Date(surgery.scheduledDate), "dd MMM, hh:mm a")}</div>
          </div>
          <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <Clock className="w-5 h-5 text-orange-500 mb-3" />
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Est. Duration</div>
            <div className="text-sm font-bold text-gray-900">{surgery.durationMinutes} Minutes</div>
          </div>
          <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <UserSquare2 className="w-5 h-5 text-blue-500 mb-3" />
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lead Surgeon</div>
            <div className="text-sm font-bold text-gray-900">{surgery.leadSurgeon?.user?.name || "N/A"}</div>
          </div>
          <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <MapPin className="w-5 h-5 text-emerald-500 mb-3" />
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Theater</div>
            <div className="text-sm font-bold text-gray-900">{surgery.theater?.name || "N/A"}</div>
          </div>
        </div>

        {/* Consumables */}
        {(surgery.consumables as any)?.items && (
          <div className="p-6 bg-[#FAFAFA] border border-gray-200/60 rounded-[2rem]">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Required Equipment & Consumables
            </h3>
            <div className="flex flex-wrap gap-2">
              {(surgery.consumables as any).items.map((item: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-lg">
                  {item}
                </span>
              ))}
            </div>
            <button 
              onClick={() => setShowManagerModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
            >
              <Pill className="w-3.5 h-3.5" />
              + Add / Return Medicines
            </button>
          </div>
        )}

        {/* Staff Assignments */}
        <OTStaffAssignments surgeryId={surgery.id} />

        {/* Form Management */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Documents & Forms</h3>
          <div className="space-y-4">
            <FormItem title="Patient Consent Form" fieldName="consentFormUrl" url={surgery.consentFormUrl} />
            <FormItem title="Pre-Anesthesia Record" fieldName="anaesthesiaRecordUrl" url={surgery.anaesthesiaRecordUrl} />
            <FormItem title="Operation Notes" fieldName="operationNoteUrl" url={surgery.operationNoteUrl} />
          </div>
        </div>
      </div>

      {/* Right Column: Timeline */}
      <div className="w-full lg:w-[380px] shrink-0 p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm self-start sticky top-6">
        <h3 className="text-xl font-bold text-gray-900 mb-8">Surgery Timeline</h3>
        
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {timeline.map((item, index) => {
            const isClickable = !!item.link && surgery.status !== "CANCELLED"
            const Wrapper = isClickable ? 'button' : 'div'
            return (
            <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${item.completed ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                {item.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              
              <Wrapper
                {...(isClickable ? { onClick: () => router.push(item.link!) } : {})}
                className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-[1.5rem] border border-gray-100 text-left transition-all ${
                  isClickable ? 'bg-[#FAFAFA] hover:bg-blue-50 hover:border-blue-200 cursor-pointer' : 'bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-sm font-bold ${item.completed ? 'text-gray-900' : 'text-gray-400'}`}>{item.title}</h4>
                  {isClickable && !item.completed && <span className="text-[10px] font-bold text-blue-500">→</span>}
                </div>
                <div className={`text-xs font-medium ${item.completed ? 'text-gray-500' : 'text-gray-400'}`}>{item.desc}</div>
                {item.time && (
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-3">
                    {format(new Date(item.time), "dd MMM, hh:mm a")}
                  </div>
                )}
              </Wrapper>
            </div>
          )})}
        </div>

      </div>

    </div>

    {/* Cancel Surgery Modal (High-End Design) */}
    {showCancelModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Cancel Operation</h3>
                <p className="text-sm font-medium text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <button onClick={() => setShowCancelModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-6">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Reason for Cancellation</label>
            <textarea 
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="E.g., Patient unfit for surgery, equipment failure..."
              className="w-full min-h-[100px] p-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-medium outline-none focus:ring-2 focus:ring-red-500 resize-none"
            ></textarea>
          </div>
          
          <div className="flex items-center gap-3 justify-end">
            <button onClick={() => setShowCancelModal(false)} className="px-6 py-3 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
              Keep Scheduled
            </button>
            <button 
              onClick={handleCancel}
              disabled={cancelling}
              className="px-6 py-3 rounded-full bg-red-500 text-white text-sm font-bold shadow-md shadow-red-500/20 hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
              Cancel Operation
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Surgery Operation Manager Modal (Charges, Doctors & Staff, Add & Return Meds) */}
    {showManagerModal && (
      <SurgeryOperationManagerModal
        surgeryId={surgery.id}
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        onSuccess={() => {
          onUpdate({ ...surgery })
        }}
      />
    )}
  </>
  )
}
