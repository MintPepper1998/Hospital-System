"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Printer, X, Radiation, QrCode } from "lucide-react"
import { useRef } from "react"
import { LabReportTemplate, type CatalogParameter } from "@/components/lab/lab-report-template"
import type { HospitalSettingsData } from "@/app/actions/settings"
import type { PrintTemplateSettingsData } from "@/lib/print-template-types"
import type { EnhancedParametersData } from "./lab-test-dialog"

interface LabTest {
  id: string
  name: string
  code: string
  price: number
  category: string | null
  type?: "PATHOLOGY" | "RADIOLOGY"
  parameters?: unknown | null
}

interface HospitalInfo {
  name: string
  address: string
  phone: string
  email: string
  logoUrl?: string | null
  labTechnicianSignature?: string | null
  pathologistSignature?: string | null
  gstNo?: string | null
  website?: string | null
}

interface LabTestPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  test: LabTest
  testType?: "PATHOLOGY" | "RADIOLOGY"
  hospital?: HospitalInfo | null
}

function parseParameters(raw: unknown): EnhancedParametersData | null {
  if (!raw) return null
  const obj = raw as Record<string, unknown>
  if (obj.sections && Array.isArray(obj.sections)) {
    return {
      sections: obj.sections as EnhancedParametersData["sections"],
      notes: (obj.notes as string) || "",
      sampleType: (obj.sampleType as string) || "",
      defaultInterpretation: (obj.defaultInterpretation as string) || (obj.notes as string) || "",
      defaultDiagramUrl: (obj.defaultDiagramUrl as string) || (obj.defaultImageUrl as string) || "",
      defaultImageUrl: (obj.defaultImageUrl as string) || (obj.defaultDiagramUrl as string) || "",
      defaultImagePosition: ((obj.defaultImagePosition as string) === "start" ? "start" : "end") as "start" | "end",
      modality: (obj.modality as string) || "",
      studyArea: (obj.studyArea as string) || "",
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return {
      sections: [
        {
          heading: "",
          parameters: raw.map((item: unknown) => {
            const p = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
            return {
              name: (p.name as string) || "",
              unit: (p.unit as string) || "",
              normalRange: (p.normalRange as string) || "",
              method: (p.method as string) || "",
              inputType: "text" as const,
              options: [],
              abnormalValues: [],
              defaultResult: (p.defaultResult as string) || "",
            }
          }),
        },
      ],
      notes: "",
      sampleType: "",
      defaultInterpretation: "",
      defaultDiagramUrl: "",
      defaultImageUrl: "",
      defaultImagePosition: "end",
      modality: "",
      studyArea: "",
    }
  }
  return null
}

function sampleValue(param: {
  name?: string
  inputType?: string
  options?: string[]
  normalRange?: string
  abnormalValues?: string[]
  defaultResult?: string
}): { value: string; isAbnormal: boolean } {
  if (param.defaultResult && param.defaultResult.trim()) {
    return { value: param.defaultResult.trim(), isAbnormal: false }
  }

  const n = (param.name || "").toLowerCase()
  if (n === "volume") return { value: "10", isAbnormal: false }
  if (n === "colour" || n === "color") return { value: "yellowish", isAbnormal: false }
  if (n === "appearance") return { value: "turbidity", isAbnormal: false }
  if (n === "ph") return { value: "6.0", isAbnormal: false }
  if (n === "specific gravity") return { value: "1.010", isAbnormal: false }
  if (n === "urine protein") return { value: "trace", isAbnormal: false }
  if (n === "urine glucose") return { value: "absent", isAbnormal: false }
  if (n === "ketone") return { value: "not done", isAbnormal: false }
  if (n === "nitrite") return { value: "not done", isAbnormal: false }
  if (n === "blood") return { value: "nil", isAbnormal: false }
  if (n === "urobilinogen") return { value: "not done", isAbnormal: false }
  if (n === "urine bilirubin") return { value: "not done", isAbnormal: false }
  if (n === "leukocyte") return { value: "present", isAbnormal: false }
  if (n === "r.b.c." || n === "rbc") return { value: "nil", isAbnormal: false }
  if (n === "pus cells") return { value: "10-12", isAbnormal: false }
  if (n === "epithelial cells") return { value: "+", isAbnormal: false }
  if (n === "casts") return { value: "nil", isAbnormal: false }
  if (n === "crystals") return { value: "nil", isAbnormal: false }

  if (param.inputType === "select" && param.options && param.options.length > 0) {
    const val = param.options[0]
    return { value: val, isAbnormal: (param.abnormalValues || []).includes(val) }
  }
  const range = param.normalRange || ""
  if (range) {
    const match = range.match(/([\d.]+)\s*[-–]\s*([\d.]+)/)
    if (match) {
      const low = parseFloat(match[1])
      const high = parseFloat(match[2])
      const mid = ((low + high) / 2).toFixed(1)
      return {
        value: mid.endsWith(".0") && !range.includes(".") ? parseInt(mid, 10).toString() : mid,
        isAbnormal: false,
      }
    }
    if (range.toLowerCase().includes("negative")) return { value: "NEGATIVE", isAbnormal: false }
    if (range.toLowerCase().includes("nil")) return { value: "NIL", isAbnormal: false }
    return { value: range, isAbnormal: false }
  }
  return { value: "—", isAbnormal: false }
}

export function LabTestPreviewDialog({
  open,
  onOpenChange,
  test,
  testType = "PATHOLOGY",
  hospital,
}: LabTestPreviewDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const data = parseParameters(test.parameters)

  const isRadiology =
    testType === "RADIOLOGY" ||
    test.type === "RADIOLOGY" ||
    test.category?.toUpperCase() === "RADIOLOGY" ||
    test.category?.toUpperCase() === "ULTRASOUND" ||
    test.category?.toUpperCase() === "X-RAY" ||
    test.category?.toUpperCase() === "CT SCAN" ||
    test.category?.toUpperCase() === "MRI" ||
    test.category?.toUpperCase() === "MAMMOGRAPHY" ||
    test.category?.toUpperCase() === "DOPPLER"

  if (!data || data.sections.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogTitle>Report Preview — {test.name}</DialogTitle>
          <div className="py-8 text-center text-muted-foreground">
            <p>No parameters defined for this test.</p>
            <p className="text-sm mt-2">Edit the test and add parameter sections to see a report preview.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const catalogParameters: CatalogParameter[] = []
  const parameterResults: Record<string, string> = {}

  data.sections.forEach((section) => {
    const heading = section.heading ? section.heading.trim() : undefined
    section.parameters.forEach((param) => {
      const s = sampleValue(param)
      parameterResults[param.name] = s.value
      catalogParameters.push({
        name: param.name,
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        method: param.method || "",
        sectionHeading: heading,
        isAbnormal: s.isAbnormal,
      })
    })
  })

  const themeColor = isRadiology ? "#7C3AED" : "#2563EB"
  const defaultImageUrl = data.defaultImageUrl || data.defaultDiagramUrl || ""
  const defaultImagePosition = data.defaultImagePosition || "end"
  const defaultInterpretation = data.defaultInterpretation || data.notes || ""
  const modality = data.modality || (isRadiology ? "ULTRASOUND" : "CLINICAL")
  const studyArea = data.studyArea || test.name

  const mockRequest = {
    id: test.code || "49015121",
    testName: test.name,
    testPrice: test.price,
    testType: isRadiology ? "RADIOLOGY" : "PATHOLOGY",
    status: "COMPLETED",
    priority: "ROUTINE",
    notes: data.notes || null,
    reportContent: defaultInterpretation || null,
    impression: data.notes || null,
    completedAt: new Date("2026-10-23T12:24:00"),
    performedBy: "Dr. Monika Panda",
    createdAt: new Date("2026-10-23T12:20:00"),
    patient: {
      id: "mock-patient-id",
      patientId: "PAT-2026-0175",
      dateOfBirth: new Date("1992-05-15"),
      gender: "MALE",
      bloodGroup: "O+",
      user: {
        name: "SUBRAT KUMAR SAHOO",
        email: "patient@shreekamal.com",
        phone: "+919777919827",
      },
    },
    appointment: {
      doctor: {
        specialization: isRadiology ? "Radiodiagnosis" : "Pathology",
        user: { name: "Self / Direct" },
      },
    },
    billing: { billNumber: "BILL-2026-0590" },
  }

  const hospitalSettings = {
    id: 1,
    name: hospital?.name || "SHREE KAMAL HOSPITAL",
    address: hospital?.address || "CHANDAPUR , PANIKOILI , JAJPUR , ODISHA , 755043",
    phone: hospital?.phone || "+919777919827",
    email: hospital?.email || "radiology@shreekamal.com",
    website: hospital?.website || "www.shreekamal.com",
    gstNo: hospital?.gstNo || "",
    logoUrl: hospital?.logoUrl || "/shree-kamal-logo.png",
    letterheadHeaderUrl: null,
    letterheadFooterUrl: null,
    labTechnicianSignature: hospital?.labTechnicianSignature || null,
    pathologistSignature: hospital?.pathologistSignature || null,
  } as unknown as HospitalSettingsData

  const printSettings = {
    templateType: "LAB_RESULTS",
    orientation: "Portrait",
    themeColor,
    companyNameSize: "Medium",
    printHeaderRepeat: true,
    showReferenceRanges: true,
    showAbnormalFlags: true,
    showQualityAccreditations: false,
    showPrintDescription: false,
  } as unknown as PrintTemplateSettingsData

  const handlePrint = () => {
    if (!printRef.current) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${test.name} - ${isRadiology ? "Radiology" : "Lab"} Report</title>
        ${styles}
        <style>
          @page { margin: 10mm 12mm; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; margin: 0; padding: 0; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        </style>
      </head>
      <body class="bg-white">
        <div style="width: 210mm; margin: 0 auto;">
          ${printRef.current.innerHTML}
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 350)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] max-h-[94vh] overflow-y-auto p-0 bg-slate-100 border-none shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>Report Preview — {test.name}</DialogTitle>
        </VisuallyHidden>

        {/* Toolbar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 bg-slate-900 text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-md border ${
                isRadiology
                  ? "bg-purple-600/30 text-purple-300 border-purple-500/30"
                  : "bg-blue-600/30 text-blue-400 border-blue-500/30"
              }`}
            >
              {isRadiology ? <Radiation className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-wide">
                  {isRadiology ? "Radiology Report Preview" : "Pathology Report Preview"}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    isRadiology
                      ? "bg-purple-950 text-purple-300 border-purple-700"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {isRadiology ? "RADIOLOGY" : "PATHOLOGY"}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {catalogParameters.length} parameters
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {test.code || test.id} — {test.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className={`h-8 text-xs text-white shadow-sm font-semibold ${
                isRadiology ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Report
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Report Canvas */}
        <div className="p-4 sm:p-6 flex justify-center bg-slate-100/80">
          <div
            ref={printRef}
            className="w-full max-w-[210mm] shadow-2xl rounded-sm overflow-hidden bg-white border border-gray-200"
          >
            {isRadiology ? (
              /* ── Medclin-grade Radiology Layout ── */
              <div className="border-2 border-black p-5 sm:p-6 text-slate-900 font-sans min-h-[270mm] flex flex-col justify-between">
                <div>
                  {/* 1. Header */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full border-2 border-black flex items-center justify-center bg-slate-50 text-slate-900">
                        <Radiation className="h-7 w-7 text-purple-700" />
                      </div>
                      <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-950 font-serif">
                          {hospitalSettings.name}
                        </h1>
                        <p className="text-[10px] text-slate-600 font-medium">
                          (A Unit of Shree Kamal Healthcare Private Limited)
                        </p>
                        <p className="text-[10px] text-slate-600 font-medium leading-tight">
                          {hospitalSettings.address}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                          Phone: {hospitalSettings.phone} | Email: {hospitalSettings.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="border border-black px-2.5 py-1 bg-slate-50 inline-block text-right">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          ACCREDITED IMAGING CENTRE
                        </span>
                        <span className="block font-mono text-xs font-black text-slate-950">
                          RAD-PREVIEW-{test.code || "001"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Department Banner */}
                  <div className="bg-black text-white text-center py-1 mt-1 font-bold text-xs uppercase tracking-widest">
                    DEPARTMENT OF RADIODIAGNOSIS &amp; IMAGING — RADIOLOGY TEST REPORT
                  </div>

                  {/* 3. Patient Demographics Grid */}
                  <div className="border border-black mt-1 text-[11px]">
                    <div className="grid grid-cols-2 divide-x divide-black">
                      <div className="divide-y divide-black/80">
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Patient Name :</span>
                          <span className="font-bold text-slate-950 uppercase">SUBRAT KUMAR SAHOO</span>
                        </div>
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Age / Gender :</span>
                          <span className="font-medium text-slate-950">34 Y / MALE</span>
                        </div>
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Patient ID (UHID) :</span>
                          <span className="font-mono font-bold text-slate-950">PAT-2026-0042</span>
                        </div>
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Referred By :</span>
                          <span className="font-semibold text-slate-950">Dr. SELF</span>
                        </div>
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Patient Location :</span>
                          <span className="font-medium text-slate-950">OPD Walk-in</span>
                        </div>
                      </div>

                      <div className="divide-y divide-black/80">
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Report No / SID :</span>
                          <span className="font-mono font-bold text-slate-950">RAD-20261101-008</span>
                        </div>
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Registered Date :</span>
                          <span className="font-mono text-slate-950">01-Nov-2026 10:15 AM</span>
                        </div>
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Reported Date :</span>
                          <span className="font-mono text-slate-950">01-Nov-2026 11:30 AM</span>
                        </div>
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Modality / Area :</span>
                          <span className="font-bold text-slate-950 uppercase">
                            {modality} — {studyArea}
                          </span>
                        </div>
                        <div className="p-1.5 flex">
                          <span className="w-32 shrink-0 font-semibold text-slate-600">Report Status :</span>
                          <span className="font-bold text-emerald-800 uppercase tracking-wide">
                            FINAL REPORT / VERIFIED
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Investigation Bar */}
                  <div className="border-x border-b border-black bg-slate-100/90 px-3 py-1.5 flex justify-between items-center text-xs">
                    <div className="font-bold uppercase tracking-wide text-slate-950">
                      INVESTIGATION : <span className="underline decoration-purple-500 underline-offset-2">{test.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 uppercase">
                      STUDY : {studyArea}
                    </div>
                  </div>

                  {/* 5. 5-Column Parameters Table */}
                  {catalogParameters.length > 0 && (
                    <div className="border-x border-b border-black">
                      <table className="w-full text-[10.5px] border-collapse">
                        <thead>
                          <tr className="border-b border-black bg-slate-50 text-slate-900 font-bold uppercase tracking-wider text-[9.5px]">
                            <th className="py-1 px-3 text-left w-[24%] border-r border-black/40">Test / Parameter</th>
                            <th className="py-1 px-3 text-left w-[36%] border-r border-black/40">Results</th>
                            <th className="py-1 px-2 text-center w-[10%] border-r border-black/40">Units</th>
                            <th className="py-1 px-3 text-left w-[15%] border-r border-black/40">Bio. Ref. Interval</th>
                            <th className="py-1 px-3 text-left w-[15%]">Method</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {data.sections.flatMap((s) => s.parameters).map((param, index) => {
                            const val = sampleValue(param).value
                            return (
                              <tr key={index} className="leading-tight">
                                <td className="py-1 px-3 font-semibold text-slate-900 border-r border-black/40 uppercase">
                                  {param.name}
                                </td>
                                <td className="py-1 px-3 font-mono font-bold text-slate-950 border-r border-black/40">
                                  {val}
                                </td>
                                <td className="py-1 px-2 text-center text-slate-700 border-r border-black/40">
                                  {param.unit || "—"}
                                </td>
                                <td className="py-1 px-3 text-slate-600 border-r border-black/40 whitespace-pre-line">
                                  {param.normalRange || "—"}
                                </td>
                                <td className="py-1 px-3 text-slate-500 font-medium">
                                  {param.method || "Real-time B Mode"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 6. Interpretation & Clinical Findings */}
                  <div className="border-x border-b border-black p-3.5 space-y-3">
                    <div>
                      <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-slate-950 underline underline-offset-2 mb-1.5">
                        Interpretation :-
                      </h3>

                      {/* ── IMAGE AT START ── */}
                      {defaultImageUrl && defaultImagePosition === "start" && (
                        <div className="pb-3 border-b border-black/20 mb-3 text-center">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 text-left">
                            DIAGNOSTIC IMAGING CAPTURES &amp; SCAN FILMS :-
                          </div>
                          <div className="border border-black/60 p-2 bg-white inline-block max-w-md shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={defaultImageUrl}
                              alt="Reference Diagram"
                              className="max-h-72 max-w-full object-contain mx-auto rounded"
                            />
                            <p className="text-[9px] font-semibold text-slate-700 italic mt-1">
                              Reference Anatomical / Sonological Correlation
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Text Findings */}
                      <div className="text-[11px] leading-relaxed text-slate-900 whitespace-pre-wrap font-sans">
                        {defaultInterpretation || "Normal sonological study with no focal lesions or acute abnormality."}
                      </div>
                    </div>

                    {/* Final Diagnostic Impression Box */}
                    <div className="p-2.5 bg-slate-50 border border-black rounded text-[11px]">
                      <span className="font-bold text-slate-950 uppercase tracking-wider block mb-1">
                        IMPRESSION :-
                      </span>
                      <p className="font-semibold text-slate-950 whitespace-pre-wrap leading-snug">
                        No significant sonological abnormality detected in the whole abdomen and pelvis.
                      </p>
                    </div>

                    {/* ── IMAGE AT END ── */}
                    {defaultImageUrl && defaultImagePosition === "end" && (
                      <div className="pt-3 border-t border-black/20 mt-3 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 text-left">
                          DIAGNOSTIC IMAGING CAPTURES &amp; SCAN FILMS :-
                        </div>
                        <div className="border border-black/60 p-2 bg-white inline-block max-w-md shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={defaultImageUrl}
                            alt="Reference Diagram"
                            className="max-h-72 max-w-full object-contain mx-auto rounded"
                          />
                          <p className="text-[9px] font-semibold text-slate-700 italic mt-1">
                            Reference Anatomical / Sonological Correlation
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Signatures & Footer */}
                <div className="mt-4 pt-2 border-t border-black space-y-3">
                  <div className="text-center">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-900 px-4 py-0.5 bg-slate-100 border border-black/30 inline-block">
                      *** End Of Report ***
                    </span>
                    <p className="text-[9px] text-slate-500 italic mt-0.5">
                      This report has been electronically authenticated and verified. Clinical correlation is recommended.
                    </p>
                  </div>

                  <div className="flex items-end justify-between px-2 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 border border-black bg-white">
                        <QrCode className="h-14 w-14 text-slate-950" />
                      </div>
                      <div className="text-[9px] text-slate-600 leading-tight">
                        <span className="font-bold text-slate-950 block font-mono">RAD-PREVIEW-{test.code || "001"}</span>
                        <span>Scan to verify authentic report</span>
                        <span className="block text-slate-500">Printed: 01-Nov-2026 11:32:00</span>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5 min-w-[200px]">
                      <div className="h-10 flex items-end justify-end mb-1">
                        <span className="font-serif italic text-slate-500 text-xs tracking-wider">
                          [Digitally Signed]
                        </span>
                      </div>
                      <div className="border-t border-black pt-1">
                        <p className="text-xs font-bold text-slate-950 uppercase font-serif">Dr. Monika Panda</p>
                        <p className="text-[10px] text-slate-700 font-medium">MD Radiodiagnosis</p>
                        <p className="text-[9px] text-slate-600">Head of the Department &amp; Consultant Radiologist</p>
                        <p className="text-[9px] font-mono text-slate-500">Regd. No: 48921/OMC</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-black/60 pt-1 flex justify-between items-center text-[8.5px] text-slate-500">
                    <span className="max-w-[80%] leading-tight">
                      Conditions of Reporting: 1. It is presumed that the scan/investigation belongs to the patient named above. 2. Medical findings must be clinically correlated by the treating physician. 3. Not valid for medico-legal purposes.
                    </span>
                    <span className="font-bold font-mono text-slate-700 shrink-0">Page 1 of 1</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Pathology Layout with Image Support ── */
              <div className="space-y-4">
                {defaultImageUrl && defaultImagePosition === "start" && (
                  <div className="p-4 border-b text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={defaultImageUrl}
                      alt="Reference Diagram"
                      className="max-h-64 max-w-full object-contain mx-auto rounded border"
                    />
                  </div>
                )}
                <LabReportTemplate
                  request={mockRequest}
                  hospitalSettings={hospitalSettings}
                  printSettings={printSettings}
                  catalogParameters={catalogParameters}
                  parameterResults={parameterResults}
                  isRadiology={false}
                  patientAge={34}
                  referringDoctor="Self / Direct"
                />
                {defaultImageUrl && defaultImagePosition === "end" && (
                  <div className="p-4 border-t text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={defaultImageUrl}
                      alt="Reference Diagram"
                      className="max-h-64 max-w-full object-contain mx-auto rounded border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
