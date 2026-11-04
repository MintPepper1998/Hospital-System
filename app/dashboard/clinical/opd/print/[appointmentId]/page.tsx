import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { format, differenceInYears } from "date-fns"
import { formatDateIST, formatTimeIST } from "@/lib/timezone"
import { PrintTrigger } from "./print-trigger"
import { getHospitalSettings } from "@/app/actions/settings"
import { PKSahooPrescription } from "@/components/print/pk-sahoo-prescription"

export const dynamic = 'force-dynamic'

interface PrintOPDCardPageProps {
  params: Promise<{ appointmentId: string }>
}

export default async function PrintOPDCardPage({ params }: PrintOPDCardPageProps) {
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
      billings: true,
    },
  })

  if (!appointment) {
    notFound()
  }

  // Calculate patient age (default to today if DOB missing → Age 0)
  const age = differenceInYears(new Date(), new Date(appointment.patient.dateOfBirth || new Date()))

  // Get consultation fee from billing or default (use first OPD billing if exists)
  const opdBilling = appointment.billings?.find(b => b.type === "OPD") || appointment.billings?.[0]
  const consultationFee = opdBilling?.netAmount || 500

  // Print date & time in Asia/Kolkata timezone (matches current hospital issuance time)
  const isFutureScheduled = new Date(appointment.appointmentDate).getTime() > Date.now() + 12 * 60 * 60 * 1000
  const appointmentDate = isFutureScheduled
    ? formatDateIST(appointment.appointmentDate, "dd/MM/yyyy")
    : formatDateIST(new Date(), "dd/MM/yyyy")

  const appointmentTime = isFutureScheduled && (appointment.appointmentTime?.includes("AM") || appointment.appointmentTime?.includes("PM"))
    ? appointment.appointmentTime
    : formatTimeIST(new Date(), "hh:mm a")

  // Get last 6 digits of appointment ID
  const appointmentIdShort = appointment.id.slice(-6).toUpperCase()

  // Get hospital settings for dynamic name
  const hospitalSettings = await getHospitalSettings()
  // Get print settings
  const { getTemplateSettings } = await import("@/app/actions/print-template-settings")
  const settings = await getTemplateSettings("OPD_PRESCRIPTION")

  const isPortrait = (settings.orientation || "Portrait") === "Portrait"
  const themeColor = settings.themeColor || "#0077B6"

  const headerSizeClass =
    (settings.companyNameSize || "Large") === "Small" ? "text-lg" :
    (settings.companyNameSize || "Large") === "Large" ? "text-3xl" : "text-xl"

  const textSizeClass =
    (settings.invoiceTextSize || "Medium") === "Small" ? "text-[8px]" :
    (settings.invoiceTextSize || "Medium") === "Large" ? "text-[12px]" : "text-[10px]"

  // ═══════════════════════════════════════════════════════════════════
  // CUSTOM PRESCRIPTION TEMPLATE — for doctors with custom paper
  // Renders a fully native HTML/CSS layout (no background images!)
  // ═══════════════════════════════════════════════════════════════════
  if (appointment.doctor.opdCustomPaperUrl) {
    return (
      <>
        <PrintTrigger />
        <PKSahooPrescription
          appointment={appointment}
          age={age}
          appointmentDate={appointmentDate}
          hospitalSettings={hospitalSettings}
        />
      </>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // STANDARD PRESCRIPTION TEMPLATE — for all other doctors
  // ═══════════════════════════════════════════════════════════════════
  return (
    <>
      {/* Auto-trigger print */}
      <PrintTrigger />
      {/* Force single-page print via raw CSS — Tailwind print: variants don't prevent Chrome page breaks */}
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0 !important; }
          html, body { margin: 0 !important; padding: 0 !important; height: auto !important; }
          .prescription-pad {
            position: absolute !important;
            top: 0; left: 0;
            width: 210mm !important;
            height: 295mm !important;
            max-height: 295mm !important;
            overflow: hidden !important;
            padding: 6mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            background: white !important;
          }
          .prescription-pad * { overflow: visible; }
        }
      `}} />

      {/* A4/A5 Prescription Pad */}
      <div className="prescription-pad bg-white min-h-screen print:min-h-0 relative shadow-sm print:shadow-none">
        <div 
          className={`mx-auto bg-white p-8 print:p-0 flex flex-col print:h-full ${isPortrait ? 'max-w-[210mm] min-h-[297mm] print:min-h-0' : 'max-w-[297mm] min-h-[210mm] print:min-h-0'} ${textSizeClass}`}
        >
          
          {/* HEADER */}
          {settings.printHeaderRepeat && (
            <div className="flex items-start justify-between border-b-2 pb-4 mb-4" style={{ borderColor: themeColor }}>
              <div className="flex items-start gap-3">
                {hospitalSettings.logoUrl && (
                  <img src={hospitalSettings.logoUrl} alt="Logo" className="h-20 w-20 object-contain flex-shrink-0" />
                )}
                <div>
                  <p className="text-lg font-bold text-gray-900">Dr. {appointment.doctor.user.name}</p>
                  <p className="text-xs text-gray-600">{appointment.doctor.department || appointment.doctor.designation || appointment.doctor.specialization || "General Medicine"}</p>
                  {appointment.doctor.licenseNumber && <p className="text-xs text-gray-500">Reg. No. {appointment.doctor.licenseNumber}</p>}
                </div>
              </div>
              <div className="text-right max-w-[320px]">
                <h1 className={`${headerSizeClass} font-bold tracking-wide uppercase`} style={{ color: themeColor }}>
                  {hospitalSettings.name}
                </h1>
                {hospitalSettings.address && <p className="text-xs text-gray-600 mt-0.5">{hospitalSettings.address}</p>}
                <div className="flex items-center justify-end gap-2 mt-1 text-xs text-gray-500">
                  {hospitalSettings.phone && <span>📞 {hospitalSettings.phone}</span>}
                  {hospitalSettings.email && <span>✉ {hospitalSettings.email}</span>}
                </div>
                {settings.showQualityAccreditations && (settings as any).accreditationText && (
                  <p className="text-[10px] font-bold text-green-700 print:text-black mt-1">✓ {(settings as any).accreditationText}</p>
                )}
              </div>
            </div>
          )}

          {/* PATIENT SECTION */}
          <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: themeColor }}>Patient</h3>
              <p className="font-semibold text-[12px]">{appointment.patient.user.name}, {appointment.patient.gender || "-"}, {age} Yrs</p>
              {appointment.patient.phone && <p className="text-xs text-gray-600">Mobile: {appointment.patient.phone}</p>}
              <p className="text-xs text-gray-500">UHID: {appointment.patient.patientId}</p>
            </div>
            <div className="text-right text-xs text-gray-600 space-y-0.5">
              <p><span className="font-semibold text-gray-800">Date:</span> {appointmentDate}</p>
              {appointmentTime && <p><span className="font-semibold text-gray-800">Time:</span> {appointmentTime}</p>}
              <p><span className="font-semibold text-gray-800">Consult Type:</span> OPD</p>
              <p><span className="font-semibold text-gray-800">Consultant:</span> Dr. {appointment.doctor.user.name}</p>
            </div>
          </div>

          <div className="main-content flex gap-4 flex-1">
            {/* LEFT SIDEBAR (Only show if Vitals, Complaints, or empty lines are needed) */}
            {(settings.showVitals || settings.showChiefComplaints) && (
              <div className="left-sidebar w-1/4 border-r border-gray-300 pr-3 shrink-0">
                
                {settings.showVitals && (
                  <div className="mb-4">
                    <h3 className="text-xs font-bold mb-2 uppercase border-b border-gray-400 pb-1" style={{ color: themeColor }}>Vitals</h3>
                    <div className="vitals-list space-y-2 text-[11px]">
                      <div className="flex items-center"><span className="text-gray-700 font-medium w-10">BP:</span><span className={`flex-1 ${appointment.bloodPressure ? "font-semibold text-black" : "border-b border-dotted border-gray-400"}`}>{appointment.bloodPressure || ""}</span></div>
                      <div className="flex items-center"><span className="text-gray-700 font-medium w-10">Pulse:</span><span className={`flex-1 ${appointment.pulse ? "font-semibold text-black" : "border-b border-dotted border-gray-400"}`}>{appointment.pulse ? `${appointment.pulse} bpm` : ""}</span></div>
                      <div className="flex items-center"><span className="text-gray-700 font-medium w-10">Temp:</span><span className={`flex-1 ${appointment.temperature ? "font-semibold text-black" : "border-b border-dotted border-gray-400"}`}>{appointment.temperature ? `${appointment.temperature}°F` : ""}</span></div>
                      <div className="flex items-center"><span className="text-gray-700 font-medium w-10">Wt:</span><span className={`flex-1 ${appointment.weight ? "font-semibold text-black" : "border-b border-dotted border-gray-400"}`}>{appointment.weight || ""}</span></div>
                      <div className="flex items-center"><span className="text-gray-700 font-medium w-10">SpO2:</span><span className={`flex-1 ${appointment.spo2 ? "font-semibold text-black" : "border-b border-dotted border-gray-400"}`}>{appointment.spo2 ? `${appointment.spo2}%` : ""}</span></div>
                    </div>
                  </div>
                )}
                
                {settings.showChiefComplaints && (
                  <div className="mt-4">
                    <h4 className="text-[10px] font-bold text-gray-700 uppercase mb-1">Chief Complaint:</h4>
                    <p className="text-[11px] text-gray-800 leading-tight">
                      {appointment.reason}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* RIGHT MAIN AREA */}
            <div className={`right-main pl-3 flex-1 ${(settings.showVitals || settings.showChiefComplaints) ? 'w-3/4' : 'w-full'}`}>
              <div className="flex items-center mb-3">
                <div className="rx-symbol text-5xl font-serif italic font-bold" style={{ color: themeColor }}>℞</div>
              </div>

              {/* Clean blank area for doctor to write prescriptions — no lines */}
              <div className="flex-1" />
            </div>
          </div>

          {/* SIGNATURE — pushed to bottom of A4 page */}
          {settings.showSignature && (
            <div className="mt-auto pt-8 print:pt-2 flex justify-end" style={{ marginTop: 'auto' }}>
              <div className="text-center">
                <div className="border-t-2 border-gray-800 w-52 pt-2">
                  <p className="text-sm font-bold text-gray-900">Dr. {appointment.doctor.user.name}</p>
                  {appointment.doctor.licenseNumber && <p className="text-xs text-gray-500">Reg. No: {appointment.doctor.licenseNumber}</p>}
                </div>
              </div>
            </div>
          )}

          {/* DISCLAIMER — at very bottom */}
          <div className="pt-3 mt-4 border-t border-gray-300 print:hidden">
            {settings.showTermsAndConditions && settings.termsText && (
               <p className="text-[10px] text-gray-500 mb-2">{settings.termsText}</p>
            )}
            <p className="text-[10px] text-gray-500 leading-tight">
              <span className="font-bold">Disclaimer:</span> This prescription is issued on the basis of clinical evaluation. 
              Not for Medico-Legal Purpose.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

