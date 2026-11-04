import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdmitPatientForm } from "@/components/ipd/admit-patient-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdmitPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ bedId?: string }>
}) {
  const { bedId: preSelectedBedId } = await searchParams
  // Fetch available beds
  const availableBeds = await prisma.bed.findMany({
    where: { 
      status: "AVAILABLE",
      ward: { type: { not: "EMERGENCY" } }
    },
    include: {
      ward: true,
    },
    orderBy: [
      { ward: { name: "asc" } },
      { bedNumber: "asc" },
    ],
  })

  // Fetch all patients
  const patients = await prisma.patient.findMany({
    where: { patientId: { not: "PAT-WALKIN" } },
    select: {
      id: true,
      patientId: true,
      phone: true,
      gender: true,
      aadharNumber: true,
      bskyNumber: true,
      isBsky: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Fetch all doctors
  const doctors = await prisma.staff.findMany({
    where: {
      user: {
        role: "DOCTOR",
        isActive: true,
      },
    },
    include: {
      user: true,
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  })

  // Fetch patients currently admitted (to prevent duplicate admissions)
  const currentlyAdmitted = await prisma.iPDAdmission.findMany({
    where: { status: "ADMITTED" },
    select: {
      patientId: true,
      bed: {
        select: {
          bedNumber: true,
          ward: { select: { name: true } },
        },
      },
    },
  })

  const admittedPatientMap: Record<string, string> = {}
  for (const adm of currentlyAdmitted) {
    admittedPatientMap[adm.patientId] = adm.bed
      ? `${adm.bed.ward?.name} - ${adm.bed.bedNumber}`
      : "Unknown Bed"
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/ipd">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-600">
            Admit Patient to IPD
          </h2>
          <p className="text-muted-foreground mt-1">
            Select patient, bed, and collect advance deposit
          </p>
        </div>
      </div>

      {/* Admission Form */}
      {availableBeds.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-lg font-semibold text-destructive">No Beds Available</p>
            <p className="text-muted-foreground mt-2">
              All beds are currently occupied or under maintenance. Please wait for a bed to become available.
            </p>
            <Link href="/dashboard/ipd">
              <Button className="mt-4" variant="outline">
                Back to IPD Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <AdmitPatientForm
          patients={patients}
          beds={availableBeds}
          doctors={doctors}
          preSelectedBedId={preSelectedBedId}
          admittedPatientMap={admittedPatientMap}
        />
      )}

      {/* Important Notes */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="text-sm text-orange-900">Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-orange-800 space-y-2 list-disc list-inside">
            <li>
              <strong>Advance Deposit:</strong> Minimum deposit is required before admission (Indian hospital standard practice)
            </li>
            <li>
              <strong>Bed Charges:</strong> Daily charges will be added to the patient's bill automatically
            </li>
            <li>
              <strong>Receipt:</strong> A deposit receipt will be generated immediately after admission
            </li>
            <li>
              <strong>Bed Assignment:</strong> Once admitted, the bed status will be updated to "Occupied"
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
