"use client"

import { format, differenceInYears } from "date-fns"
import type { HospitalSettingsData } from "@/app/actions/settings"

interface PrintPrescriptionProps {
  appointment: any
  prescription: any
  medicalRecord: any
  hospitalSettings?: HospitalSettingsData
}

// Helper: convert frequency like "1-0-1" into M-N-E-N style
function parseDosageSchedule(frequency: string): { schedule: string; mnen: string; label: string } {
  // If already in M-N-E-N friendly format like "1-0-1", "1-1-1", "1-0-0-1"
  const parts = frequency.replace(/\s/g, "").split("-")
  if (parts.length >= 3 && parts.every(p => /^\d+$/.test(p))) {
    // Pad to 4 parts: Morning - Noon - Evening - Night
    while (parts.length < 4) parts.push("0")
    const schedule = parts.join(" - ")
    const mnen = "M - N - E - N"
    const total = parts.reduce((s, p) => s + parseInt(p), 0)
    const freqLabel = total === 1 ? "Once a day" : total === 2 ? "Twice a day" : total === 3 ? "Thrice a day" : `${total} times a day`
    return { schedule, mnen, label: freqLabel }
  }
  // Fallback for text frequencies like "BD", "TDS", etc.
  const map: Record<string, { schedule: string; label: string }> = {
    "od": { schedule: "1 - 0 - 0 - 0", label: "Once a day" },
    "bd": { schedule: "1 - 0 - 1 - 0", label: "Twice a day" },
    "tds": { schedule: "1 - 1 - 1 - 0", label: "Thrice a day" },
    "qid": { schedule: "1 - 1 - 1 - 1", label: "Four times a day" },
    "hs": { schedule: "0 - 0 - 0 - 1", label: "At bedtime" },
    "sos": { schedule: "- - - - -", label: "As needed" },
    "stat": { schedule: "1 - 0 - 0 - 0", label: "Immediately" },
  }
  const key = frequency.toLowerCase().trim()
  if (map[key]) {
    return { schedule: map[key].schedule, mnen: "M - N - E - N", label: map[key].label }
  }
  return { schedule: frequency, mnen: "", label: frequency }
}

// Helper: extract route from instruction
function getRoute(instruction: string | null): string {
  if (!instruction) return "Orally"
  const lower = instruction.toLowerCase()
  if (lower.includes("topical") || lower.includes("local") || lower.includes("apply")) return "Local application"
  if (lower.includes("iv") || lower.includes("intravenous")) return "Intravenously"
  if (lower.includes("im") || lower.includes("intramuscular")) return "Intramuscular"
  if (lower.includes("sc") || lower.includes("subcutaneous")) return "Subcutaneous"
  if (lower.includes("drops") || lower.includes("ear") || lower.includes("eye") || lower.includes("nasal")) return "Local application"
  return "Orally"
}

// Helper: get timing from instruction
function getTiming(instruction: string | null): string {
  if (!instruction) return ""
  const lower = instruction.toLowerCase()
  if (lower.includes("before food") || lower.includes("before meal") || lower.includes("empty stomach")) return "Before food"
  if (lower.includes("after food") || lower.includes("after meal")) return "After food"
  if (lower.includes("with food") || lower.includes("with meal")) return "With food"
  if (lower.includes("bedtime") || lower.includes("at night") || lower.includes("hs")) return "At bedtime"
  return instruction
}

// Helper: guess form from medication name
function getMedicineForm(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("tablet") || lower.includes("tab")) return "TABLET"
  if (lower.includes("capsule") || lower.includes("cap")) return "CAPSULE"
  if (lower.includes("syrup") || lower.includes("syr")) return "SYRUP"
  if (lower.includes("injection") || lower.includes("inj")) return "INJECTION"
  if (lower.includes("cream") || lower.includes("oint")) return "OINTMENT"
  if (lower.includes("drops") || lower.includes("drop")) return "DROP"
  if (lower.includes("gel")) return "GEL"
  if (lower.includes("inhaler")) return "INHALER"
  if (lower.includes("suspension") || lower.includes("susp")) return "SUSPENSION"
  if (lower.includes("powder")) return "POWDER"
  return "TABLET" // Default
}

