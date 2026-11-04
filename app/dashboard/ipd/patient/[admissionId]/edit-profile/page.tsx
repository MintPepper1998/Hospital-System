import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { EditPatientForm } from "@/components/patient/edit-patient-form"

export default async function IpdEditPatientProfilePage({ params }: { params: Promise<{ admissionId: string }> }) {
    const resolvedParams = await params

    const admission = await prisma.iPDAdmission.findUnique({
        where: { id: resolvedParams.admissionId },
        include: { 
            patient: {
                include: { user: true }
            }
        }
    })

    if (!admission || !admission.patient) {
        return notFound()
    }

    const patientData = admission.patient

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
                        Edit Patient Profile
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Update demographic and clinical information for {patientData.user.name}
                    </p>
                </div>
                <Link href={`/dashboard/ipd/patient/${resolvedParams.admissionId}`}>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Patient 360
                    </Button>
                </Link>
            </div>

            <EditPatientForm 
                patientData={patientData} 
                returnUrl={`/dashboard/ipd/patient/${resolvedParams.admissionId}`} 
            />
        </div>
    )
}
