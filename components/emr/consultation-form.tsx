"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { 
  Activity, 
  FlaskConical, 
  Save, 
  Loader2,
  Calendar,
  FileText,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { saveConsultation } from "@/lib/actions"
import { useRouter } from "next/navigation"
import { PrescriptionWriter, type Medication } from "@/components/clinical/prescription-writer"

// Re-export for external use if needed
export type { Medication }

interface EMRConsultationFormProps {
  appointment: any
  labTests: any[]
}

export function EMRConsultationForm({ appointment, labTests }: EMRConsultationFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Vitals
  const [bloodPressure, setBloodPressure] = useState(appointment.bloodPressure || "")
  const [pulse, setPulse] = useState(appointment.pulse || "")
  const [temperature, setTemperature] = useState(appointment.temperature || "")
  const [weight, setWeight] = useState(appointment.weight || "")
  const [spo2, setSpo2] = useState(appointment.spo2 || "")
  
  // Clinical Details
  const [chiefComplaint, setChiefComplaint] = useState(appointment.chiefComplaint || appointment.reason || "")
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState(appointment.historyOfPresentIllness || "")
  const [symptoms, setSymptoms] = useState(appointment.symptoms || "")
  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || "")
  const [notes, setNotes] = useState(appointment.notes || "")
  const [followUpDate, setFollowUpDate] = useState("")
  
  // Medications
  const [medications, setMedications] = useState<Medication[]>([])
  
  // Lab Tests
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([])
  
  // Hold for reports
  const [waitingForReports, setWaitingForReports] = useState(false)

  // Toggle lab test selection
  const toggleLabTest = (testId: string) => {
    setSelectedLabTests(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  // Submit consultation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!diagnosis.trim()) {
      toast.error("Please enter a diagnosis")
      return
    }

    startTransition(async () => {
      const result = await saveConsultation({
        appointmentId: appointment.id,
        bloodPressure,
        pulse,
        temperature,
        weight,
        spo2,
        chiefComplaint,
        historyOfPresentIllness,
        symptoms,
        diagnosis,
        notes,
        medications: medications.map(m => ({
          medicationName: m.medicationName,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: m.quantity,
          instructions: m.instructions
        })),
        labTestIds: selectedLabTests,
        followUpDate: followUpDate || undefined,
        waitingForReports,
      })

      if (result.success) {
        toast.success(result.message)
        if (result.data?.waitingForReports) {
          router.push("/dashboard/clinical/emr")
        } else if (result.data?.prescriptionId) {
          router.push(`/dashboard/clinical/emr/${appointment.id}/print`)
        } else {
          router.push("/dashboard/clinical/opd")
        }
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel - Vitals & History */}
        <div className="space-y-6">
          {/* Vitals Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bloodPressure" className="text-xs">Blood Pressure</Label>
                  <Input
                    id="bloodPressure"
                    placeholder="120/80"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pulse" className="text-xs">Pulse (bpm)</Label>
                  <Input
                    id="pulse"
                    placeholder="72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-xs">Temperature (°F)</Label>
                  <Input
                    id="temperature"
                    placeholder="98.6"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-xs">Weight (kg)</Label>
                  <Input
                    id="weight"
                    placeholder="70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="spo2" className="text-xs">SpO2 (%)</Label>
                  <Input
                    id="spo2"
                    placeholder="99"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lab Orders Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-purple-600" />
                Lab Investigations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {labTests.map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`test-${test.id}`}
                        checked={selectedLabTests.includes(test.id)}
                        onCheckedChange={() => toggleLabTest(test.id)}
                      />
                      <Label htmlFor={`test-${test.id}`} className="text-sm cursor-pointer">
                        {test.name}
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">₹{test.price}</span>
                  </div>
                ))}
              </div>
              {selectedLabTests.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium">
                    {selectedLabTests.length} test{selectedLabTests.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-up */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="followUpDate" className="text-sm">Next Visit Date</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Panel - Clinical Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chief Complaint & History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Clinical Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
                <Textarea
                  id="chiefComplaint"
                  placeholder="e.g., Fever since last night, Headache for 3 days"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="historyOfPresentIllness">History of Present Illness</Label>
                <Textarea
                  id="historyOfPresentIllness"
                  placeholder="Detailed history of the current condition..."
                  value={historyOfPresentIllness}
                  onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                  rows={3}
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
                <Label htmlFor="notes">Doctor's Notes (Private)</Label>
                <Textarea
                  id="notes"
                  placeholder="Private notes for future reference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Prescription Writer Component */}
          <PrescriptionWriter
            medications={medications}
            onMedicationsChange={setMedications}
          />

          {/* Hold for Reports Toggle */}
          <Card className={waitingForReports ? "border-amber-300 bg-amber-50/50" : ""}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className={`h-5 w-5 ${waitingForReports ? "text-amber-600" : "text-muted-foreground"}`} />
                  <div>
                    <Label htmlFor="waitingForReports" className="text-sm font-medium cursor-pointer">
                      Patient will return with test reports today
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Keeps the appointment open in your queue for a same-day follow-up
                    </p>
                  </div>
                </div>
                <Switch
                  id="waitingForReports"
                  checked={waitingForReports}
                  onCheckedChange={setWaitingForReports}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isPending}
              className={`flex-1 h-12 ${waitingForReports ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}`}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : waitingForReports ? (
                <>
                  <Clock className="mr-2 h-5 w-5" />
                  Save & Hold for Reports
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save & Complete
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              className="h-12"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
