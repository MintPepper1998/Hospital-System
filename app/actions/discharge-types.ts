"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// DEFAULT DISCHARGE TYPES (seed on first load)
// ============================================

const DEFAULT_DISCHARGE_TYPES = [
  {
    code: "NORMAL",
    label: "Normal Discharge",
    description: "Patient is clinically stable and cleared for discharge by the treating physician.",
    displayOrder: 1,
    headerNote: "",
    footerNote: "Patient discharged in stable condition. Follow-up as advised.",
    requiresWitness: false,
    requiresPolice: false,
    showBilling: true,
    autoReleaseBed: true,
    templateSections: [
      { sectionKey: "finalDiagnosis", sectionLabel: "DISEASE / FINAL DIAGNOSIS", placeholder: "e.g., Pneumonia with pleural effusion, resolved", required: true },
      { sectionKey: "treatmentGiven", sectionLabel: "TREATMENT GIVEN", placeholder: "Treatment given during stay, investigations performed...", required: true },
      { sectionKey: "treatmentOnDischarge", sectionLabel: "TREATMENT ON DISCHARGE", placeholder: "Take-home treatment, medications prescribed...", required: false },
      { sectionKey: "adviceOnDischarge", sectionLabel: "ADVICE ON DISCHARGE", placeholder: "Diet, rest, follow-up instructions...", required: true },
      { sectionKey: "conditionAtDischarge", sectionLabel: "CONDITION AT DISCHARGE", placeholder: "Patient condition, vitals stable...", required: false },
      { sectionKey: "courseInHospital", sectionLabel: "COURSE IN HOSPITAL", placeholder: "Clinical course during admission...", required: false },
    ],
  },
  {
    code: "LAMA",
    label: "LAMA (Left Against Medical Advice)",
    description: "Patient is leaving the hospital against the treating doctor's advice. Requires witness signature.",
    displayOrder: 2,
    headerNote: "DISCHARGE AGAINST MEDICAL ADVICE",
    footerNote: "I, the undersigned, hereby declare that I am leaving the hospital against the medical advice of the treating physician. I understand the risks involved and take full responsibility for any consequences. The hospital and its staff are absolved of any liability arising from this decision.",
    requiresWitness: true,
    requiresPolice: false,
    showBilling: true,
    autoReleaseBed: true,
    templateSections: [
      { sectionKey: "finalDiagnosis", sectionLabel: "Provisional Diagnosis", placeholder: "Current diagnosis at time of leaving", required: true },
      { sectionKey: "courseInHospital", sectionLabel: "Treatment Given So Far", placeholder: "Treatment administered before patient decided to leave...", required: true },
      { sectionKey: "conditionAtDischarge", sectionLabel: "Condition at Time of Leaving", placeholder: "Patient's condition when they chose to leave...", required: true },
      { sectionKey: "reasonForLAMA", sectionLabel: "Reason for LAMA", placeholder: "Patient's stated reason for leaving against advice...", required: true },
      { sectionKey: "adviceOnDischarge", sectionLabel: "Advice Given to Patient", placeholder: "Risks explained, medications advised...", required: true },
      { sectionKey: "witnessName", sectionLabel: "Witness Name & Relation", placeholder: "Name and relationship of witness", required: true },
    ],
  },
  {
    code: "DAMA",
    label: "DAMA (Discharge Against Medical Advice)",
    description: "Formal discharge against medical advice, initiated by the patient or their family.",
    displayOrder: 3,
    headerNote: "DISCHARGE AGAINST MEDICAL ADVICE (DAMA)",
    footerNote: "This is to certify that the patient/attendant has requested discharge against medical advice. All risks have been explained. The hospital bears no responsibility for any adverse outcome.",
    requiresWitness: true,
    requiresPolice: false,
    showBilling: true,
    autoReleaseBed: true,
    templateSections: [
      { sectionKey: "finalDiagnosis", sectionLabel: "Provisional Diagnosis", placeholder: "Current diagnosis", required: true },
      { sectionKey: "courseInHospital", sectionLabel: "Treatment Given", placeholder: "Treatment administered...", required: true },
      { sectionKey: "conditionAtDischarge", sectionLabel: "Condition at Discharge", placeholder: "Patient's condition...", required: true },
      { sectionKey: "reasonForDAMA", sectionLabel: "Reason for DAMA", placeholder: "Reason stated by patient/family...", required: true },
      { sectionKey: "adviceOnDischarge", sectionLabel: "Advice Given", placeholder: "Risks explained, advice given...", required: true },
      { sectionKey: "witnessName", sectionLabel: "Witness Name & Relation", placeholder: "Name and relationship", required: true },
    ],
  },
  {
    code: "ABSCONDED",
    label: "Absconded",
    description: "Patient left the hospital without informing the staff. May require police notification.",
    displayOrder: 4,
    headerNote: "PATIENT ABSCONDED — MEDICO-LEGAL NOTE",
    footerNote: "The patient left the hospital premises without informing the medical or nursing staff. The concerned authorities have been notified as per hospital protocol.",
    requiresWitness: false,
    requiresPolice: true,
    showBilling: false,
    autoReleaseBed: true,
    templateSections: [
      { sectionKey: "finalDiagnosis", sectionLabel: "Diagnosis at Time of Absconding", placeholder: "Current diagnosis", required: true },
      { sectionKey: "courseInHospital", sectionLabel: "Treatment Given", placeholder: "Treatment provided before absconding...", required: true },
      { sectionKey: "lastSeenDetails", sectionLabel: "Last Seen Details", placeholder: "Date, time, and location patient was last seen by staff...", required: true },
      { sectionKey: "conditionAtDischarge", sectionLabel: "Condition When Last Seen", placeholder: "Patient's condition at last assessment...", required: true },
      { sectionKey: "policeNotified", sectionLabel: "Police Notification Details", placeholder: "FIR number, station, officer name...", required: false },
    ],
  },
  {
    code: "DEATH",
    label: "Death",
    description: "Patient expired during hospital stay. Death certificate and MLC procedures apply.",
    displayOrder: 5,
    headerNote: "DEATH SUMMARY",
    footerNote: "The patient was declared dead at the above-mentioned time. Death certificate issued. Body handed over to the attendant/police as per protocol.",
    requiresWitness: true,
    requiresPolice: true,
    showBilling: true,
    autoReleaseBed: true,
    templateSections: [
      { sectionKey: "finalDiagnosis", sectionLabel: "Cause of Death", placeholder: "Primary and secondary causes of death...", required: true },
      { sectionKey: "courseInHospital", sectionLabel: "Course in Hospital", placeholder: "Treatment timeline and clinical events leading to death...", required: true },
      { sectionKey: "timeOfDeath", sectionLabel: "Date & Time of Death", placeholder: "Exact date and time of death declaration...", required: true },
      { sectionKey: "pronouncedBy", sectionLabel: "Death Pronounced By", placeholder: "Name and designation of doctor who pronounced death...", required: true },
      { sectionKey: "bodyHandover", sectionLabel: "Body Handover Details", placeholder: "Handed to family member/police, name, ID...", required: true },
      { sectionKey: "mlcDetails", sectionLabel: "MLC/Post-Mortem Details", placeholder: "MLC number, whether post-mortem required...", required: false },
    ],
  },
  {
    code: "REFERRED",
    label: "Referred to Another Hospital",
    description: "Patient is being referred/transferred to another hospital for higher care or specialized treatment.",
    displayOrder: 6,
    headerNote: "REFERRAL / TRANSFER SUMMARY",
    footerNote: "Patient transferred in stable/critical condition (as specified above). Referral letter attached.",
    requiresWitness: false,
    requiresPolice: false,
    showBilling: true,
    autoReleaseBed: true,
    templateSections: [
      { sectionKey: "finalDiagnosis", sectionLabel: "Diagnosis", placeholder: "Current diagnosis", required: true },
      { sectionKey: "courseInHospital", sectionLabel: "Treatment Given", placeholder: "Treatment provided here...", required: true },
      { sectionKey: "conditionAtDischarge", sectionLabel: "Condition at Transfer", placeholder: "Vitals, consciousness level...", required: true },
      { sectionKey: "reasonForReferral", sectionLabel: "Reason for Referral", placeholder: "Why patient needs transfer (higher care, specialized equipment, etc.)...", required: true },
      { sectionKey: "referredToHospital", sectionLabel: "Referred To", placeholder: "Hospital name, department, doctor name...", required: true },
      { sectionKey: "adviceOnDischarge", sectionLabel: "Advice & Medications During Transfer", placeholder: "Medications given, monitoring instructions...", required: true },
    ],
  },
  {
    code: "TRANSFER",
    label: "Inter-Department Transfer",
    description: "Patient transferred to a different department or ward within the same hospital.",
    displayOrder: 7,
    headerNote: "INTER-DEPARTMENT TRANSFER NOTE",
    footerNote: "",
    requiresWitness: false,
    requiresPolice: false,
    showBilling: false,
    autoReleaseBed: true,
    templateSections: [
      { sectionKey: "finalDiagnosis", sectionLabel: "Diagnosis", placeholder: "Current diagnosis", required: true },
      { sectionKey: "courseInHospital", sectionLabel: "Course in Current Ward", placeholder: "Treatment provided in current ward...", required: true },
      { sectionKey: "conditionAtDischarge", sectionLabel: "Condition at Transfer", placeholder: "Patient's condition at time of transfer...", required: true },
      { sectionKey: "transferReason", sectionLabel: "Reason for Transfer", placeholder: "Reason for moving to new department/ward...", required: true },
      { sectionKey: "transferTo", sectionLabel: "Transfer To (Ward/Dept)", placeholder: "Target ward or department...", required: true },
    ],
  },
]

