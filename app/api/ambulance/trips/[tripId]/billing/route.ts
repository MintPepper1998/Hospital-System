import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/ambulance/trips/[tripId]/billing — Get billing for a trip
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params

    const billing = await prisma.ambulanceBilling.findUnique({
      where: { tripId },
      include: {
        trip: {
          select: {
            tripNumber: true,
            patientName: true,
            patientPhone: true,
            pickupLocation: true,
            dropLocation: true,
            distanceKm: true,
            requestedAt: true,
            completedAt: true,
            ambulance: { select: { vehicleNumber: true, type: true } },
          },
        },
      },
    })

    if (!billing) {
      return NextResponse.json({ error: "Billing not found for this trip" }, { status: 404 })
    }

    return NextResponse.json(billing)
  } catch (error) {
    console.error("Failed to fetch billing:", error)
    return NextResponse.json({ error: "Failed to fetch billing" }, { status: 500 })
  }
}

// PATCH /api/ambulance/trips/[tripId]/billing — Update billing (payment, waiver, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
    if (body.receiptNumber !== undefined) updateData.receiptNumber = body.receiptNumber
    if (body.isWaived !== undefined) {
      updateData.isWaived = body.isWaived
      if (body.isWaived) {
        updateData.paymentStatus = "WAIVED"
        updateData.waiverReason = body.waiverReason || ""
        updateData.waivedBy = body.waivedBy || ""
      }
    }
    if (body.notes !== undefined) updateData.notes = body.notes

    // If marked as paid, set paidAt
    if (body.paymentStatus === "PAID") {
      updateData.paidAt = new Date()

      // Auto-create a Billing record in the hospital finance system
      const ambBilling = await prisma.ambulanceBilling.findUnique({
        where: { tripId },
        include: {
          trip: {
            include: { patient: true },
          },
        },
      })

      if (ambBilling && ambBilling.trip.patientId && !ambBilling.billingId) {
        // Generate bill number
        const year = new Date().getFullYear()
        const lastBill = await prisma.billing.findFirst({
          where: { billNumber: { startsWith: `AMB-BILL-${year}` } },
          orderBy: { billNumber: "desc" },
        })
        let nextSeq = 1
        if (lastBill?.billNumber) {
          const parts = lastBill.billNumber.split("-")
          nextSeq = parseInt(parts[parts.length - 1]) + 1
        }
        const billNumber = `AMB-BILL-${year}-${String(nextSeq).padStart(4, "0")}`

        // Create hospital billing record
        const hospitalBill = await prisma.billing.create({
          data: {
            billNumber,
            patientId: ambBilling.trip.patientId,
            type: "AMBULANCE",
            totalAmount: ambBilling.totalAmount,
            netAmount: ambBilling.totalAmount,
            paidAmount: ambBilling.totalAmount,
            balanceAmount: 0,
            status: "PAID",
            paymentMethod: body.paymentMethod || "CASH",
            notes: `Ambulance trip ${ambBilling.trip.tripNumber}`,
            items: {
              create: [
                {
                  description: `Ambulance Booking Fee`,
                  quantity: 1,
                  unitPrice: ambBilling.bookingFee,
                  amount: ambBilling.bookingFee,
                  totalAmount: ambBilling.bookingFee,
                },
                ...(ambBilling.distanceCharge > 0 ? [{
                  description: `Distance Charge (${ambBilling.distanceKm} km × ₹${ambBilling.perKmRate}/km)`,
                  quantity: 1,
                  unitPrice: ambBilling.distanceCharge,
                  amount: ambBilling.distanceCharge,
                  totalAmount: ambBilling.distanceCharge,
                }] : []),
                ...(ambBilling.equipmentCharge > 0 ? [{
                  description: `Equipment/ALS Surcharge`,
                  quantity: 1,
                  unitPrice: ambBilling.equipmentCharge,
                  amount: ambBilling.equipmentCharge,
                  totalAmount: ambBilling.equipmentCharge,
                }] : []),
                ...(ambBilling.nightSurcharge > 0 ? [{
                  description: `Night Surcharge`,
                  quantity: 1,
                  unitPrice: ambBilling.nightSurcharge,
                  amount: ambBilling.nightSurcharge,
                  totalAmount: ambBilling.nightSurcharge,
                }] : []),
              ],
            },
          },
        })

        // Link ambulance billing to hospital billing
        updateData.billingId = hospitalBill.id
      }
    }

    const updated = await prisma.ambulanceBilling.update({
      where: { tripId },
      data: updateData,
      include: {
        trip: {
          select: {
            tripNumber: true,
            patientName: true,
            ambulance: { select: { vehicleNumber: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update billing:", error)
    return NextResponse.json({ error: "Failed to update billing" }, { status: 400 })
  }
}
