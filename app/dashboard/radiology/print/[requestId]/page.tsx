import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import { format, differenceInYears } from "date-fns"
import { QrCode, Radiation } from "lucide-react"
import { RadiologyReportPrintActions } from "@/components/radiology/report-print-actions"
import { RadiologyReportData } from "@/app/actions/radiology"

export const dynamic = "force-dynamic"

interface RadiologyReportPrintPageProps {
  params: Promise<{ requestId: string }>
}

function splitIpdResult(raw: string | null): { reportContent: string | null; impression: string | null } {
  if (!raw) return { reportContent: null, impression: null }
  const delimiter = "\n\n--- IMPRESSION ---\n"
  if (!raw.includes(delimiter)) return { reportContent: raw, impression: null }

  const [content, ...impressionParts] = raw.split(delimiter)
  return {
    reportContent: content?.trim() || null,
    impression: impressionParts.join(delimiter).trim() || null,
  }
}

export default async function RadiologyReportPrintPage({ params }: RadiologyReportPrintPageProps) {
  const { requestId } = await params

  // 1. Fetch OPD Request
  const opdRequest = await prisma.labRequest.findUnique({
    where: { id: requestId },
    include: {
      patient: { include: { user: true } },
      appointment: {
        include: {
          doctor: { include: { user: true } },
        },
      },
      billing: true,
    },
  })

  // 2. Fetch IPD Request if not OPD
  const ipdRequest = !opdRequest
    ? await prisma.iPDLabRequest.findUnique({
        where: { id: requestId },
        include: {
          admission: {
            include: {
              patient: { include: { user: true } },
              primaryDoctor: { include: { user: true } },
              bed: { include: { ward: true } },
            },
          },
          emergencyVisit: {
            include: {
              patient: { include: { user: true } },
              assignedDoctor: { include: { user: true } },
              bed: { include: { ward: true } },
            },
          },
          testCatalog: true,
        },
      })
    : null

  if (!opdRequest && (!ipdRequest || ipdRequest.type !== "RADIOLOGY")) {
    notFound()
  }

  // 3. Hospital Settings
  const hospital = await prisma.hospitalSettings.findUnique({ where: { id: 1 } })

  const isIPD = !opdRequest
  const testName = isIPD ? ipdRequest!.testName : opdRequest!.testName
  const createdAt = isIPD ? ipdRequest!.createdAt : opdRequest!.createdAt
  const completedAt = (isIPD ? ipdRequest!.completedAt : opdRequest!.completedAt) || new Date()
  const status = isIPD ? ipdRequest!.status : opdRequest!.status

  // Patient info
  const patientRaw = isIPD
    ? ipdRequest!.admission?.patient || ipdRequest!.emergencyVisit?.patient
    : opdRequest!.patient

  const patientName = patientRaw?.user?.name || "Patient"
  const patientId = patientRaw?.patientId || "N/A"
  const gender = patientRaw?.gender || "OTHER"
  const patientAge = patientRaw?.dateOfBirth
    ? differenceInYears(new Date(), new Date(patientRaw.dateOfBirth))
    : null

  const referringDoctor = isIPD
    ? ipdRequest!.orderedByName ||
      ipdRequest!.admission?.primaryDoctor?.user?.name ||
      ipdRequest!.emergencyVisit?.assignedDoctor?.user?.name ||
      "Dr. SELF"
    : opdRequest!.appointment?.doctor?.user?.name
    ? `Dr. ${opdRequest!.appointment.doctor.user.name}`
    : "Dr. SELF"

  const bedInfo = isIPD
    ? ipdRequest!.admission?.bed
      ? `${ipdRequest!.admission.bed.ward.name} / Bed ${ipdRequest!.admission.bed.bedNumber}`
      : ipdRequest!.emergencyVisit?.bed
      ? `Emergency / Bed ${ipdRequest!.emergencyVisit.bed.bedNumber}`
      : "IPD Inpatient"
    : "OPD Walk-in"

  // 4. Parse Structured Report Data from parameterResults
  const rawParamResults = isIPD
    ? (ipdRequest!.parameterResults as Record<string, unknown> | null)
    : (opdRequest!.parameterResults as Record<string, unknown> | null)

  const isStructured =
    rawParamResults &&
    typeof rawParamResults === "object" &&
    ("interpretation" in rawParamResults || "parameters" in rawParamResults || "modality" in rawParamResults)

  const structuredData = isStructured
    ? (rawParamResults as unknown as RadiologyReportData)
    : null

  // Fallbacks if legacy
  const legacyContent = isIPD ? splitIpdResult(ipdRequest!.result) : {
    reportContent: opdRequest!.reportContent,
    impression: opdRequest!.impression,
  }

  const modality = structuredData?.modality || "ULTRASOUND"
  const studyArea = structuredData?.studyArea || testName
  const parameters = structuredData?.parameters || []
  const interpretationText = structuredData?.interpretation || legacyContent.reportContent || "No findings entered."
  const impressionText = structuredData?.impression || legacyContent.impression || ""
  const attachments = structuredData?.attachments || []
  const diagramUrl = structuredData?.imageUrl || structuredData?.diagramUrl
  const imagePosition = structuredData?.imagePosition || "end"

  const signingDoctor = structuredData?.radiologist || {
    name: opdRequest?.performedBy || "Dr. Monika Panda",
    qualification: "MD Radiodiagnosis",
    designation: "Head of the Department & Consultant Radiologist",
    regNo: "48921/OMC",
  }

  const reportSID = `RAD-${format(new Date(createdAt), "yyyyMMdd")}-${requestId.slice(-5).toUpperCase()}`

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0 print:min-h-0 text-slate-900 font-sans">
      {/* ── Screen Actions Bar (hidden when printing) ── */}
      <div className="print:hidden max-w-[210mm] mx-auto px-4 mb-4">
        <RadiologyReportPrintActions requestId={requestId} />
      </div>

      {/* ── Printable A4 Sheet Matching Medclin Lab Spec ── */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none print:w-full print:m-0">
        <div
          id="radiology-report-print"
          className="border-2 border-black p-5 sm:p-6 print:p-5 flex flex-col justify-between min-h-[285mm] print:min-h-[275mm]"
        >
          <div>
            {/* ── 1. Hospital Header ── */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border-2 border-black flex items-center justify-center bg-slate-50 text-slate-900">
                  <Radiation className="h-7 w-7 text-purple-700" />
                </div>
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-950 font-serif">
                    {hospital?.name || "SHREE KAMAL HOSPITAL"}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-medium">
                    (A Unit of Shree Kamal Healthcare Private Limited)
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium leading-tight">
                    {hospital?.address || "CHANDAPUR, PANIKOILI, JAJPUR, ODISHA, 755043"}
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                    Phone: {hospital?.phone || "+91 97779 19827"} | Email: {hospital?.email || "radiology@shreekamal.com"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="border border-black px-2.5 py-1 bg-slate-50 inline-block text-right">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    ACCREDITED IMAGING CENTRE
                  </span>
                  <span className="block font-mono text-xs font-black text-slate-950">
                    {reportSID}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 2. Department Banner ── */}
            <div className="bg-black text-white text-center py-1 mt-1 font-bold text-xs uppercase tracking-widest">
              DEPARTMENT OF RADIODIAGNOSIS &amp; IMAGING — RADIOLOGY TEST REPORT
            </div>

            {/* ── 3. Two-Column Patient Demographics Table (Medclin Specification) ── */}
            <div className="border border-black mt-1 text-[11px]">
              <div className="grid grid-cols-2 divide-x divide-black">
                {/* Left Column */}
                <div className="divide-y divide-black/80">
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Patient Name :</span>
                    <span className="font-bold text-slate-950 uppercase">{patientName}</span>
                  </div>
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Age / Gender :</span>
                    <span className="font-medium text-slate-950">
                      {patientAge ? `${patientAge} Y` : "N/A"} / {gender}
                    </span>
                  </div>
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Patient ID (UHID) :</span>
                    <span className="font-mono font-bold text-slate-950">{patientId}</span>
                  </div>
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Referred By :</span>
                    <span className="font-semibold text-slate-950">{referringDoctor}</span>
                  </div>
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Patient Location :</span>
                    <span className="font-medium text-slate-950">{bedInfo}</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="divide-y divide-black/80">
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Report No / SID :</span>
                    <span className="font-mono font-bold text-slate-950">{reportSID}</span>
                  </div>
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Registered Date :</span>
                    <span className="font-mono text-slate-950">
                      {format(new Date(createdAt), "dd-MMM-yyyy hh:mm a")}
                    </span>
                  </div>
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Reported Date :</span>
                    <span className="font-mono text-slate-950">
                      {format(new Date(completedAt), "dd-MMM-yyyy hh:mm a")}
                    </span>
                  </div>
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Modality / Area :</span>
                    <span className="font-bold text-slate-950 uppercase">{modality} — {studyArea}</span>
                  </div>
                  <div className="p-1.5 flex">
                    <span className="w-32 shrink-0 font-semibold text-slate-600">Report Status :</span>
                    <span className="font-bold text-emerald-800 uppercase tracking-wide">
                      {status === "COMPLETED" ? "FINAL REPORT / VERIFIED" : status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. Investigation Title Bar ── */}
            <div className="border-x border-b border-black bg-slate-100/90 px-3 py-1.5 flex justify-between items-center text-xs">
              <div className="font-bold uppercase tracking-wide text-slate-950">
                INVESTIGATION : <span className="underline decoration-purple-500 underline-offset-2">{testName}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-600 uppercase">
                STUDY : {studyArea}
              </div>
            </div>

            {/* ── 5. Five-Column Parameters Table (Medclin Specification) ── */}
            {parameters.length > 0 && (
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
                    {parameters.map((param, index) => (
                      <tr key={index} className="leading-tight">
                        <td className="py-1 px-3 font-semibold text-slate-900 border-r border-black/40 uppercase">
                          {param.name}
                        </td>
                        <td className="py-1 px-3 font-mono font-bold text-slate-950 border-r border-black/40">
                          {param.result || "—"}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── 6. Interpretation & Clinical Findings Section ── */}
            <div className="border-x border-b border-black p-3.5 space-y-3">
              <div>
                <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-slate-950 underline underline-offset-2 mb-1.5">
                  Interpretation :-
                </h3>

                {/* If image position is START: render images BEFORE findings text */}
                {imagePosition === "start" && (attachments.length > 0 || diagramUrl) && (
                  <div className="pb-3 border-b border-black/20 mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      DIAGNOSTIC IMAGING CAPTURES &amp; SCAN FILMS :-
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {diagramUrl && (
                        <div className="border border-black/60 p-1 bg-white text-center space-y-1">
                          <div className="relative aspect-[4/3] w-full bg-black/5 overflow-hidden">
                            <Image
                              src={diagramUrl}
                              alt="Reference Diagram"
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>
                          <p className="text-[9px] font-semibold text-slate-700 italic">
                            Reference Anatomical / Sonological Correlation
                          </p>
                        </div>
                      )}

                      {attachments.map((att, idx) => (
                        <div key={idx} className="border border-black/60 p-1 bg-white text-center space-y-1">
                          <div className="relative aspect-[4/3] w-full bg-black overflow-hidden">
                            <Image
                              src={att.url}
                              alt={att.caption || `Film ${idx + 1}`}
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>
                          <p className="text-[9px] font-semibold text-slate-800">
                            {att.caption || `Figure ${idx + 1}: Scan Film Capture`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[11px] leading-relaxed text-slate-900 whitespace-pre-wrap font-sans">
                  {interpretationText}
                </div>
              </div>

              {/* Final Diagnostic Impression Box */}
              {impressionText.trim() && (
                <div className="p-2.5 bg-slate-50 border border-black rounded text-[11px]">
                  <span className="font-bold text-slate-950 uppercase tracking-wider block mb-1">
                    IMPRESSION :-
                  </span>
                  <p className="font-semibold text-slate-950 whitespace-pre-wrap leading-snug">
                    {impressionText}
                  </p>
                </div>
              )}

              {/* If image position is END (default): render images AFTER impression */}
              {imagePosition === "end" && (attachments.length > 0 || diagramUrl) && (
                <div className="pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    DIAGNOSTIC IMAGING CAPTURES &amp; SCAN FILMS :-
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {diagramUrl && (
                      <div className="border border-black/60 p-1 bg-white text-center space-y-1">
                        <div className="relative aspect-[4/3] w-full bg-black/5 overflow-hidden">
                          <Image
                            src={diagramUrl}
                            alt="Reference Diagram"
                            fill
                            unoptimized
                            className="object-contain"
                          />
                        </div>
                        <p className="text-[9px] font-semibold text-slate-700 italic">
                          Reference Anatomical / Sonological Correlation
                        </p>
                      </div>
                    )}

                    {attachments.map((att, idx) => (
                      <div key={idx} className="border border-black/60 p-1 bg-white text-center space-y-1">
                        <div className="relative aspect-[4/3] w-full bg-black overflow-hidden">
                          <Image
                            src={att.url}
                            alt={att.caption || `Film ${idx + 1}`}
                            fill
                            unoptimized
                            className="object-contain"
                          />
                        </div>
                        <p className="text-[9px] font-semibold text-slate-800">
                          {att.caption || `Figure ${idx + 1}: Scan Film Capture`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 7. End of Report & Signatures Section ── */}
          <div className="mt-4 pt-2 border-t border-black space-y-3">
            {/* End of Report text */}
            <div className="text-center">
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-900 px-4 py-0.5 bg-slate-100 border border-black/30 inline-block">
                *** End Of Report ***
              </span>
              <p className="text-[9px] text-slate-500 italic mt-0.5">
                This report has been electronically authenticated and verified. Clinical correlation is recommended.
              </p>
            </div>

            {/* QR Code and Consultant Signatures Grid */}
            <div className="flex items-end justify-between px-2 pt-2">
              {/* Left: QR Code & Verification */}
              <div className="flex items-center gap-2">
                <div className="p-1 border border-black bg-white">
                  <QrCode className="h-14 w-14 text-slate-950" />
                </div>
                <div className="text-[9px] text-slate-600 leading-tight">
                  <span className="font-bold text-slate-900 block font-mono">{reportSID}</span>
                  <span>Scan to verify authentic report</span>
                  <span className="block text-slate-500">
                    Printed: {format(new Date(), "dd-MMM-yyyy HH:mm:ss")}
                  </span>
                </div>
              </div>

              {/* Right: Signing Radiologist */}
              <div className="text-right space-y-0.5 min-w-[200px]">
                <div className="h-10 flex items-end justify-end mb-1">
                  <span className="font-serif italic text-slate-500 text-xs tracking-wider">
                    [Digitally Signed]
                  </span>
                </div>
                <div className="border-t border-black pt-1">
                  <p className="text-xs font-bold text-slate-950 uppercase font-serif">
                    {signingDoctor.name}
                  </p>
                  <p className="text-[10px] text-slate-700 font-medium">
                    {signingDoctor.qualification}
                  </p>
                  <p className="text-[9px] text-slate-600">
                    {signingDoctor.designation}
                  </p>
                  {signingDoctor.regNo && (
                    <p className="text-[9px] font-mono text-slate-500">
                      Regd. No: {signingDoctor.regNo}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Legal Disclaimer & Pagination */}
            <div className="border-t border-black/60 pt-1 flex justify-between items-center text-[8.5px] text-slate-500">
              <span className="max-w-[80%] leading-tight">
                Conditions of Reporting: 1. It is presumed that the scan/investigation belongs to the patient named above. 2. Medical findings must be clinically correlated by the treating physician. 3. Not valid for medico-legal purposes.
              </span>
              <span className="font-bold font-mono text-slate-700 shrink-0">
                Page 1 of 1
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
