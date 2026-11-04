"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Plus, Activity, Droplet, Wind, Thermometer, Weight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { addVitalRecord } from "@/lib/actions/vitals"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export function VitalsTab({ admission, availableDoctors }: { admission: any; availableDoctors: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    recordedById: "",
    bp: "",
    pulse: "",
    temperature: "",
    spO2: "",
    respiratoryRate: "",
    weight: "",
    bloodSugar: "",
    notes: "",
  })

  const vitals = admission.vitals || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.recordedById) {
        toast.error("Please select who is recording these vitals.")
        setLoading(false)
        return
      }

      const result = await addVitalRecord({
        admissionId: admission.id,
        recordedById: formData.recordedById,
        bp: formData.bp,
        pulse: formData.pulse,
        temperature: formData.temperature,
        spO2: formData.spO2,
        respiratoryRate: formData.respiratoryRate,
        weight: formData.weight,
        bloodSugar: formData.bloodSugar,
        notes: formData.notes,
      })

      if (result.success) {
        toast.success("Vitals recorded successfully")
        setOpen(false)
        setFormData({
          recordedById: "", bp: "", pulse: "", temperature: "", spO2: "", respiratoryRate: "", weight: "", bloodSugar: "", notes: "",
        })
      } else {
        toast.error(result.error || "Failed to record vitals")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Patient Vitals</h3>
            <p className="text-sm text-gray-500">Track and monitor patient's vital signs</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              Record Vitals
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">Record Vitals</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Recorded By <span className="text-red-500">*</span></Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.recordedById}
                  onChange={(e) => setFormData({ ...formData, recordedById: e.target.value })}
                  required
                >
                  <option value="">Select Staff Member</option>
                  {availableDoctors.map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.user.name} {doc.specialization ? `(${doc.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Blood Pressure</Label>
                  <Input 
                    placeholder="e.g. 120/80" 
                    value={formData.bp}
                    onChange={(e) => setFormData({...formData, bp: e.target.value})}
                    className="rounded-lg border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pulse (bpm)</Label>
                  <Input 
                    placeholder="e.g. 72" 
                    value={formData.pulse}
                    onChange={(e) => setFormData({...formData, pulse: e.target.value})}
                    className="rounded-lg border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature (°F)</Label>
                  <Input 
                    placeholder="e.g. 98.6" 
                    value={formData.temperature}
                    onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                    className="rounded-lg border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SpO2 (%)</Label>
                  <Input 
                    placeholder="e.g. 98" 
                    value={formData.spO2}
                    onChange={(e) => setFormData({...formData, spO2: e.target.value})}
                    className="rounded-lg border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Respiratory Rate</Label>
                  <Input 
                    placeholder="e.g. 16" 
                    value={formData.respiratoryRate}
                    onChange={(e) => setFormData({...formData, respiratoryRate: e.target.value})}
                    className="rounded-lg border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Blood Sugar</Label>
                  <Input 
                    placeholder="e.g. 110" 
                    value={formData.bloodSugar}
                    onChange={(e) => setFormData({...formData, bloodSugar: e.target.value})}
                    className="rounded-lg border-gray-200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea 
                  placeholder="Any additional observations..." 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="rounded-lg border-gray-200"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                  {loading ? "Saving..." : "Save Vitals"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {vitals.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Vitals Recorded</h3>
            <p className="text-gray-500 max-w-sm">
              There are no vital signs recorded for this admission yet. Click the button above to add the first reading.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {vitals.map((vital: any) => (
              <div key={vital.id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {format(new Date(vital.recordedAt), "dd MMM yyyy, hh:mm a")}
                    </div>
                    <div className="text-sm text-gray-500">
                      Recorded by: {vital.recordedBy?.user?.name || vital.recordedByName || "Unknown"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {vital.bp && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium mb-1">Blood Pressure</div>
                      <div className="font-semibold text-gray-900">{vital.bp}</div>
                    </div>
                  )}
                  {vital.pulse && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                      <div className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Pulse
                      </div>
                      <div className="font-semibold text-gray-900">{vital.pulse} bpm</div>
                    </div>
                  )}
                  {vital.temperature && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                      <div className="text-xs text-orange-600 font-medium mb-1 flex items-center gap-1">
                        <Thermometer className="h-3 w-3" /> Temp
                      </div>
                      <div className="font-semibold text-gray-900">{vital.temperature} °F</div>
                    </div>
                  )}
                  {vital.spO2 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <div className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                        <Wind className="h-3 w-3" /> SpO2
                      </div>
                      <div className="font-semibold text-gray-900">{vital.spO2} %</div>
                    </div>
                  )}
                  {vital.respiratoryRate && (
                    <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
                      <div className="text-xs text-teal-600 font-medium mb-1 flex items-center gap-1">
                        <Wind className="h-3 w-3" /> RR
                      </div>
                      <div className="font-semibold text-gray-900">{vital.respiratoryRate}</div>
                    </div>
                  )}
                  {vital.bloodSugar && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                      <div className="text-xs text-purple-600 font-medium mb-1 flex items-center gap-1">
                        <Droplet className="h-3 w-3" /> Sugar
                      </div>
                      <div className="font-semibold text-gray-900">{vital.bloodSugar}</div>
                    </div>
                  )}
                </div>

                {vital.notes && (
                  <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-medium text-gray-700">Notes: </span>
                    {vital.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
