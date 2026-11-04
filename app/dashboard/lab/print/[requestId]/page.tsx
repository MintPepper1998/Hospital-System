import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format, differenceInYears } from "date-fns"
import { LabReportPrintActions } from "@/components/lab/report-print-actions"
import { LabReportTemplate } from "@/components/lab/lab-report-template"
import { getHospitalSettings } from "@/app/actions/settings"
import { getTemplateSettings } from "@/app/actions/print-template-settings"

interface CatalogParameter {
  name: string
  unit: string
  normalRange: string
  method?: string
  sectionHeading?: string
}

function normalizeCatalogParameters(raw: unknown): CatalogParameter[] | null {
  if (!raw) return null

  let rawParams: any[] = []

  // Check if it's the newer structured format with sections
  if (typeof raw === "object" && raw !== null && "sections" in raw && Array.isArray((raw as Record<string, any>).sections)) {
    const sections = (raw as Record<string, any>).sections
    for (const section of sections) {
      if (section && typeof section === "object" && Array.isArray(section.parameters)) {
        const heading = section.heading ? String(section.heading).trim() : undefined
        for (const p of section.parameters) {
          if (p && typeof p === "object") {
            rawParams.push({ ...p, sectionHeading: heading })
          }
        }
      }
    }
  } else if (Array.isArray(raw)) {
    // Older simple array format
    rawParams = raw
  } else {
    return null
  }

  const normalized = rawParams
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      unit: String(item.unit ?? "").trim(),
      normalRange: String(item.normalRange ?? "").trim(),
      method: item.method ? String(item.method).trim() : undefined,
      sectionHeading: item.sectionHeading ? String(item.sectionHeading).trim() : undefined,
    }))
    .filter((item) => item.name.length > 0)

  return normalized.length > 0 ? normalized : null
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

