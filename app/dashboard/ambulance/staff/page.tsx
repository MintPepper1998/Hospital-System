import { prisma } from "@/lib/prisma"
import { StaffAssignmentClient } from "@/components/ambulance/staff-assignment-client"

export default async function StaffPage() {
  const [assignments, ambulances, staffList, shifts] = await Promise.all([
    prisma.ambulanceStaffAssignment.findMany({
      where: { isActive: true },
      include: {
        ambulance: { select: { vehicleNumber: true, type: true } },
        staff: { include: { user: { select: { name: true, email: true, phone: true } } } },
        shift: true,
      },
      orderBy: [{ assignmentDate: "desc" }, { role: "asc" }],
      take: 100,
    }),
    prisma.ambulance.findMany({
      where: { isActive: true },
      select: { id: true, vehicleNumber: true, type: true },
      orderBy: { vehicleNumber: "asc" },
    }),
    prisma.staff.findMany({
      where: { user: { isActive: true, role: { in: ["AMBULANCE_DRIVER", "NURSE", "DOCTOR"] } } },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    }),
  ])

  return (
    <StaffAssignmentClient
      assignments={JSON.parse(JSON.stringify(assignments))}
      ambulances={JSON.parse(JSON.stringify(ambulances))}
      staffList={JSON.parse(JSON.stringify(staffList))}
      shifts={JSON.parse(JSON.stringify(shifts))}
    />
  )
}
