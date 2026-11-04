"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getSurgeryStaff(surgeryId: string) {
  try {
    const staff = await prisma.surgeryStaffAssignment.findMany({
      where: { surgeryId },
      include: {
        staff: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' }
    })
    return { success: true, staff }
  } catch (error: any) {
    console.error("Error fetching surgery staff:", error)
    return { success: false, error: error.message }
  }
}

export async function addSurgeryStaff(surgeryId: string, data: { staffId: string, role: string, paymentAmount: number }) {
  try {
    // Verify assignment doesn't already exist for this role
    const existing = await prisma.surgeryStaffAssignment.findFirst({
      where: { surgeryId, staffId: data.staffId, role: data.role }
    })
    
    if (existing) {
      return { success: false, error: "Staff member is already assigned to this role." }
    }

    const assignment = await prisma.surgeryStaffAssignment.create({
      data: {
        surgeryId,
        staffId: data.staffId,
        role: data.role,
        paymentAmount: data.paymentAmount
      },
      include: {
        staff: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      }
    })

    revalidatePath(`/dashboard/ot/schedule`)
    return { success: true, assignment }
  } catch (error: any) {
    console.error("Error adding surgery staff:", error)
    return { success: false, error: error.message }
  }
}

export async function updateSurgeryStaff(assignmentId: string, data: { role?: string, paymentAmount?: number, status?: string }) {
  try {
    const assignment = await prisma.surgeryStaffAssignment.update({
      where: { id: assignmentId },
      data,
      include: {
        staff: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      }
    })

    revalidatePath(`/dashboard/ot/schedule`)
    return { success: true, assignment }
  } catch (error: any) {
    console.error("Error updating surgery staff:", error)
    return { success: false, error: error.message }
  }
}

export async function removeSurgeryStaff(assignmentId: string) {
  try {
    await prisma.surgeryStaffAssignment.delete({
      where: { id: assignmentId }
    })

    revalidatePath(`/dashboard/ot/schedule`)
    return { success: true }
  } catch (error: any) {
    console.error("Error removing surgery staff:", error)
    return { success: false, error: error.message }
  }
}

export async function getAvailableStaff() {
  try {
    const staff = await prisma.staff.findMany({
      include: {
        user: { select: { name: true } }
      },
      orderBy: { user: { name: 'asc' } }
    })
    return { success: true, staff }
  } catch (error: any) {
    console.error("Error fetching available staff:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Fetch the charge breakdown for a surgery — either from the procedure template
 * or from the surgery record's chargeBreakdown JSON.
 * Returns a map of chargeType → amount for auto-filling team member payments.
 */
export async function getSurgeryChargeBreakdown(surgeryId: string) {
  try {
    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      select: {
        procedureTemplateId: true,
        chargeBreakdown: true,
      }
    })
    if (!surgery) return { success: false, error: "Surgery not found" }

    let charges: { chargeType: string; chargeLabel: string; amount: number; requiresAssignment: boolean }[] = []

    // Priority 1: Fetch from the procedure template (live source of truth)
    if (surgery.procedureTemplateId) {
      const components = await prisma.surgeryChargeComponent.findMany({
        where: { procedureId: surgery.procedureTemplateId },
        orderBy: { sortOrder: "asc" },
      })
      charges = components.map(c => ({
        chargeType: c.chargeType,
        chargeLabel: c.chargeLabel,
        amount: c.amount,
        requiresAssignment: c.requiresAssignment,
      }))
    }

    // Fallback: Use the surgery's stored chargeBreakdown JSON
    if (charges.length === 0 && surgery.chargeBreakdown && Array.isArray(surgery.chargeBreakdown)) {
      charges = (surgery.chargeBreakdown as any[]).map(c => ({
        chargeType: c.chargeType || "",
        chargeLabel: c.chargeLabel || "",
        amount: c.amount || 0,
        requiresAssignment: c.requiresAssignment ?? false,
      }))
    }

    return { success: true, charges }
  } catch (error: any) {
    console.error("Error fetching surgery charge breakdown:", error)
    return { success: false, error: error.message }
  }
}
