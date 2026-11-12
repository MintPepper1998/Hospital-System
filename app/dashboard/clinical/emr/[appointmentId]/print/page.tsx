import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PrintPrescription } from "@/components/emr/print-prescription"
import { PrintActions } from "@/components/emr/print-actions"
import { getHospitalSettings } from "@/app/actions/settings"
import { getTemplateSettings } from "@/app/actions/print-template-settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ExternalLink, Printer } from "lucide-react"
import Link from "next/link"

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
      ) : appointment.isPaperConsultation ? (
        <Card className="max-w-3xl mx-auto shadow-md border-amber-200">
          <CardHeader className="bg-amber-50/60 border-b border-amber-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-700" />
                <CardTitle className="text-lg font-bold text-amber-900">
                  Physical OPD Paper Consultation
                </CardTitle>
              </div>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                Paper OPD
              </Badge>
            </div>
            <p className="text-xs text-amber-800 mt-1">
              Patient: <strong>{appointment.patient.user.name}</strong> ({appointment.patient.patientId}) • Dr. {appointment.doctor.user.name}
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-zinc-50 rounded-xl text-xs">
              <div>
                <span className="text-zinc-400 block font-medium">Diagnosis</span>
                <span className="font-bold text-zinc-800">{appointment.diagnosis || "Treated on OPD Paper"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-medium">Time / Date</span>
                <span className="font-bold text-zinc-800">{appointment.appointmentTime}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-medium">Prescription Mode</span>
                <span className="font-bold text-zinc-800">Physical Handwritten Slip</span>
              </div>
            </div>

            {appointment.scannedPaperUrl ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-zinc-700">Scanned Prescription Paper:</h4>
                  <a
                    href={appointment.scannedPaperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open Full Image
                  </a>
                </div>

                <div className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 p-2 flex justify-center">
                  {appointment.scannedPaperUrl.toLowerCase().endsWith(".pdf") ? (
                    <div className="py-12 text-center">
                      <p className="text-sm font-bold text-zinc-700">Attached PDF Document</p>
                      <a
                        href={appointment.scannedPaperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                      >
                        <ExternalLink className="h-4 w-4" /> View PDF Scan
                      </a>
                    </div>
                  ) : (
                    <img
                      src={appointment.scannedPaperUrl}
                      alt="Scanned OPD Prescription"
                      className="max-h-[650px] w-auto object-contain rounded-lg shadow-xs"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                <FileText className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-zinc-700">No scanned paper attached yet</p>
                <p className="text-xs text-zinc-500 mt-1">
                  The consultation was marked as completed on physical paper without an attached scan image.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
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
