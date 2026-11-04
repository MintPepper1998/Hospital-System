import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { updateConsultation } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Activity, Stethoscope, Pill, FileText, CheckCircle, FlaskConical } from "lucide-react"
import Link from "next/link"
import { differenceInYears } from "date-fns"
import { LabTestSelector } from "@/components/clinical/lab-test-selector"

interface ConsultationPageProps {
  params: Promise<{
    appointmentId: string
  }>
}

export default async function ConsultationPage({ params }: ConsultationPageProps) {
  const { appointmentId } = await params

  // Fetch appointment with patient and doctor details
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      doctor: {
        include: {
          user: true,
        },
      },
    },
  })

  if (!appointment) {
    notFound()
  }

  // Fetch all active lab tests for the multi-select
  const labTests = await prisma.labTestCatalog.findMany({
    where: { isActive: true },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  })

  // Calculate patient age from date of birth
  const patientAge = appointment.patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(appointment.patient.dateOfBirth))
    : null

  // Server action wrapper
  async function handleConsultationSubmit(formData: FormData) {
    "use server"
    console.log("🔥 DEBUG: handleConsultationSubmit called")
    console.log("🔥 DEBUG: formData entries:")
    
    // Log all form data entries
    for (const [key, value] of formData.entries()) {
      console.log(`  🔥 ${key}: ${value}`)
    }
    
    // Specifically check for labTests
    const labTests = formData.getAll("labTests")
    console.log("🔥 DEBUG: labTests from formData.getAll('labTests'):", labTests)
    console.log("🔥 DEBUG: labTests count:", labTests.length)
    
    const result = await updateConsultation(appointmentId, formData)
    
    console.log("🔥 DEBUG: updateConsultation result:", result)
    
    if (result.success) {
      redirect("/dashboard/clinical/opd")
    }
    
    return result
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clinical/opd">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to OPD
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
              Consultation
            </h2>
            <p className="text-muted-foreground mt-1">
              Complete patient examination and treatment
            </p>
          </div>
        </div>
        <Link href={`/dashboard/clinical/patient/${appointment.patientId}`}>
          <Button variant="outline" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
            <Activity className="mr-2 h-4 w-4" />
            View Past History
          </Button>
        </Link>
      </div>

      {/* Patient Information Card */}
      <Card className="border-t-4 border-t-[#0066CC]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-[#0066CC]" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Patient Name</p>
              <p className="text-lg font-semibold">{appointment.patient.user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="text-lg font-semibold">
                {patientAge !== null ? `${patientAge} years` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="text-lg font-semibold capitalize">
                {appointment.patient.gender?.toLowerCase() || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patient ID</p>
              <p className="text-lg font-semibold font-mono text-[#0066CC]">
                {appointment.patient.patientId}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consultation Form */}
      <form action={async (formData) => {
        "use server"
        await handleConsultationSubmit(formData)
      }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Vitals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Vital Signs
              </CardTitle>
              <CardDescription>Record patient's vital measurements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pulse">Pulse (bpm)</Label>
                <Input
                  id="pulse"
                  name="pulse"
                  type="text"
                  placeholder="e.g., 72"
                  defaultValue={appointment.pulse || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°F)</Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="text"
                  placeholder="e.g., 98.6"
                  defaultValue={appointment.temperature || ""}
                />
              </div>

              <div className="space-y-2">
                <Label>Weight</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="weightKg"
                    name="weightKg"
                    type="number"
                    min="0"
                    max="300"
                    placeholder="Kg"
                    defaultValue={appointment.weight ? appointment.weight.split(" ")[0] : ""}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground font-medium">kg</span>
                  <Input
                    id="weightGrams"
                    name="weightGrams"
                    type="number"
                    min="0"
                    max="999"
                    placeholder="gm"
                    defaultValue={appointment.weight && appointment.weight.includes("gm") ? appointment.weight.match(/(\d+)\s*gm/)?.[1] || "" : ""}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground font-medium">gm</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodPressure">Blood Pressure (mmHg)</Label>
                <Input
                  id="bloodPressure"
                  name="bloodPressure"
                  type="text"
                  placeholder="e.g., 120/80"
                  defaultValue={appointment.bloodPressure || ""}
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Clinical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Clinical Assessment
              </CardTitle>
              <CardDescription>Document patient condition and treatment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                <Textarea
                  id="chiefComplaint"
                  name="chiefComplaint"
                  placeholder="Patient's main concern or reason for visit"
                  rows={3}
                  defaultValue={appointment.reason || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">
                  Diagnosis <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="diagnosis"
                  name="diagnosis"
                  placeholder="Clinical diagnosis based on examination"
                  rows={4}
                  required
                  defaultValue={appointment.diagnosis || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prescription">
                  Prescription <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="prescription"
                  name="prescription"
                  placeholder="Medications and dosage instructions"
                  rows={4}
                  required
                  defaultValue={appointment.prescription || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Doctor's Notes (Private)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Additional notes for medical record"
                  rows={3}
                  defaultValue={appointment.notes || ""}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lab Investigations Section */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-purple-600" />
              Lab Investigations
            </CardTitle>
            <CardDescription>
              Select tests to be ordered (Patient must pay before sample collection)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LabTestSelector labTests={labTests} />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end gap-4">
          <Link href="/dashboard/clinical/opd">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Consultation
          </Button>
        </div>
      </form>
    </div>
  )
}
