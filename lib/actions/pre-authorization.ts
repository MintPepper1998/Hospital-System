"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PreAuthStatus, Prisma } from "@prisma/client"
import { z } from "zod"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { type PaginationParams, getPaginationValues, paginatedResult } from "@/lib/pagination"
import { writeAuditLog } from "@/lib/audit"

const createPreAuthSchema = z.object({
  policyId: z.string().min(1),
  patientId: z.string().min(1),
  admissionId: z.string().optional(),
  provisionalDiagnosis: z.string().min(1, "Diagnosis is required"),
  icdPrimaryCode: z.string().optional(),
  icdPrimaryDescription: z.string().optional(),
  icdSecondaryCode: z.string().optional(),
  icdSecondaryDescription: z.string().optional(),
  treatmentType: z.string().optional(),
  proposedTreatment: z.string().min(1, "Proposed treatment is required"),
  surgeryName: z.string().optional(),
  admissionType: z.string().optional(),
  expectedStayDays: z.number().optional(),
  expectedIcuDays: z.number().optional(),
  roomType: z.string().optional(),
  roomChargePerDay: z.number().optional(),
  totalEstimatedCost: z.number().min(0),
  estimatedRoomRent: z.number().optional(),
  estimatedIcuCharges: z.number().optional(),
  estimatedInvestigation: z.number().optional(),
  estimatedOtCharges: z.number().optional(),
  estimatedProfessionalFees: z.number().optional(),
  estimatedMedicines: z.number().optional(),
  estimatedImplants: z.number().optional(),
  estimatedOtherCharges: z.number().optional(),
  treatingDoctorName: z.string().optional(),
  treatingDoctorRegNo: z.string().optional(),
})

