import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { format, differenceInYears } from "date-fns"
import { requireAuth } from "@/lib/auth-guard"
import { PrintTrigger } from "@/app/dashboard/clinical/opd/print/[appointmentId]/print-trigger"
import { getHospitalSettings } from "@/app/actions/settings"
import { PrintPrescription } from "@/components/emr/print-prescription"

interface PatientPortalPrintPrescriptionPageProps {
  params: Promise<{ appointmentId: string }>
}

export default async function PatientPortalPrintPrescriptionPage({ params }: PatientPortalPrintPrescriptionPageProps) {
  const session = await requireAuth(["PATIENT"])
  const { appointmentId } = await params

  // Verify patient access
  const patient = await prisma.patient.findFirst({
    where: { userId: session.userId },
  })

  if (!patient) {
    notFound()
  }

  // Fetch appointment
  const appointment = await prisma.appointment.findFirst({
    where: { 
      id: appointmentId,
      patientId: patient.id 
    },
    include: {
      patient: {
        include: { user: true }
      },
      doctor: {
        include: { user: true }
      },
      medicalRecords: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          prescriptions: {
            include: { medications: true }
          }
        }
      }
    }
  })

  if (!appointment) {
    notFound()
  }

  const hospitalSettings = await getHospitalSettings()
  
  // Try to use EMR prescription first
  const medicalRecord = appointment.medicalRecords[0]
  const emrPrescription = medicalRecord?.prescriptions[0]

  // If there's an EMR Prescription, we can render the exact same UI as the clinical side
  if (emrPrescription && medicalRecord) {
    return (
      <>
        <PrintTrigger />
        <PrintPrescription
          appointment={appointment}
          prescription={emrPrescription}
          medicalRecord={medicalRecord}
          hospitalSettings={hospitalSettings}
        />
      </>
    )
  }

  // Otherwise, fallback to the text string prescription
  if (!appointment.prescription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center py-20 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800">No Prescription Available</h2>
        <p className="text-gray-500 mt-2">There is no prescription associated with this consultation.</p>
      </div>
    )
  }

  // Calculate patient age
  const age = differenceInYears(new Date(), new Date(appointment.patient.dateOfBirth || new Date()))
  const appointmentDate = format(new Date(appointment.appointmentDate), "dd/MM/yyyy")
  const appointmentIdShort = appointment.id.slice(-6).toUpperCase()

  return (
    <>
      <PrintTrigger />
      <div className="prescription-pad bg-white min-h-screen print:min-h-0">
        <div className="max-w-[210mm] mx-auto bg-white p-8 print:p-6 shadow-sm print:shadow-none">
          {/* ==================== LETTERHEAD HEADER ==================== */}
          <div className="header-section text-center border-b-2 border-[#0066CC] pb-3 mb-3 flex flex-col items-center">
            {hospitalSettings.logoUrl && (
              <img src={hospitalSettings.logoUrl} alt="Logo" className="h-16 object-contain mb-2" />
            )}
            <h1 className="text-3xl font-bold text-[#0066CC] tracking-wide">
              {hospitalSettings.name.toUpperCase()}
            </h1>
            <p className="text-xs text-gray-700 mt-1">
              {hospitalSettings.address} | Ph: {hospitalSettings.phone} | Email: {hospitalSettings.email}
            </p>
          </div>

          {/* ==================== PATIENT INFO STRIP ==================== */}
          <div className="patient-info-strip border border-gray-300 rounded mb-6 p-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-4">
                <span className="font-semibold">
                  <span className="text-gray-600">Patient:</span>{" "}
                  <span className="text-black text-sm">{appointment.patient.user.name}</span>
                </span>
                <span className="text-gray-400">|</span>
                <span>
                  <span className="text-gray-600">Age/Sex:</span>{" "}
                  <span className="font-semibold text-black">{age}Y / {appointment.patient.gender?.charAt(0)}</span>
                </span>
                <span className="text-gray-400">|</span>
                <span>
                  <span className="text-gray-600">Date:</span>{" "}
                  <span className="font-semibold text-black">{appointmentDate}</span>
                </span>
              </div>
              <div>
                <span className="text-gray-600">ID:</span>{" "}
                <span className="font-mono font-semibold text-black">{appointmentIdShort}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span>
                  <span className="text-gray-600">Consultant:</span>{" "}
                  <span className="font-semibold text-black text-sm">Dr. {appointment.doctor.user.name}</span>
                  {appointment.doctor.specialization && (
                    <span className="text-gray-600"> ({appointment.doctor.specialization})</span>
                  )}
                </span>
                <span className="text-gray-400">|</span>
                <span>
                  <span className="text-gray-600">Dept:</span>{" "}
                  <span className="font-semibold text-black">{appointment.doctor.department || "General"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* ==================== MAIN CONTENT ==================== */}
          <div className="main-content flex gap-6 min-h-[500px]">
            {/* LEFT SIDEBAR - Vitals / History (30% width) */}
            <div className="left-sidebar w-[30%] border-r border-gray-200 pr-4">
              <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase border-b border-gray-300 pb-1">
                Clinical Details
              </h3>
              
              <div className="space-y-4">
                {appointment.diagnosis && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase">Diagnosis</h4>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{appointment.diagnosis}</p>
                  </div>
                )}
                
                {appointment.reason && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase">Chief Complaint</h4>
                    <p className="text-xs text-gray-800 mt-0.5">{appointment.reason}</p>
                  </div>
                )}

                {(appointment.bloodPressure || appointment.temperature || appointment.weight) && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Vitals</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {appointment.bloodPressure && (
                        <div className="bg-gray-50 p-1.5 rounded border border-gray-100">
                          <span className="text-gray-500 block text-[9px]">BP</span>
                          <span className="font-semibold">{appointment.bloodPressure}</span>
                        </div>
                      )}
                      {appointment.temperature && (
                        <div className="bg-gray-50 p-1.5 rounded border border-gray-100">
                          <span className="text-gray-500 block text-[9px]">Temp</span>
                          <span className="font-semibold">{appointment.temperature}°F</span>
                        </div>
                      )}
                      {appointment.weight && (
                        <div className="bg-gray-50 p-1.5 rounded border border-gray-100">
                          <span className="text-gray-500 block text-[9px]">Weight</span>
                          <span className="font-semibold">{appointment.weight} kg</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT MAIN AREA - Rx (70% width) */}
            <div className="right-main w-[70%] pl-2">
              <div className="flex items-center mb-6">
                <div className="text-5xl font-serif italic text-[#0066CC] font-bold">℞</div>
              </div>

              <div className="prescription-area">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 font-medium">
                  {appointment.prescription}
                </p>
                
                {appointment.notes && (
                  <div className="mt-8 pt-4 border-t border-dashed border-gray-200">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Doctor's Notes</h4>
                    <p className="text-sm text-gray-700 italic">{appointment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ==================== FOOTER ==================== */}
          <div className="footer-section mt-8 pt-4 border-t-2 border-gray-200">
            <div className="flex justify-between items-end">
              <div className="text-xs text-gray-500">
                <p>Printed on: {format(new Date(), "dd/MM/yyyy hh:mm a")}</p>
                <p className="mt-1">Digital Prescription - Patient Portal</p>
              </div>
              <div className="text-right">
                <div className="border-t border-gray-400 w-48 inline-block mb-1"></div>
                <p className="text-xs font-bold text-gray-800">Dr. {appointment.doctor.user.name}</p>
                <p className="text-[10px] text-gray-500">{appointment.doctor.department || "Consultant"}</p>
              </div>
            </div>
            <p className="text-center text-[10px] text-gray-400 italic mt-6">
              This is a computer-generated document and does not require a physical signature.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
