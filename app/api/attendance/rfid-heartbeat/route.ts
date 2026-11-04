import { NextRequest, NextResponse } from "next/server"

/**
 * RFID Device Heartbeat
 * 
 * Called by ESP32 every 60 seconds to confirm device is alive.
 * POST /api/attendance/rfid-heartbeat
 * Body: { deviceId, uptime, freeHeap, wifiRSSI, offlineQueue }
 */

const API_KEY = process.env.RFID_API_KEY || "rfid-attendance-secret-key"

// In-memory device status (simple approach, resets on server restart)
const deviceStatus: Record<string, {
  lastSeen: Date
  uptime: number
  freeHeap: number
  wifiRSSI: number
  offlineQueue: number
}> = {}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key")
  if (apiKey !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { deviceId, uptime, freeHeap, wifiRSSI, offlineQueue } = body

    if (!deviceId) {
      return NextResponse.json({ error: "Missing deviceId" }, { status: 400 })
    }

    deviceStatus[deviceId] = {
      lastSeen: new Date(),
      uptime: uptime || 0,
      freeHeap: freeHeap || 0,
      wifiRSSI: wifiRSSI || 0,
      offlineQueue: offlineQueue || 0,
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
}

// GET endpoint to check device health from admin UI
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("key")
  if (apiKey !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ devices: deviceStatus })
}
