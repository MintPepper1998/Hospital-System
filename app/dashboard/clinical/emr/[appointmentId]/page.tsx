import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Activity, Stethoscope } from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ConsultationManager } from "@/components/clinical/consultation-manager"
import type { LabRequestWithResults } from "@/components/clinical/lab-results-viewer"

interface EMRPageProps {
  params: Promise<{ appointmentId: string }>
}

export default async function EMRPage({ params }: EMRPageProps) {
  const { appointmentId } = await params

  if (!appointmentId) {
    notFound()
  }

  // Fetch appointment with patient and previous records
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: {
          user: true,
          appointments: {
            where: {
              status: 'COMPLETED',
              id: {
                not: appointmentId
              }
            },
            orderBy: {
              appointmentDate: 'desc'
            },
            take: 3,
            include: {
              doctor: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      },
      doctor: {
        include: {
          user: true
        }
      }
    }
  })

  if (!appointment) {
    notFound()
  }

  const blockedStatuses = ["PENDING", "SCHEDULED", "CONFIRMED", "WAITING"]
  if (blockedStatuses.includes(appointment.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="h-20 w-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <Activity className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Vitals Required</h2>
        <p className="text-muted-foreground max-w-md">
          Consultation cannot begin until the nursing staff has recorded the patient's vitals. 
          Please wait for the status to change to <strong className="text-green-600">Vitals ✓</strong>.
        </p>
        <Link href="/dashboard/doctor">
          <Button variant="outline" className="mt-4">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  // Fetch available lab tests from catalog
  const labTestCatalog = await prisma.labTestCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  })

  // Transform for client component (include type for Pathology/Radiology)
  const availableLabTests = labTestCatalog.map(test => ({
    id: test.id,
    name: test.name,
    code: test.code,
    price: test.price,
    category: test.category,
    type: test.type as "PATHOLOGY" | "RADIOLOGY"
  }))

  // Fetch lab requests & results for this appointment
  const labRequestsRaw = await prisma.labRequest.findMany({
    where: { appointmentId },
    include: { results: true },
    orderBy: { createdAt: 'asc' },
  })

  // Serialize for client component (dates → strings)
  const labResults: LabRequestWithResults[] = labRequestsRaw.map(req => ({
    id: req.id,
    testName: req.testName,
    testType: req.testType as "PATHOLOGY" | "RADIOLOGY",
    status: req.status,
    priority: req.priority,
    reportContent: req.reportContent,
    impression: req.impression,
    parameterResults: req.parameterResults as Record<string, string> | null,
    completedAt: req.completedAt?.toISOString() || null,
    createdAt: req.createdAt.toISOString(),
    results: req.results.map(r => ({
      id: r.id,
      testName: r.testName,
      resultValue: r.resultValue,
      unit: r.unit,
      normalRange: r.normalRange,
      remarks: r.remarks,
    })),
  }))

  // ── Fetch existing prescriptions for this appointment (for completed EMR view) ──
  let existingMedicines: Array<{
    id: string
    medicationName: string
    dosage: string
    frequency: string
    duration: string
    quantity: number
    instructions: string
  }> = []

  // Try via MedicalRecord first
  const medicalRecordWithRx = await prisma.medicalRecord.findFirst({
    where: { appointmentId },
    include: {
      prescriptions: {
        include: { medications: true },
        orderBy: { prescriptionDate: 'desc' },
        take: 1,
      }
    }
  })

  const rxItems = medicalRecordWithRx?.prescriptions[0]?.medications

  if (rxItems && rxItems.length > 0) {
    existingMedicines = rxItems.map(m => ({
      id: m.id,
      medicationName: m.medicationName,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      quantity: m.quantity,
      instructions: m.instructions || "After Food",
    }))
  } else {
    // Fallback: query prescriptions by patientId + appointment date
    const apptDate = new Date(appointment.appointmentDate)
    const startOfDay = new Date(apptDate); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(apptDate); endOfDay.setHours(23, 59, 59, 999)

    const fallbackRx = await prisma.prescription.findFirst({
      where: {
        patientId: appointment.patientId,
        prescriptionDate: { gte: startOfDay, lte: endOfDay },
      },
      include: { medications: true },
      orderBy: { prescriptionDate: 'desc' },
    })

    if (fallbackRx?.medications?.length) {
      existingMedicines = fallbackRx.medications.map(m => ({
        id: m.id,
        medicationName: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        quantity: m.quantity,
        instructions: m.instructions || "After Food",
      }))
    }
  }

  // Calculate patient age
  const age = appointment.patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(appointment.patient.dateOfBirth))
    : null

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <Stethoscope className="h-8 w-8" />
            Electronic Medical Record
          </h2>
          <p className="text-muted-foreground mt-1">
            Consultation for {appointment.patient.user.name} • {format(new Date(appointment.appointmentDate), "MMM dd, yyyy")} at {appointment.appointmentTime}
          </p>
        </div>
        <Badge 
          variant={appointment.status === 'COMPLETED' ? 'outline' : 'default'} 
          className={appointment.status === 'COMPLETED' ? 'bg-green-600 text-white' : ''}
        >
          {appointment.status}
        </Badge>
      </div>

      {/* Patient Context Card */}
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
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
              <p className="text-sm text-muted-foreground">Patient ID</p>
              <p className="text-lg font-semibold">{appointment.patient.patientId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Age / Gender</p>
              <p className="text-lg font-semibold">
                {age || "N/A"} years / {appointment.patient.gender || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Blood Group</p>
              <p className="text-lg font-semibold">{appointment.patient.bloodGroup || "—"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Medical History</p>
              <p className="text-sm">{appointment.patient.medicalHistory || "No significant history"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Known Allergies</p>
              <p className="text-sm text-red-600 font-medium">{appointment.patient.allergies || "None reported"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previous Consultations */}
      {appointment.patient.appointments && appointment.patient.appointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Visits
            </CardTitle>
            <CardDescription>Last 3 consultations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointment.patient.appointments.map((appt: any) => (
                <div key={appt.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(appt.appointmentDate), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dr. {appt.doctor.user.name} • {appt.diagnosis || "General consultation"}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20">Completed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 
        Consultation Manager - Client Component
        This handles ALL user interaction: form inputs, medicine selection, save button
        The page just passes the appointmentId - NO event handlers here!
      */}
      <ConsultationManager 
        appointmentId={appointment.id}
        initialData={{
          chiefComplaint: appointment.chiefComplaint || appointment.reason || undefined,
          diagnosis: appointment.diagnosis || undefined,
          symptoms: appointment.symptoms || undefined,
          notes: appointment.notes || undefined,
          bloodPressure: appointment.bloodPressure || undefined,
          pulse: appointment.pulse || undefined,
          temperature: appointment.temperature || undefined,
          weight: appointment.weight || undefined,
          height: appointment.height || undefined,
          spo2: appointment.spo2 || undefined,
          vitalsTakenBy: appointment.vitalsTakenBy || undefined,
        }}
        initialMedicines={existingMedicines}
        availableLabTests={availableLabTests}
        labResults={labResults}
        appointmentStatus={appointment.status}
      />
    </div>
  )
}

