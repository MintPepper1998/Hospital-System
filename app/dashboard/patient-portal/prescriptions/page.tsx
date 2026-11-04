import { requireAuth } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { getPatientHistory } from "@/lib/actions"
import { format } from "date-fns"
import { Pill, Printer, FileText, Download, Heartbeat } from "@phosphor-icons/react/dist/ssr"
import Link from "next/link"

export default async function PatientPrescriptionsPage() {
  const session = await requireAuth(["PATIENT"])
  
  // Find the patient record linked to this user
  const patient = await prisma.patient.findFirst({
    where: { userId: session.userId },
  })

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Pill size={32} weight="fill" />
        </div>
        <h3 className="text-xl font-bold text-[#1e293b]">Patient Profile Not Found</h3>
        <p className="text-[#64748b] mt-2 max-w-sm">We couldn't find your patient profile. Please contact the hospital reception.</p>
      </div>
    )
  }

  // Get full patient history to extract prescriptions
  const history = await getPatientHistory(patient.id)
  
  const prescriptionHistory = history.success && history.data ? history.data.prescriptionHistory : []

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1e293b] tracking-tight">My Prescriptions</h1>
          <p className="text-sm font-medium text-[#64748b] mt-1">
            View and download your digital prescriptions
          </p>
        </div>
      </div>

      {prescriptionHistory.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
            <FileText size={40} weight="fill" />
          </div>
          <h3 className="text-lg font-bold text-[#1e293b]">No Prescriptions Found</h3>
          <p className="text-[#64748b] mt-2 max-w-sm mx-auto font-medium">
            You don't have any digital prescriptions associated with your past consultations yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {prescriptionHistory.map((rx, idx) => (
            <div key={`${rx.appointmentId}-${idx}`} className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Pill size={24} weight="fill" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">Date</span>
                    <span className="text-sm font-bold text-[#1e293b]">{format(new Date(rx.date), "MMM dd, yyyy")}</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-[#1e293b] mb-1 truncate" title={`Dr. ${rx.doctorName}`}>
                  Dr. {rx.doctorName}
                </h3>
                
                <div className="flex items-center gap-2 mb-4">
                  {rx.diagnosis ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold border border-orange-100">
                      <Heartbeat size={14} weight="bold" />
                      {rx.diagnosis}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100">
                      General Checkup
                    </span>
                  )}
                </div>

                <div className="bg-[#f8f9fb] rounded-xl p-4 mb-5 border border-gray-100 h-24 overflow-hidden relative">
                  <p className="text-sm font-medium text-[#475569] leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {rx.medicines}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#f8f9fb] to-transparent"></div>
                </div>
                
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/patient-portal/prescriptions/${rx.appointmentId}/print`}
                    className="flex-1 bg-white hover:bg-gray-50 text-[#1e293b] border border-gray-200 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileText size={18} weight="bold" />
                    View Details
                  </Link>
                  <Link
                    href={`/dashboard/patient-portal/prescriptions/${rx.appointmentId}/print`}
                    target="_blank"
                    className="flex-1 bg-[#1a56db] hover:bg-[#1e40af] text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/20"
                  >
                    <Download size={18} weight="bold" />
                    Download
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
