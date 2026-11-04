"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  UserSearch,
  CalendarDays,
  User,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  Clock,
  Stethoscope,
  IndianRupee,
  Copy,
  MessageCircle,
} from "lucide-react"
import { toast } from "sonner"

interface DoctorSchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDuration: number
  maxPatients: number
}

interface Doctor {
  id: string
  department: string | null
  specialization: string | null
  consultationFee: number
  user: { name: string | null }
  doctorSchedules: DoctorSchedule[]
}

interface BookingFormProps {
  departments: string[]
  doctors: Doctor[]
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM",
]

export function BookingForm({ departments, doctors }: BookingFormProps) {
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState<{
    token: string
    message: string
  } | null>(null)

  // Form state
  const [department, setDepartment] = useState("")
  const [selectedDoctorId, setSelectedDoctorId] = useState("")
  const [preferredDate, setPreferredDate] = useState("")
  const [preferredTime, setPreferredTime] = useState("")
  const [patientName, setPatientName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [reason, setReason] = useState("")

  // Derived
  const filteredDoctors = department
    ? doctors.filter((d) => d.department === department)
    : doctors

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)

  const today = new Date().toISOString().split("T")[0]

  // Check if selected doctor is available on the selected date
  const selectedDateDay = preferredDate
    ? new Date(preferredDate).getDay()
    : -1

  const doctorAvailableOnDay = selectedDoctor?.doctorSchedules.some(
    (s) => s.dayOfWeek === selectedDateDay
  )

  const doctorScheduleForDay = selectedDoctor?.doctorSchedules.filter(
    (s) => s.dayOfWeek === selectedDateDay
  )

  // Steps config
  const steps = [
    { label: "Department", icon: Building2 },
    { label: "Date & Time", icon: CalendarDays },
    { label: "Your Details", icon: User },
    { label: "Confirm", icon: CheckCircle2 },
  ]

  const handleSubmit = async () => {
    if (!department || !preferredDate || !preferredTime || !patientName || !phone) {
      toast.error("Please fill all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/public/book-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          phone,
          email,
          age: age || undefined,
          gender: gender || undefined,
          department,
          preferredDoctorId: selectedDoctorId || undefined,
          preferredDate,
          preferredTime,
          reason: reason || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setBookingResult({
          token: result.bookingToken,
          message: result.message,
        })
        toast.success("Booking submitted successfully!")
      } else {
        toast.error(result.message || "Failed to submit booking")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToken = () => {
    if (bookingResult?.token) {
      navigator.clipboard.writeText(bookingResult.token)
      toast.success("Booking token copied!")
    }
  }

  // ── SUCCESS SCREEN ──
  if (bookingResult) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="border-2 border-green-200 shadow-xl">
          <CardContent className="pt-8 pb-10 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-green-700">
                Booking Request Submitted!
              </h2>
              <p className="text-gray-600 mt-2 text-sm">
                Our reception team will review and confirm your appointment shortly.
              </p>
            </div>

            {/* Token */}
            <div className="bg-gray-50 rounded-xl p-5 border">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
                Your Booking Token
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold text-[#0066CC]">
                  {bookingResult.token}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyToken}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Save this token to track your booking status
              </p>
            </div>

            {/* Summary */}
            <div className="text-left bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Department:</span>
                <span className="font-medium">{department}</span>
              </div>
              {selectedDoctor && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Doctor:</span>
                  <span className="font-medium">
                    Dr. {selectedDoctor.user.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Preferred Date:</span>
                <span className="font-medium">
                  {new Date(preferredDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Preferred Time:</span>
                <span className="font-medium">{preferredTime}</span>
              </div>
            </div>

            {/* WhatsApp Note */}
            <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                You will receive a confirmation on your WhatsApp ({phone})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="w-full sm:flex-1 h-12 text-base border-gray-300"
                onClick={() => (window.location.href = "/")}
              >
                Back to Home
              </Button>
              <Button
                className="w-full sm:flex-1 bg-[#0066CC] hover:bg-[#0055AA] h-12 text-base"
                onClick={() => (window.location.href = "/patient-login")}
              >
                Check Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── MULTI-STEP FORM ──
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-1 md:gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                step === i
                  ? "bg-[#0066CC] text-white shadow-lg shadow-blue-200"
                  : step > i
                  ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step > i ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <s.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`w-6 md:w-10 h-0.5 ${
                  step > i ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 0: Department & Doctor ── */}
      {step === 0 && (
        <Card className="border-t-4 border-t-[#0066CC] shadow-lg animate-in fade-in duration-300">
          <CardHeader className="bg-blue-50/50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-[#0066CC]" />
              Select Department & Doctor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {/* Department */}
            <div className="space-y-2">
              <Label>
                Department <span className="text-red-500">*</span>
              </Label>
              <Select value={department} onValueChange={(v) => {
                setDepartment(v)
                setSelectedDoctorId("")
              }}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Selection */}
            {department && (
              <div className="space-y-3">
                <Label>
                  Preferred Doctor{" "}
                  <span className="text-gray-400 text-xs">(optional)</span>
                </Label>

                {filteredDoctors.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    No doctors available in this department currently.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {/* "Any Doctor" option */}
                    <button
                      type="button"
                      onClick={() => setSelectedDoctorId("")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        !selectedDoctorId
                          ? "border-[#0066CC] bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserSearch className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Any Available Doctor</p>
                          <p className="text-xs text-gray-500">
                            Reception will assign the best available doctor
                          </p>
                        </div>
                      </div>
                    </button>

                    {filteredDoctors.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedDoctorId === doc.id
                            ? "border-[#0066CC] bg-blue-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0066CC]/10 flex items-center justify-center">
                            <Stethoscope className="h-5 w-5 text-[#0066CC]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              Dr. {doc.user.name}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {doc.specialization && (
                                <span className="text-xs text-gray-500">
                                  {doc.specialization}
                                </span>
                              )}
                              <Badge variant="secondary" className="text-[10px] h-5">
                                <IndianRupee className="h-2.5 w-2.5" />
                                {doc.consultationFee}
                              </Badge>
                            </div>
                            {doc.doctorSchedules.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <Clock className="h-3 w-3 text-gray-400" />
                                {doc.doctorSchedules.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded"
                                  >
                                    {dayNames[s.dayOfWeek].slice(0, 3)} {s.startTime}–{s.endTime}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={() => setStep(1)}
                disabled={!department}
                className="bg-[#0066CC] hover:bg-[#0055AA] px-6"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 1: Date & Time ── */}
      {step === 1 && (
        <Card className="border-t-4 border-t-purple-500 shadow-lg animate-in fade-in duration-300">
          <CardHeader className="bg-purple-50/50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-purple-600" />
              Choose Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {/* Date */}
            <div className="space-y-2">
              <Label>
                Preferred Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={today}
                className="h-12"
              />
              {preferredDate && selectedDoctor && !doctorAvailableOnDay && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                  ⚠️ Dr. {selectedDoctor.user.name} may not be available on{" "}
                  {dayNames[selectedDateDay]}. Reception will confirm availability.
                </p>
              )}
              {preferredDate && selectedDoctor && doctorScheduleForDay && doctorScheduleForDay.length > 0 && (
                <p className="text-xs text-green-700 bg-green-50 rounded-lg p-2">
                  ✅ Dr. {selectedDoctor.user.name} is scheduled on{" "}
                  {dayNames[selectedDateDay]}:{" "}
                  {doctorScheduleForDay.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}
                </p>
              )}
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>
                Preferred Time <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setPreferredTime(slot)}
                    className={`py-2.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                      preferredTime === slot
                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!preferredDate || !preferredTime}
                className="bg-[#0066CC] hover:bg-[#0055AA] px-6"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Patient Details ── */}
      {step === 2 && (
        <Card className="border-t-4 border-t-green-500 shadow-lg animate-in fade-in duration-300">
          <CardHeader className="bg-green-50/50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-green-600" />
              Your Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10)
                      setPhone(val)
                    }}
                    placeholder="10-digit mobile number"
                    className="pl-10 h-12"
                    maxLength={10}
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  We'll send booking confirmation via WhatsApp
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Email <span className="text-gray-400 text-xs">(optional)</span>
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Age <span className="text-gray-400 text-xs">(optional)</span>
                </Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 35"
                  min="0"
                  max="120"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Gender <span className="text-gray-400 text-xs">(optional)</span>
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Reason / Symptoms{" "}
                <span className="text-gray-400 text-xs">(optional)</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for visit..."
                rows={3}
              />
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!patientName || phone.length !== 10}
                className="bg-[#0066CC] hover:bg-[#0055AA] px-6"
              >
                Review & Confirm
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Confirmation ── */}
      {step === 3 && (
        <Card className="border-t-4 border-t-amber-500 shadow-lg animate-in fade-in duration-300">
          <CardHeader className="bg-amber-50/50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-amber-600" />
              Review & Confirm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {/* Summary */}
            <div className="rounded-xl border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                Appointment Summary
              </div>

              <div className="divide-y">
                <SummaryRow label="Department" value={department} />
                <SummaryRow
                  label="Doctor"
                  value={
                    selectedDoctor
                      ? `Dr. ${selectedDoctor.user.name}`
                      : "Any Available Doctor"
                  }
                />
                <SummaryRow
                  label="Date"
                  value={new Date(preferredDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <SummaryRow label="Time" value={preferredTime} />
              </div>

              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                Patient Details
              </div>

              <div className="divide-y">
                <SummaryRow label="Name" value={patientName} />
                <SummaryRow label="Phone" value={phone} />
                {email && <SummaryRow label="Email" value={email} />}
                {age && <SummaryRow label="Age" value={`${age} years`} />}
                {gender && <SummaryRow label="Gender" value={gender} />}
                {reason && <SummaryRow label="Reason" value={reason} />}
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm text-blue-800 space-y-1">
              <p className="font-medium">📋 What happens next?</p>
              <ul className="text-xs space-y-1 list-disc list-inside text-blue-700">
                <li>Your request will be reviewed by our reception team</li>
                <li>You will receive a WhatsApp confirmation once approved</li>
                <li>Payment is collected at the hospital during your visit</li>
                <li>Please arrive 15 minutes before your appointment time</li>
              </ul>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 px-8 h-12 text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}
