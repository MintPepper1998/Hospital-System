"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface PACAssessmentData {
  // Vitals
  height?: number
  weight?: number
  bmi?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  pulse?: number
  spo2?: number
  temperature?: number
  respiratoryRate?: number
  // ASA Classification
  asaClass?: string // "I" | "II" | "III" | "IV" | "V"
  isEmergencyASA?: boolean
  // Airway Assessment
  mallampatiClass?: string // "I" | "II" | "III" | "IV"
  mouthOpening?: number
  neckMobility?: string // "Normal" | "Limited" | "Fixed"
  thyromental?: number
  dentition?: string
  predictedDifficulty?: string // "Easy" | "Moderate" | "Difficult"
  // Medical History (system-by-system)
  cardiovascular?: { htn?: boolean; mi?: boolean; arrhythmia?: boolean; heartFailure?: boolean; notes?: string }
  respiratory?: { asthma?: boolean; copd?: boolean; sleepApnea?: boolean; recentURI?: boolean; notes?: string }
  neurological?: { seizures?: boolean; stroke?: boolean; neuropathy?: boolean; notes?: string }
  endocrine?: { diabetes?: boolean; thyroid?: boolean; notes?: string }
  hepatic?: { issues?: boolean; notes?: string }
  renal?: { issues?: boolean; notes?: string }
  hematologic?: { issues?: boolean; bleedingDisorder?: boolean; notes?: string }
  // Previous Anesthesia
  previousSurgeries?: string
  adverseReactions?: string
  difficultIntubationHistory?: boolean
  // Medications & Allergies
  currentMedications?: string
  drugAllergies?: string
  foodAllergies?: string
  // Investigations
  investigations?: {
    cbc?: string
    bloodGrouping?: string
    coagulation?: string
    bloodSugar?: string
    kidneyFunction?: string
    liverFunction?: string
    ecg?: string
    chestXray?: string
    other?: string
  }
  // Anesthesia Plan
  anesthesiaType?: string // "General" | "Spinal" | "Epidural" | "Local" | "MAC"
  specialPrecautions?: string
  preOpOrders?: string
  // Decision
  decision?: string // "FIT" | "UNFIT" | "CONDITIONAL"
  conditions?: string
  reviewNotes?: string
}

// ═══════════════════════════════════════════════════════════════════════
// 1. PAC CLEARANCE
// ═══════════════════════════════════════════════════════════════════════

