import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { VisitorPassClient } from "./visitor-pass-client"

interface PageProps {
  params: Promise<{ admissionId: string }>
  searchParams: Promise<{ copies?: string }>
}

export default async function VisitorPassPage({ params, searchParams }: PageProps) {
  const { admissionId } = await params
  const sp = await searchParams
  const copies = Math.min(Math.max(parseInt(sp.copies || "1") || 1, 1), 10)

  const admission = await prisma.iPDAdmission.findUnique({
    where: { id: admissionId },
    include: {
      patient: {
        include: { user: true },
      },
      primaryDoctor: {
        include: { user: true },
      },
      bed: {
        include: { ward: true },
      },
    },
  })

  if (!admission) {
    notFound()
  }

  // Calculate age
  let age: string = "—"
  if (admission.patient.dateOfBirth) {
    const dob = new Date(admission.patient.dateOfBirth)
    const now = new Date()
    const years = Math.floor(
      (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    )
    age = `${years} Y`
  }

  const gender = admission.patient.gender === "MALE" ? "M" : admission.patient.gender === "FEMALE" ? "F" : "O"

  const passData = {
    patientName: admission.patient.user.name || "Unknown",
    patientId: admission.patient.patientId,
    age,
    gender,
    doctorName: admission.primaryDoctor.user.name || "Unknown",
    wardName: admission.bed.ward.name,
    bedNumber: admission.bed.bedNumber,
    wardType: admission.bed.ward.type,
    admissionDate: format(admission.admissionDate, "dd/MM/yyyy"),
    admissionTime: format(admission.admissionDate, "hh:mm a"),
    isBsky: admission.isBskyAdmission,
    paymentType: admission.isBskyAdmission ? "BSKY" : "CASH",
  }

  return <VisitorPassClient passData={passData} copies={copies} />
}
