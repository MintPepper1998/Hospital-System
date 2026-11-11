"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { createMultiRoleNotification } from "@/lib/create-notification"
import { writeAuditLog } from "@/lib/audit"

interface LabRequestRawRow {
  id: string
  testName: string
  testPrice: number
  testType: string
  status: string
  priority: string | null
  notes: string | null
  reportContent: string | null
  impression: string | null
  completedAt: Date | null
  performedBy: string | null
  createdAt: Date
  patient_id: string
  patient_patientId: string
  patient_dateOfBirth: Date | null
  patient_gender: string | null
  patient_bloodGroup?: string | null
  patient_name: string | null
  patient_email: string | null
  patient_phone: string | null
  doctor_name: string | null
  doctor_specialization: string | null
}

/**
 * Save lab/radiology result and finalize the request.
 * Supports both OPD (LabRequest) and IPD (IPDLabRequest).
 */
export async function saveLabResult(data: {
  requestId: string
  reportContent: string
  impression: string
  performedBy?: string
  isIPD?: boolean
  parameterResults?: Record<string, string>
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "LAB_TECHNICIAN", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    console.log("[INFO] Saving lab result for request:", data.requestId, "isIPD:", !!data.isIPD)

    if (!data.requestId) {
      return { success: false, message: "Request ID is required" }
    }

    if (!data.reportContent?.trim()) {
      return { success: false, message: "Findings/Report content is required" }
    }

    // ==========================================
    // IPD path: update IPDLabRequest
    // ==========================================
    if (data.isIPD) {
      const ipdRequest = await prisma.iPDLabRequest.findUnique({
        where: { id: data.requestId },
      })

      if (!ipdRequest) {
        return { success: false, message: "IPD lab request not found" }
      }

      if (ipdRequest.status === "COMPLETED") {
        return { success: false, message: "This request has already been completed" }
      }

      if (ipdRequest.status !== "PENDING" && ipdRequest.status !== "IN_PROGRESS") {
        return {
          success: false,
          message: `Cannot enter results for request with status: ${ipdRequest.status}`,
        }
      }

      // Store result + impression in the result field (combined)
      const fullResult = data.impression?.trim()
        ? `${data.reportContent.trim()}\n\n--- IMPRESSION ---\n${data.impression.trim()}`
        : data.reportContent.trim()

      await prisma.iPDLabRequest.update({
        where: { id: data.requestId },
        data: {
          result: fullResult,
          parameterResults: data.parameterResults ?? undefined,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })

      console.log("[SUCCESS] IPD lab result saved:", data.requestId)

      // Fetch admission or ER details for notification
      let patientName = "patient"
      let link = `/dashboard/ipd/patient/${ipdRequest.admissionId}`

      if (ipdRequest.admissionId) {
        const admissionDetails = await prisma.iPDAdmission.findUnique({
          where: { id: ipdRequest.admissionId },
          include: { patient: { include: { user: true } } },
        })
        patientName = (admissionDetails as any)?.patient?.user?.name || "patient"
      } else if (ipdRequest.emergencyVisitId) {
        const erDetails = await prisma.emergencyVisit.findUnique({
          where: { id: ipdRequest.emergencyVisitId },
          include: { patient: { include: { user: true } } },
        })
        patientName = (erDetails as any)?.patient?.user?.name || "patient"
        link = `/dashboard/clinical/emergency/patient/${ipdRequest.emergencyVisitId}`
      }

      // Notify doctors and nurses about completed lab result
      await createMultiRoleNotification({
        title: "Lab Result Ready (IPD/ER)",
        message: `${ipdRequest.testName} result is now available for ${patientName}.`,
        type: "SUCCESS",
        module: "LAB",
        link,
        referenceId: data.requestId,
        targetRoles: ["DOCTOR", "NURSE", "SUPER_ADMIN"],
      })

      // Revalidate
      revalidatePath("/dashboard/lab/queue")
      revalidatePath("/dashboard/lab/pathology/queue")
      revalidatePath("/dashboard/lab/radiology/queue")
      revalidatePath(`/dashboard/lab/entry/${data.requestId}`)
      revalidatePath(`/dashboard/lab/print/${data.requestId}`)
      if (ipdRequest.admissionId) {
        revalidatePath(`/dashboard/ipd/patient/${ipdRequest.admissionId}`)
      }
      if (ipdRequest.emergencyVisitId) {
        revalidatePath(`/dashboard/clinical/emergency/patient/${ipdRequest.emergencyVisitId}`)
      }

      writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "LabResult", recordId: data.requestId, changes: {} })

      return {
        success: true,
        message: "IPD result saved successfully",
        requestId: data.requestId,
      }
    }

    // ==========================================
    // OPD path: update LabRequest (existing logic)
    // ==========================================
    const request = await prisma.labRequest.findUnique({
      where: { id: data.requestId },
      include: {
        patient: {
          include: { user: true },
        },
      },
    })

    if (!request) {
      return { success: false, message: "Lab request not found" }
    }

    if (request.status === "COMPLETED") {
      return { success: false, message: "This request has already been completed" }
    }

    const isBilledOrCollected =
      request.status === "SAMPLE_COLLECTED" ||
      request.status === "PAID_PENDING_SAMPLE" ||
      (request.status === "PENDING_PAYMENT" && !!request.billingId)

    if (!isBilledOrCollected) {
      return {
        success: false,
        message: `Cannot enter results for request with status: ${request.status}`,
      }
    }

    await prisma.labRequest.update({
      where: { id: data.requestId },
      data: {
        reportContent: data.reportContent.trim(),
        impression: data.impression?.trim() || null,
        parameterResults: data.parameterResults ?? undefined,
        performedBy: data.performedBy || null,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    })

    console.log("[SUCCESS] OPD lab result saved:", data.requestId)

    // Notify doctor about completed lab result
    await createMultiRoleNotification({
      title: "Lab Result Ready",
      message: `${request.testName} result is ready for ${request.patient.user?.name || "patient"}.`,
      type: "SUCCESS",
      module: "LAB",
      link: `/dashboard/lab/print/${data.requestId}`,
      referenceId: data.requestId,
      targetRoles: ["DOCTOR", "SUPER_ADMIN"],
    })

    revalidatePath("/dashboard/laboratory")
    revalidatePath("/dashboard/lab/queue")
    revalidatePath("/dashboard/lab/reports")
    revalidatePath("/dashboard/lab/pathology/queue")
    revalidatePath("/dashboard/lab/radiology/queue")
    revalidatePath("/dashboard/radiology/queue")
    revalidatePath("/dashboard/radiology/reports")
    revalidatePath(`/dashboard/lab/entry/${data.requestId}`)
    revalidatePath(`/dashboard/lab/print/${data.requestId}`)
    revalidatePath(`/dashboard/radiology/print/${data.requestId}`)

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "IPDLabResult", recordId: data.requestId, changes: {} })

    return {
      success: true,
      message: "Result saved successfully",
      requestId: data.requestId,
    }
  } catch (error: unknown) {
    console.error("[ERROR] saveLabResult:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save result",
    }
  }
}