export async function savePACAssessment(surgeryId: string, data: PACAssessmentData, isDraft: boolean = false) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId }, select: { id: true, status: true, pacStatus: true } })
    if (!surgery) return { success: false, message: "Surgery not found" }
    if (surgery.status === "CANCELLED") return { success: false, message: "Cannot update PAC for cancelled surgery" }

    // Determine PAC status
    let pacStatus: "PENDING" | "FIT" | "UNFIT" | "CONDITIONAL" = "PENDING"
    if (!isDraft && data.decision) {
      pacStatus = data.decision as any
    }

    const updateData: any = {
      pacAssessment: data,
      pacNotes: data.reviewNotes || null,
    }

    if (!isDraft && data.decision) {
      updateData.pacStatus = pacStatus
      updateData.pacCheckedBy = auth.session.userId
      updateData.pacCheckedAt = new Date()
    }

    await prisma.surgery.update({
      where: { id: surgeryId },
      data: updateData,
    })

    // Create IPD timeline event if completing PAC
    if (!isDraft && data.decision) {
      const surgeryFull = await prisma.surgery.findUnique({
        where: { id: surgeryId },
        select: { patientId: true, procedureName: true }
      })
      if (surgeryFull) {
        const activeAdmission = await prisma.iPDAdmission.findFirst({
          where: { patientId: surgeryFull.patientId, status: "ADMITTED" }
        })
        if (activeAdmission) {
          await prisma.patientTimelineEvent.create({
            data: {
              admissionId: activeAdmission.id,
              title: `PAC Clearance: ${pacStatus}`,
              description: `Pre-Anesthetic Assessment completed for ${surgeryFull.procedureName}. Status: ${pacStatus}${data.conditions ? `. Conditions: ${data.conditions}` : ""}`,
              type: "GENERAL",
            }
          })
        }
      }
    }

    writeAuditLog({
      userId: auth.session.userId,
      action: isDraft ? "UPDATE" : "CREATE",
      module: "PACAssessment",
      changes: { surgeryId, status: isDraft ? "DRAFT" : pacStatus },
    })

    revalidatePath("/dashboard/ot/schedule")
    revalidatePath(`/dashboard/ot/pac/${surgeryId}`)
    return { success: true, message: isDraft ? "Draft saved" : `PAC marked as ${pacStatus}` }
  } catch (error: any) {
    console.error("[ERROR] savePACAssessment:", error)
    return { success: false, message: error.message || "Failed to save PAC assessment" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 2. SURGERY STARTED (WHO Sign-In + Time-Out)
// ═══════════════════════════════════════════════════════════════════════

export interface WHOSignInData {
  patientIdentityConfirmed: boolean
  surgicalSiteMarked: boolean
  procedureConfirmed: boolean
  consentSigned: boolean
  pulseOximeterAttached: boolean
  knownAllergiesReviewed: boolean
  airwayRiskAssessed: boolean
  bloodLossRisk: string // "Low" | "High"
  ivAccessEstablished: boolean
}

export interface WHOTimeOutData {
  teamIntroduced: boolean
  patientNameProcedureSite: boolean
  antibioticGiven: boolean
  antibioticTime?: string
  essentialImagingDisplayed: boolean
  criticalEventsSurgeon?: string
  criticalEventsAnesthesia?: string
  criticalEventsNursing?: string
  sterilityConcerns: boolean
}

export async function startSurgery(surgeryId: string, signIn: WHOSignInData, timeOut: WHOTimeOutData) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      select: { id: true, status: true, pacStatus: true, patientId: true, procedureName: true }
    })
    if (!surgery) return { success: false, message: "Surgery not found" }

    // Gating: PAC must be cleared
    if (surgery.pacStatus !== "FIT" && surgery.pacStatus !== "CONDITIONAL") {
      return { success: false, message: "PAC clearance required before starting surgery. Current PAC status: " + surgery.pacStatus }
    }
    if (surgery.status !== "SCHEDULED") {
      return { success: false, message: `Surgery is already ${surgery.status}. Cannot start again.` }
    }

    // Validate all Sign-In checklist items are checked
    const signInChecks = [
      signIn.patientIdentityConfirmed, signIn.surgicalSiteMarked, signIn.procedureConfirmed,
      signIn.consentSigned, signIn.pulseOximeterAttached, signIn.knownAllergiesReviewed,
      signIn.airwayRiskAssessed, signIn.ivAccessEstablished,
    ]
    if (signInChecks.some(c => !c)) {
      return { success: false, message: "All WHO Sign-In checklist items must be verified before starting surgery" }
    }

    // Validate all Time-Out checklist items are checked
    const timeOutChecks = [
      timeOut.teamIntroduced, timeOut.patientNameProcedureSite,
      timeOut.antibioticGiven, timeOut.essentialImagingDisplayed, timeOut.sterilityConcerns,
    ]
    if (timeOutChecks.some(c => !c)) {
      return { success: false, message: "All WHO Time-Out checklist items must be verified before starting surgery" }
    }

    await prisma.surgery.update({
      where: { id: surgeryId },
      data: {
        whoSignIn: signIn as any,
        whoTimeOut: timeOut as any,
        actualStartTime: new Date(),
        status: "IN_PROGRESS",
        surgeryStartedBy: auth.session.userId,
      }
    })

    // IPD timeline event
    const activeAdmission = await prisma.iPDAdmission.findFirst({
      where: { patientId: surgery.patientId, status: "ADMITTED" }
    })
    if (activeAdmission) {
      await prisma.patientTimelineEvent.create({
        data: {
          admissionId: activeAdmission.id,
          title: "Surgery Started",
          description: `${surgery.procedureName} has begun. Patient entered OT.`,
          type: "GENERAL",
        }
      })
    }

    writeAuditLog({
      userId: auth.session.userId,
      action: "UPDATE",
      module: "Surgery",
      changes: { surgeryId, action: "STARTED", status: "IN_PROGRESS" },
    })

    revalidatePath("/dashboard/ot/schedule")
    return { success: true, message: "Surgery has been started successfully" }
  } catch (error: any) {
    console.error("[ERROR] startSurgery:", error)
    return { success: false, message: error.message || "Failed to start surgery" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 3. SURGERY COMPLETED (WHO Sign-Out + Post-Op)
// ═══════════════════════════════════════════════════════════════════════

export interface WHOSignOutData {
  procedureRecorded: boolean
  instrumentCountCorrect: boolean
  specimenLabeled: boolean
  specimenDetails?: string
  equipmentIssues?: string
  recoveryPlan?: string
}

export interface PostOpData {
  findings?: string
  procedurePerformed?: string
  complications?: string
  estimatedBloodLoss?: number
  bloodProductsUsed?: string
  drainInserted?: boolean
  drainDetails?: string
  sutureType?: string
  postOpInstructions?: string
  nextReview?: string
}

export async function completeSurgery(
  surgeryId: string,
  signOut: WHOSignOutData,
  postOp: PostOpData
) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      select: { id: true, status: true, patientId: true, procedureName: true }
    })
    if (!surgery) return { success: false, message: "Surgery not found" }

    // Gating: Must be IN_PROGRESS
    if (surgery.status !== "IN_PROGRESS") {
      return { success: false, message: `Surgery must be in progress to complete. Current status: ${surgery.status}` }
    }

    // Validate mandatory Sign-Out items
    if (!signOut.procedureRecorded || !signOut.instrumentCountCorrect) {
      return { success: false, message: "Procedure recording and instrument count verification are mandatory" }
    }

    await prisma.surgery.update({
      where: { id: surgeryId },
      data: {
        whoSignOut: signOut as any,
        postOpNotes: postOp as any,
        findings: postOp.findings || null,
        complications: postOp.complications || null,
        bloodLoss: postOp.estimatedBloodLoss ? String(postOp.estimatedBloodLoss) : null,
        specimenDetails: signOut.specimenDetails || null,
        spongeCountVerified: signOut.instrumentCountCorrect,
        instrumentCountVerified: signOut.instrumentCountCorrect,
        actualEndTime: new Date(),
        status: "COMPLETED",
        surgeryCompletedBy: auth.session.userId,
      }
    })

    // IPD timeline event
    const activeAdmission = await prisma.iPDAdmission.findFirst({
      where: { patientId: surgery.patientId, status: "ADMITTED" }
    })
    if (activeAdmission) {
      await prisma.patientTimelineEvent.create({
        data: {
          admissionId: activeAdmission.id,
          title: "Surgery Completed",
          description: `${surgery.procedureName} completed successfully. Patient shifted to recovery.${postOp.complications ? ` Complications: ${postOp.complications}` : ""}`,
          type: "GENERAL",
        }
      })
    }

    writeAuditLog({
      userId: auth.session.userId,
      action: "UPDATE",
      module: "Surgery",
      changes: { surgeryId, action: "COMPLETED", status: "COMPLETED", bloodLoss: postOp.estimatedBloodLoss },
    })

    revalidatePath("/dashboard/ot/schedule")
    return { success: true, message: "Surgery completed successfully" }
  } catch (error: any) {
    console.error("[ERROR] completeSurgery:", error)
    return { success: false, message: error.message || "Failed to complete surgery" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Get PAC data for a surgery
// ═══════════════════════════════════════════════════════════════════════

export async function getPACAssessment(surgeryId: string) {
  try {
    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      select: {
        id: true,
        pacAssessment: true,
        pacStatus: true,
        pacNotes: true,
        pacCheckedBy: true,
        pacCheckedAt: true,
        status: true,
        procedureName: true,
        patient: { include: { user: true } },
        leadSurgeon: { include: { user: true } },
      }
    })
    if (!surgery) return { success: false, error: "Surgery not found" }
    return { success: true, surgery }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getSurgeryForWorkflow(surgeryId: string) {
  try {
    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      include: {
        patient: { include: { user: true } },
        leadSurgeon: { include: { user: true } },
        theater: true,
        staffAssignments: { include: { staff: { include: { user: true } } } },
      }
    })
    if (!surgery) return { success: false, error: "Surgery not found" }
    return { success: true, surgery }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
