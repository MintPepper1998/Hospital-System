import { prisma } from "@/lib/prisma"
import { TripManagementClient } from "@/components/ambulance/trip-management-client"

export default async function TripsPage() {
  const [trips, ambulances] = await Promise.all([
    prisma.ambulanceTrip.findMany({
      include: {
        ambulance: { select: { vehicleNumber: true, type: true } },
        billing: true,
        patient: { select: { patientId: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 100,
    }),
    prisma.ambulance.findMany({
      where: { isActive: true, status: "AVAILABLE" },
      select: { id: true, vehicleNumber: true, type: true },
      orderBy: { vehicleNumber: "asc" },
    }),
  ])

  return (
    <TripManagementClient
      trips={JSON.parse(JSON.stringify(trips))}
      availableAmbulances={JSON.parse(JSON.stringify(ambulances))}
    />
  )
}
