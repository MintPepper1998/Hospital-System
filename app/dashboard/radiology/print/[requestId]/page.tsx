import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import { format, differenceInYears } from "date-fns"
import { RadiologyReportPrintActions } from "@/components/radiology/report-print-actions"
import type { RadiologyReportData, RadiologyOrganFinding } from "@/app/actions/radiology"

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
  const rawGender = (patientRaw?.gender || "OTHER").toUpperCase()
  const genderDisplay = rawGender === "MALE" ? "Male" : rawGender === "FEMALE" ? "Female" : rawGender

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

  // 4. Parse Structured Report Data from parameterResults
  const rawParamResults = isIPD
    ? (ipdRequest!.parameterResults as Record<string, unknown> | null)
    : (opdRequest!.parameterResults as Record<string, unknown> | null)

  const isStructured =
    rawParamResults &&
    typeof rawParamResults === "object" &&
    ("interpretation" in rawParamResults ||
      "parameters" in rawParamResults ||
      "modality" in rawParamResults ||
      "organs" in rawParamResults)

  const structuredData = isStructured
    ? (rawParamResults as unknown as RadiologyReportData)
    : null

  // Fallbacks if legacy
  const legacyContent = isIPD ? splitIpdResult(ipdRequest!.result) : {
    reportContent: opdRequest!.reportContent,
    impression: opdRequest!.impression,
  }

  const studyTitle = structuredData?.studyTitle || testName
  const organs: RadiologyOrganFinding[] = structuredData?.organs || []
  const additionalObservations = structuredData?.additionalObservations || ""
  const interpretationText = structuredData?.interpretation || legacyContent.reportContent || ""
  const impressionText = structuredData?.impression || legacyContent.impression || ""
  const footerNote =
    structuredData?.footerNote ||
    `जाँच केवल ${hospital?.name || "श्री कमल अस्पताल"} परिसर की ही मान्य होगी।`

  const attachments = structuredData?.attachments || []
  const diagramUrl = structuredData?.imageUrl || structuredData?.diagramUrl
  const imagePosition = structuredData?.imagePosition || "end"
  const parameters = structuredData?.parameters || []

  const signingDoctor = structuredData?.radiologist || {
    name: opdRequest?.performedBy || "Dr. S. Prakash",
    qualification: "M.B.B.S., M.D. (Radio)",
    designation: "Consultant Radiologist",
    regNo: "13082",
  }

  // Lab / Report No
  const labNumber = isIPD
    ? ipdRequest!.id.slice(-4).toUpperCase()
    : opdRequest!.id.slice(-4).toUpperCase()

  const hospitalName = hospital?.name || "SHREE KAMAL HOSPITAL"
  const hospitalAddress = hospital?.address || "CHANDAPUR , PANIKOILI , JAJPUR , ODISHA , 755043"
  const hospitalTel = hospital?.phone || "91-5275-263082, 263092"
  const hospitalMob = hospital?.whatsappBusinessNumber || hospital?.phone || "9369125406"
  const hospitalLogo = hospital?.logoUrl || "/images/shreekamal-logo.png"

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0 print:min-h-0 text-slate-900 font-sans">
      {/* ── Screen Actions Bar (hidden when printing) ── */}
      <div className="print:hidden max-w-[210mm] mx-auto px-4 mb-4">
        <RadiologyReportPrintActions requestId={requestId} />
      </div>

      {/* ── Printable A4 Sheet Matching Uploaded Template Exactly ── */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none print:w-full print:m-0">
        <div
          id="radiology-report-print"
          className="p-8 sm:p-10 print:p-8 flex flex-col justify-between min-h-[297mm] print:min-h-[285mm] text-slate-900"
        >
          <div>
            {/* ── 1. Top Header: Logo + Hindi Tagline (Left), Hospital Name & Details (Right) ── */}
            <div className="flex items-start justify-between pb-2">
              {/* Left: Logo & Sanskrit Tagline */}
              <div className="flex flex-col items-center">
                <div className="relative h-20 w-24">
                  <Image
                    src={hospitalLogo}
                    alt={hospitalName}
                    fill
                    unoptimized
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="text-[12px] font-bold text-slate-800 tracking-wider mt-1 font-sans">
                  ।। ज्योतिर्गमय ।।
                </div>
              </div>

              {/* Right: Hospital Name, Address, Tel, Mob */}
              <div className="text-right space-y-0.5 max-w-md">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-emerald-800 font-sans">
                  {hospitalName}
                </h1>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  {hospitalAddress}
                </p>
                <p className="text-xs font-medium text-slate-900">
                  Tel. : {hospitalTel}
                </p>
                <p className="text-xs font-medium text-slate-900">
                  Mob.: {hospitalMob}
                </p>
              </div>
            </div>

            {/* Horizontal Line below Header */}
            <hr className="border-t border-black my-2" />

            {/* ── 2. Patient Demographics Header Block (Exact layout from uploaded image) ── */}
            <div className="text-xs font-sans py-1 leading-relaxed">
              {/* Row 1 */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 flex">
                  <span className="font-bold w-24 shrink-0 text-slate-900">Patient Name</span>
                  <span className="font-bold uppercase text-slate-950">: {patientName}</span>
                </div>
                <div className="col-span-4 flex">
                  <span className="font-bold w-12 shrink-0 text-slate-900">Date</span>
                  <span className="font-medium text-slate-950">: {format(new Date(createdAt), "dd/MM/yyyy")}</span>
                </div>
                <div className="col-span-3 flex justify-end sm:justify-start">
                  <span className="font-bold w-16 shrink-0 text-slate-900">Lab No.</span>
                  <span className="font-mono font-bold text-slate-950">: {labNumber}</span>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 flex">
                  <span className="font-bold w-24 shrink-0 text-slate-900">Sex</span>
                  <span className="font-medium text-slate-950">: {genderDisplay}</span>
                </div>
                <div className="col-span-7 flex">
                  <span className="font-bold w-12 shrink-0 text-slate-900">Age</span>
                  <span className="font-medium text-slate-950">
                    : {patientAge ? `${patientAge} Yr(s)` : "—"}
                  </span>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 flex">
                  <span className="font-bold w-24 shrink-0 text-slate-900">Ref By</span>
                  <span className="font-bold uppercase text-slate-950">: {referringDoctor}</span>
                </div>
              </div>
            </div>

            {/* Thick Horizontal Divider Line */}
            <hr className="border-t-2 border-black my-2.5" />

            {/* ── 3. Centered, Underlined Study Title ── */}
            <div className="text-center my-3.5">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider underline underline-offset-4 font-sans text-slate-950">
                {studyTitle}
              </h2>
            </div>

            {/* ── 4. Organ-Wise Findings Body (Matches Uploaded Template) ── */}
            {organs && organs.length > 0 ? (
              <div className="space-y-3.5 my-4 text-xs leading-relaxed text-slate-900 font-sans">
                {organs.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-3 sm:col-span-2 font-bold uppercase tracking-tight text-slate-950">
                      {item.organ.trim()}:
                    </div>
                    <div className="col-span-9 sm:col-span-10 whitespace-pre-wrap text-slate-900 font-medium">
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : interpretationText ? (
              /* Fallback for legacy text reports */
              <div className="my-4 text-xs leading-relaxed text-slate-900 whitespace-pre-wrap font-sans font-medium">
                {interpretationText}
              </div>
            ) : null}

            {/* Fallback 5-column parameters table if legacy parameters exist without organs */}
            {organs.length === 0 && parameters.length > 0 && (
              <div className="border border-black my-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black font-bold uppercase text-[10px]">
                      <th className="py-1 px-3 text-left">Organ / Parameter</th>
                      <th className="py-1 px-3 text-left">Observation / Finding</th>
                      <th className="py-1 px-2 text-center">Unit</th>
                      <th className="py-1 px-3 text-left">Bio. Ref. Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parameters.map((p, i) => (
                      <tr key={i}>
                        <td className="py-1 px-3 font-bold uppercase">{p.name}</td>
                        <td className="py-1 px-3">{p.result}</td>
                        <td className="py-1 px-2 text-center">{p.unit || "—"}</td>
                        <td className="py-1 px-3">{p.normalRange || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── 5. Additional Observations Paragraphs ── */}
            {additionalObservations.trim() && (
              <div className="my-4 text-xs leading-relaxed space-y-2 text-slate-950 font-bold font-sans">
                {additionalObservations
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
              </div>
            )}

            {/* ── 6. Bold Uppercase IMPRESSION ── */}
            {impressionText.trim() && (
              <div className="my-5 text-xs font-bold leading-normal font-sans text-slate-950">
                <span className="uppercase tracking-wider mr-2">IMPRESSION:</span>
                <span className="uppercase font-extrabold">{impressionText}</span>
              </div>
            )}

            {/* Scan Film Captures or Diagrams if Attached */}
            {(attachments.length > 0 || diagramUrl) && (
              <div className="my-4 pt-3 border-t border-slate-300">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                  ATTACHED DIAGNOSTIC SCAN FILMS / CAPTURES:
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {diagramUrl && (
                    <div className="border border-black/40 p-1 bg-white text-center">
                      <div className="relative aspect-[4/3] w-full bg-slate-50 overflow-hidden">
                        <Image
                          src={diagramUrl}
                          alt="Diagnostic Diagram"
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}
                  {attachments.map((att, idx) => (
                    <div key={idx} className="border border-black/40 p-1 bg-white text-center">
                      <div className="relative aspect-[4/3] w-full bg-black overflow-hidden">
                        <Image
                          src={att.url}
                          alt={att.caption || `Film ${idx + 1}`}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                      <p className="text-[9px] font-semibold text-slate-800 mt-1">
                        {att.caption || `Scan Capture ${idx + 1}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 7. Bottom Section: Doctor Signature (Right) & Footer Disclaimer ── */}
          <div className="mt-8">
            {/* Doctor Signature Block on Right */}
            <div className="flex justify-end mb-4">
              <div className="text-center min-w-[200px] space-y-0.5">
                <div className="h-14 flex items-end justify-center mb-1">
                  {hospital?.pathologistSignature ? (
                    <div className="relative h-14 w-32">
                      <Image
                        src={hospital.pathologistSignature}
                        alt="Doctor Signature"
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <span className="font-serif italic text-slate-400 text-xs tracking-wider">
                      [Signature &amp; Stamp]
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-950 font-sans">
                  {signingDoctor.name}
                </p>
                <p className="text-[11px] text-slate-700 font-sans">
                  {signingDoctor.qualification}
                </p>
                {signingDoctor.regNo && (
                  <p className="text-[10px] text-slate-600 font-mono">
                    Reg. No.-{signingDoctor.regNo}
                  </p>
                )}
              </div>
            </div>

            {/* Thick Bottom Divider Line */}
            <hr className="border-t-2 border-black my-2" />

            {/* Centered Hindi Disclaimer (matches uploaded image: "जाँच केवल [Hospital Name] परिसर की ही मान्य होगी।") */}
            <div className="text-center text-xs sm:text-sm font-semibold text-slate-900 font-sans tracking-wide py-1">
              {footerNote}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