// ============================================
// SEED DEFAULT TYPES (idempotent)
// ============================================

export async function seedDischargeTypes() {
  const count = await prisma.dischargeTypeConfig.count()
  if (count > 0) return

  for (const dt of DEFAULT_DISCHARGE_TYPES) {
    await prisma.dischargeTypeConfig.create({ data: dt })
  }
}

// ============================================
// GET ALL DISCHARGE TYPE CONFIGS
// ============================================

export async function getDischargeTypeConfigs() {
  // Auto-seed on first access
  await seedDischargeTypes()

  return prisma.dischargeTypeConfig.findMany({
    orderBy: { displayOrder: "asc" },
  })
}

// ============================================
// GET ACTIVE DISCHARGE TYPES (for form dropdowns)
// ============================================

export async function getActiveDischargeTypes() {
  await seedDischargeTypes()

  return prisma.dischargeTypeConfig.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  })
}

// ============================================
// GET SINGLE DISCHARGE TYPE CONFIG
// ============================================

export async function getDischargeTypeConfig(id: string) {
  return prisma.dischargeTypeConfig.findUnique({ where: { id } })
}

// ============================================
// CREATE DISCHARGE TYPE
// ============================================

export async function createDischargeType(data: {
  code: string
  label: string
  description?: string
  headerNote?: string
  footerNote?: string
  requiresWitness?: boolean
  requiresPolice?: boolean
  showBilling?: boolean
  autoReleaseBed?: boolean
  templateSections?: any[]
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.code || !data.label) {
      return { success: false, message: "Code and Label are required." }
    }

    // Check unique code
    const existing = await prisma.dischargeTypeConfig.findUnique({ where: { code: data.code.toUpperCase() } })
    if (existing) return { success: false, message: `A discharge type with code "${data.code}" already exists.` }

    // Get next display order
    const maxOrder = await prisma.dischargeTypeConfig.aggregate({ _max: { displayOrder: true } })
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1

    const created = await prisma.dischargeTypeConfig.create({
      data: {
        code: data.code.toUpperCase().replace(/\s+/g, "_"),
        label: data.label,
        description: data.description || null,
        headerNote: data.headerNote || null,
        footerNote: data.footerNote || null,
        requiresWitness: data.requiresWitness ?? false,
        requiresPolice: data.requiresPolice ?? false,
        showBilling: data.showBilling ?? true,
        autoReleaseBed: data.autoReleaseBed ?? true,
        templateSections: data.templateSections || [],
        displayOrder: nextOrder,
      },
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "DischargeTypeConfig",
      recordId: created.id,
      changes: { code: created.code, label: created.label },
    })

    revalidatePath("/dashboard/admin/discharge-types")
    return { success: true, message: `Discharge type "${created.label}" created.` }
  } catch (error: any) {
    console.error("[ERROR] createDischargeType:", error)
    return { success: false, message: error.message || "Failed to create discharge type." }
  }
}