/**
 * Get lab request details for result entry
 */
export async function getLabRequestForEntry(requestId: string) {
  await requireAuth()
  try {
    // Use raw SQL to ensure we get all fields including newly added ones
    const results = await prisma.$queryRaw<LabRequestRawRow[]>`
      SELECT 
        lr.*,
        p.id as "patient_id",
        p."patientId" as "patient_patientId",
        p."dateOfBirth" as "patient_dateOfBirth",
        p.gender as "patient_gender",
        u.name as "patient_name",
        u.email as "patient_email",
        p.phone as "patient_phone",
        doc_u.name as "doctor_name",
        d."specialization" as "doctor_specialization"
      FROM lab_requests lr
      LEFT JOIN patients p ON lr."patientId" = p.id
      LEFT JOIN users u ON p."userId" = u.id
      LEFT JOIN appointments a ON lr."appointmentId" = a.id
      LEFT JOIN doctors d ON a."doctorId" = d.id
      LEFT JOIN users doc_u ON d."userId" = doc_u.id
      WHERE lr.id = ${requestId}
    `

    if (!results || results.length === 0) {
      return {
        success: false,
        message: "Lab request not found",
      }
    }

    const row = results[0]
    
    // Transform raw result to expected structure
    const request = {
      id: row.id,
      testName: row.testName,
      testPrice: row.testPrice,
      testType: row.testType,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      reportContent: row.reportContent,
      impression: row.impression,
      completedAt: row.completedAt,
      performedBy: row.performedBy,
      createdAt: row.createdAt,
      patient: {
        id: row.patient_id,
        patientId: row.patient_patientId,
        dateOfBirth: row.patient_dateOfBirth,
        gender: row.patient_gender,
        user: {
          name: row.patient_name,
          email: row.patient_email,
          phone: row.patient_phone,
        },
      },
      appointment: row.doctor_name ? {
        doctor: {
          specialization: row.doctor_specialization,
          user: {
            name: row.doctor_name,
          },
        },
      } : null,
    }

    return {
      success: true,
      data: request,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getLabRequestForEntry:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch lab request",
    }
  }
}

/**
 * Get completed lab request for printing
 */
export async function getLabRequestForPrint(requestId: string) {
  await requireAuth()
  try {
    // Use raw SQL to ensure we get all fields including newly added ones
    const results = await prisma.$queryRaw<LabRequestRawRow[]>`
      SELECT 
        lr.*,
        p.id as "patient_id",
        p."patientId" as "patient_patientId",
        p."dateOfBirth" as "patient_dateOfBirth",
        p.gender as "patient_gender",
        p."bloodGroup" as "patient_bloodGroup",
        u.name as "patient_name",
        u.email as "patient_email",
        p.phone as "patient_phone",
        doc_u.name as "doctor_name",
        d."specialization" as "doctor_specialization"
      FROM lab_requests lr
      LEFT JOIN patients p ON lr."patientId" = p.id
      LEFT JOIN users u ON p."userId" = u.id
      LEFT JOIN appointments a ON lr."appointmentId" = a.id
      LEFT JOIN doctors d ON a."doctorId" = d.id
      LEFT JOIN users doc_u ON d."userId" = doc_u.id
      WHERE lr.id = ${requestId}
    `

    if (!results || results.length === 0) {
      return {
        success: false,
        message: "Lab request not found",
      }
    }

    const row = results[0]
    
    // Transform raw result to expected structure
    const request = {
      id: row.id,
      testName: row.testName,
      testPrice: row.testPrice,
      testType: row.testType,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      reportContent: row.reportContent,
      impression: row.impression,
      completedAt: row.completedAt,
      performedBy: row.performedBy,
      createdAt: row.createdAt,
      patient: {
        id: row.patient_id,
        patientId: row.patient_patientId,
        dateOfBirth: row.patient_dateOfBirth,
        gender: row.patient_gender,
        bloodGroup: row.patient_bloodGroup,
        user: {
          name: row.patient_name,
          email: row.patient_email,
          phone: row.patient_phone,
        },
      },
      appointment: row.doctor_name ? {
        doctor: {
          specialization: row.doctor_specialization,
          user: {
            name: row.doctor_name,
          },
        },
      } : null,
    }

    return {
      success: true,
      data: request,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getLabRequestForPrint:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch lab request",
    }
  }
}
