"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"

/**
 * Get all staff with their RFID tag assignment status
 */
export async function getStaffRfidList() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error, data: [] }

  try {
    const staff = await prisma.staff.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { employeeId: "asc" },
    })

    const data = staff.map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      name: s.user?.name || "Unknown",
      department: s.department || "General",
      rfidTag: s.rfidTag,
    }))

    return { success: true, data }
  } catch (error: any) {
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Assign an RFID card UID to a staff member
 */
export async function assignRfidCard(staffId: string, rfidTag: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!staffId || !rfidTag) {
      return { success: false, message: "Staff ID and RFID tag are required" }
    }

    // Check if this RFID tag is already assigned to someone else
    const existing = await prisma.staff.findUnique({ where: { rfidTag } })
    if (existing && existing.id !== staffId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: existing.userId },
        select: { name: true },
      })
      return {
        success: false,
        message: `This card is already assigned to ${existingUser?.name || "another staff member"}`,
      }
    }

    await prisma.staff.update({
      where: { id: staffId },
      data: { rfidTag },
    })

    revalidatePath("/dashboard/hr/rfid-cards")
    return { success: true, message: "RFID card assigned successfully" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

/**
 * Remove RFID card from a staff member
 */
export async function removeRfidCard(staffId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.staff.update({
      where: { id: staffId },
      data: { rfidTag: null },
    })

    revalidatePath("/dashboard/hr/rfid-cards")
    return { success: true, message: "RFID card removed" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
