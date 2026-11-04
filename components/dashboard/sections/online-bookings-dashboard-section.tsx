import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { OnlineBookingsSection } from "@/components/reception/online-bookings-section"

/**
 * Async server component that fetches online booking data
 * and renders the OnlineBookingsSection for the admin dashboard.
 */
export async function OnlineBookingsDashboardSection() {
  const session = await auth()

  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) return null

  const [onlineBookings, availableDoctors] = await Promise.all([
    prisma.onlineBooking.findMany({
      include: {
        preferredDoctor: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    prisma.staff.findMany({
      where: {
        user: { role: "DOCTOR", isActive: true },
        isOnLeave: false,
      },
      select: {
        id: true,
        department: true,
        specialization: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  return (
    <OnlineBookingsSection
      initialBookings={JSON.parse(JSON.stringify(onlineBookings))}
      doctors={JSON.parse(JSON.stringify(availableDoctors))}
      currentUser={{ id: user.id, name: user.name || "Admin" }}
    />
  )
}
