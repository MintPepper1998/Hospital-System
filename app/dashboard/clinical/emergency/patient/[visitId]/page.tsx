import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { requireAuthSafe } from "@/lib/auth-guard"
import { ERPatientDashboardClient } from "@/components/emergency/er-patient-dashboard-client"
import { getSecureUrl } from "@/lib/s3-server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ERPatientDashboardPageProps {
  params: Promise<{ visitId: string }>
}

export default async function ERPatientDashboardPage({ params }: ERPatientDashboardPageProps) {
  const { visitId } = await params

  const [visit, dietPlans] = await Promise.all([
    prisma.emergencyVisit.findUnique({
      where: { id: visitId },
      include: {
        patient: {
          include: {
            user: true,
            documents: {
              orderBy: { uploadedAt: "desc" },
            },
          },
        },
        assignedDoctor: {
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
        canteenDiets: {
          include: { dietPlan: true },
          orderBy: { createdAt: "desc" },
        },
        discharge: true,
      },
    }),
    prisma.canteenDietPlan.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!visit) {
    notFound()
  }

  const now = new Date()
  const daysAdmitted = Math.max(1, Math.ceil(
    (now.getTime() - visit.arrivalTime.getTime()) / (1000 * 60 * 60 * 24)
  ))

  let age: number | null = null
  if (visit.patient!.dateOfBirth) {
    const dob = new Date(visit.patient!.dateOfBirth)
    age = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  }

  const [signedProfilePhoto, signedAadharCard, signedBskyCard, signedUserImage] = await Promise.all([
    getSecureUrl(visit.patient!.profilePhotoUrl),
    getSecureUrl(visit.patient!.aadharCardUrl),
    getSecureUrl(visit.patient!.bskyCardUrl),
    getSecureUrl(visit.patient!.user.image),
  ])

  const signedDocuments = await Promise.all(
    visit.patient!.documents.map(async (doc) => ({
      ...doc,
      fileUrl: (await getSecureUrl(doc.fileUrl)) || doc.fileUrl,
      uploadedAt: doc.uploadedAt.toISOString(),
    }))
  )

  const serializedVisit = {
    ...visit,
    arrivalTime: visit.arrivalTime.toISOString(),
    dischargeTime: visit.dischargeTime?.toISOString() || null,
    createdAt: visit.createdAt.toISOString(),
    updatedAt: visit.updatedAt.toISOString(),
    patient: {
      ...visit.patient,
      dateOfBirth: visit.patient!.dateOfBirth?.toISOString() || null,
      createdAt: visit.patient!.createdAt.toISOString(),
      updatedAt: visit.patient!.updatedAt.toISOString(),
      profilePhotoUrl: signedProfilePhoto,
      aadharCardUrl: signedAadharCard,
      bskyCardUrl: signedBskyCard,
      user: {
        ...visit.patient!.user,
        image: signedUserImage || visit.patient!.user.image,
      },
      documents: signedDocuments,
    },
    assignedDoctor: visit.assignedDoctor ? {
      ...visit.assignedDoctor,
      joiningDate: visit.assignedDoctor.joiningDate.toISOString(),
      createdAt: visit.assignedDoctor.createdAt.toISOString(),
      updatedAt: visit.assignedDoctor.updatedAt.toISOString(),
      user: visit.assignedDoctor.user,
    } : null,
    bed: visit.bed ? {
      ...visit.bed,
      lastCleaned: visit.bed.lastCleaned?.toISOString() || null,
      createdAt: visit.bed.createdAt.toISOString(),
      updatedAt: visit.bed.updatedAt.toISOString(),
      ward: visit.bed.ward,
    } : null,
    clinicalNotes: visit.clinicalNotes.map((note) => ({
      ...note,
      date: note.date.toISOString(),
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
    ipdPrescriptions: visit.ipdPrescriptions.map((px) => ({
      ...px,
      stoppedAt: px.stoppedAt?.toISOString() || null,
      createdAt: px.createdAt.toISOString(),
      updatedAt: px.updatedAt.toISOString(),
    })),
    ipdLabRequests: visit.ipdLabRequests.map((req) => ({
      ...req,
      completedAt: req.completedAt?.toISOString() || null,
      cancelledAt: req.cancelledAt?.toISOString() || null,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    })),
  }

  const patientName = visit.patient!.user?.name || "Patient"

  const auth = await requireAuthSafe()
  const activeUserRole = auth.ok ? auth.session?.role : undefined

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clinical/emergency">
          <Button variant="outline" size="icon" className="rounded-full shadow-none neo-flat">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-800">
            {patientName}
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            ER Visit ID: <span className="font-mono text-zinc-900 bg-zinc-200 px-1.5 py-0.5 rounded-md">{visit.id}</span>
          </p>
        </div>
      </div>
      <ERPatientDashboardClient 
        visit={serializedVisit as any} 
        age={age} 
        daysAdmitted={daysAdmitted}
        dietPlans={dietPlans}
        canteenDiets={visit.canteenDiets}
        dischargeDraft={visit.discharge}
        activeUserRole={activeUserRole}
      />
    </div>
  )
}
