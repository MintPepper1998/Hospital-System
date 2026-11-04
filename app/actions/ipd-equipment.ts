"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createMultiRoleNotification } from "@/lib/create-notification"
import { auth } from "@/auth"
import { writeAuditLog } from "@/lib/audit"

// ═══════════════════════════════════════════════
// ADMIN: CRUD for Equipment Master List
// ═══════════════════════════════════════════════

export async function getEquipmentItems() {
  try {
    const items = await prisma.iPDEquipmentItem.findMany({
      orderBy: [{ isActive: "desc" }, { category: "asc" }, { name: "asc" }],
      include: { _count: { select: { usages: true } } },
    })
    return { success: true, data: items }
  } catch (error: any) {
    console.error("[ERROR] getEquipmentItems:", error.message)
    return { success: false, message: "Failed to fetch equipment" }
  }
}

export async function getActiveEquipmentItems() {
  try {
    const items = await prisma.iPDEquipmentItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })
    return { success: true, data: items }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function getEquipmentStats() {
  try {
    const [total, active, categories] = await Promise.all([
      prisma.iPDEquipmentItem.count(),
      prisma.iPDEquipmentItem.count({ where: { isActive: true } }),
      prisma.iPDEquipmentItem.findMany({
        select: { category: true },
        distinct: ["category"],
        where: { category: { not: null } },
      }),
    ])
    return {
      success: true,
      data: { total, active, inactive: total - active, categories: categories.length },
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function createEquipmentItem(data: {
  name: string
  code?: string
  category?: string
  description?: string
  chargeType: string
  ratePerUnit: number
  depositAmount?: number
}) {
  try {
    const item = await prisma.iPDEquipmentItem.create({
      data: {
        name: data.name,
        code: data.code || null,
        category: data.category || null,
        description: data.description || null,
        chargeType: data.chargeType,
        ratePerUnit: data.ratePerUnit,
        depositAmount: data.depositAmount || 0,
      },
    })
    revalidatePath("/dashboard/admin/ipd-equipment")
    writeAuditLog({ userId: "system", action: "CREATE", module: "Equipment", recordId: item.id, changes: { name: data.name, chargeType: data.chargeType, ratePerUnit: data.ratePerUnit } })
    return { success: true, data: item }
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, message: "Equipment code already exists" }
    }
    return { success: false, message: error.message }
  }
}

export async function updateEquipmentItem(
  id: string,
  data: {
    name: string
    code?: string
    category?: string
    description?: string
    chargeType: string
    ratePerUnit: number
    depositAmount?: number
  }
) {
  try {
    const item = await prisma.iPDEquipmentItem.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code || null,
        category: data.category || null,
        description: data.description || null,
        chargeType: data.chargeType,
        ratePerUnit: data.ratePerUnit,
        depositAmount: data.depositAmount || 0,
      },
    })
    revalidatePath("/dashboard/admin/ipd-equipment")
    writeAuditLog({ userId: "system", action: "UPDATE", module: "Equipment", recordId: id, changes: { name: data.name, chargeType: data.chargeType, ratePerUnit: data.ratePerUnit } })
    return { success: true, data: item }
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, message: "Equipment code already exists" }
    }
    return { success: false, message: error.message }
  }
}

