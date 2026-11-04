import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/ambulance/config — Get billing configuration
export async function GET() {
  try {
    let config = await prisma.ambulanceBillingConfig.findUnique({ where: { id: 1 } })
    if (!config) {
      config = await prisma.ambulanceBillingConfig.create({ data: { id: 1 } })
    }
    return NextResponse.json(config)
  } catch (error) {
    console.error("Failed to fetch config:", error)
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 })
  }
}

// PATCH /api/ambulance/config — Update billing configuration
export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    const config = await prisma.ambulanceBillingConfig.upsert({
      where: { id: 1 },
      update: {
        defaultBookingFee: body.defaultBookingFee !== undefined ? parseFloat(body.defaultBookingFee) : undefined,
        defaultPerKmRate: body.defaultPerKmRate !== undefined ? parseFloat(body.defaultPerKmRate) : undefined,
        nightSurchargeRate: body.nightSurchargeRate !== undefined ? parseFloat(body.nightSurchargeRate) : undefined,
        nightStartHour: body.nightStartHour !== undefined ? parseInt(body.nightStartHour) : undefined,
        nightEndHour: body.nightEndHour !== undefined ? parseInt(body.nightEndHour) : undefined,
        waitingChargePerHr: body.waitingChargePerHr !== undefined ? parseFloat(body.waitingChargePerHr) : undefined,
        alsExtraCharge: body.alsExtraCharge !== undefined ? parseFloat(body.alsExtraCharge) : undefined,
        neonatalExtraCharge: body.neonatalExtraCharge !== undefined ? parseFloat(body.neonatalExtraCharge) : undefined,
        oxygenChargePerHr: body.oxygenChargePerHr !== undefined ? parseFloat(body.oxygenChargePerHr) : undefined,
      },
      create: {
        id: 1,
        defaultBookingFee: body.defaultBookingFee ? parseFloat(body.defaultBookingFee) : 500,
        defaultPerKmRate: body.defaultPerKmRate ? parseFloat(body.defaultPerKmRate) : 15,
        nightSurchargeRate: body.nightSurchargeRate ? parseFloat(body.nightSurchargeRate) : 200,
        nightStartHour: body.nightStartHour ? parseInt(body.nightStartHour) : 22,
        nightEndHour: body.nightEndHour ? parseInt(body.nightEndHour) : 6,
        waitingChargePerHr: body.waitingChargePerHr ? parseFloat(body.waitingChargePerHr) : 100,
        alsExtraCharge: body.alsExtraCharge ? parseFloat(body.alsExtraCharge) : 1000,
        neonatalExtraCharge: body.neonatalExtraCharge ? parseFloat(body.neonatalExtraCharge) : 1500,
        oxygenChargePerHr: body.oxygenChargePerHr ? parseFloat(body.oxygenChargePerHr) : 200,
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error("Failed to update config:", error)
    return NextResponse.json({ error: "Failed to update config" }, { status: 400 })
  }
}
