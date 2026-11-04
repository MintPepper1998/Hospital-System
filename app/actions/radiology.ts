"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { createMultiRoleNotification } from "@/lib/create-notification"
import { writeAuditLog } from "@/lib/audit"
import { differenceInYears } from "date-fns"

export interface RadiologyParameterResult {
  name: string
  result: string
  unit?: string
  normalRange?: string
  method?: string
  isAbnormal?: boolean
}

export interface RadiologyParameterSectionResult {
  heading: string
  parameters: RadiologyParameterResult[]
}

export interface RadiologyAttachment {
  url: string
  title?: string
  caption?: string
}

export interface RadiologyReportData {
  modality: string
  studyArea: string
  sections?: RadiologyParameterSectionResult[]
  parameters: RadiologyParameterResult[]
  interpretation: string
  impression: string
  diagramUrl?: string
  imageUrl?: string
  imagePosition?: "start" | "end"
  attachments?: RadiologyAttachment[]
  radiologist: {
    name: string
    qualification: string
    designation: string
    regNo?: string
  }
}

export interface SaveRadiologyReportInput {
  requestId: string
  isIPD?: boolean
  reportData: RadiologyReportData
}

const DEFAULT_RADIOLOGIST = {
  name: "Dr. Monika Panda",
  qualification: "MD Radiodiagnosis",
  designation: "Head of the Department & Consultant Radiologist",
  regNo: "48921/OMC",
}