export async function toggleEquipmentItem(id: string) {
  try {
    const item = await prisma.iPDEquipmentItem.findUnique({ where: { id } })
    if (!item) return { success: false, message: "Not found" }
    await prisma.iPDEquipmentItem.update({
      where: { id },
      data: { isActive: !item.isActive },
    })
    revalidatePath("/dashboard/admin/ipd-equipment")
    writeAuditLog({ userId: "system", action: "UPDATE", module: "Equipment", recordId: id, changes: { isActive: !item.isActive } })
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function deleteEquipmentItem(id: string) {
  try {
    // Check for active usages first
    const activeUsages = await prisma.iPDEquipmentUsage.count({
      where: { equipmentId: id, status: "ACTIVE" },
    })
    if (activeUsages > 0) {
      return { success: false, message: "Cannot delete: equipment is currently assigned to patients" }
    }
    await prisma.iPDEquipmentItem.delete({ where: { id } })
    revalidatePath("/dashboard/admin/ipd-equipment")
    writeAuditLog({ userId: "system", action: "DELETE", module: "Equipment", recordId: id, changes: {} })
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// ═══════════════════════════════════════════════
// NURSE: Assign / Return / Cancel Equipment
// ═══════════════════════════════════════════════

export async function assignEquipment(data: {
  admissionId?: string
  emergencyVisitId?: string
  equipmentId: string
  quantity?: number
  notes?: string
}) {
  try {
    if (!data.admissionId && !data.emergencyVisitId) return { success: false, message: "Either Admission ID or ER Visit ID is required" }

    const equipment = await prisma.iPDEquipmentItem.findUnique({
      where: { id: data.equipmentId },
    })
    if (!equipment) return { success: false, message: "Equipment not found" }
    if (!equipment.isActive) return { success: false, message: "Equipment is inactive" }

    const usage = await prisma.iPDEquipmentUsage.create({
      data: {
        admissionId: data.admissionId || null,
        emergencyVisitId: data.emergencyVisitId || null,
        equipmentId: data.equipmentId,
        quantity: data.quantity || 1,
        chargeType: equipment.chargeType,
        ratePerUnit: equipment.ratePerUnit,
        notes: data.notes || null,
        status: "ACTIVE",
      },
    })

    // Fetch admission/visit details for the notification message
    let patientName = "Unknown Patient"
    let bedInfo = ""
    let redirectLink = ""
    let referenceId = data.admissionId || data.emergencyVisitId || ""

    if (data.admissionId) {
      const admission = await prisma.iPDAdmission.findUnique({
        where: { id: data.admissionId },
        include: { patient: { include: { user: true } }, bed: { include: { ward: true } } },
      })
      if (admission) {
        patientName = admission.patient.user.name || "Unknown Patient"
        bedInfo = admission.bed ? `${admission.bed.ward.name} - ${admission.bed.bedNumber}` : ""
      }
      redirectLink = `/dashboard/ipd/patient/${data.admissionId}`
    } else if (data.emergencyVisitId) {
      const erVisit = await prisma.emergencyVisit.findUnique({
        where: { id: data.emergencyVisitId },
        include: { patient: { include: { user: true } }, bed: { include: { ward: true } } },
      })
      if (erVisit) {
        patientName = erVisit.patient?.user.name || "Unknown Patient"
        bedInfo = erVisit.bed ? `${erVisit.bed.ward.name} - ${erVisit.bed.bedNumber}` : ""
      }
      redirectLink = `/dashboard/clinical/emergency/patient/${data.emergencyVisitId}`
    }

    // Get current user info
    const session = await auth()
    const currentUser = session?.user?.email ? await prisma.user.findUnique({ where: { email: session.user.email } }) : null

    // Notify nurses and doctors
    await createMultiRoleNotification({
      title: "Equipment Assigned",
      message: `${equipment.name}${(data.quantity || 1) > 1 ? ` ×${data.quantity}` : ""} has been assigned to ${patientName} ${bedInfo ? `(${bedInfo})` : ""}. Rate: ₹${equipment.ratePerUnit}/${equipment.chargeType === "HOURLY" ? "hr" : "day"}.`,
      type: "INFO",
      module: "IPD",
      link: redirectLink,
      referenceId,
      targetRoles: ["NURSE", "DOCTOR", "SUPER_ADMIN"],
      createdById: currentUser?.id,
      createdByName: currentUser?.name || undefined,
    })

    revalidatePath(redirectLink)
    revalidatePath("/dashboard/billing-counter/ipd")
    revalidatePath("/dashboard/ipd/billing")
    revalidatePath("/dashboard/ipd/discharge")
    writeAuditLog({ userId: currentUser?.id || "system", action: "CREATE", module: "EquipmentAssignment", recordId: usage.id, changes: { equipment: equipment.name, patient: patientName, quantity: data.quantity } })
    return { success: true, data: usage }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

/**
 * Return equipment — calculates final charge based on elapsed time.
 */
export async function returnEquipment(usageId: string) {
  try {
    const usage = await prisma.iPDEquipmentUsage.findUnique({
      where: { id: usageId },
      include: { equipment: true },
    })
    if (!usage) return { success: false, message: "Usage record not found" }
    if (usage.status !== "ACTIVE") return { success: false, message: "Equipment is not currently active" }

    const endTime = new Date()
    const charge = computeCharge(usage.startTime, endTime, usage.chargeType, usage.ratePerUnit, usage.quantity)

    await prisma.iPDEquipmentUsage.update({
      where: { id: usageId },
      data: { endTime, computedCharge: charge, status: "RETURNED" },
    })

    // Notify accountants about the charge
    let patientName = "Unknown Patient"
    let redirectLink = ""
    if (usage.admissionId) {
      const admission = await prisma.iPDAdmission.findUnique({
        where: { id: usage.admissionId },
        include: { patient: { include: { user: true } } },
      })
      patientName = admission?.patient.user.name || "Unknown Patient"
      redirectLink = `/dashboard/ipd/patient/${usage.admissionId}`
    } else if (usage.emergencyVisitId) {
      const erVisit = await prisma.emergencyVisit.findUnique({
        where: { id: usage.emergencyVisitId },
        include: { patient: { include: { user: true } } },
      })
      patientName = erVisit?.patient?.user?.name || "Unknown Patient"
      redirectLink = `/dashboard/clinical/emergency/patient/${usage.emergencyVisitId}`
    }

    await createMultiRoleNotification({
      title: "Equipment Returned",
      message: `${usage.equipment.name} returned by ${patientName}. Charge: ₹${charge.toFixed(0)}.`,
      type: "SUCCESS",
      module: "IPD",
      link: redirectLink,
      referenceId: usage.admissionId || usage.emergencyVisitId || "",
      targetRoles: ["NURSE", "ACCOUNTANT", "SUPER_ADMIN"],
    })

    revalidatePath(redirectLink)
    revalidatePath("/dashboard/billing-counter/ipd")
    revalidatePath("/dashboard/ipd/billing")
    revalidatePath("/dashboard/ipd/discharge")
    writeAuditLog({ userId: "system", action: "PROCESS", module: "EquipmentReturn", recordId: usageId, changes: { equipment: usage.equipment.name, patient: patientName, charge } })
    return { success: true, charge }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function cancelEquipmentUsage(usageId: string) {
  try {
    const usage = await prisma.iPDEquipmentUsage.findUnique({ where: { id: usageId } })
    if (!usage) return { success: false, message: "Not found" }
    await prisma.iPDEquipmentUsage.update({
      where: { id: usageId },
      data: { status: "CANCELLED", computedCharge: 0, endTime: new Date() },
    })
    if (usage.admissionId) {
      revalidatePath(`/dashboard/ipd/patient/${usage.admissionId}`)
      revalidatePath("/dashboard/billing-counter/ipd")
      revalidatePath("/dashboard/ipd/billing")
      revalidatePath("/dashboard/ipd/discharge")
    }
    if (usage.emergencyVisitId) revalidatePath(`/dashboard/clinical/emergency/patient/${usage.emergencyVisitId}`)
    writeAuditLog({ userId: "system", action: "DELETE", module: "EquipmentUsage", recordId: usageId, changes: { status: "CANCELLED" } })
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function getEquipmentUsages(admissionId?: string, emergencyVisitId?: string) {
  try {
    if (!admissionId && !emergencyVisitId) return { success: false, message: "ID Required" }
    const usages = await prisma.iPDEquipmentUsage.findMany({
      where: admissionId ? { admissionId } : { emergencyVisitId },
      include: { equipment: true },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: usages }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function computeCharge(
  startTime: Date,
  endTime: Date,
  chargeType: string,
  ratePerUnit: number,
  quantity: number
): number {
  const ms = endTime.getTime() - startTime.getTime()
  if (ms <= 0) return 0

  if (chargeType === "HOURLY") {
    const hours = Math.ceil(ms / (1000 * 60 * 60))
    return hours * ratePerUnit * quantity
  } else {
    // PER_DAY and custom types — minimum 1 day
    const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
    return days * ratePerUnit * quantity
  }
}