import { PrintTemplateSettingsData } from "@/lib/print-template-types"

interface PrintPrescriptionProps {
  appointment: any
  prescription: any
  medicalRecord: any
  hospitalSettings?: HospitalSettingsData
  settings?: PrintTemplateSettingsData
}

export function PrintPrescription({ appointment, prescription, medicalRecord, hospitalSettings, settings }: PrintPrescriptionProps) {
  const patient = appointment.patient
  const doctor = appointment.doctor
  
  const age = patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : null

  // Hospital info from settings
  const hospName = hospitalSettings?.name || "Hospital"
  const hospAddress = hospitalSettings?.address || ""
  const hospPhone = hospitalSettings?.phone || ""
  const hospEmail = hospitalSettings?.email || ""
  const hospWebsite = hospitalSettings?.website || ""
  const hospLogo = hospitalSettings?.logoUrl || null
  const letterheadHeader = hospitalSettings?.letterheadHeaderUrl || null
  const letterheadFooter = hospitalSettings?.letterheadFooterUrl || null

  const hasAdvisory = appointment.advisedAdmission || appointment.advisedSurgery
  const hasMedications = prescription?.medications?.length > 0
  const hasLabTests = appointment.labRequests?.length > 0
  const appointmentDate = new Date(appointment.appointmentDate)

  return (
    <>
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 6mm 8mm;
          }
          body * {
            visibility: hidden;
          }
          #prescription-print,
          #prescription-print * {
            visibility: visible;
          }
          #prescription-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          #prescription-print .px-6 {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          #prescription-print .py-4 {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          #prescription-print h3 {
            font-size: 11px !important;
            margin-bottom: 2px !important;
          }
          #prescription-print .mb-4 {
            margin-bottom: 6px !important;
          }
          #prescription-print table {
            font-size: 10.5px !important;
          }
          #prescription-print table td {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          #prescription-print table th {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
          }
          #prescription-print .mt-10 {
            margin-top: 12px !important;
          }
          #prescription-print .mt-6 {
            margin-top: 6px !important;
          }
          #prescription-print .pt-4 {
            padding-top: 4px !important;
          }
          #prescription-print .pt-3 {
            padding-top: 4px !important;
          }
          #prescription-print .pb-3 {
            padding-bottom: 4px !important;
          }
          #prescription-print .pb-4 {
            padding-bottom: 4px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="prescription-print" className="bg-white text-black max-w-4xl mx-auto border rounded-lg print:border-0 print:rounded-none text-[13px] leading-relaxed">

        {/* ═══════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════ */}
        {letterheadHeader ? (
          <div className="w-full">
            <img src={letterheadHeader} alt="Letterhead" className="w-full h-auto object-contain" />
          </div>
        ) : (
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b-2 border-[#0077B6]">
            {/* Left: Logo + Doctor */}
            <div className="flex items-start gap-3">
              {hospLogo && (
                <img src={hospLogo} alt="Logo" className="h-20 w-20 object-contain flex-shrink-0" />
              )}
              <div>
                <p className="text-lg font-bold text-gray-900">Dr. {doctor.user.name}</p>
                <p className="text-xs text-gray-600">{doctor.designation || doctor.specialization || "General Physician"}</p>
                {doctor.specialization && doctor.designation && (
                  <p className="text-xs text-gray-600">{doctor.specialization}</p>
                )}
                <p className="text-xs text-gray-500">Reg. No. {doctor.licenseNumber || "N/A"}</p>
              </div>
            </div>
            {/* Right: Hospital Info */}
            <div className="text-right max-w-[320px]">
              <p className="text-lg font-bold text-gray-900">{hospName}</p>
              {hospAddress && <p className="text-xs text-gray-600 mt-0.5">{hospAddress}</p>}
              <div className="flex items-center justify-end gap-3 mt-1 text-xs text-gray-500">
                {hospPhone && <span>📞 {hospPhone}</span>}
                {hospEmail && <span>✉ {hospEmail}</span>}
              </div>
              {hospWebsite && <p className="text-xs text-gray-400 mt-0.5">{hospWebsite}</p>}
            </div>
          </div>
        )}

        <div className="px-6 py-4">

          {/* ═══════════════════════════════════════════════
              PATIENT SECTION
          ═══════════════════════════════════════════════ */}
          <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
            <div>
              <h3 className="text-[#0077B6] font-bold text-sm mb-1">Patient</h3>
              <p className="font-semibold">{patient.user.name}, {patient.gender || "N/A"}, {age || "N/A"} Yrs</p>
              {patient.phone && <p className="text-xs text-gray-600">Mobile: {patient.phone}</p>}
              <p className="text-xs text-gray-500">UHID: {patient.patientId}</p>
            </div>
            <div className="text-right text-xs text-gray-600 space-y-0.5">
              <p><span className="font-semibold text-gray-800">Date:</span> {format(appointmentDate, "EEEE, dd MMM yyyy")}</p>
              <p><span className="font-semibold text-gray-800">Time:</span> {appointment.appointmentTime || format(appointmentDate, "hh:mm a")}</p>
              <p><span className="font-semibold text-gray-800">Consult Type:</span> OPD</p>
              <p><span className="font-semibold text-gray-800">Appointment ID:</span> {appointment.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              CHIEF COMPLAINTS
          ═══════════════════════════════════════════════ */}
          {(medicalRecord?.chiefComplaint || appointment.chiefComplaint || appointment.reason) && (
            <div className="mb-4">
              <h3 className="text-[#0077B6] font-bold text-sm mb-1">Chief Complaints</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5 ml-1">
                <li>{medicalRecord?.chiefComplaint || appointment.chiefComplaint || appointment.reason}</li>
              </ul>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              VITALS
          ═══════════════════════════════════════════════ */}
          {(appointment.bloodPressure || appointment.pulse || appointment.temperature || appointment.weight || appointment.spo2) && (
            <div className="mb-4">
              <h3 className="text-[#0077B6] font-bold text-sm mb-1">Vitals</h3>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700 ml-1">
                {appointment.bloodPressure && <span><span className="font-semibold">BP:</span> {appointment.bloodPressure} mmHg</span>}
                {appointment.pulse && <span><span className="font-semibold">Pulse:</span> {appointment.pulse} bpm</span>}
                {appointment.temperature && <span><span className="font-semibold">Temp:</span> {appointment.temperature}°F</span>}
                {appointment.weight && <span><span className="font-semibold">Weight:</span> {appointment.weight} kg</span>}
                {appointment.spo2 && <span><span className="font-semibold">SpO2:</span> {appointment.spo2}%</span>}
                {appointment.height && <span><span className="font-semibold">Height:</span> {appointment.height} cm</span>}
              </div>
              {/* Allergies */}
              {patient.allergies && (
                <p className="text-xs text-red-600 mt-1 ml-1">
                  <span className="font-semibold">Drug Allergies:</span> {patient.allergies}
                </p>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              DIAGNOSIS
          ═══════════════════════════════════════════════ */}
          {(medicalRecord?.diagnosis || appointment.diagnosis) && (
            <div className="mb-4">
              <h3 className="text-[#0077B6] font-bold text-sm mb-1">Diagnosis / Provisional Diagnosis</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5 ml-1">
                <li>{medicalRecord?.diagnosis || appointment.diagnosis}</li>
              </ul>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              MEDICATION PRESCRIBED
          ═══════════════════════════════════════════════ */}
          {hasMedications && (
            <div className="mb-4">
              <h3 className="text-[#0077B6] font-bold text-sm mb-2">Medication Prescribed</h3>
              
              {/* Medication Table */}
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 pr-2 font-bold text-gray-700 w-[40%]">Medicine Name</th>
                    <th className="text-center py-2 px-2 font-bold text-gray-700 w-[20%]">Dosage</th>
                    <th className="text-left py-2 px-2 font-bold text-gray-700 w-[25%]">Medicine Details</th>
                    <th className="text-right py-2 pl-2 font-bold text-gray-700 w-[15%]">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.medications.map((med: any, index: number) => {
                    const dosage = parseDosageSchedule(med.frequency)
                    const form = getMedicineForm(med.medicationName)
                    const route = getRoute(med.instructions)
                    const timing = getTiming(med.instructions)

                    return (
                      <tr key={med.id} className="border-b border-gray-200 align-top">
                        {/* Medicine Name */}
                        <td className="py-3 pr-2">
                          <div className="flex items-start gap-1.5">
                            <span className="text-gray-500 font-medium flex-shrink-0">{index + 1}.</span>
                            <div>
                              <p className="font-bold text-gray-900 uppercase">{med.medicationName}</p>
                              {med.dosage && (
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  Dosage: {med.dosage}
                                </p>
                              )}
                              {med.instructions && (
                                <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                                  <span className="inline-block w-3 h-3 rounded-full border border-gray-400 text-[8px] text-center leading-[10px]">i</span>
                                  {med.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Dosage Schedule */}
                        <td className="py-3 px-2 text-center">
                          <p className="font-bold text-gray-800 tracking-wider">{dosage.schedule}</p>
                          {dosage.mnen && (
                            <p className="text-[10px] text-gray-400 tracking-wider">{dosage.mnen}</p>
                          )}
                        </td>
                        {/* Medicine Details */}
                        <td className="py-3 px-2">
                          <p className="text-gray-800">
                            <span className="font-semibold">{form}</span>
                            <span className="text-gray-400 mx-1">|</span>
                            <span>{dosage.label}</span>
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {route}{timing ? `. ${timing}` : ""}
                          </p>
                        </td>
                        {/* Duration */}
                        <td className="py-3 pl-2 text-right">
                          <p className="font-semibold text-gray-800">{med.duration}</p>
                          {med.quantity > 0 && (
                            <p className="text-[10px] text-gray-400">Qty: {med.quantity}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Legend Row */}
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] text-gray-500">
                <span className="border border-gray-300 rounded px-1.5 py-px">
                  <span className="font-bold">M-N-E-N:</span> Morning - Noon - Evening - Night
                </span>
                <span className="border border-gray-300 rounded px-1.5 py-px">
                  <span className="inline-block w-3 h-3 rounded-full border border-gray-400 text-[8px] text-center leading-[10px] mr-0.5">i</span>
                  Instruction
                </span>
                <span className="border border-gray-300 rounded px-1.5 py-px">
                  <span className="font-bold">NOTE:</span> Medicine Substitution Allowed Wherever Applicable.
                </span>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              DIAGNOSTIC TESTS
          ═══════════════════════════════════════════════ */}
          {hasLabTests && (
            <div className="mb-4 pt-3 border-t border-gray-200">
              <h3 className="text-[#0077B6] font-bold text-sm mb-2">Diagnostic Tests</h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-1 ml-1">
                {appointment.labRequests.map((req: any) => (
                  <li key={req.id} className="uppercase">
                    {req.testName}
                    {req.notes && (
                      <p className="text-[10px] text-gray-500 ml-5 normal-case flex items-center gap-1 mt-0.5">
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-400 text-[8px] text-center leading-[10px]">i</span>
                        {req.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              DOCTOR'S ADVISORY (IPD + SURGERY)
          ═══════════════════════════════════════════════ */}
          {hasAdvisory && (
            <div className="mb-4 pt-3 border-t border-gray-200">
              <h3 className="text-[#0077B6] font-bold text-sm mb-2">Doctor&apos;s Advisory</h3>
              
              {appointment.advisedAdmission && (
                <div className="border-l-4 border-blue-500 bg-blue-50/60 pl-3 py-2 mb-3 rounded-r print:bg-blue-50">
                  <p className="font-bold text-blue-900 text-sm mb-1">🛏️ IPD Admission Recommended</p>
                  {appointment.admissionReason && (
                    <p className="text-gray-700"><span className="font-semibold text-blue-800">Reason:</span> {appointment.admissionReason}</p>
                  )}
                  {appointment.admissionNotes && (
                    <p className="text-gray-600 text-xs mt-1"><span className="font-semibold text-blue-800">Notes:</span> {appointment.admissionNotes}</p>
                  )}
                </div>
              )}

              {appointment.advisedSurgery && (
                <div className="border-l-4 border-rose-500 bg-rose-50/60 pl-3 py-2 mb-3 rounded-r print:bg-rose-50">
                  <p className="font-bold text-rose-900 text-sm mb-1">
                    ✂️ Surgery / Procedure Recommended
                    {appointment.surgeryUrgency && (
                      <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        appointment.surgeryUrgency === "EMERGENCY"
                          ? "bg-red-200 text-red-800"
                          : appointment.surgeryUrgency === "URGENT"
                          ? "bg-orange-200 text-orange-800"
                          : "bg-green-200 text-green-800"
                      }`}>
                        {appointment.surgeryUrgency}
                      </span>
                    )}
                  </p>
                  {appointment.advisedSurgeryName && (
                    <p className="text-gray-700"><span className="font-semibold text-rose-800">Procedure:</span> {appointment.advisedSurgeryName}</p>
                  )}
                  {appointment.surgeryNotes && (
                    <p className="text-gray-600 text-xs mt-1 whitespace-pre-line"><span className="font-semibold text-rose-800">Details:</span> {appointment.surgeryNotes}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              ADVICE & INSTRUCTIONS (Doctor's Notes)
          ═══════════════════════════════════════════════ */}
          {(medicalRecord?.examination || appointment.notes) && (
            <div className="mb-4 pt-3 border-t border-gray-200">
              <h3 className="text-[#0077B6] font-bold text-sm mb-1">Advice &amp; Instructions</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5 ml-1">
                {(medicalRecord?.examination || appointment.notes || "").split("\n").filter((l: string) => l.trim()).map((line: string, i: number) => (
                  <li key={i}>{line.trim()}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              DOCTOR SIGNATURE
          ═══════════════════════════════════════════════ */}
          <div className="mt-10 pt-4 border-t border-gray-200 flex justify-end print:mt-3 print:pt-2">
            <div className="text-center">
              <div className="border-t-2 border-gray-800 w-48 pt-1">
                <p className="text-sm font-bold text-gray-900 print:text-[11px]">Dr. {doctor.user.name}</p>
                <p className="text-xs text-gray-600 print:text-[10px]">{doctor.specialization || "General Physician"}</p>
                <p className="text-xs text-gray-500 print:text-[10px]">Reg. No: {doctor.licenseNumber || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              DISCLAIMER
          ═══════════════════════════════════════════════ */}
          <div className="mt-6 pt-3 border-t border-gray-300 print:mt-2 print:pt-1">
            <p className="text-[10px] text-gray-500 leading-tight print:text-[9px]">
              <span className="font-bold">Disclaimer:</span> This prescription is issued on the basis of clinical evaluation. 
              It is valid from the date of issue until the specific period/dosage of each medicine as advised. 
              Please consult the prescribing doctor for any modifications.
            </p>
            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-gray-400 print:text-[9px]">
                For queries, contact: {hospPhone || "Hospital Reception"}
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            LETTERHEAD FOOTER IMAGE
        ═══════════════════════════════════════════════ */}
        {letterheadFooter && (
          <div className="w-full">
            <img src={letterheadFooter} alt="Letterhead Footer" className="w-full h-auto object-contain" />
          </div>
        )}
      </div>
    </>
  )
}