export async function getRadiologyEntryContext(requestId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "LAB_TECHNICIAN", "DOCTOR", "STAFF"])
  if (!authResult.ok) {
    return { success: false, message: authResult.error }
  }

  try {
    // 1. Try OPD LabRequest
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

    // 2. Try IPD LabRequest if not found
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

    if (!opdRequest && !ipdRequest) {
      return { success: false, message: "Radiology investigation request not found" }
    }

    const isIPD = !opdRequest
    const testName = isIPD ? ipdRequest!.testName : opdRequest!.testName
    const catalogId = isIPD ? ipdRequest!.testCatalogId : opdRequest!.testCatalogId

    // 3. Fetch LabTestCatalog config
    let catalog = catalogId
      ? await prisma.labTestCatalog.findUnique({ where: { id: catalogId } })
      : null

    if (!catalog) {
      catalog = await prisma.labTestCatalog.findFirst({
        where: {
          name: testName,
          type: "RADIOLOGY",
          isActive: true,
        },
      })
    }

    // 4. Fetch Hospital Settings
    const hospital = await prisma.hospitalSettings.findUnique({ where: { id: 1 } })

    // Extract patient details
    const patientRaw = isIPD
      ? ipdRequest!.admission?.patient || ipdRequest!.emergencyVisit?.patient
      : opdRequest!.patient

    const age = patientRaw?.dateOfBirth
      ? differenceInYears(new Date(), new Date(patientRaw.dateOfBirth))
      : null

    const patient = {
      id: patientRaw?.id || "",
      patientId: patientRaw?.patientId || "",
      name: patientRaw?.user?.name || "Unknown Patient",
      gender: patientRaw?.gender || "OTHER",
      age,
      phone: patientRaw?.phone || "",
      bloodGroup: patientRaw?.bloodGroup || null,
    }

    const referringDoctor = isIPD
      ? ipdRequest!.orderedByName ||
        ipdRequest!.admission?.primaryDoctor?.user?.name ||
        ipdRequest!.emergencyVisit?.assignedDoctor?.user?.name ||
        "Dr. SELF"
      : opdRequest!.appointment?.doctor?.user?.name
      ? `Dr. ${opdRequest!.appointment.doctor.user.name}`
      : "Dr. SELF"

    // Parse catalog parameters
    const catalogParamsRaw = catalog?.parameters as Record<string, unknown> | null
    let defaultSections: RadiologyParameterSectionResult[] = []
    let defaultParameters: RadiologyParameterResult[] = []
    const defaultModality = (catalogParamsRaw?.modality as string) || "ULTRASOUND"
    const defaultStudyArea = (catalogParamsRaw?.studyArea as string) || testName
    let defaultInterpretation =
      (catalogParamsRaw?.defaultInterpretation as string) ||
      (catalogParamsRaw?.notes as string) ||
      ""
    const defaultDiagramUrl =
      (catalogParamsRaw?.defaultDiagramUrl as string) ||
      (catalogParamsRaw?.defaultImageUrl as string) ||
      ""
    const defaultImageUrl =
      (catalogParamsRaw?.defaultImageUrl as string) ||
      (catalogParamsRaw?.defaultDiagramUrl as string) ||
      ""
    const defaultImagePosition =
      ((catalogParamsRaw?.defaultImagePosition as string) === "start" ? "start" : "end") as "start" | "end"

    if (catalogParamsRaw && typeof catalogParamsRaw === "object") {
      if (Array.isArray(catalogParamsRaw.sections)) {
        defaultSections = (catalogParamsRaw.sections as Array<Record<string, unknown>>).map((s) => ({
          heading: (s.heading as string) || "",
          parameters: Array.isArray(s.parameters)
            ? (s.parameters as Array<Record<string, unknown>>).map((p) => ({
                name: (p.name as string) || "",
                result: (p.defaultResult as string) || "",
                unit: (p.unit as string) || "",
                normalRange: (p.normalRange as string) || "",
                method: (p.method as string) || "",
                isAbnormal: false,
              }))
            : [],
        }))

        // Flatten for easy access
        defaultParameters = defaultSections.flatMap((s) => s.parameters)
      } else if (Array.isArray(catalogParamsRaw)) {
        defaultParameters = (catalogParamsRaw as Array<Record<string, unknown>>).map((p) => ({
          name: (p.name as string) || "",
          result: (p.defaultResult as string) || "",
          unit: (p.unit as string) || "",
          normalRange: (p.normalRange as string) || "",
          method: (p.method as string) || "",
          isAbnormal: false,
        }))
        defaultSections = [{ heading: "Parameters", parameters: defaultParameters }]
      }
    }

    // Check for existing saved report data
    const savedParameterResults = isIPD
      ? (ipdRequest!.parameterResults as Record<string, unknown> | null)
      : (opdRequest!.parameterResults as Record<string, unknown> | null)

    let existingData: RadiologyReportData | null = null

    if (savedParameterResults && typeof savedParameterResults === "object") {
      // Check if it matches structured RadiologyReportData
      if (
        "interpretation" in savedParameterResults ||
        "parameters" in savedParameterResults ||
        "modality" in savedParameterResults
      ) {
        existingData = {
          modality: (savedParameterResults.modality as string) || defaultModality,
          studyArea: (savedParameterResults.studyArea as string) || defaultStudyArea,
          sections: (savedParameterResults.sections as RadiologyParameterSectionResult[]) || defaultSections,
          parameters: (savedParameterResults.parameters as RadiologyParameterResult[]) || defaultParameters,
          interpretation:
            (savedParameterResults.interpretation as string) ||
            (isIPD ? ipdRequest!.result || "" : opdRequest!.reportContent || "") ||
            defaultInterpretation,
          impression:
            (savedParameterResults.impression as string) ||
            (isIPD ? "" : opdRequest!.impression || "") ||
            "",
          diagramUrl:
            (savedParameterResults.diagramUrl as string) ||
            (savedParameterResults.imageUrl as string) ||
            defaultDiagramUrl,
          imageUrl:
            (savedParameterResults.imageUrl as string) ||
            (savedParameterResults.diagramUrl as string) ||
            defaultImageUrl,
          imagePosition:
            ((savedParameterResults.imagePosition as string) === "start" ? "start" : "end") as "start" | "end",
          attachments: (savedParameterResults.attachments as RadiologyAttachment[]) || [],
          radiologist:
            (savedParameterResults.radiologist as RadiologyReportData["radiologist"]) ||
            DEFAULT_RADIOLOGIST,
        }
      }
    }

    // Default template fallback if empty
    if (!defaultInterpretation.trim()) {
      defaultInterpretation = `CLINICAL FINDINGS / OBSERVATION:
- All visualized organs demonstrated normal anatomical outline, size, and acoustic impedance.
- No focal parenchymal lesions, mass lesions, calculus, or abnormal collection visualized.
- Retroperitoneal major vascular structures appear normal.

IMPRESSION:
- No significant sonological / radiological abnormality detected.`
    }

    return {
      success: true,
      data: {
        requestId,
        isIPD,
        testName,
        status: isIPD ? ipdRequest!.status : opdRequest!.status,
        priority: isIPD ? (ipdRequest!.isUrgent ? "URGENT" : "ROUTINE") : opdRequest!.priority,
        createdAt: isIPD ? ipdRequest!.createdAt : opdRequest!.createdAt,
        patient,
        referringDoctor,
        hospital: {
          name: hospital?.name || "Shree Kamal Hospital",
          address: hospital?.address || "CHANDAPUR , PANIKOILI , JAJPUR , ODISHA , 755043",
          phone: hospital?.phone || "+919777919827",
          email: hospital?.email || "radiology@shreekamal.com",
        },
        defaultRadiologist: DEFAULT_RADIOLOGIST,
        catalog: {
          id: catalog?.id || "",
          name: catalog?.name || testName,
          code: catalog?.code || "",
          modality: defaultModality,
          studyArea: defaultStudyArea,
          defaultSections,
          defaultParameters,
          defaultInterpretation,
          defaultDiagramUrl,
          defaultImageUrl,
          defaultImagePosition,
        },
        existingData,
      },
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load radiology context"
    return { success: false, message }
  }
}

