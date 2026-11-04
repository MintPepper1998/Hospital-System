import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { LabResultEntryForm } from "@/components/lab/result-entry-form"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Microscope, Radiation, User, Calendar, Stethoscope, FileText, BedDouble } from "lucide-react"
import { format, differenceInYears } from "date-fns"

export const dynamic = "force-dynamic"

function normalizeCatalogParameters(
  raw: unknown
): { name: string; unit: string; normalRange: string }[] | null {
  if (!raw) return null

  let rawParams: any[] = []

  // Check if it's the newer structured format with sections
  if (typeof raw === "object" && raw !== null && "sections" in raw && Array.isArray((raw as any).sections)) {
    const sections = (raw as any).sections
    for (const section of sections) {
      if (section && typeof section === "object" && Array.isArray(section.parameters)) {
        rawParams = [...rawParams, ...section.parameters]
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
    }))
    .filter((item) => item.name.length > 0)

  return normalized.length > 0 ? normalized : null
}

export default async function LabResultEntryPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params

  // ==========================================
  // 1. Try OPD LabRequest first
  // ==========================================
  const opdRequest = await prisma.labRequest.findUnique({
    where: { id: requestId },
    include: {
      patient: {
        include: { user: true },
      },
      appointment: {
        include: {
          doctor: {
            include: { user: true },
          },
        },
      },
      billing: true,
    },
  })

  // Fetch catalog parameters for OPD requests
  let catalogParameters: { name: string; unit: string; normalRange: string }[] | null = null
  let existingParameterResults: Record<string, string> | null = null

  if (opdRequest?.testCatalogId) {
    const catalogTest = await prisma.labTestCatalog.findUnique({
      where: { id: opdRequest.testCatalogId },
      select: { parameters: true },
    })
    catalogParameters = normalizeCatalogParameters(catalogTest?.parameters)
    if (opdRequest.parameterResults && typeof opdRequest.parameterResults === "object") {
      existingParameterResults = opdRequest.parameterResults as Record<string, string>
    }
  }

  // Backward compatibility: older OPD orders or direct billing may not have testCatalogId.
  if (opdRequest && !catalogParameters) {
    const matchedCatalog = await prisma.labTestCatalog.findFirst({
      where: {
        name: opdRequest.testName,
        type: opdRequest.testType,
        isActive: true,
      },
      select: { parameters: true },
    })
    catalogParameters = normalizeCatalogParameters(matchedCatalog?.parameters)
    if (opdRequest.parameterResults && typeof opdRequest.parameterResults === "object") {
      existingParameterResults = opdRequest.parameterResults as Record<string, string>
    }
  }

  // ==========================================
  // 2. If not found, try IPD IPDLabRequest
  // ==========================================
  const ipdRequest = !opdRequest
    ? await prisma.iPDLabRequest.findUnique({
        where: { id: requestId },
        include: {
          admission: {
            include: {
              patient: {
                include: { user: true },
              },
              primaryDoctor: {
                include: { user: true },
              },
              bed: {
                include: { ward: true },
              },
            },
          },
          emergencyVisit: {
            include: {
              patient: {
                include: { user: true },
              },
              assignedDoctor: {
                include: { user: true },
              },
              bed: {
                include: { ward: true },
              },
            },
          },
          testCatalog: {
            select: {
              id: true,
              parameters: true,
            },
          },
        },
      })
    : null

  if (ipdRequest) {
    // Primary source: linked catalog relation on IPD order.
    catalogParameters = normalizeCatalogParameters(ipdRequest.testCatalog?.parameters)

    // Backward compatibility: older IPD orders may not have testCatalogId.
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

    if (ipdRequest.parameterResults && typeof ipdRequest.parameterResults === "object") {
      existingParameterResults = ipdRequest.parameterResults as Record<string, string>
    }
  }

  // ==========================================
  // 3. If neither found, 404
  // ==========================================
  if (!opdRequest && !ipdRequest) {
    notFound()
  }

  // ==========================================
  // 4. Build unified test details
  // ==========================================
  const isIPD = !!ipdRequest
  const isRadiology = isIPD
    ? ipdRequest!.type === "RADIOLOGY"
    : opdRequest!.testType === "RADIOLOGY"

  const testDetails = isIPD
    ? {
        requestId: ipdRequest!.id,
        source: "IPD" as const,
        testName: ipdRequest!.testName,
        testType: ipdRequest!.type as "PATHOLOGY" | "RADIOLOGY",
        status: ipdRequest!.status,
        priority: ipdRequest!.isUrgent ? "URGENT" : "ROUTINE",
        notes: ipdRequest!.notes,
        existingContent: ipdRequest!.result || "",
        existingImpression: "",
        isCompleted: ipdRequest!.status === "COMPLETED",
        canEnterResults:
          ipdRequest!.status === "PENDING" || ipdRequest!.status === "IN_PROGRESS",
        createdAt: ipdRequest!.createdAt,
        patient: {
          name: ipdRequest!.admission?.patient?.user?.name || ipdRequest!.emergencyVisit?.patient?.user?.name || "Unknown",
          patientId: ipdRequest!.admission?.patient?.patientId || ipdRequest!.emergencyVisit?.patient?.patientId || "",
          age: ipdRequest!.admission?.patient?.dateOfBirth
            ? differenceInYears(new Date(), new Date(ipdRequest!.admission.patient.dateOfBirth))
            : ipdRequest!.emergencyVisit?.patient?.dateOfBirth
            ? differenceInYears(new Date(), new Date(ipdRequest!.emergencyVisit.patient.dateOfBirth))
            : null,
          gender: ipdRequest!.admission?.patient?.gender || ipdRequest!.emergencyVisit?.patient?.gender || "OTHER",
        },
        doctor: {
          name: ipdRequest!.orderedByName
            ? `Dr. ${ipdRequest!.orderedByName}`
            : ipdRequest!.admission?.primaryDoctor?.user?.name
            ? `Dr. ${ipdRequest!.admission.primaryDoctor.user.name}`
            : ipdRequest!.emergencyVisit?.assignedDoctor?.user?.name
            ? `Dr. ${ipdRequest!.emergencyVisit.assignedDoctor.user.name}`
            : "Doctor",
          specialization: null as string | null,
        },
        location: ipdRequest!.admission?.bed 
          ? `${ipdRequest!.admission.bed.ward.name} - Bed ${ipdRequest!.admission.bed.bedNumber}` 
          : ipdRequest!.emergencyVisit?.bed
          ? `ER - Bed ${ipdRequest!.emergencyVisit.bed.bedNumber}`
          : "IPD/ER",
      }
    : {
        requestId: opdRequest!.id,
        source: "OPD" as const,
        testName: opdRequest!.testName,
        testType: opdRequest!.testType as "PATHOLOGY" | "RADIOLOGY",
        status: opdRequest!.status,
        priority: opdRequest!.priority,
        notes: opdRequest!.notes,
        existingContent: opdRequest!.reportContent || "",
        existingImpression: opdRequest!.impression || "",
        isCompleted: opdRequest!.status === "COMPLETED",
        canEnterResults:
          opdRequest!.status === "SAMPLE_COLLECTED" || opdRequest!.status === "PAID_PENDING_SAMPLE",
        createdAt: opdRequest!.createdAt,
        patient: {
          name: opdRequest!.patient.user.name || "Unknown",
          patientId: opdRequest!.patient.patientId,
          age: opdRequest!.patient.dateOfBirth
            ? differenceInYears(new Date(), new Date(opdRequest!.patient.dateOfBirth))
            : null,
          gender: opdRequest!.patient.gender,
        },
        doctor: {
          name: opdRequest!.appointment?.doctor?.user?.name
            ? `Dr. ${opdRequest!.appointment.doctor.user.name}`
            : "Direct Order",
          specialization: opdRequest!.appointment?.doctor?.specialization || null,
        },
        location: "OPD",
      }

  const IconComponent = isRadiology ? Radiation : Microscope
  const colorClass = isRadiology ? "text-purple-600" : "text-blue-600"
  const bgClass = isRadiology ? "bg-purple-50" : "bg-blue-50"
  const borderClass = isRadiology ? "border-purple-500" : "border-blue-500"

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-3xl font-bold tracking-tight ${colorClass} flex items-center gap-2`}
          >
            <IconComponent className="h-8 w-8" />
            {isRadiology ? "Radiology Report Entry" : "Pathology Result Entry"}
          </h2>
          <p className="text-muted-foreground mt-1">
            Enter findings and impression for the test
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Source badge */}
          {isIPD ? (
            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
              <BedDouble className="h-3 w-3 mr-1" />
              IPD
            </Badge>
          ) : (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              <Stethoscope className="h-3 w-3 mr-1" />
              OPD
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`${
              testDetails.isCompleted
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }`}
          >
            {testDetails.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* Patient & Test Info */}
      <Card className={`border-t-4 ${borderClass}`}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Info */}
            <div className={`p-4 rounded-lg ${bgClass}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full bg-white ${colorClass}`}>
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Patient
                  </p>
                  <p className="text-lg font-bold">{testDetails.patient.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{testDetails.patient.patientId}</span>
                    {testDetails.patient.age && <span>{testDetails.patient.age} years</span>}
                    {testDetails.patient.gender && <span>{testDetails.patient.gender}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Test Info */}
            <div className={`p-4 rounded-lg ${bgClass}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full bg-white ${colorClass}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Investigation
                  </p>
                  <p className="text-lg font-bold">{testDetails.testName}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {testDetails.testType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {testDetails.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Referring Doctor */}
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-white text-gray-600">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Referred By
                  </p>
                  <p className="text-lg font-bold">{testDetails.doctor.name}</p>
                  {testDetails.doctor.specialization && (
                    <p className="text-sm text-muted-foreground">
                      {testDetails.doctor.specialization}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location / Date Info */}
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-white text-gray-600">
                  {isIPD ? <BedDouble className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    {isIPD ? "Location" : "Test Date"}
                  </p>
                  {isIPD ? (
                    <>
                      <p className="text-lg font-bold">{testDetails.location}</p>
                      <p className="text-sm text-muted-foreground">
                        Ordered: {format(new Date(testDetails.createdAt), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold">
                        {format(new Date(testDetails.createdAt), "dd MMM yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(testDetails.createdAt), "hh:mm a")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes from Doctor */}
          {testDetails.notes && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700 uppercase font-semibold mb-1">
                Clinical Notes
              </p>
              <p className="text-sm text-amber-900">{testDetails.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Entry Form */}
      <LabResultEntryForm
        requestId={testDetails.requestId}
        testName={testDetails.testName}
        testType={testDetails.testType}
        isCompleted={testDetails.isCompleted}
        existingContent={testDetails.existingContent}
        existingImpression={testDetails.existingImpression}
        isIPD={isIPD}
        catalogParameters={catalogParameters}
        existingParameterResults={existingParameterResults}
      />
    </div>
  )
}