// ============================================
// UPDATE DISCHARGE TYPE
// ============================================

export async function updateDischargeType(
  id: string,
  data: {
    label?: string
    description?: string
    headerNote?: string
    footerNote?: string
    requiresWitness?: boolean
    requiresPolice?: boolean
    showBilling?: boolean
    autoReleaseBed?: boolean
    templateSections?: any[]
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const updated = await prisma.dischargeTypeConfig.update({
      where: { id },
      data: {
        label: data.label,
        description: data.description,
        headerNote: data.headerNote,
        footerNote: data.footerNote,
        requiresWitness: data.requiresWitness,
        requiresPolice: data.requiresPolice,
        showBilling: data.showBilling,
        autoReleaseBed: data.autoReleaseBed,
        templateSections: data.templateSections,
      },
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "DischargeTypeConfig",
      recordId: updated.id,
      changes: { code: updated.code, label: updated.label },
    })

    revalidatePath("/dashboard/admin/discharge-types")
    return { success: true, message: `Discharge type "${updated.label}" updated.` }
  } catch (error: any) {
    console.error("[ERROR] updateDischargeType:", error)
    return { success: false, message: error.message || "Failed to update." }
  }
}

// ============================================
// TOGGLE ACTIVE STATUS
// ============================================

export async function toggleDischargeTypeActive(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const current = await prisma.dischargeTypeConfig.findUnique({ where: { id } })
    if (!current) return { success: false, message: "Not found." }

    const updated = await prisma.dischargeTypeConfig.update({
      where: { id },
      data: { isActive: !current.isActive },
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "DischargeTypeConfig",
      recordId: updated.id,
      changes: { code: updated.code, isActive: updated.isActive },
    })

    revalidatePath("/dashboard/admin/discharge-types")
    return { success: true, message: `"${updated.label}" is now ${updated.isActive ? "active" : "inactive"}.` }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to toggle." }
  }
}

// ============================================
// DELETE DISCHARGE TYPE
// ============================================

export async function deleteDischargeType(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const dt = await prisma.dischargeTypeConfig.findUnique({ where: { id } })
    if (!dt) return { success: false, message: "Not found." }

    // Prevent deleting core types
    const coreCodes = ["NORMAL", "LAMA", "DEATH"]
    if (coreCodes.includes(dt.code)) {
      return { success: false, message: `"${dt.label}" is a core type and cannot be deleted. You can deactivate it instead.` }
    }

    await prisma.dischargeTypeConfig.delete({ where: { id } })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "DischargeTypeConfig",
      recordId: id,
      changes: { code: dt.code, label: dt.label },
    })

    revalidatePath("/dashboard/admin/discharge-types")
    return { success: true, message: `"${dt.label}" deleted.` }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete." }
  }
}

// ============================================
// REORDER DISCHARGE TYPES
// ============================================

export async function reorderDischargeTypes(orderedIds: string[]) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.dischargeTypeConfig.update({
          where: { id },
          data: { displayOrder: index + 1 },
        })
      )
    )

    revalidatePath("/dashboard/admin/discharge-types")
    return { success: true, message: "Order updated." }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to reorder." }
  }
}