export async function saveRadiologyReport(input: SaveRadiologyReportInput) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "LAB_TECHNICIAN", "DOCTOR"])
  if (!authResult.ok) {
    return { success: false, message: authResult.error }
  }

  try {
    const { requestId, isIPD, reportData } = input

    if (!requestId) {
      return { success: false, message: "Request ID is required" }
    }
    if (!reportData.interpretation?.trim()) {
      return { success: false, message: "Clinical interpretation / findings are required" }
    }

    const signingRadiologist = reportData.radiologist || DEFAULT_RADIOLOGIST
    const fullImpression = reportData.impression?.trim() || ""

    if (isIPD) {
      const ipdRequest = await prisma.iPDLabRequest.findUnique({
        where: { id: requestId },
        include: {
          admission: { include: { patient: { include: { user: true } } } },
          emergencyVisit: { include: { patient: { include: { user: true } } } },
        },
      })

      if (!ipdRequest) {
        return { success: false, message: "IPD radiology request not found" }
      }

      const combinedResult = fullImpression
        ? `${reportData.interpretation.trim()}\n\n--- IMPRESSION ---\n${fullImpression}`
        : reportData.interpretation.trim()

      await prisma.iPDLabRequest.update({
        where: { id: requestId },
        data: {
          result: combinedResult,
          parameterResults: reportData as unknown as Record<string, unknown>,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })

      const patientName =
        ipdRequest.admission?.patient?.user?.name ||
        ipdRequest.emergencyVisit?.patient?.user?.name ||
        "Patient"

      const link = ipdRequest.admissionId
        ? `/dashboard/ipd/patient/${ipdRequest.admissionId}`
        : `/dashboard/clinical/emergency/patient/${ipdRequest.emergencyVisitId}`

      await createMultiRoleNotification({
        title: "Radiology Report Finalized (IPD)",
        message: `${ipdRequest.testName} report ready for ${patientName} by ${signingRadiologist.name}.`,
        type: "SUCCESS",
        module: "LAB",
        link,
        referenceId: requestId,
        targetRoles: ["DOCTOR", "NURSE", "SUPER_ADMIN"],
      })
    } else {
      const opdRequest = await prisma.labRequest.findUnique({
        where: { id: requestId },
        include: {
          patient: { include: { user: true } },
        },
      })

      if (!opdRequest) {
        return { success: false, message: "OPD radiology request not found" }
      }

      await prisma.labRequest.update({
        where: { id: requestId },
        data: {
          reportContent: reportData.interpretation.trim(),
          impression: fullImpression || null,
          parameterResults: reportData as unknown as Record<string, unknown>,
          performedBy: signingRadiologist.name,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })

      const patientName = opdRequest.patient?.user?.name || "Patient"

      await createMultiRoleNotification({
        title: "Radiology Report Finalized",
        message: `${opdRequest.testName} report signed for ${patientName} by ${signingRadiologist.name}.`,
        type: "SUCCESS",
        module: "LAB",
        link: `/dashboard/radiology/print/${requestId}`,
        referenceId: requestId,
        targetRoles: ["DOCTOR", "SUPER_ADMIN"],
      })
    }

    // Revalidate all related paths
    revalidatePath("/dashboard/radiology/queue")
    revalidatePath("/dashboard/radiology/reports")
    revalidatePath(`/dashboard/radiology/entry/${requestId}`)
    revalidatePath(`/dashboard/radiology/print/${requestId}`)
    revalidatePath("/dashboard/lab/queue")
    revalidatePath("/dashboard/lab/radiology/queue")
    revalidatePath("/dashboard/lab/reports")
    revalidatePath(`/dashboard/lab/entry/${requestId}`)
    revalidatePath(`/dashboard/lab/print/${requestId}`)

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "RadiologyReport",
      recordId: requestId,
      changes: {
        testName: isIPD ? "IPD Radiology" : "OPD Radiology",
        performedBy: signingRadiologist.name,
      },
    })

    return {
      success: true,
      message: "Radiology report finalized and signed successfully",
      requestId,
      redirectUrl: `/dashboard/radiology/print/${requestId}`,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save radiology report"
    return { success: false, message }
  }
}
