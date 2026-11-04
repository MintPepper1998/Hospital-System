import React from "react"
import { format, differenceInYears } from "date-fns"
import type { HospitalSettingsData } from "@/app/actions/settings"
import type { PrintTemplateSettingsData } from "@/lib/print-template-types"
import { Building2 } from "lucide-react"

export interface CatalogParameter {
  name: string
  unit: string
  normalRange: string
  method?: string
  sectionHeading?: string
  isAbnormal?: boolean
}

interface LabReportTemplateProps {
  request: any
  hospitalSettings: HospitalSettingsData
  printSettings: PrintTemplateSettingsData
  catalogParameters: CatalogParameter[] | null
  parameterResults: Record<string, string> | null
  isRadiology: boolean
  patientAge: number | null
  referringDoctor: string
}

export function LabReportTemplate({
  request,
  hospitalSettings,
  printSettings,
  catalogParameters,
  parameterResults,
  isRadiology,
  patientAge,
  referringDoctor,
}: LabReportTemplateProps) {
  const isPortrait = printSettings.orientation === "Portrait"
  const themeColor = printSettings.themeColor || (isRadiology ? "#7C3AED" : "#2563EB")
  const departmentName = isRadiology ? "RADIOLOGY" : "PATHOLOGY"

  const hasStructuredResults = catalogParameters && catalogParameters.length > 0 && parameterResults

  const dispName = hospitalSettings.name
  const dispAddress = hospitalSettings.address
  const dispPhone = hospitalSettings.phone
  const dispEmail = hospitalSettings.email
  const dispGstin = hospitalSettings.gstNo

  const headerSizeClass = 
    printSettings.companyNameSize === "Small" ? "text-lg print:text-base" :
    printSettings.companyNameSize === "Large" ? "text-3xl print:text-2xl" : "text-xl print:text-lg"

  // ── Density tiers: adjust spacing based on parameter count ──
  // This ensures reports with many parameters (like CBC) still fit on 1 page.
  const paramCount = catalogParameters?.length || 0
  const hasImpression = !!request.impression

  // Determine density tier
  // "normal" = ≤8 params, "compact" = 9-15, "dense" = 16-22, "ultra" = 23+
  const density: "normal" | "compact" | "dense" | "ultra" =
    paramCount <= 8 ? "normal" :
    paramCount <= 15 ? "compact" :
    paramCount <= 22 ? "dense" : "ultra"

  // Impression text adds ~80px, adjust thresholds if present
  const effectiveDensity: typeof density =
    hasImpression && density === "normal" && paramCount > 5 ? "compact" :
    hasImpression && density === "compact" ? "dense" :
    hasImpression && density === "dense" ? "ultra" :
    density

  // Table row padding per density
  const rowPy = {
    normal: "py-2.5 print:py-2",
    compact: "py-1.5 print:py-1",
    dense: "py-1 print:py-[3px]",
    ultra: "py-0.5 print:py-[2px]",
  }[effectiveDensity]

  // Table font size per density
  const tableFontSize = {
    normal: "text-[13px] print:text-[11px]",
    compact: "text-[12px] print:text-[10px]",
    dense: "text-[11px] print:text-[9px]",
    ultra: "text-[10px] print:text-[8.5px]",
  }[effectiveDensity]

  // Section margins per density
  const sectionMb = {
    normal: "mb-6 print:mb-4",
    compact: "mb-4 print:mb-2",
    dense: "mb-2 print:mb-1",
    ultra: "mb-1 print:mb-0.5",
  }[effectiveDensity]

  // Header margin bottom
  const headerMb = {
    normal: "mb-6 print:mb-4",
    compact: "mb-4 print:mb-2",
    dense: "mb-2 print:mb-1",
    ultra: "mb-1 print:mb-0.5",
  }[effectiveDensity]

  // Footer spacing
  const footerPt = {
    normal: "pt-8",
    compact: "pt-4",
    dense: "pt-2",
    ultra: "pt-1",
  }[effectiveDensity]

  // Signature spacer
  const sigSpacer = {
    normal: "mb-8",
    compact: "mb-4",
    dense: "mb-2",
    ultra: "mb-1",
  }[effectiveDensity]

  // Patient info padding
  const patInfoPad = {
    normal: "p-3",
    compact: "p-2.5",
    dense: "p-2",
    ultra: "p-1.5",
  }[effectiveDensity]

  const patInfoGap = {
    normal: "gap-2",
    compact: "gap-1.5",
    dense: "gap-1",
    ultra: "gap-0.5",
  }[effectiveDensity]

  return (
    <div className={`bg-white shadow-md print:shadow-none mx-auto ${isPortrait ? 'max-w-[210mm]' : 'max-w-[297mm]'} p-8 print:p-[5mm] print:border-none overflow-hidden box-border`} style={{ minHeight: "297mm" }}>
      {/* HEADER */}
      {printSettings.printHeaderRepeat && (
        <div className={`flex justify-between items-center border-[1.5px] border-gray-400 ${headerMb} p-2 min-h-[4rem] py-2 print:h-auto`}>
          <div className="flex gap-4 items-center pl-2">
            {hospitalSettings.logoUrl ? (
              <img src={hospitalSettings.logoUrl} alt="Logo" className="max-w-[100px] max-h-[55px] object-contain" />
            ) : (
              <div 
                className="w-14 h-14 bg-gray-200 flex items-center justify-center print:border print:border-gray-300"
                style={{ backgroundColor: `${themeColor}20` }}
              >
                <Building2 style={{ color: themeColor }} className="h-8 w-8 print:text-black" />
              </div>
            )}
          </div>
          
          <div className="text-center flex-1">
            <h1 className={`${headerSizeClass} font-bold tracking-wide uppercase print:text-black`} style={{ color: themeColor }}>
              {dispName}
            </h1>
            <p className="text-gray-700 mt-0.5 leading-tight font-medium print:text-black text-xs">
              {dispAddress}
            </p>
            <div className="flex items-center justify-center gap-2 mt-0.5 text-gray-700 print:text-black text-xs">
              {dispPhone && <span>Tel.: {dispPhone}</span>}
              {dispEmail && <span>| Email: {dispEmail}</span>}
            </div>
            {dispGstin && <p className="text-gray-500 font-medium mt-0.5 print:text-black text-[10px]">GSTIN: {dispGstin}</p>}
            {printSettings.showQualityAccreditations && (printSettings as any).accreditationText && (
              <p className="text-[9px] font-bold text-green-700 print:text-black mt-0.5">✓ {(printSettings as any).accreditationText}</p>
            )}
          </div>

          <div className="w-36 shrink-0 flex justify-end flex-col items-end gap-1">
             <div className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 text-center text-xs print:border-[1.5px] print:border-black print:text-black print:bg-transparent uppercase" style={{ borderColor: themeColor }}>
                DEPARTMENT OF {departmentName}
             </div>
             <p className="text-[9px] text-gray-500 font-mono mt-0.5">ID: {request.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
      )}

      {/* Patient Info Grid */}
      <div className={`border-[1.5px] border-gray-400 text-gray-800 print:text-black grid grid-cols-2 text-xs ${sectionMb}`}>
        <div className={`${patInfoPad} border-r-[1.5px] border-gray-400 flex flex-col ${patInfoGap}`}>
          <p className="font-bold border-b border-gray-300 pb-0.5 mb-0.5 text-[10px] uppercase text-gray-500">Patient Details</p>
          <div className="grid grid-cols-[70px_1fr] flex-1">
            <span className="text-gray-600 print:text-black text-[10px]">Name :</span> <span className="font-bold text-xs uppercase">{request.patient.user.name}</span>
          </div>
          <div className="grid grid-cols-[70px_1fr] flex-1">
            <span className="text-gray-600 print:text-black text-[10px]">Age / Sex :</span> <span className="text-[11px]">{patientAge ? `${patientAge} Years` : "N/A"} / {request.patient.gender || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[70px_1fr] flex-1">
            <span className="text-gray-600 print:text-black text-[10px]">Patient ID :</span> <span className="font-semibold text-[11px]">{request.patient.patientId}</span>
          </div>
        </div>
        <div className={`${patInfoPad} flex flex-col ${patInfoGap}`}>
           <div className="grid grid-cols-[70px_1fr] flex-1">
             <span className="text-gray-600 print:text-black text-[10px]">Ref By :</span> <span className="font-bold text-[11px]">{referringDoctor}</span>
           </div>
           <div className="grid grid-cols-[70px_1fr] flex-1">
             <span className="text-gray-600 print:text-black text-[10px]">Sample On :</span> <span className="text-[11px]">{format(new Date(request.createdAt), "dd-MMM-yyyy hh:mm a")}</span>
           </div>
           <div className="grid grid-cols-[70px_1fr] flex-1">
             <span className="text-gray-600 print:text-black text-[10px]">Reported :</span> <span className="text-[11px]">{request.completedAt ? format(new Date(request.completedAt), "dd-MMM-yyyy hh:mm a") : format(new Date(), "dd-MMM-yyyy hh:mm a")}</span>
           </div>
           {request.billing?.billNumber && (
             <div className="grid grid-cols-[70px_1fr] flex-1">
               <span className="text-gray-600 print:text-black text-[10px]">Bill No :</span> <span className="text-[11px]">{request.billing.billNumber}</span>
             </div>
           )}
        </div>
      </div>

      {/* Test Name */}
      <div className={`${sectionMb} border-[1.5px] border-gray-400 flex items-center justify-between p-1.5 print:border-black`}>
        <h2 className="font-bold text-base uppercase ml-2">{request.testName}</h2>
        {request.priority === "URGENT" || request.priority === "EMERGENCY" ? (
          <span className="bg-red-100 text-red-800 text-[9px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase print:bg-transparent print:border-black print:text-black">
            {request.priority}
          </span>
        ) : (
          <span className="text-[9px] text-gray-500 uppercase">{request.priority} PRIORITY</span>
        )}
      </div>

      {/* Results Section */}
      <div className={`${sectionMb} break-inside-auto`}>
        <h3 className="text-[10px] font-bold uppercase mb-1 pb-0.5 border-b-2" style={{ color: themeColor, borderColor: themeColor }}>
          {isRadiology ? "FINDINGS" : "RESULTS / OBSERVATIONS"}
        </h3>

        {hasStructuredResults ? (
          <table className={`w-full ${tableFontSize} border-collapse mt-1 text-gray-800 print:text-black break-inside-auto table-fixed`}>
            <thead className="break-inside-avoid">
              <tr style={{ backgroundColor: `${themeColor}15` }}>
                <th className={`text-left px-2 ${rowPy} font-semibold border-b border-gray-300 print:border-black w-[35%]`}>Test Name</th>
                <th className={`text-center px-2 ${rowPy} font-semibold border-b border-gray-300 print:border-black w-[15%]`}>Result</th>
                <th className={`text-center px-2 ${rowPy} font-semibold border-b border-gray-300 print:border-black w-[15%]`}>Unit</th>
                {printSettings.showReferenceRanges && (
                  <th className={`text-center px-2 ${rowPy} font-semibold border-b border-gray-300 print:border-black w-[20%]`}>Reference Range</th>
                )}
                <th className={`text-center px-2 ${rowPy} font-semibold border-b border-gray-300 print:border-black w-[15%]`}>Method</th>
              </tr>
            </thead>
            <tbody>
              {catalogParameters!.map((param, i) => {
                const rawResult = parameterResults![param.name] || "-"
                const isAbnormal = param.isAbnormal || false
                const isNewSection = !!param.sectionHeading && (i === 0 || catalogParameters![i - 1].sectionHeading !== param.sectionHeading)

                return (
                  <React.Fragment key={i}>
                    {isNewSection && (
                      <tr className="bg-gray-50/80 print:bg-transparent break-inside-avoid">
                        <td
                          colSpan={printSettings.showReferenceRanges ? 5 : 4}
                          className="px-2 py-1 font-bold text-[11px] print:text-[10px] text-blue-900 print:text-black uppercase tracking-wide border-b border-gray-300 print:border-black underline"
                        >
                          {param.sectionHeading}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-200 border-dashed print:border-black break-inside-avoid">
                      <td className={`px-2 ${rowPy} font-medium uppercase break-words`}>{param.name}</td>
                      <td className={`px-2 ${rowPy} text-center`}>
                        <span className={`font-bold ${isAbnormal && printSettings.showAbnormalFlags ? 'text-red-600 print:text-black' : ''}`}>
                          {rawResult}
                        </span>
                      </td>
                      <td className={`px-2 ${rowPy} text-center text-gray-600 print:text-black break-words`}>{param.unit || "-"}</td>
                      {printSettings.showReferenceRanges && (
                        <td className={`px-2 ${rowPy} text-center text-gray-600 print:text-black break-words`}>{param.normalRange || "-"}</td>
                      )}
                      <td className={`px-2 ${rowPy} text-center text-[10px] text-gray-500 print:text-black break-words`}>{param.method || "—"}</td>
                    </tr>
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="whitespace-pre-wrap text-gray-800 print:text-black leading-relaxed pl-2 text-sm print:text-xs min-h-[200px]">
            {request.reportContent || (
              <span className="text-gray-400 italic">No findings recorded</span>
            )}
          </div>
        )}
      </div>

      {/* Impression */}
      {request.impression && (
        <div className={`${sectionMb}`}>
          <h3 className="text-[10px] font-bold uppercase mb-1 pb-0.5 border-b-2" style={{ color: themeColor, borderColor: themeColor }}>
            IMPRESSION / CONCLUSION
          </h3>
          <div className="p-2 whitespace-pre-wrap font-semibold text-xs print:text-[10px] text-gray-900 print:text-black border border-gray-300 print:border-black">
            {request.impression}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Footer / Signature */}
      <div className={`mt-auto ${footerPt} border-t border-gray-400 print:border-black print:border-dashed print:break-inside-avoid`}>
        <div className="flex justify-between items-end">
          <div className="text-center">
            {hospitalSettings?.labTechnicianSignature ? (
              <div className="flex flex-col items-center">
                <img src={hospitalSettings.labTechnicianSignature} alt="Lab Tech Signature" className="max-h-12 max-w-[140px] mb-1 object-contain" />
                <p className="text-[10px] text-gray-500 font-medium">Lab Technician</p>
              </div>
            ) : null}
          </div>
          <div className="text-right">
            {hospitalSettings?.pathologistSignature ? (
              <img src={hospitalSettings.pathologistSignature} alt="Pathologist Signature" className="max-h-12 max-w-[140px] mb-1 object-contain ml-auto" />
            ) : (
              <div className={sigSpacer} />
            )}
            <div className="border-t border-gray-800 print:border-black pt-1 min-w-[180px]">
              <p className="font-bold text-gray-900 print:text-black text-xs">
                {request.performedBy || "Lab Technician"}
              </p>
              <p className="text-[10px] text-gray-600 print:text-black mt-0.5">
                {isRadiology ? "Radiologist / Technician" : "Pathologist / Technician"}
              </p>
              <p className="text-[9px] text-gray-500 print:text-black">Electronically Signed</p>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200 print:border-gray-300 text-[9px] text-gray-500 print:text-black text-center space-y-0.5">
          {printSettings.showPrintDescription && printSettings.printDescriptionText && (
            <p className="font-semibold text-[10px] mb-1">{printSettings.printDescriptionText}</p>
          )}
          <p>This is a computer-generated report. Results should be correlated clinically.</p>
          <p>For any queries, please contact the {departmentName.toLowerCase()} department.</p>
        </div>
      </div>
    </div>
  )
}
