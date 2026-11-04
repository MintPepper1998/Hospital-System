"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { actionError, getErrorMessage } from "@/lib/action-result"

// ============================================
// TYPES
// ============================================

export interface StaffAttendanceRecord {
  staffId: string
  employeeId: string 
  name: string
  department: string
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE"
  halfDayTime?: string
  remarks?: string
}

// ============================================
// GET ATTENDANCE FOR DATE
// ============================================

export async function getAttendanceForDate(dateIso: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error, data: [] }

  try {
    const targetDate = new Date(dateIso)
    
    // Fetch all active staff with their user info
    const allStaff = await prisma.staff.findMany({
      include: {
        user: { select: { name: true } }
      }
    })

    // Fetch existing attendance records for this date
    const existingRecords = await prisma.staffAttendance.findMany({
      where: { date: targetDate }
    })
    const recordMap = new Map(existingRecords.map(r => [r.staffId, r]))

    // Merge them
    const data: StaffAttendanceRecord[] = allStaff.map(staff => {
      const rec = recordMap.get(staff.id)
      return {
        staffId: staff.id,
        employeeId: staff.employeeId || "",
        name: staff.user?.name || "Unknown",
        department: staff.department || "General",
        status: (rec?.status as any) || "PRESENT",
        halfDayTime: rec?.halfDayTime || "",
        remarks: rec?.notes || "",
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error("[ERROR] getAttendanceForDate:", error)
    return { success: false, message: getErrorMessage(error), data: [] }
  }
}

// ============================================
// SAVE BULK ATTENDANCE
// ============================================

export async function saveBulkAttendance(dateIso: string, records: StaffAttendanceRecord[]) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const targetDate = new Date(dateIso)
    const recordedBy = authResult.session.userId

    await prisma.$transaction(async (tx) => {
      // For each record, upsert the attendance
      for (const rec of records) {
        await tx.staffAttendance.upsert({
          where: {
            staffId_date: {
              staffId: rec.staffId,
              date: targetDate
            }
          },
          update: {
            status: rec.status,
            halfDayTime: rec.status === "HALF_DAY" ? rec.halfDayTime : null,
            notes: rec.remarks || null,
            recordedBy
          },
          create: {
            staffId: rec.staffId,
            date: targetDate,
            status: rec.status,
            halfDayTime: rec.status === "HALF_DAY" ? rec.halfDayTime : null,
            notes: rec.remarks || null,
            recordedBy
          }
        })
      }
    })

    revalidatePath("/dashboard/hr/attendance")
    writeAuditLog({
      userId: recordedBy,
      action: "UPDATE",
      module: "StaffAttendance",
      changes: { date: dateIso, updatedCount: records.length },
    })

    return { success: true, message: "Attendance saved successfully" }
  } catch (error) {
    console.error("[ERROR] saveBulkAttendance:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// GET LIVE CHECK-INS (Today's RFID Activity)
// ============================================

export async function getLiveCheckins() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error, data: [] }

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const records = await prisma.staffAttendance.findMany({
      where: {
        date: today,
        checkInTime: { not: null },
      },
      include: {
        staff: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { checkInTime: "desc" },
    })

    const data = records.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      employeeId: r.staff.employeeId,
      name: r.staff.user?.name || "Unknown",
      department: r.staff.department || "General",
      checkInTime: r.checkInTime?.toISOString() || null,
      checkOutTime: r.checkOutTime?.toISOString() || null,
      checkInMethod: r.checkInMethod || "MANUAL",
      deviceInfo: r.deviceInfo,
    }))

    return { success: true, data }
  } catch (error) {
    console.error("[ERROR] getLiveCheckins:", error)
    return { success: false, message: getErrorMessage(error), data: [] }
  }
}
