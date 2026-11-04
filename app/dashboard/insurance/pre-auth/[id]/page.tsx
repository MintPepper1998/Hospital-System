import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700" },
  APPROVED_WITH_MODIFICATION: { label: "Approved (Modified)", color: "bg-green-100 text-green-700" },
  QUERY_RAISED: { label: "Query Raised", color: "bg-amber-100 text-amber-700" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700" },
  ENHANCEMENT_REQUESTED: { label: "Enhancement Requested", color: "bg-purple-100 text-purple-700" },
  ENHANCEMENT_APPROVED: { label: "Enhancement Approved", color: "bg-green-100 text-green-700" },
  DISCHARGE_APPROVED: { label: "Discharge Approved", color: "bg-teal-100 text-teal-700" },
}

function formatCurrency(amount: number | null) {
  if (amount == null) return "-"
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export default async function PreAuthDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params

  const preAuth = await prisma.preAuthorization.findUnique({
    where: { id },
    include: {
      patient: { include: { user: true } },
      policy: true,
    },
  })

  if (!preAuth) notFound()

  const config = statusConfig[preAuth.status] || { label: preAuth.status, color: "bg-gray-100 text-gray-700" }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">{preAuth.preAuthNumber}</h2>
          <p className="text-muted-foreground mt-1">Pre-Authorization Detail</p>
        </div>
        <Badge className={`${config.color} text-base px-4 py-2`}>{config.label}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Patient Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{preAuth.patient?.user?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Policy No.</span><span className="font-medium">{preAuth.policy?.policyNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Insurer</span><span className="font-medium">{preAuth.policy?.providerName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Scheme</span><span className="font-medium">{preAuth.policy?.schemeType}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Diagnosis</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Provisional Diagnosis</span><span className="font-medium">{preAuth.provisionalDiagnosis}</span></div>
            {preAuth.icdPrimaryCode && (
              <div className="flex justify-between"><span className="text-muted-foreground">ICD-10 Code</span><span className="font-mono font-medium">{preAuth.icdPrimaryCode} - {preAuth.icdPrimaryDescription}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Treatment</span><span className="font-medium">{preAuth.proposedTreatment}</span></div>
            {preAuth.surgeryName && (
              <div className="flex justify-between"><span className="text-muted-foreground">Surgery</span><span className="font-medium">{preAuth.surgeryName}</span></div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Cost Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground">Room Rent</p><p className="font-medium">{formatCurrency(preAuth.estimatedRoomRent)}</p></div>
            <div><p className="text-muted-foreground">ICU Charges</p><p className="font-medium">{formatCurrency(preAuth.estimatedIcuCharges)}</p></div>
            <div><p className="text-muted-foreground">Investigation</p><p className="font-medium">{formatCurrency(preAuth.estimatedInvestigation)}</p></div>
            <div><p className="text-muted-foreground">OT Charges</p><p className="font-medium">{formatCurrency(preAuth.estimatedOtCharges)}</p></div>
            <div><p className="text-muted-foreground">Professional Fees</p><p className="font-medium">{formatCurrency(preAuth.estimatedProfessionalFees)}</p></div>
            <div><p className="text-muted-foreground">Medicines</p><p className="font-medium">{formatCurrency(preAuth.estimatedMedicines)}</p></div>
            <div><p className="text-muted-foreground">Implants</p><p className="font-medium">{formatCurrency(preAuth.estimatedImplants)}</p></div>
            <div><p className="text-muted-foreground">Other</p><p className="font-medium">{formatCurrency(preAuth.estimatedOtherCharges)}</p></div>
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between">
            <span className="text-lg font-semibold">Total Estimated Cost</span>
            <span className="text-xl font-bold text-blue-700">{formatCurrency(preAuth.totalEstimatedCost)}</span>
          </div>
          {preAuth.approvedAmount && (
            <div className="mt-2 flex justify-between">
              <span className="text-lg font-semibold text-green-700">Approved Amount</span>
              <span className="text-xl font-bold text-green-700">{formatCurrency(preAuth.approvedAmount)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {(preAuth.approvedRemarks || preAuth.queryDetails || preAuth.rejectionReason) && (
        <Card>
          <CardHeader><CardTitle>TPA Response</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {preAuth.approvedRemarks && (
              <div><p className="text-muted-foreground">Remarks</p><p className="mt-1 p-3 bg-green-50 rounded-lg">{preAuth.approvedRemarks}</p></div>
            )}
            {preAuth.queryDetails && (
              <div><p className="text-muted-foreground">Query Details</p><p className="mt-1 p-3 bg-amber-50 rounded-lg">{preAuth.queryDetails}</p></div>
            )}
            {preAuth.rejectionReason && (
              <div><p className="text-muted-foreground">Rejection Reason</p><p className="mt-1 p-3 bg-red-50 rounded-lg">{preAuth.rejectionReason}</p></div>
            )}
          </CardContent>
        </Card>
      )}

      {preAuth.enhancementAmount && (
        <Card>
          <CardHeader><CardTitle>Enhancement Request</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">{formatCurrency(preAuth.enhancementAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reason</span><span>{preAuth.enhancementReason || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{preAuth.enhancementStatus || "PENDING"}</Badge></div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
