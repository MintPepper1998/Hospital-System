"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Activity,
  Heart,
  Thermometer,
  Weight,
  Ruler,
  Droplets,
  Wind,
  CheckCircle2,
  Clock,
  Stethoscope,
  Loader2,
  RefreshCcw,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { saveOPDVitals, getOPDVitalsQueue } from "@/app/actions/opd-vitals"

interface AppointmentWithPatient {
  id: string
  appointmentTime: string
  appointmentDate: string
  status: string
  reason: string | null
  pulse: string | null
  temperature: string | null
  weight: string | null
  height: string | null
  bloodPressure: string | null
  spo2: string | null
  vitalsTakenBy: string | null
  vitalsTakenAt: string | null
  patient: {
    patientId: string
    gender: string | null
    dateOfBirth: string | null
    address: string | null
    user: { name: string | null }
  }
  doctor: {
    user: { name: string | null }
  }
}

interface OPDVitalsQueueProps {
  initialPending: AppointmentWithPatient[]
  initialCompleted: AppointmentWithPatient[]
  nurseName: string
}

export function OPDVitalsQueue({
  initialPending,
  initialCompleted,
  nurseName,
}: OPDVitalsQueueProps) {
  const [pending, setPending] = useState(initialPending)
  const [completed, setCompleted] = useState(initialCompleted)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Vitals form state
  const [pulse, setPulse] = useState("")
  const [temperature, setTemperature] = useState("")
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [bloodPressure, setBloodPressure] = useState("")
  const [spo2, setSpo2] = useState("")

  const refreshQueue = async () => {
    setIsRefreshing(true)
    const result = await getOPDVitalsQueue()
    if (result.success) {
      setPending(result.pending as unknown as AppointmentWithPatient[])
      setCompleted(result.completed as unknown as AppointmentWithPatient[])
    }
    setIsRefreshing(false)
  }

  const openVitalsDialog = (appointment: AppointmentWithPatient) => {
    setSelectedAppointment(appointment)
    setPulse(appointment.pulse || "")
    setTemperature(appointment.temperature || "")
    setWeight(appointment.weight || "")
    setHeight(appointment.height || "")
    setBloodPressure(appointment.bloodPressure || "")
    setSpo2(appointment.spo2 || "")
  }

  const handleSaveVitals = () => {
    if (!selectedAppointment) return

    // At least one vital must be recorded
    if (!pulse && !temperature && !weight && !bloodPressure && !spo2) {
      toast.error("Please record at least one vital sign")
      return
    }

    startTransition(async () => {
      const result = await saveOPDVitals({
        appointmentId: selectedAppointment.id,
        pulse,
        temperature,
        weight,
        height,
        bloodPressure,
        spo2,
        takenByName: nurseName,
      })

      if (result.success) {
        toast.success(result.message)
        setSelectedAppointment(null)
        refreshQueue()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <Card className="border-l-4 border-l-rose-500">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-rose-600" />
              OPD Vitals Queue
              {pending.length > 0 && (
                <span className="flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                  {pending.length}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Record vitals before patients see the doctor
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshQueue}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p className="font-medium text-green-700">All vitals recorded!</p>
              <p className="text-sm mt-1">No patients waiting for vitals</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pending.map((apt) => (
                <div
                  key={apt.id}
                  className="group relative rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer"
                  onClick={() => openVitalsDialog(apt)}
                >
                  {/* Time badge */}
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-amber-500 text-white text-[10px] px-2 shadow-sm">
                      <Clock className="h-2.5 w-2.5 mr-1" />
                      {apt.appointmentTime}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {apt.patient.user.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {apt.patient.patientId} • {apt.patient.gender || "—"}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Stethoscope className="h-3 w-3 text-blue-500" />
                        <span className="text-[11px] text-blue-700">
                          Dr. {apt.doctor.user.name}
                        </span>
                      </div>
                      {apt.reason && (
                        <p className="text-[10px] text-gray-500 mt-1 truncate" title={apt.reason}>
                          💬 {apt.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const isProfileComplete = !!(apt.patient.dateOfBirth && apt.patient.gender && apt.patient.address)
                    if (!isProfileComplete) {
                      return (
                        <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-md text-center">
                          <p className="text-[11px] font-semibold text-red-600 flex items-center justify-center gap-1">
                            <Activity className="h-3 w-3" />
                            Incomplete Profile
                          </p>
                          <p className="text-[10px] text-red-500 mt-0.5">Awaiting Reception</p>
                        </div>
                      )
                    }

                    return (
                      <Button
                        size="sm"
                        className="w-full mt-3 bg-rose-500 hover:bg-rose-600 text-white h-8 text-xs font-semibold"
                        onClick={(e) => {
                          e.stopPropagation()
                          openVitalsDialog(apt)
                        }}
                      >
                        <Thermometer className="h-3.5 w-3.5 mr-1" />
                        Record Vitals
                      </Button>
                    )
                  })()}
                </div>
              ))}
            </div>
          )}

          {/* Recently completed */}
          {completed.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Vitals Completed Today
              </h4>
              <div className="space-y-2">
                {completed.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-green-50 border border-green-100 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-green-900">
                        {apt.patient.user.name}
                      </span>
                      <span className="text-xs text-green-600">
                        {apt.appointmentTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.bloodPressure && (
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border text-slate-600">
                          BP: {apt.bloodPressure}
                        </span>
                      )}
                      {apt.pulse && (
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border text-slate-600">
                          P: {apt.pulse}
                        </span>
                      )}
                      <Badge className="bg-green-600 text-white text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        Done
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── VITALS DIALOG ── */}
      <Dialog open={!!selectedAppointment} onOpenChange={(v) => !v && setSelectedAppointment(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-rose-700 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Record Vitals
            </DialogTitle>
            <DialogDescription>
              Patient:{" "}
              <span className="font-semibold text-slate-900">
                {selectedAppointment?.patient.user.name}
              </span>{" "}
              ({selectedAppointment?.patient.patientId})
              {selectedAppointment?.reason && (
                <span className="block text-xs mt-1">
                  Reason: {selectedAppointment.reason}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-3">
            {/* Blood Pressure */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Heart className="h-3.5 w-3.5 text-red-500" />
                Blood Pressure (mmHg)
              </Label>
              <Input
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder="120/80"
                className="h-11 text-lg font-mono"
              />
            </div>

            {/* Pulse */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Activity className="h-3.5 w-3.5 text-rose-500" />
                Pulse (bpm)
              </Label>
              <Input
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="72"
                className="h-11 text-lg font-mono"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                Temperature (°F)
              </Label>
              <Input
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="98.6"
                className="h-11 text-lg font-mono"
              />
            </div>

            {/* SpO2 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Wind className="h-3.5 w-3.5 text-cyan-500" />
                SpO₂ (%)
              </Label>
              <Input
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="98"
                className="h-11 text-lg font-mono"
              />
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Weight className="h-3.5 w-3.5 text-purple-500" />
                Weight (kg)
              </Label>
              <Input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                className="h-11 text-lg font-mono"
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Ruler className="h-3.5 w-3.5 text-indigo-500" />
                Height (cm)
              </Label>
              <Input
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
                className="h-11 text-lg font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedAppointment(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleSaveVitals}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save Vitals
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
