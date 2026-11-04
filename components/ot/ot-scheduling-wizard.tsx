"use client"

import React, { useState } from "react"
import { scheduleSurgery, updateSurgeryDetails } from "@/app/actions/ot-schedule"
import { Loader2, Scissors, Calendar, Clock, MapPin, UserSquare2, ArrowRight, ShieldCheck, FileText, CheckCircle2, AlertCircle, Syringe, ClipboardList } from "lucide-react"
import { toast } from "sonner"

export function OTSchedulingWizard({
  patient,
  schedulingData,
  initialSurgery,
  onScheduled
}: {
  patient?: any
  schedulingData: any
  initialSurgery?: any
  onScheduled: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    procedureCode: initialSurgery?.procedureCode || "",
    procedureName: initialSurgery?.procedureName || "",
    theaterId: initialSurgery?.theaterId || "",
    leadSurgeonId: initialSurgery?.leadSurgeonId || "",
    assistantSurgeons: initialSurgery?.assistantSurgeons || "",
    anesthetistId: initialSurgery?.anesthetistId || "",
    anesthetistName: initialSurgery?.anesthetistName || "",
    scheduledDate: initialSurgery?.scheduledDate ? new Date(initialSurgery.scheduledDate).toISOString().slice(0, 16) : "",
    durationMinutes: initialSurgery?.durationMinutes ? initialSurgery.durationMinutes.toString() : "60",
    diagnosis: initialSurgery?.diagnosis || "",
    consumables: initialSurgery?.consumables?.items ? initialSurgery.consumables.items.join(", ") : ""
  })

  const { procedures, theaters, doctors, nurses, anesthetists } = schedulingData

  const handleProcedureSelect = (procId: string) => {
    const proc = procedures.find((p: any) => p.id === procId)
    if (proc) {
      setFormData({
        ...formData,
        procedureCode: proc.code || "",
        procedureName: proc.name,
        durationMinutes: proc.estimatedDuration ? proc.estimatedDuration.toString() : formData.durationMinutes
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initialSurgery && !patient) {
      toast.error("No patient selected")
      return
    }

    setLoading(true)
    try {
      // Find anesthetist name if ID was selected
      let finalAnesthetistName = formData.anesthetistName
      if (formData.anesthetistId) {
        const selectedAnes = anesthetists.find((a: any) => a.id === formData.anesthetistId)
        if (selectedAnes) finalAnesthetistName = selectedAnes.user.name
      }

      const payload = {
        ...formData,
        durationMinutes: parseInt(formData.durationMinutes) || 60,
        anesthetistId: formData.anesthetistId || null,
        anesthetistName: finalAnesthetistName || null,
        consumables: formData.consumables ? { items: formData.consumables.split(',').map((s: string) => s.trim()) } : null
      }

      let res
      if (initialSurgery) {
        res = await updateSurgeryDetails(initialSurgery.id, payload)
        if (res.success) {
          toast.success("Operation updated successfully!")
          onScheduled(initialSurgery.id)
        } else {
          toast.error(res.error || "Failed to update operation")
        }
      } else {
        res = await scheduleSurgery({
          ...payload,
          patientId: patient.id,
        })
        if (res.success) {
          toast.success("Operation scheduled successfully!")
          if (res.surgeryId) onScheduled(res.surgeryId)
        } else {
          toast.error(res.error || "Failed to schedule operation")
        }
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col lg:flex-row gap-6">
      
      {/* Left Column - Main Details */}
      <div className="flex-1 space-y-6">
        
        {/* Procedure & Theater */}
        <div className="p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Procedure Details</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Select Procedure *</label>
              <select 
                required
                className="w-full mt-2 px-5 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                onChange={(e) => handleProcedureSelect(e.target.value)}
                value={procedures.find((p:any) => p.name === formData.procedureName)?.id || ""}
              >
                <option value="">-- Choose Procedure --</option>
                {procedures.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Diagnosis</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Appendicitis"
                  className="w-full mt-2 px-5 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={formData.diagnosis}
                  onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Operation Theater *</label>
                <select 
                  required
                  className="w-full mt-2 px-5 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                  value={formData.theaterId}
                  onChange={e => setFormData({...formData, theaterId: e.target.value})}
                >
                  <option value="">-- Choose OT --</option>
                  {theaters.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Schedule & Duration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Date & Time *</label>
              <input
                type="datetime-local"
                required
                className="w-full mt-2 px-5 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                value={formData.scheduledDate}
                onChange={e => setFormData({...formData, scheduledDate: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Estimated Duration (Minutes)</label>
              <input
                type="number"
                min="15"
                step="15"
                required
                className="w-full mt-2 px-5 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                value={formData.durationMinutes}
                onChange={e => setFormData({...formData, durationMinutes: e.target.value})}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Right Column - Staff & Equipment */}
      <div className="w-full lg:w-[450px] shrink-0 space-y-6">
        
        {/* Staff Assignment */}
        <div className="p-8 bg-[#FAFAFA] border border-gray-200/60 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <UserSquare2 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Surgical Team</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Lead Surgeon *</label>
              <select 
                required
                className="w-full mt-2 px-5 py-3.5 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                value={formData.leadSurgeonId}
                onChange={e => setFormData({...formData, leadSurgeonId: e.target.value})}
              >
                <option value="">-- Select Surgeon --</option>
                {doctors.map((d: any) => (
                  <option key={d.id} value={d.id}>Dr. {d.user.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Anesthetist</label>
              <div className="flex flex-col gap-2 mt-2">
                <select 
                  className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                  value={formData.anesthetistId}
                  onChange={e => setFormData({...formData, anesthetistId: e.target.value, anesthetistName: ""})}
                >
                  <option value="">-- In-house Anesthetist --</option>
                  {anesthetists.map((d: any) => (
                    <option key={d.id} value={d.id}>Dr. {d.user.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter custom name..."
                  className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData.anesthetistName}
                  onChange={e => setFormData({...formData, anesthetistName: e.target.value, anesthetistId: ""})}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Assistant Surgeons / Staff</label>
              <textarea
                placeholder="Comma separated names or roles..."
                rows={2}
                className="w-full mt-2 px-5 py-3.5 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                value={formData.assistantSurgeons}
                onChange={e => setFormData({...formData, assistantSurgeons: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="p-8 bg-[#FAFAFA] border border-gray-200/60 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <Syringe className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Required Resources</h3>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Equipment & Consumables</label>
            <textarea
              placeholder="e.g. C-Arm, Extra Sponges, Specialized Stents..."
              rows={3}
              className="w-full mt-2 px-5 py-3.5 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              value={formData.consumables}
              onChange={e => setFormData({...formData, consumables: e.target.value})}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !formData.procedureName || !formData.theaterId || !formData.leadSurgeonId || !formData.scheduledDate}
          className="w-full group relative flex items-center justify-between bg-black text-white px-8 py-5 rounded-[2rem] text-base font-bold tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-xl hover:shadow-black/20 disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-none"
        >
          <div className="flex items-center gap-3">
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>{loading ? (initialSurgery ? "Updating..." : "Scheduling...") : (initialSurgery ? "Update Operation" : "Schedule Operation")}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-2 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </button>

      </div>
    </form>
  )
}
