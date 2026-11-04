import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardCheck, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { PreAuthActionDropdown } from "@/components/insurance/pre-auth-action-dropdown"

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Clock },
  SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: ClipboardCheck },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  APPROVED_WITH_MODIFICATION: { label: "Approved (Modified)", color: "bg-green-100 text-green-700", icon: CheckCircle },
  QUERY_RAISED: { label: "Query Raised", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  ENHANCEMENT_REQUESTED: { label: "Enhancement", color: "bg-purple-100 text-purple-700", icon: Clock },
  ENHANCEMENT_APPROVED: { label: "Enhancement OK", color: "bg-green-100 text-green-700", icon: CheckCircle },
  DISCHARGE_APPROVED: { label: "Discharge OK", color: "bg-teal-100 text-teal-700", icon: CheckCircle },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export default async function PreAuthListPage() {
  await requireAuth()

  const preAuths = await prisma.preAuthorization.findMany({
    include: {
      patient: { include: { user: true } },
      policy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const statusCounts = await prisma.preAuthorization.groupBy({
    by: ["status"],
    _count: true,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">Pre-Authorization Requests</h2>
          <p className="text-muted-foreground mt-1">Track TPA pre-authorization requests</p>
        </div>
        <Link href="/dashboard/insurance/pre-auth/create">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <ClipboardCheck className="h-4 w-4" /> New Pre-Auth
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(statusConfig).slice(0, 5).map(([status, config]) => {
          const count = statusCounts.find((s) => s.status === status)?._count || 0
          const Icon = config.icon
          return (
            <Card key={status} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Pre-Authorizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">PA Number</th>
                  <th className="pb-2 font-medium">Patient</th>
                  <th className="pb-2 font-medium">Diagnosis</th>
                  <th className="pb-2 font-medium">Treatment</th>
                  <th className="pb-2 font-medium text-right">Est. Cost</th>
                  <th className="pb-2 font-medium text-right pr-4">Approved Amt</th>
                  <th className="pb-2 font-medium min-w-[120px]">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {preAuths.map((pa) => {
                  const config = statusConfig[pa.status] || { label: pa.status, color: "bg-gray-100 text-gray-700" }
                  return (
                    <tr key={pa.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3">
                        <Link href={`/dashboard/insurance/pre-auth/${pa.id}`} className="text-blue-600 hover:underline font-medium">
                          {pa.preAuthNumber}
                        </Link>
                      </td>
                      <td className="py-3">
                        <p className="font-medium">{pa.patient?.user?.name || "Unknown"}</p>
                      </td>
                      <td className="py-3">
                        <p className="truncate max-w-[200px]">{pa.provisionalDiagnosis}</p>
                        {pa.icdPrimaryCode && (
                          <p className="text-xs text-muted-foreground">{pa.icdPrimaryCode}</p>
                        )}
                      </td>
                      <td className="py-3">
                        <p className="truncate max-w-[200px]">{pa.proposedTreatment}</p>
                      </td>
                      <td className="py-3 text-right">{formatCurrency(pa.totalEstimatedCost)}</td>
                      <td className="py-3 text-right text-green-700 font-medium pr-4">
                        {pa.approvedAmount ? formatCurrency(pa.approvedAmount) : "-"}
                      </td>
                      <td className="py-3">
                        <Badge className={`${config.color} whitespace-nowrap`} variant="outline">{config.label}</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(pa.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 text-right">
                        <PreAuthActionDropdown 
                          preAuthId={pa.id} 
                          status={pa.status} 
                          totalEstimatedCost={pa.totalEstimatedCost} 
                        />
                      </td>
                    </tr>
                  )
                })}
                {preAuths.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      No pre-authorization requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