export async function createPreAuth(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const rawData = {
      policyId: formData.get("policyId") as string,
      patientId: formData.get("patientId") as string,
      admissionId: (formData.get("admissionId") as string) || undefined,
      provisionalDiagnosis: formData.get("provisionalDiagnosis") as string,
      icdPrimaryCode: (formData.get("icdPrimaryCode") as string) || undefined,
      icdPrimaryDescription: (formData.get("icdPrimaryDescription") as string) || undefined,
      icdSecondaryCode: (formData.get("icdSecondaryCode") as string) || undefined,
      icdSecondaryDescription: (formData.get("icdSecondaryDescription") as string) || undefined,
      treatmentType: (formData.get("treatmentType") as string) || undefined,
      proposedTreatment: formData.get("proposedTreatment") as string,
      surgeryName: (formData.get("surgeryName") as string) || undefined,
      admissionType: (formData.get("admissionType") as string) || undefined,
      expectedStayDays: formData.get("expectedStayDays") ? parseInt(formData.get("expectedStayDays") as string) : undefined,
      expectedIcuDays: formData.get("expectedIcuDays") ? parseInt(formData.get("expectedIcuDays") as string) : undefined,
      roomType: (formData.get("roomType") as string) || undefined,
      roomChargePerDay: formData.get("roomChargePerDay") ? parseFloat(formData.get("roomChargePerDay") as string) : undefined,
      totalEstimatedCost: parseFloat(formData.get("totalEstimatedCost") as string) || 0,
      estimatedRoomRent: formData.get("estimatedRoomRent") ? parseFloat(formData.get("estimatedRoomRent") as string) : undefined,
      estimatedIcuCharges: formData.get("estimatedIcuCharges") ? parseFloat(formData.get("estimatedIcuCharges") as string) : undefined,
      estimatedInvestigation: formData.get("estimatedInvestigation") ? parseFloat(formData.get("estimatedInvestigation") as string) : undefined,
      estimatedOtCharges: formData.get("estimatedOtCharges") ? parseFloat(formData.get("estimatedOtCharges") as string) : undefined,
      estimatedProfessionalFees: formData.get("estimatedProfessionalFees") ? parseFloat(formData.get("estimatedProfessionalFees") as string) : undefined,
      estimatedMedicines: formData.get("estimatedMedicines") ? parseFloat(formData.get("estimatedMedicines") as string) : undefined,
      estimatedImplants: formData.get("estimatedImplants") ? parseFloat(formData.get("estimatedImplants") as string) : undefined,
      estimatedOtherCharges: formData.get("estimatedOtherCharges") ? parseFloat(formData.get("estimatedOtherCharges") as string) : undefined,
      treatingDoctorName: (formData.get("treatingDoctorName") as string) || undefined,
      treatingDoctorRegNo: (formData.get("treatingDoctorRegNo") as string) || undefined,
    }

    const parsed = createPreAuthSchema.safeParse(rawData)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || "Validation failed"
      return { success: false, message: firstError }
    }

    const currentYear = new Date().getFullYear()
    const count = await prisma.preAuthorization.count()
    const preAuthNumber = `PA-${currentYear}-${String(count + 1).padStart(4, "0")}`

    const preAuth = await prisma.preAuthorization.create({
      data: {
        preAuthNumber,
        policyId: parsed.data.policyId,
        patientId: parsed.data.patientId,
        admissionId: parsed.data.admissionId || null,
        provisionalDiagnosis: parsed.data.provisionalDiagnosis,
        icdPrimaryCode: parsed.data.icdPrimaryCode || null,
        icdPrimaryDescription: parsed.data.icdPrimaryDescription || null,
        icdSecondaryCode: parsed.data.icdSecondaryCode || null,
        icdSecondaryDescription: parsed.data.icdSecondaryDescription || null,
        treatmentType: parsed.data.treatmentType || null,
        proposedTreatment: parsed.data.proposedTreatment,
        surgeryName: parsed.data.surgeryName || null,
        admissionType: parsed.data.admissionType || null,
        expectedStayDays: parsed.data.expectedStayDays || null,
        expectedIcuDays: parsed.data.expectedIcuDays || null,
        roomType: parsed.data.roomType || null,
        roomChargePerDay: parsed.data.roomChargePerDay || null,
        totalEstimatedCost: parsed.data.totalEstimatedCost,
        estimatedRoomRent: parsed.data.estimatedRoomRent || null,
        estimatedIcuCharges: parsed.data.estimatedIcuCharges || null,
        estimatedInvestigation: parsed.data.estimatedInvestigation || null,
        estimatedOtCharges: parsed.data.estimatedOtCharges || null,
        estimatedProfessionalFees: parsed.data.estimatedProfessionalFees || null,
        estimatedMedicines: parsed.data.estimatedMedicines || null,
        estimatedImplants: parsed.data.estimatedImplants || null,
        estimatedOtherCharges: parsed.data.estimatedOtherCharges || null,
        treatingDoctorName: parsed.data.treatingDoctorName || null,
        treatingDoctorRegNo: parsed.data.treatingDoctorRegNo || null,
        status: PreAuthStatus.DRAFT,
      },
    })

    revalidatePath("/dashboard/insurance/pre-auth")
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "PreAuthorization", recordId: preAuth.id, changes: {} })

    return {
      success: true,
      message: `Pre-authorization ${preAuthNumber} created`,
      data: { preAuthId: preAuth.id, preAuthNumber },
    }
  } catch (error: unknown) {
    console.error("[ERROR] createPreAuth:", error)
    const message = error instanceof Error ? error.message : "Failed to create pre-authorization"
    return { success: false, message }
  }
}

export async function submitPreAuth(preAuthId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const preAuth = await prisma.preAuthorization.findUnique({ where: { id: preAuthId } })
    if (!preAuth) return { success: false, message: "Pre-authorization not found" }
    if (preAuth.status !== "DRAFT") return { success: false, message: "Only draft pre-authorizations can be submitted" }

    await prisma.preAuthorization.update({
      where: { id: preAuthId },
      data: { status: PreAuthStatus.SUBMITTED, submittedAt: new Date() },
    })

    revalidatePath("/dashboard/insurance/pre-auth")
    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "PreAuthorization", recordId: preAuthId, changes: { status: "SUBMITTED" } })
    return { success: true, message: `Pre-authorization ${preAuth.preAuthNumber} submitted to TPA` }
  } catch (error: unknown) {
    console.error("[ERROR] submitPreAuth:", error)
    return { success: false, message: "Failed to submit pre-authorization" }
  }
}

