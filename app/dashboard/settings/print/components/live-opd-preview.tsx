"use client"

import { PrintTemplateSettingsData } from "@/lib/print-template-types"
import { HospitalSettingsData } from "@/app/actions/settings"
import { Building2, CheckCircle2 } from "lucide-react"

export function LiveOPDPreview({ 
  settings, 
  hospitalSettings 
}: { 
  settings: PrintTemplateSettingsData
  hospitalSettings: HospitalSettingsData 
}) {
  const isPortrait = (settings.orientation || "Portrait") === "Portrait"
  const themeColor = settings.themeColor || "#0077B6"

  const headerSizeClass =
    (settings.companyNameSize || "Large") === "Small" ? "text-lg" :
    (settings.companyNameSize || "Large") === "Large" ? "text-3xl" : "text-xl"

  const textSizeClass =
    (settings.invoiceTextSize || "Medium") === "Small" ? "text-[8px]" :
    (settings.invoiceTextSize || "Medium") === "Large" ? "text-[12px]" : "text-[10px]"

  return (
    <div className={`bg-white shadow-2xl overflow-y-auto flex flex-col transition-all duration-300 ${isPortrait ? 'w-[210mm]' : 'w-[297mm]'}`}>
      {/* Preview Banner */}
      <div className="bg-gray-800 text-white text-xs py-1 px-4 text-center tracking-widest font-mono flex items-center justify-center gap-2">
        <CheckCircle2 className="h-3 w-3 text-green-400" />
        OPD PRESCRIPTION PREVIEW ({settings.paperSize || "A4"} {settings.orientation || "Portrait"})
      </div>

      <div className={`p-8 pb-12 ${textSizeClass} flex-1 flex flex-col mx-auto w-full max-w-5xl`}>
        
        {/* HEADER */}
        {settings.printHeaderRepeat && (
          <div className="flex items-start justify-between border-b-2 pb-4 mb-4" style={{ borderColor: themeColor }}>
            <div className="flex items-start gap-3">
              {hospitalSettings.logoUrl ? (
                <img src={hospitalSettings.logoUrl} alt="Logo" className="h-20 w-20 object-contain flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded" style={{ backgroundColor: `${themeColor}15` }}>
                  <Building2 style={{ color: themeColor }} className="h-10 w-10" />
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-gray-900">Dr. Rajesh Sharma</p>
                <p className="text-xs text-gray-600">MBBS, MD (General Medicine)</p>
                <p className="text-xs text-gray-500">Reg. No. ORD-23456</p>
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
              {settings.showQualityAccreditations && (
                <p className="text-[10px] font-bold text-green-700 mt-1">✓ NABH Accredited Hospital</p>
              )}
            </div>
          </div>
        )}

        {/* PATIENT SECTION */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-sm mb-1" style={{ color: themeColor }}>Patient</h3>
            <p className="font-semibold text-[12px]">Subham Biswal, Male, 28 Yrs</p>
            <p className="text-xs text-gray-600">Mobile: +91 9777929827</p>
            <p className="text-xs text-gray-500">UHID: PID-002341</p>
          </div>
          <div className="text-right text-xs text-gray-600 space-y-0.5">
            <p><span className="font-semibold text-gray-800">Date:</span> Monday, 23 Jun 2025</p>
            <p><span className="font-semibold text-gray-800">Time:</span> 10:30 AM</p>
            <p><span className="font-semibold text-gray-800">Consult Type:</span> OPD</p>
          </div>
        </div>

        {/* CHIEF COMPLAINTS */}
        {settings.showChiefComplaints && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-1" style={{ color: themeColor }}>Chief Complaints</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-0.5 ml-1 text-[11px]">
              <li>Fever since 3 days with body ache</li>
              <li>Mild cough and cold</li>
            </ul>
          </div>
        )}

        {/* VITALS */}
        {settings.showVitals && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-1" style={{ color: themeColor }}>Vitals</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-700 ml-1">
              <span><span className="font-semibold">BP:</span> 120/80 mmHg</span>
              <span><span className="font-semibold">Pulse:</span> 82 bpm</span>
              <span><span className="font-semibold">Temp:</span> 101.2°F</span>
              <span><span className="font-semibold">Weight:</span> 72 kg</span>
              <span><span className="font-semibold">SpO2:</span> 98%</span>
            </div>
          </div>
        )}

        {/* DIAGNOSIS */}
        {settings.showDiagnosis && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-1" style={{ color: themeColor }}>Diagnosis / Provisional Diagnosis</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-0.5 ml-1 text-[11px]">
              <li>Acute Viral Fever (ICD-10: R50.9)</li>
            </ul>
          </div>
        )}

        {/* MEDICATION TABLE */}
        {settings.showMedicationTable && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2" style={{ color: themeColor }}>Medication Prescribed</h3>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 pr-2 font-bold text-gray-700 w-[40%]">Medicine Name</th>
                  {settings.showDosageSchedule && (
                    <th className="text-center py-2 px-2 font-bold text-gray-700 w-[20%]">Dosage</th>
                  )}
                  <th className="text-left py-2 px-2 font-bold text-gray-700 w-[25%]">Details</th>
                  <th className="text-right py-2 pl-2 font-bold text-gray-700 w-[15%]">Duration</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Tab. DOLO 650mg", dosage: "1 - 0 - 1 - 0", form: "TABLET", freq: "Twice a day", route: "Orally. After food", duration: "5 days" },
                  { name: "Tab. CETIRIZINE 10mg", dosage: "0 - 0 - 0 - 1", form: "TABLET", freq: "At bedtime", route: "Orally. At bedtime", duration: "5 days" },
                  { name: "Syr. ASCORIL-LS", dosage: "1 - 1 - 1 - 0", form: "SYRUP", freq: "Thrice a day", route: "Orally. After food", duration: "5 days" },
                ].map((med, idx) => (
                  <tr key={idx} className="border-b border-gray-200 align-top">
                    <td className="py-2.5 pr-2">
                      <span className="text-gray-500 font-medium mr-1.5">{idx + 1}.</span>
                      <span className="font-bold text-gray-900 uppercase">{med.name}</span>
                    </td>
                    {settings.showDosageSchedule && (
                      <td className="py-2.5 px-2 text-center">
                        <p className="font-bold text-gray-800 tracking-wider">{med.dosage}</p>
                        <p className="text-[9px] text-gray-400 tracking-wider">M - N - E - N</p>
                      </td>
                    )}
                    <td className="py-2.5 px-2">
                      <p className="text-gray-800"><span className="font-semibold">{med.form}</span> | {med.freq}</p>
                      <p className="text-gray-500 text-[10px]">{med.route}</p>
                    </td>
                    <td className="py-2.5 pl-2 text-right font-semibold text-gray-800">{med.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LAB TESTS */}
        {settings.showLabTests && (
          <div className="mb-4 pt-3 border-t border-gray-200">
            <h3 className="font-bold text-sm mb-2" style={{ color: themeColor }}>Diagnostic Tests</h3>
            <ol className="list-decimal list-inside text-gray-700 space-y-1 ml-1 text-[11px]">
              <li className="uppercase">Complete Blood Count (CBC)</li>
              <li className="uppercase">Dengue NS1 Antigen</li>
            </ol>
          </div>
        )}

        {/* DOCTOR ADVISORY */}
        {settings.showDoctorAdvisory && (
          <div className="mb-4 pt-3 border-t border-gray-200">
            <h3 className="font-bold text-sm mb-1" style={{ color: themeColor }}>Advice & Instructions</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-0.5 ml-1 text-[11px]">
              <li>Take plenty of fluids and rest</li>
              <li>Review after 3 days with reports</li>
            </ul>
          </div>
        )}

        {/* SIGNATURE */}
        {settings.showSignature && (
          <div className="mt-10 pt-4 border-t border-gray-200 flex justify-end">
            <div className="text-center">
              <div className="border-t-2 border-gray-800 w-52 pt-2">
                <p className="text-sm font-bold text-gray-900">Dr. Rajesh Sharma</p>
                <p className="text-xs text-gray-600">General Medicine</p>
                <p className="text-xs text-gray-500">Reg. No: ORD-23456</p>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        {settings.showTermsAndConditions && settings.termsText && (
          <div className="mt-4 pt-3 border-t border-gray-300">
            <p className="text-[10px] text-gray-500">{settings.termsText}</p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-300">
          <p className="text-[10px] text-gray-500 leading-tight">
            <span className="font-bold">Disclaimer:</span> This prescription is issued on the basis of clinical evaluation.
            Valid from the date of issue until the specific period of each medicine as advised.
          </p>
        </div>
      </div>
    </div>
  )
}
