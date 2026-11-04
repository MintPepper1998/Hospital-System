"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

/**
 * Create a new IPD lab/investigation request.
 */
export async function createIPDLabRequest(data: {
  admissionId?: string
  emergencyVisitId?: string
  orderedById: string
  orderedByName: string
  type: "PATHOLOGY" | "RADIOLOGY"
  testName: string
  testCatalogId?: string
  isUrgent?: boolean
  notes?: string
}) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "NURSE"])

  if ((!data.admissionId && !data.emergencyVisitId) || !data.testName.trim()) {
    throw new Error("Admission ID or Emergency Visit ID, and test name are required")
  }

  if (data.admissionId) {
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: data.admissionId },
    })

    if (!admission) throw new Error("Admission not found")
    if (admission.status !== "ADMITTED") {
      throw new Error("Cannot order investigations for a discharged/inactive admission")
    }
  }

  if (data.emergencyVisitId) {
    const visit = await prisma.emergencyVisit.findUnique({
      where: { id: data.emergencyVisitId },
    })

    if (!visit) throw new Error("Emergency visit not found")
    if (visit.status === "DISCHARGED") {
      throw new Error("Cannot order investigations for a discharged emergency visit")
    }
  }

  const normalizedTestName = data.testName.trim()
  let resolvedCatalogId: string | null = null

  if (data.testCatalogId) {
    const selectedCatalog = await prisma.labTestCatalog.findUnique({
      where: { id: data.testCatalogId },
      select: { id: true, type: true, isActive: true },
    })

    if (selectedCatalog && selectedCatalog.isActive && selectedCatalog.type === data.type) {
      resolvedCatalogId = selectedCatalog.id
    }
  }

  if (!resolvedCatalogId) {
    const matchedCatalog = await prisma.labTestCatalog.findFirst({
      where: {
        name: normalizedTestName,
        type: data.type,
        isActive: true,
      },
      select: { id: true },
    })
    resolvedCatalogId = matchedCatalog?.id ?? null
  }

  const labRequest = await prisma.iPDLabRequest.create({
    data: {
      admissionId: data.admissionId || null,
      emergencyVisitId: data.emergencyVisitId || null,
      testCatalogId: resolvedCatalogId,
      orderedById: data.orderedById,
      orderedByName: data.orderedByName,
      type: data.type,
      testName: normalizedTestName,
      isUrgent: data.isUrgent || false,
      notes: data.notes?.trim() || null,
      status: "PENDING",
    },
  })

  if (data.admissionId) {
    revalidatePath(`/dashboard/ipd/patient/${data.admissionId}`)
  }
  if (data.emergencyVisitId) {
    revalidatePath(`/dashboard/clinical/emergency/patient/${data.emergencyVisitId}`)
  }

  writeAuditLog({ userId: data.orderedById, action: "CREATE", module: "IPDLabRequest", recordId: labRequest.id, changes: { testName: normalizedTestName, type: data.type, isUrgent: data.isUrgent } })

  return {
    success: true,
    requestId: labRequest.id,
  }
}

/**
 * Collect sample / mark as in-progress for an IPD lab request.
 * Equivalent to OPD's collectSample but for IPDLabRequest.
 */
export async function collectIPDSample(requestId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (!requestId) {
    return { success: false, message: "Request ID is required" }
  }

  const request = await prisma.iPDLabRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    return { success: false, message: "IPD lab request not found" }
  }

  if (request.status !== "PENDING") {
    return { success: false, message: `Cannot collect sample: status is ${request.status}` }
  }

  await prisma.iPDLabRequest.update({
    where: { id: requestId },
    data: { status: "IN_PROGRESS" },
  })

  revalidatePath("/dashboard/lab/queue")
  revalidatePath("/dashboard/lab/pathology/queue")
  if (request.admissionId) {
    revalidatePath(`/dashboard/ipd/patient/${request.admissionId}`)
  }
  if (request.emergencyVisitId) {
    revalidatePath(`/dashboard/clinical/emergency/patient/${request.emergencyVisitId}`)
  }

  writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "IPDLabSample", recordId: requestId, changes: { testName: request.testName, status: "IN_PROGRESS" } })

  return { success: true }
}

/**
 * Cancel a pending IPD lab request.
 */
export async function cancelIPDLabRequest(data: {
  requestId: string
  cancelledBy: string
}) {
  await requireAuth(["SUPER_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "NURSE"])

  if (!data.requestId) {
    throw new Error("Request ID is required")
  }

  const request = await prisma.iPDLabRequest.findUnique({
    where: { id: data.requestId },
  })

  if (!request) {
    throw new Error("Lab request not found")
  }

  if (request.status !== "PENDING") {
    throw new Error(`Cannot cancel a request with status: ${request.status}`)
  }

  const updated = await prisma.iPDLabRequest.update({
    where: { id: data.requestId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: data.cancelledBy,
    },
  })

  if (updated.admissionId) {
    revalidatePath(`/dashboard/ipd/patient/${updated.admissionId}`)
  }
  if (updated.emergencyVisitId) {
    revalidatePath(`/dashboard/clinical/emergency/patient/${updated.emergencyVisitId}`)
  }

  writeAuditLog({ userId: data.cancelledBy, action: "DELETE", module: "IPDLabRequest", recordId: data.requestId, changes: { testName: request.testName, status: "CANCELLED" } })

  return {
    success: true,
  }
}
