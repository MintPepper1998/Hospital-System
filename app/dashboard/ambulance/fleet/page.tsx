import { prisma } from "@/lib/prisma"
import { FleetManagementClient } from "@/components/ambulance/fleet-management-client"

export default async function FleetPage() {
  const ambulances = await prisma.ambulance.findMany({
    where: { isActive: true },
    include: {
      equipment: { orderBy: { category: "asc" } },
      staffAssignments: {
        where: { isActive: true },
        include: {
          staff: { include: { user: { select: { name: true } } } },
          shift: true,
        },
        take: 5,
        orderBy: { assignmentDate: "desc" },
      },
      _count: { select: { equipment: true, trips: true, staffAssignments: true } },
    },
    orderBy: { vehicleNumber: "asc" },
  })

  return <FleetManagementClient ambulances={JSON.parse(JSON.stringify(ambulances))} />
}
