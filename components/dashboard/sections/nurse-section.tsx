import { getCachedNurseStats } from "@/lib/data/dashboard-cache"
import { LazyNurseView } from "@/components/dashboard/lazy-role-views"
import { prisma } from "@/lib/prisma"
import { OPDVitalsQueue } from "@/components/clinical/opd-vitals-queue"

interface NurseSectionProps {
  userName: string
}

export async function NurseSection({ userName }: NurseSectionProps) {
  const nurseData = await getCachedNurseStats()

  // Fetch today's OPD vitals queue
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [pendingVitals, completedVitals] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: today, lt: tomorrow },
        status: { in: ["PENDING", "WAITING"] },
      },
      include: {
        patient: {
          include: { user: { select: { name: true } } },
        },
        doctor: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: [
        { appointmentTime: "asc" },
        { createdAt: "asc" },
      ],
    }),

    prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: today, lt: tomorrow },
        status: "VITALS_DONE",
      },
      include: {
        patient: {
          include: { user: { select: { name: true } } },
        },
        doctor: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { vitalsTakenAt: "desc" },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* OPD Vitals Queue — top priority for nurses */}
      <OPDVitalsQueue
        initialPending={JSON.parse(JSON.stringify(pendingVitals))}
        initialCompleted={JSON.parse(JSON.stringify(completedVitals))}
        nurseName={userName}
      />

      {/* IPD Ward Patients (existing nurse view) */}
      <LazyNurseView
        userName={userName}
        stats={nurseData.stats}
        patients={nurseData.patients}
      />
    </div>
  )
}
