import { prisma } from "@/lib/prisma"
import { BillingClient } from "@/components/ambulance/billing-client"

export default async function BillingPage() {
  const [billings, config] = await Promise.all([
    prisma.ambulanceBilling.findMany({
      include: {
        trip: {
          select: {
            tripNumber: true,
            patientName: true,
            patientPhone: true,
            pickupLocation: true,
            dropLocation: true,
            distanceKm: true,
            status: true,
            requestedAt: true,
            completedAt: true,
            ambulance: { select: { vehicleNumber: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.ambulanceBillingConfig.findUnique({ where: { id: 1 } }),
  ])

  // Create default config if none exists
  const billingConfig = config || {
    id: 1,
    defaultBookingFee: 500,
    defaultPerKmRate: 15,
    nightSurchargeRate: 200,
    nightStartHour: 22,
    nightEndHour: 6,
    waitingChargePerHr: 100,
    alsExtraCharge: 1000,
    neonatalExtraCharge: 1500,
    oxygenChargePerHr: 200,
  }

  // Calculate summary
  const totalRevenue = billings.reduce((sum, b) => sum + b.totalAmount, 0)
  const paidRevenue = billings.filter(b => b.paymentStatus === "PAID").reduce((sum, b) => sum + b.totalAmount, 0)
  const pendingRevenue = billings.filter(b => b.paymentStatus === "PENDING").reduce((sum, b) => sum + b.totalAmount, 0)
  const waivedAmount = billings.filter(b => b.paymentStatus === "WAIVED" || b.isWaived).reduce((sum, b) => sum + b.totalAmount, 0)

  return (
    <BillingClient
      billings={JSON.parse(JSON.stringify(billings))}
      config={JSON.parse(JSON.stringify(billingConfig))}
      summary={{ totalRevenue, paidRevenue, pendingRevenue, waivedAmount, totalTrips: billings.length }}
    />
  )
}
