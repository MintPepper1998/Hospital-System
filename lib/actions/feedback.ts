"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { FeedbackType, FeedbackStatus } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit"

// Create new feedback (Patient only)
export async function submitFeedback(data: {
  type: FeedbackType
  subject: string
  message: string
}) {
  const session = await requireAuth(["PATIENT"])

  const patient = await prisma.patient.findUnique({
    where: { userId: session.userId }
  })

  if (!patient) {
    throw new Error("Patient profile not found")
  }

  const feedback = await prisma.patientFeedback.create({
    data: {
      patientId: patient.id,
      type: data.type,
      subject: data.subject,
      message: data.message,
    }
  })

  revalidatePath("/dashboard/patient-portal/feedback")
  return feedback
}

// Get all feedback for a patient
export async function getPatientFeedback() {
  const session = await requireAuth(["PATIENT"])

  const patient = await prisma.patient.findUnique({
    where: { userId: session.userId }
  })

  if (!patient) {
    throw new Error("Patient profile not found")
  }

  return await prisma.patientFeedback.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" }
  })
}

// Get feedback for Admin/Reception dashboard (Staff only)
export async function getStaffFeedback(params?: {
  status?: FeedbackStatus
  type?: FeedbackType
  limit?: number
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "RECEPTIONIST"])
  if (!authResult.ok) {
    // Optionally check if the user has the "FEEDBACK" permission
    const user = await prisma.user.findUnique({ where: { id: (await requireAuth()).userId } })
    if (!user?.permissions.includes("FEEDBACK")) {
      throw new Error("Unauthorized to view feedback")
    }
  }

  const where: any = {}
  if (params?.status) where.status = params.status
  if (params?.type) where.type = params.type

  return await prisma.patientFeedback.findMany({
    where,
    include: {
      patient: {
        include: { user: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: params?.limit
  })
}

// Update feedback status (Staff only)
export async function updateFeedbackStatus(
  feedbackId: string, 
  status: FeedbackStatus, 
  resolveNote?: string
) {
  const session = await requireAuth()
  
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user?.permissions.includes("FEEDBACK") && !["SUPER_ADMIN", "RECEPTIONIST"].includes(user?.role || "")) {
    throw new Error("Unauthorized to manage feedback")
  }

  const feedback = await prisma.patientFeedback.update({
    where: { id: feedbackId },
    data: {
      status,
      resolvedBy: status === "RESOLVED" ? session.userId : undefined,
      resolveNote: resolveNote || undefined
    }
  })

  revalidatePath("/dashboard/feedback")
  return feedback
}
