import { prisma } from "@/lib/prisma"
import { AmbulanceDashboardClient } from "@/components/ambulance/ambulance-dashboard-client"

export default async function AmbulanceDashboardPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    ambulances,
    todayTrips,
    activeTrips,
    allTripsCount,
  ] = await Promise.all([
    prisma.ambulance.findMany({
      where: { isActive: true },
      include: {
        equipment: true,
        staffAssignments: {
          where: { isActive: true, assignmentDate: { gte: today, lt: tomorrow } },
          include: {
            staff: { include: { user: { select: { name: true } } } },
            shift: true,
          },
        },
        _count: { select: { equipment: true, trips: true } },
      },
      orderBy: { vehicleNumber: "asc" },
    }),
    prisma.ambulanceTrip.findMany({
      where: { requestedAt: { gte: today, lt: tomorrow } },
      include: {
        ambulance: { select: { vehicleNumber: true, type: true } },
        billing: true,
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.ambulanceTrip.findMany({
      where: {
        status: { in: ["DISPATCHED", "EN_ROUTE", "ARRIVED", "PATIENT_LOADED", "RETURNING"] },
      },
      include: {
        ambulance: { select: { vehicleNumber: true, type: true, contactNumber: true } },
        billing: true,
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.ambulanceTrip.count(),
  ])

  // Calculate stats
  const totalAmbulances = ambulances.length
  const availableCount = ambulances.filter((a) => a.status === "AVAILABLE").length
  const onTripCount = ambulances.filter((a) => a.status === "ON_TRIP").length
  const maintenanceCount = ambulances.filter((a) => a.status === "MAINTENANCE").length
  const outOfServiceCount = ambulances.filter((a) => a.status === "OUT_OF_SERVICE").length

  const todayCompletedTrips = todayTrips.filter((t) => t.status === "COMPLETED").length
  const todayCancelledTrips = todayTrips.filter((t) => t.status === "CANCELLED").length
  const todayRevenue = todayTrips.reduce((sum, t) => sum + (t.billing?.totalAmount || 0), 0)
  const todayPaidRevenue = todayTrips.reduce(
    (sum, t) => sum + (t.billing?.paymentStatus === "PAID" ? t.billing.totalAmount : 0),
    0
  )

  return (
    <AmbulanceDashboardClient
      ambulances={JSON.parse(JSON.stringify(ambulances))}
      todayTrips={JSON.parse(JSON.stringify(todayTrips))}
      activeTrips={JSON.parse(JSON.stringify(activeTrips))}
      stats={{
        totalAmbulances,
        availableCount,
        onTripCount,
        maintenanceCount,
        outOfServiceCount,
        todayTotalTrips: todayTrips.length,
        todayCompletedTrips,
        todayCancelledTrips,
        todayRevenue,
        todayPaidRevenue,
        allTimeTrips: allTripsCount,
      }}
    />
  )
}
