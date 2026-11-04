import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PrintPrescription } from "@/components/emr/print-prescription"
import { PrintActions } from "@/components/emr/print-actions"
import { getHospitalSettings } from "@/app/actions/settings"
import { getTemplateSettings } from "@/app/actions/print-template-settings"

interface PrintPageProps {
  params: Promise<{ appointmentId: string }>
}

export default async function PrintPrescriptionPage({ params }: PrintPageProps) {
  const { appointmentId } = await params

  // Fetch appointment data, hospital settings, and template settings in parallel
  const [appointment, hospitalSettings, templateSettings] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        doctor: {
          include: {
            user: true
          }
        },
        medicalRecords: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            prescriptions: {
              include: {
                medications: true
              }
            }
          }
        },
        labRequests: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    }),
    getHospitalSettings(),
    getTemplateSettings("OPD_PRESCRIPTION")
  ])

  if (!appointment) {
    notFound()
  }

  let medicalRecord = appointment.medicalRecords[0]
  let prescription = medicalRecord?.prescriptions[0]

  // Fallback: If no prescription found through medicalRecords, query directly
  // by patientId scoped to the appointment date. This handles older consultations
  // where the MedicalRecord link was missing.
  if (!prescription) {
    const appointmentDate = new Date(appointment.appointmentDate)
    const startOfDay = new Date(appointmentDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(appointmentDate)
    endOfDay.setHours(23, 59, 59, 999)

    const fallbackPrescription = await prisma.prescription.findFirst({
      where: {
        patientId: appointment.patientId,
        prescriptionDate: { gte: startOfDay, lte: endOfDay },
      },
      include: { medications: true },
      orderBy: { prescriptionDate: 'desc' },
    })

    if (fallbackPrescription) {
      prescription = fallbackPrescription
      // Build a synthetic medicalRecord from the appointment data for the print template
      if (!medicalRecord) {
        medicalRecord = {
          id: "synthetic",
          chiefComplaint: appointment.chiefComplaint,
          diagnosis: appointment.diagnosis,
          symptoms: appointment.symptoms,
          examination: appointment.notes,
          vitals: {
            bloodPressure: appointment.bloodPressure,
            pulse: appointment.pulse,
            temperature: appointment.temperature,
            weight: appointment.weight,
            spo2: appointment.spo2,
          },
          followUpDate: null,
          prescriptions: [fallbackPrescription],
        } as any
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Bar - Client Component handles the onClick */}
      <PrintActions />

      {/* Print Component */}
      {prescription ? (
        <PrintPrescription
          appointment={appointment}
          prescription={prescription}
          medicalRecord={medicalRecord}
          hospitalSettings={hospitalSettings}
          settings={templateSettings}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No prescription found for this consultation.</p>
          <p className="text-sm text-muted-foreground mt-2">
            This may happen if no medicines were prescribed during the consultation.
          </p>
        </div>
      )}
    </div>
  )
}
