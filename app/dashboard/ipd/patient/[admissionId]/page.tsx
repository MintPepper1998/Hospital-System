import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PatientDashboardClient } from "@/components/ipd/patient-dashboard-client"
import { getSecureUrl } from "@/lib/s3-server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { calculateFinalBill } from "@/app/actions/billing"

interface PatientDashboardPageProps {
  params: Promise<{ admissionId: string }>
}

export default async function PatientDashboardPage({ params }: PatientDashboardPageProps) {
  const { admissionId } = await params

  // Fetch the admission with all related data
  const admission = await prisma.iPDAdmission.findUnique({
    where: { id: admissionId },
    include: {
      patient: {
        include: {
          user: true,
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
        },
      },
      primaryDoctor: {
        include: { user: true },
      },
      bed: {
        include: { ward: true },
      },
      clinicalNotes: {
        orderBy: { date: "desc" },
      },
      ipdPrescriptions: {
        orderBy: { createdAt: "desc" },
      },
      ipdLabRequests: {
        orderBy: { createdAt: "desc" },
      },
      vitals: {
        orderBy: { recordedAt: "desc" },
        include: {
          recordedBy: { include: { user: true } },
        }
      },
      discharge: true,
      canteenDiets: {
        orderBy: { createdAt: "desc" },
        include: { dietPlan: true },
      },
      bedTransfers: {
        orderBy: { transferDate: "desc" },
        include: {
          fromBed: { include: { ward: true } },
          toBed: { include: { ward: true } }
        }
      },
      doctors: {
        orderBy: { assignedAt: "asc" },
        include: {
          doctor: { include: { user: true } }
        }
      },
      timelineEvents: {
        orderBy: { timestamp: "desc" },
      },
      dischargeMedicines: {
        orderBy: { createdAt: "asc" },
      }
    },
  })

  const availableDoctors = await prisma.staff.findMany({
    where: { department: { not: null } }, // Or role = DOCTOR if you have a role field
    include: { user: true },
    orderBy: { user: { name: "asc" } }
  })

  const dietPlans = await prisma.canteenDietPlan.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  const dischargeTypes = await prisma.dischargeTypeConfig.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  })

  if (!admission) {
    notFound()
  }

  // Calculate live financial estimates (including unbilled charges)
  const billSummary = await calculateFinalBill(admissionId)
  const liveTotal = billSummary.success ? (billSummary.data?.totalBillAmount ?? admission.totalBillAmount) : admission.totalBillAmount
  const liveBalance = billSummary.success ? (billSummary.data?.balanceDue ?? admission.balanceDue) : admission.balanceDue
  const hasInsuranceCoverage = billSummary.success ? billSummary.data?.hasInsuranceCoverage : false
  const insuranceApprovedAmount = billSummary.success ? billSummary.data?.insuranceApprovedAmount : undefined
  const insuranceCoveredAmount = billSummary.success ? billSummary.data?.insuranceCoveredAmount : undefined
  const patientLiability = billSummary.success ? billSummary.data?.patientLiability : undefined

  // Calculate derived values
  const admissionDate = admission.admissionDate
  const now = new Date()
  const daysAdmitted = Math.max(1, Math.ceil(
    (now.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)
  ))

  // Calculate age from DOB
  let age: number | null = null
  if (admission.patient.dateOfBirth) {
    const dob = new Date(admission.patient.dateOfBirth)
    age = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  }

  // Sign all S3 URLs server-side (bucket is private, needs signed GET URLs)
  const [signedProfilePhoto, signedAadharCard, signedBskyCard] = await Promise.all([
    getSecureUrl(admission.patient.profilePhotoUrl),
    getSecureUrl(admission.patient.aadharCardUrl),
    getSecureUrl(admission.patient.bskyCardUrl),
  ])

  const signedDocuments = await Promise.all(
    admission.patient.documents.map(async (doc) => ({
      ...doc,
      fileUrl: (await getSecureUrl(doc.fileUrl)) || doc.fileUrl,
      uploadedAt: doc.uploadedAt.toISOString(),
    }))
  )

  // Serialize dates for client component
  // We override totalBillAmount and balanceDue with live estimates
  const serializedAdmission = {
    ...admission,
    totalBillAmount: liveTotal,
    balanceDue: liveBalance,
    hasInsuranceCoverage,
    insuranceApprovedAmount,
    insuranceCoveredAmount,
    patientLiability,
    billBreakdown: billSummary.data || null,
    admissionDate: admission.admissionDate.toISOString(),
    dischargeDate: admission.dischargeDate?.toISOString() || null,
    createdAt: admission.createdAt.toISOString(),
    updatedAt: admission.updatedAt.toISOString(),
    followUpDate: admission.followUpDate?.toISOString() || null,
    // Discharge summary fields (for the Summary tab editor)
    dischargeTypeCode: admission.dischargeTypeCode || null,
    customDischargeData: admission.customDischargeData || null,
    finalDiagnosis: admission.finalDiagnosis || null,
    proceduresDone: admission.proceduresDone || null,
    courseInHospital: admission.courseInHospital || null,
    treatmentGiven: admission.treatmentGiven || null,
    conditionAtDischarge: admission.conditionAtDischarge || null,
    adviceOnDischarge: admission.adviceOnDischarge || null,
    dischargeMedicines: admission.dischargeMedicines,
    patient: {
      ...admission.patient,
      dateOfBirth: admission.patient.dateOfBirth?.toISOString() || null,
      createdAt: admission.patient.createdAt.toISOString(),
      updatedAt: admission.patient.updatedAt.toISOString(),
      // Use signed URLs instead of raw S3 URLs
      profilePhotoUrl: signedProfilePhoto,
      aadharCardUrl: signedAadharCard,
      bskyCardUrl: signedBskyCard,
      user: admission.patient.user,
      documents: signedDocuments,
    },
    primaryDoctor: {
      ...admission.primaryDoctor,
      joiningDate: admission.primaryDoctor.joiningDate.toISOString(),
      createdAt: admission.primaryDoctor.createdAt.toISOString(),
      updatedAt: admission.primaryDoctor.updatedAt.toISOString(),
      user: admission.primaryDoctor.user,
    },
    bed: {
      ...admission.bed,
      lastCleaned: admission.bed.lastCleaned?.toISOString() || null,
      createdAt: admission.bed.createdAt.toISOString(),
      updatedAt: admission.bed.updatedAt.toISOString(),
      ward: admission.bed.ward,
    },
    clinicalNotes: admission.clinicalNotes.map((note) => ({
      ...note,
      date: note.date.toISOString(),
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
    ipdPrescriptions: admission.ipdPrescriptions.map((rx) => ({
      ...rx,
      stoppedAt: rx.stoppedAt?.toISOString() || null,
      dispensedAt: rx.dispensedAt?.toISOString() || null,
      createdAt: rx.createdAt.toISOString(),
      updatedAt: rx.updatedAt.toISOString(),
    })),
    ipdLabRequests: admission.ipdLabRequests.map((lr) => ({
      ...lr,
      // IPD stores results on the request itself; request id is the report id.
      reportId: lr.id,
      completedAt: lr.completedAt?.toISOString() || null,
      cancelledAt: lr.cancelledAt?.toISOString() || null,
      createdAt: lr.createdAt.toISOString(),
      updatedAt: lr.updatedAt.toISOString(),
    })),
    discharge: admission.discharge
      ? {
          ...admission.discharge,
          dischargeDate: admission.discharge.dischargeDate.toISOString(),
          createdAt: admission.discharge.createdAt.toISOString(),
          updatedAt: admission.discharge.updatedAt.toISOString(),
        }
      : null,
    canteenDiets: admission.canteenDiets.map((diet) => ({
      ...diet,
      startDate: diet.startDate.toISOString(),
      endDate: diet.endDate?.toISOString() || null,
      createdAt: diet.createdAt.toISOString(),
      updatedAt: diet.updatedAt.toISOString(),
    })),
    bedTransfers: (admission as any).bedTransfers?.map((transfer: any) => ({
      ...transfer,
      transferDate: transfer.transferDate.toISOString(),
      createdAt: transfer.createdAt.toISOString(),
      updatedAt: transfer.updatedAt.toISOString(),
    })) || [],
    doctors: (admission as any).doctors?.map((doc: any) => ({
      ...doc,
      assignedAt: doc.assignedAt.toISOString(),
    })) || [],
    timelineEvents: (admission as any).timelineEvents?.map((event: any) => ({
      ...event,
      timestamp: event.timestamp.toISOString(),
    })) || [],
  }

  // Serialize available doctors
  const serializedDoctors = availableDoctors.map(doc => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    joiningDate: doc.joiningDate.toISOString(),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/ipd">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-blue-600">
            Patient 360° View
          </h2>
          <p className="text-muted-foreground text-sm">
            {admission.patient.user.name} &bull; {admission.patient.patientId} &bull;{" "}
            <span
              className={`font-medium ${
                admission.status === "ADMITTED"
                  ? "text-green-600"
                  : admission.status === "DISCHARGED"
                  ? "text-gray-500"
                  : "text-orange-500"
              }`}
            >
              {admission.status}
            </span>
            {" "}&bull; Day {daysAdmitted}
          </p>
        </div>

      </div>

      <PatientDashboardClient
        admission={serializedAdmission as any}
        age={age}
        daysAdmitted={daysAdmitted}
        dietPlans={JSON.parse(JSON.stringify(dietPlans))}
        availableDoctors={serializedDoctors as any}
        dischargeTypes={JSON.parse(JSON.stringify(dischargeTypes))}
      />
    </div>
  )
}
