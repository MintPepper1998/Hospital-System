import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * RFID Attendance Check-in/Check-out API
 * 
 * Called by ESP32 RFID reader hardware.
 * POST /api/attendance/rfid-checkin
 * 
 * Headers: x-api-key (shared secret)
 * Body: { rfidTag: "AB:CD:EF:12", deviceId: "ENTRANCE-1" }
 * 
 * Logic:
 *   - First tap today → CHECK_IN (sets checkInTime)
 *   - Second tap today → CHECK_OUT (sets checkOutTime)
 *   - Already complete → ALREADY_COMPLETE error
 */

const API_KEY = process.env.RFID_API_KEY || "rfid-attendance-secret-key"

export async function POST(req: NextRequest) {
  // ── Auth ──
  const apiKey = req.headers.get("x-api-key")
  if (apiKey !== API_KEY) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { rfidTag, deviceId } = body

    if (!rfidTag) {
      return NextResponse.json({ success: false, error: "MISSING_RFID_TAG" }, { status: 400 })
    }

    // ── Find staff by RFID tag ──
    const staff = await prisma.staff.findUnique({
      where: { rfidTag },
      include: { user: { select: { name: true } } },
    })

    if (!staff) {
      console.log(`[RFID] Unknown card: ${rfidTag} from ${deviceId}`)
      return NextResponse.json({
        success: false,
        error: "UNKNOWN_CARD",
        message: "This card is not registered to any staff member",
      })
    }

    const staffName = staff.user?.name || "Staff"
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // ── Find or create today's attendance record ──
    const existing = await prisma.staffAttendance.findUnique({
      where: {
        staffId_date: {
          staffId: staff.id,
          date: today,
        },
      },
    })

    if (!existing) {
      // First tap → CHECK IN
      await prisma.staffAttendance.create({
        data: {
          staffId: staff.id,
          date: today,
          status: "PRESENT",
          checkInTime: now,
          checkInMethod: "RFID",
          deviceInfo: deviceId || null,
        },
      })

      console.log(`[RFID] ✅ CHECK_IN: ${staffName} (${staff.employeeId}) at ${now.toLocaleTimeString()}`)
      return NextResponse.json({
        success: true,
        staffName,
        employeeId: staff.employeeId,
        action: "CHECK_IN",
        time: now.toISOString(),
      })
    }

    if (existing.checkInTime && !existing.checkOutTime) {
      // Second tap → CHECK OUT
      await prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: now,
          deviceInfo: deviceId || existing.deviceInfo,
        },
      })

      console.log(`[RFID] ✅ CHECK_OUT: ${staffName} (${staff.employeeId}) at ${now.toLocaleTimeString()}`)
      return NextResponse.json({
        success: true,
        staffName,
        employeeId: staff.employeeId,
        action: "CHECK_OUT",
        time: now.toISOString(),
      })
    }

    // Both already set
    console.log(`[RFID] ⚠️ ALREADY_COMPLETE: ${staffName} (${staff.employeeId})`)
    return NextResponse.json({
      success: false,
      error: "ALREADY_COMPLETE",
      staffName,
      message: "Check-in and check-out already recorded for today",
    })
  } catch (error: any) {
    console.error("[RFID] Error:", error)
    return NextResponse.json({ success: false, error: "SERVER_ERROR", message: error.message }, { status: 500 })
  }
}
