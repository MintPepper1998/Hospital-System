export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import { requireAuthSafe } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { CasualtyPatientDetail } from "./casualty-patient-detail"

interface CasualtyPatientPageProps {
  params: Promise<{ visitId: string }>
}

export default async function CasualtyPatientPage({ params }: CasualtyPatientPageProps) {
  const authResult = await requireAuthSafe([
    "SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST",
  ])
  if (!authResult.ok) redirect("/login")

  const { visitId } = await params

  const visit = await prisma.casualtyVisit.findUnique({
    where: { id: visitId },
    include: {
      patient: {
        include: {
          user: true,
          documents: { orderBy: { uploadedAt: "desc" }, take: 5 },
        },
      },
      assignedDoctor: { include: { user: true } },
      procedures: { orderBy: { performedAt: "desc" } },
      appointments: {
        include: {
          doctor: { include: { user: true } },
          billings: true,
        },
      },
      billings: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!visit) notFound()

  const doctors = await prisma.staff.findMany({
    where: { user: { role: "DOCTOR", isActive: true } },
    include: { user: true },
  })

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <CasualtyPatientDetail
        visit={JSON.parse(JSON.stringify(visit))}
        doctors={JSON.parse(JSON.stringify(doctors))}
      />
    </div>
  )
}
