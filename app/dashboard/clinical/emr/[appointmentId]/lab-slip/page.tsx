import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { LabTestSlipClient } from "@/components/clinical/lab-test-slip-client"

interface Props {
  params: Promise<{ appointmentId: string }>
}

export default async function LabTestSlipPage({ params }: Props) {
  const { appointmentId } = await params

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      labRequests: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!appointment) notFound()

  // Get hospital info
  const hospital = await prisma.hospitalSettings.findUnique({
    where: { id: 1 },
    select: { name: true, address: true, phone: true, email: true, logoUrl: true },
  })

  const patientAge = appointment.patient.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(appointment.patient.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null

  const data = {
    hospitalName: hospital?.name || "Hospital",
    hospitalAddress: hospital?.address || "",
    hospitalPhone: hospital?.phone || "",
    hospitalEmail: hospital?.email || "",
    hospitalLogo: hospital?.logoUrl || null,
    patientName: appointment.patient.user.name || "—",
    patientId: appointment.patient.patientId,
    patientAge: patientAge ? `${patientAge} years` : "—",
    patientGender: appointment.patient.gender || "—",
    doctorName: appointment.doctor?.user?.name || "—",
    date: format(new Date(appointment.appointmentDate), "dd/MM/yyyy"),
    time: appointment.appointmentTime,
    diagnosis: appointment.diagnosis || "—",
    labTests: appointment.labRequests.map((lr) => ({
      name: lr.testName,
      type: lr.testType as string,
      price: lr.testPrice,
      status: lr.status,
      priority: lr.priority,
      notes: lr.notes,
    })),
  }

  return <LabTestSlipClient data={data} />
}
