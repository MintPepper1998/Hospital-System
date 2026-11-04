export const dynamic = "force-dynamic"
export const revalidate = 0

import { requireAuthSafe } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CasualtyClient } from "./casualty-client"

export const metadata = {
  title: "Casualty Department — Shree Kamal Hospital",
}

export default async function CasualtyPage() {
  const authResult = await requireAuthSafe([
    "SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST",
  ])
  if (!authResult.ok) redirect("/login")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // Active casualty visits
  const activeVisits = await prisma.casualtyVisit.findMany({
    where: {
      status: { in: ["ADMITTED", "TREATING", "REFERRED_TO_OPD"] },
    },
    include: {
      patient: { include: { user: true } },
      assignedDoctor: { include: { user: true } },
      procedures: { orderBy: { performedAt: "desc" } },
      appointments: {
        include: {
          doctor: { include: { user: true } },
        },
      },
    },
    orderBy: { arrivalTime: "desc" },
  })

  // Today's discharged (for stats)
  const todayDischarged = await prisma.casualtyVisit.count({
    where: {
      status: "DISCHARGED",
      dischargeTime: { gte: today, lt: tomorrow },
    },
  })

  // Today's total procedures
  const todayProcedures = await prisma.casualtyProcedure.count({
    where: {
      performedAt: { gte: today, lt: tomorrow },
    },
  })

  // Doctors for assignment
  const doctors = await prisma.staff.findMany({
    where: { user: { role: "DOCTOR", isActive: true } },
    include: { user: true },
  })

  // All patients for the admit search
  const recentPatients = await prisma.patient.findMany({
    where: { patientId: { not: "PAT-WALKIN" } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <CasualtyClient
        activeVisits={JSON.parse(JSON.stringify(activeVisits))}
        todayDischarged={todayDischarged}
        todayProcedures={todayProcedures}
        doctors={JSON.parse(JSON.stringify(doctors))}
        recentPatients={JSON.parse(JSON.stringify(recentPatients))}
      />
    </div>
  )
}