export default async function LabReportPrintPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params

  const [labRequest, hospitalSettings, templateSettings] = await Promise.all([
    prisma.labRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: { include: { user: true } },
        appointment: {
          include: { doctor: { include: { user: true } } },
        },
        billing: true,
      },
    }),
    getHospitalSettings(),
    getTemplateSettings("LAB_RESULTS")
  ])

  const ipdRequest = !labRequest
    ? await prisma.iPDLabRequest.findUnique({
        where: { id: requestId },
        include: {
          admission: {
            include: {
              patient: { include: { user: true } },
              primaryDoctor: { include: { user: true } },
            },
          },
          emergencyVisit: {
            include: {
              patient: { include: { user: true } },
              assignedDoctor: { include: { user: true } },
            },
          },
          testCatalog: {
            select: { parameters: true },
          },
        },
      })
    : null

  if (!labRequest && !ipdRequest) {
    notFound()
  }

  const isIPD = !!ipdRequest

  // Fetch catalog parameters template
  let catalogParameters: CatalogParameter[] | null = null
  if (labRequest?.testCatalogId) {
    const catalogTest = await prisma.labTestCatalog.findUnique({
      where: { id: labRequest.testCatalogId },
      select: { parameters: true },
    })
    catalogParameters = normalizeCatalogParameters(catalogTest?.parameters)
  }

  // Backward compatibility: older OPD orders or direct billing may not have testCatalogId.
  if (labRequest && !catalogParameters) {
    const matchedCatalog = await prisma.labTestCatalog.findFirst({
      where: {
        name: labRequest.testName,
        type: labRequest.testType,
        isActive: true,
      },
      select: { parameters: true },
    })
    catalogParameters = normalizeCatalogParameters(matchedCatalog?.parameters)
  }

  if (ipdRequest) {
    catalogParameters = normalizeCatalogParameters(ipdRequest.testCatalog?.parameters)
    if (!catalogParameters) {
      const matchedCatalog = await prisma.labTestCatalog.findFirst({
        where: {
          name: ipdRequest.testName,
          type: ipdRequest.type,
          isActive: true,
        },
        select: { parameters: true },
      })
      catalogParameters = normalizeCatalogParameters(matchedCatalog?.parameters)
    }
  }

  let parameterResults =
    labRequest?.parameterResults && typeof labRequest.parameterResults === "object"
      ? (labRequest.parameterResults as Record<string, string>)
      : ipdRequest?.parameterResults && typeof ipdRequest.parameterResults === "object"
      ? (ipdRequest.parameterResults as Record<string, string>)
      : null

  // Fallback for older reports that only have reportContent but no parameterResults saved
  if (!parameterResults && catalogParameters && catalogParameters.length > 0) {
    const rawContent = labRequest?.reportContent || (ipdRequest ? splitIpdResult(ipdRequest.result).reportContent : null)
    if (rawContent) {
      const parsed: Record<string, string> = {}
      const lines = rawContent.split('\n')
      
      for (const p of catalogParameters) {
        const prefix = `${p.name}:`
        const line = lines.find(l => l.trim().startsWith(prefix))
        if (line) {
          // Line format: "TSH: 1.501 mIU/L  (Normal: 0.4 - 5.0)"
          let valStr = line.substring(line.indexOf(':') + 1).trim()
          
          // Remove range part
          if (valStr.includes('(Normal:')) {
            valStr = valStr.substring(0, valStr.indexOf('(Normal:')).trim()
          }
          
          // Remove unit part
          if (p.unit && valStr.endsWith(p.unit)) {
            valStr = valStr.substring(0, valStr.lastIndexOf(p.unit)).trim()
          }
          
          parsed[p.name] = valStr
        }
      }
      
      if (Object.keys(parsed).length > 0) {
        parameterResults = parsed
      }
    }
  }

  const hasStructuredResults = catalogParameters && catalogParameters.length > 0 && parameterResults

  const request = labRequest
    ? {
        id: labRequest.id,
        testName: labRequest.testName,
        testPrice: labRequest.testPrice,
        testType: labRequest.testType,
        status: labRequest.status,
        priority: labRequest.priority,
        notes: labRequest.notes,
        reportContent: labRequest.reportContent,
        impression: labRequest.impression,
        completedAt: labRequest.completedAt,
        performedBy: labRequest.performedBy,
        createdAt: labRequest.createdAt,
        patient: {
          id: labRequest.patient.id,
          patientId: labRequest.patient.patientId,
          dateOfBirth: labRequest.patient.dateOfBirth,
          gender: labRequest.patient.gender,
          bloodGroup: labRequest.patient.bloodGroup,
          user: {
            name: labRequest.patient.user.name,
            email: labRequest.patient.user.email,
            phone: labRequest.patient.phone,
          },
        },
        appointment: labRequest.appointment?.doctor?.user?.name
          ? {
              doctor: {
                specialization: labRequest.appointment.doctor.specialization,
                user: { name: labRequest.appointment.doctor.user.name },
              },
            }
          : null,
        billing: labRequest.billing?.billNumber ? { billNumber: labRequest.billing.billNumber } : null,
      }
    : (() => {
        const parsed = splitIpdResult(ipdRequest!.result)
        const doctorName =
          ipdRequest!.orderedByName || ipdRequest!.admission?.primaryDoctor.user.name || ipdRequest!.emergencyVisit?.assignedDoctor?.user.name || "Direct Order"

        return {
          id: ipdRequest!.id,
          testName: ipdRequest!.testName,
          testPrice: 0,
          testType: ipdRequest!.type,
          status: ipdRequest!.status,
          priority: ipdRequest!.isUrgent ? "URGENT" : "ROUTINE",
          notes: ipdRequest!.notes,
          reportContent: parsed.reportContent,
          impression: parsed.impression,
          completedAt: ipdRequest!.completedAt,
          performedBy: null,
          createdAt: ipdRequest!.createdAt,
          patient: {
            id: ipdRequest!.admission?.patient?.id || ipdRequest!.emergencyVisit?.patient?.id || "",
            patientId: ipdRequest!.admission?.patient?.patientId || ipdRequest!.emergencyVisit?.patient?.patientId || "",
            dateOfBirth: ipdRequest!.admission?.patient?.dateOfBirth || ipdRequest!.emergencyVisit?.patient?.dateOfBirth || null,
            gender: ipdRequest!.admission?.patient?.gender || ipdRequest!.emergencyVisit?.patient?.gender || "OTHER",
            bloodGroup: ipdRequest!.admission?.patient?.bloodGroup || ipdRequest!.emergencyVisit?.patient?.bloodGroup || null,
            user: {
              name: ipdRequest!.admission?.patient?.user?.name || ipdRequest!.emergencyVisit?.patient?.user?.name || "Unknown",
              email: ipdRequest!.admission?.patient?.user?.email || ipdRequest!.emergencyVisit?.patient?.user?.email || "",
              phone: ipdRequest!.admission?.patient?.phone || ipdRequest!.emergencyVisit?.patient?.phone || "",
            },
          },
          appointment: {
            doctor: {
              specialization: ipdRequest!.admission?.primaryDoctor.specialization || ipdRequest!.emergencyVisit?.assignedDoctor?.specialization || "",
              user: { name: doctorName },
            },
          },
          billing: null,
        }
      })()

  const patientAge = request.patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(request.patient.dateOfBirth))
    : null

  const isRadiology = request.testType === "RADIOLOGY"
  const departmentName = isRadiology ? "RADIOLOGY" : "PATHOLOGY"
  const departmentColor = isRadiology ? "#7C3AED" : "#2563EB"

  const referringDoctor = request.appointment?.doctor?.user?.name
    ? `Dr. ${request.appointment.doctor.user.name}`
    : "Self / Direct"

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 10mm 12mm; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}} />
      {/* Print Actions */}
      <div className="print:hidden max-w-4xl mx-auto px-4 mb-6">
        <LabReportPrintActions requestId={requestId} testType={request.testType} />
      </div>

      <LabReportTemplate 
        request={request}
        hospitalSettings={hospitalSettings}
        printSettings={templateSettings}
        catalogParameters={catalogParameters}
        parameterResults={parameterResults}
        isRadiology={isRadiology}
        patientAge={patientAge}
        referringDoctor={referringDoctor}
      />
    </div>
  )
}
