"use client"

import { PrintTemplateSettingsData } from "@/lib/print-template-types"
import { HospitalSettingsData } from "@/app/actions/settings"
import { Building2, CheckCircle2 } from "lucide-react"

export function LiveLabPreview({ 
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

  // Sample lab data
  const labTests = [
    { name: "Haemoglobin", value: "14.2", unit: "g/dL", refRange: "13.0 - 17.0", status: "normal" },
    { name: "WBC Count", value: "12,500", unit: "/µL", refRange: "4,000 - 11,000", status: "high" },
    { name: "Platelet Count", value: "1,85,000", unit: "/µL", refRange: "1,50,000 - 4,00,000", status: "normal" },
    { name: "RBC Count", value: "5.1", unit: "million/µL", refRange: "4.5 - 5.5", status: "normal" },
    { name: "ESR", value: "28", unit: "mm/hr", refRange: "0 - 15", status: "high" },
    { name: "Blood Sugar (Fasting)", value: "98", unit: "mg/dL", refRange: "70 - 110", status: "normal" },
    { name: "Dengue NS1 Antigen", value: "Negative", unit: "", refRange: "Negative", status: "normal" },
  ]

  return (
    <div className={`bg-white shadow-2xl overflow-y-auto flex flex-col transition-all duration-300 ${isPortrait ? 'w-[210mm]' : 'w-[297mm]'}`}>
      {/* Preview Banner */}
      <div className="bg-gray-800 text-white text-xs py-1 px-4 text-center tracking-widest font-mono flex items-center justify-center gap-2">
        <CheckCircle2 className="h-3 w-3 text-green-400" />
        LAB RESULTS PREVIEW ({settings.paperSize || "A4"} {settings.orientation || "Portrait"})
      </div>

      <div className="p-8 pb-12 text-[11px] flex-1 flex flex-col mx-auto w-full max-w-5xl">
        
        {/* HEADER */}
        {settings.printHeaderRepeat && (
          <div className="flex justify-between items-center border-[1.5px] border-gray-400 mb-4 p-3">
            <div className="flex gap-4 items-center">
              {hospitalSettings.logoUrl ? (
                <img src={hospitalSettings.logoUrl} alt="Logo" className="max-w-[100px] max-h-[60px] object-contain" />
              ) : (
                <div className="w-14 h-14 bg-gray-100 flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
                  <Building2 style={{ color: themeColor }} className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="text-center flex-1">
              <h1 className={`${headerSizeClass} font-bold tracking-wide uppercase`} style={{ color: themeColor }}>
                {hospitalSettings.name}
              </h1>
              <p className="text-gray-700 mt-1 leading-tight font-medium text-[10px]">{hospitalSettings.address}</p>
              <div className="flex items-center justify-center gap-2 mt-1 text-gray-500 text-[10px]">
                {hospitalSettings.phone && <span>Tel.: {hospitalSettings.phone}</span>}
                {hospitalSettings.email && <span>| Email: {hospitalSettings.email}</span>}
              </div>
              {settings.showQualityAccreditations && (
                <p className="text-[9px] font-bold text-green-700 mt-1">✓ NABH Accredited Hospital</p>
              )}
            </div>
            <div className="w-36">
              {settings.showEmergencyBanner && (
                <div className="bg-red-600 text-white font-bold px-2 py-1 text-center text-[9px]">
                  EMERGENCY 1066
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center font-bold text-sm mb-4 uppercase tracking-wide" style={{ color: themeColor }}>
          LABORATORY REPORT
        </div>

        {/* PATIENT DETAILS */}
        <div className="border-[1.5px] border-gray-400 grid grid-cols-2 text-[11px] mb-6">
          <div className="p-3 border-r-[1.5px] border-gray-400 flex flex-col gap-1.5">
            <p className="font-bold text-xs border-b border-gray-300 pb-1">PATIENT DETAILS</p>
            <p className="font-bold text-sm">Subham Biswal</p>
            <p>28Y / Male</p>
            <p>UHID: PID-002341</p>
            <p className="text-gray-600 mt-1">Referred by: Dr. Rajesh Sharma</p>
          </div>
          <div className="p-3 flex flex-col gap-1.5">
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-gray-600">Report No. :</span>
              <span className="font-bold">LAB-2025-00847</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-gray-600">Report Date :</span>
              <span className="font-bold">23-Jun-2025 02:30 PM</span>
            </div>
            {settings.showSampleInfo && (
              <>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-600">Sample Type :</span>
                  <span className="font-bold">Blood (EDTA)</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-600">Collected :</span>
                  <span className="font-bold">23-Jun-2025 09:15 AM</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* TEST RESULTS TABLE */}
        <table className="w-full border-collapse text-[11px] mb-6">
          <thead>
            <tr className="border-t-2 border-b-2 border-black border-dashed">
              <th className="text-left py-2 font-bold text-gray-800 w-[35%]">Test Name</th>
              <th className="text-center py-2 font-bold text-gray-800 w-[20%]">Result</th>
              <th className="text-center py-2 font-bold text-gray-800 w-[15%]">Unit</th>
              {settings.showReferenceRanges && (
                <th className="text-center py-2 font-bold text-gray-800 w-[20%]">Reference Range</th>
              )}
              {settings.showAbnormalFlags && (
                <th className="text-center py-2 font-bold text-gray-800 w-[10%]">Flag</th>
              )}
            </tr>
          </thead>
          <tbody>
            {labTests.map((test, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-2 font-medium text-gray-800 uppercase">{test.name}</td>
                <td className={`py-2 text-center font-bold ${test.status === "high" ? "text-red-600" : "text-gray-900"}`}>
                  {test.value}
                </td>
                <td className="py-2 text-center text-gray-600">{test.unit}</td>
                {settings.showReferenceRanges && (
                  <td className="py-2 text-center text-gray-500">{test.refRange}</td>
                )}
                {settings.showAbnormalFlags && (
                  <td className="py-2 text-center">
                    {test.status === "high" && (
                      <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded">HIGH</span>
                    )}
                    {test.status === "low" && (
                      <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded">LOW</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* REMARKS */}
        <div className="mb-6 text-[11px]">
          <p className="font-bold text-gray-800 mb-1">Remarks:</p>
          <p className="text-gray-600">Elevated WBC and ESR — suggestive of viral infection. Correlate clinically.</p>
        </div>

        {/* SIGNATURES */}
        <div className="mt-auto flex justify-between items-end pt-8">
          {settings.showLabTechSignature && (
            <div className="text-center">
              {hospitalSettings.labTechnicianSignature && (
                <img 
                  src={hospitalSettings.labTechnicianSignature} 
                  alt="Lab Technician" 
                  className="mx-auto"
                  style={{ maxHeight: '40px', marginBottom: '4px', objectFit: 'contain' }} 
                />
              )}
              <div className="border-t border-gray-800 w-44 pt-1">
                <p className="font-semibold text-gray-700 text-[11px]">Lab Technician</p>
                <p className="text-[10px] text-gray-500">DMLT, BSc MLT</p>
              </div>
            </div>
          )}
          {settings.showSignature && (
            <div className="text-center">
              {hospitalSettings.pathologistSignature && (
                <img 
                  src={hospitalSettings.pathologistSignature} 
                  alt="Pathologist" 
                  className="mx-auto"
                  style={{ maxHeight: '40px', marginBottom: '4px', objectFit: 'contain' }} 
                />
              )}
              <div className="border-t border-gray-800 w-44 pt-1">
                <p className="font-semibold text-gray-700 text-[11px]">Pathologist</p>
                <p className="text-[10px] text-gray-500">MD (Pathology)</p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="mt-6 pt-3 border-t border-gray-300">
          <p className="text-[9px] text-gray-500 text-center">
            This is a computer generated report. Results should be correlated clinically. 
            © {hospitalSettings.name} 2025
          </p>
        </div>
      </div>
    </div>
  )
}
