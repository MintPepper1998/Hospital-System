import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { EditPatientForm } from "@/components/patient/edit-patient-form"

export default async function EditPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
    const resolvedParams = await params

    const patientData = await prisma.patient.findUnique({
        where: { id: resolvedParams.patientId },
        include: { user: true }
    })

    if (!patientData) {
        return notFound()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
                        Edit Patient Information
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Update personal and contact details for {patientData.user?.name}
                    </p>
                </div>
                <Link href="/dashboard/clinical/opd">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to OPD
                    </Button>
                </Link>
            </div>

            <EditPatientForm patientData={patientData} />
        </div>
    )
}
