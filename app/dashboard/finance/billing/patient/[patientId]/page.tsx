import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PatientLedgerClient } from "@/components/finance/patient-ledger-client"

interface Props {
  params: Promise<{ patientId: string }>
}

export default async function PatientLedgerPage({ params }: Props) {
  const { patientId } = await params

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      user: true,
      // OPD Appointments
      appointments: {
        orderBy: { appointmentDate: "desc" },
        include: {
          doctor: { include: { user: true } },
        },
      },
      // All Billings (OPD, IPD, Pharmacy, Lab, OT)
      billings: {
        orderBy: { billDate: "desc" },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          payments: { orderBy: { paymentDate: "desc" } },
          appointment: true,
        },
      },
      // IPD Admissions
      ipdAdmissions: {
        orderBy: { admissionDate: "desc" },
        include: {
          bed: { include: { ward: true } },
          primaryDoctor: { include: { user: true } },
          equipmentUsages: {
            include: { equipment: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      // Surgeries
      surgeries: {
        orderBy: { scheduledDate: "desc" },
        include: {
          leadSurgeon: { include: { user: true } },
        },
      },
      // Insurance
      insurancePolicies: true,
    },
  })

  if (!patient) notFound()

  // Serialize dates
  const serialized = JSON.parse(JSON.stringify(patient))

  return (
    <div className="space-y-6">
      <PatientLedgerClient patient={serialized} />
    </div>
  )
}