export async function updatePreAuthStatus(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const preAuthId = formData.get("preAuthId") as string
    const status = formData.get("status") as string
    const approvedAmount = formData.get("approvedAmount") ? parseFloat(formData.get("approvedAmount") as string) : undefined
    const remarks = (formData.get("remarks") as string) || undefined
    const queryDetails = (formData.get("queryDetails") as string) || undefined
    const rejectionReason = (formData.get("rejectionReason") as string) || undefined

    const preAuth = await prisma.preAuthorization.findUnique({ where: { id: preAuthId } })
    if (!preAuth) return { success: false, message: "Pre-authorization not found" }

    const updateData: any = {
      status: status as PreAuthStatus,
      updatedAt: new Date(),
    }

    if (status === "APPROVED" || status === "APPROVED_WITH_MODIFICATION") {
      updateData.approvedAmount = approvedAmount || null
      updateData.approvedRemarks = remarks || null
      updateData.approvedAt = new Date()
    } else if (status === "QUERY_RAISED") {
      updateData.queryDetails = queryDetails || remarks || null
    } else if (status === "REJECTED") {
      updateData.rejectionReason = rejectionReason || remarks || null
    }

    await prisma.preAuthorization.update({ where: { id: preAuthId }, data: updateData })

    revalidatePath("/dashboard/insurance/pre-auth")
    revalidatePath(`/dashboard/insurance/pre-auth/${preAuthId}`)
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "PreAuthorization", changes: {} })
    return { success: true, message: `Pre-authorization status updated to ${status}` }
  } catch (error: unknown) {
    console.error("[ERROR] updatePreAuthStatus:", error)
    return { success: false, message: "Failed to update pre-authorization status" }
  }
}

export async function requestEnhancement(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const preAuthId = formData.get("preAuthId") as string
    const enhancementAmount = parseFloat(formData.get("enhancementAmount") as string)
    const enhancementReason = formData.get("enhancementReason") as string

    const preAuth = await prisma.preAuthorization.findUnique({ where: { id: preAuthId } })
    if (!preAuth) return { success: false, message: "Pre-authorization not found" }

    await prisma.preAuthorization.update({
      where: { id: preAuthId },
      data: {
        enhancementAmount,
        enhancementReason,
        enhancementStatus: "REQUESTED",
        status: PreAuthStatus.ENHANCEMENT_REQUESTED,
      },
    })

    revalidatePath("/dashboard/insurance/pre-auth")
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "PreAuthEnhancement", changes: {} })
    return { success: true, message: `Enhancement of Rs.${enhancementAmount.toLocaleString("en-IN")} requested` }
  } catch (error: unknown) {
    console.error("[ERROR] requestEnhancement:", error)
    return { success: false, message: "Failed to request enhancement" }
  }
}

export async function getAllPreAuths(statusFilter?: string, params?: PaginationParams) {
  await requireAuth()
  try {
    const { page, limit, skip } = getPaginationValues(params)
    const where: Prisma.PreAuthorizationWhereInput = {}
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter as PreAuthStatus
    }

    const [preAuths, total] = await Promise.all([
      prisma.preAuthorization.findMany({
        where,
        include: {
          policy: { include: { patient: { include: { user: true } } } },
          patient: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.preAuthorization.count({ where }),
    ])

    return { success: true, ...paginatedResult(preAuths, total, page, limit) }
  } catch (error: unknown) {
    console.error("[ERROR] getAllPreAuths:", error)
    return { success: false, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
  }
}

export async function getPreAuthById(id: string) {
  await requireAuth()
  try {
    const preAuth = await prisma.preAuthorization.findUnique({
      where: { id },
      include: {
        policy: { include: { patient: { include: { user: true } } } },
        patient: { include: { user: true } },
      },
    })
    if (!preAuth) return { success: false, message: "Pre-authorization not found", data: null }
    return { success: true, data: preAuth }
  } catch (error: unknown) {
    console.error("[ERROR] getPreAuthById:", error)
    return { success: false, message: "Failed to fetch pre-authorization", data: null }
  }
}

export async function searchIcdCodes(query: string) {
  await requireAuth()
  try {
    if (!query || query.length < 2) return { success: true, data: [] }
    const codes = await prisma.icdCode.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: [{ isCommon: "desc" }, { code: "asc" }],
    })
    return { success: true, data: codes }
  } catch (error: unknown) {
    return { success: false, data: [] }
  }
}
