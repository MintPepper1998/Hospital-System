import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Receipt } from "lucide-react"

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  IN_PROCESS: "bg-purple-100 text-purple-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  SETTLED: "bg-teal-100 text-teal-700",
  QUERY_RAISED: "bg-amber-100 text-amber-700",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export default async function ReimbursementClaimsPage() {
  await requireAuth()

  const claims = await prisma.insuranceClaim.findMany({
    where: { claimType: "REIMBURSEMENT" },
    include: {
      policy: { include: { patient: { include: { user: true } } } },
      billing: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">Reimbursement Claims</h2>
        <p className="text-muted-foreground mt-1">Track reimbursement claims for patients</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Reimbursement Claims ({claims.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Claim No.</th>
                  <th className="pb-2 font-medium">Patient</th>
                  <th className="pb-2 font-medium">Insurer</th>
                  <th className="pb-2 font-medium text-right">Claim Amount</th>
                  <th className="pb-2 font-medium text-right">Settled</th>
                  <th className="pb-2 font-medium">Bank Details</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 font-medium">{claim.claimNumber}</td>
                    <td className="py-3">{claim.policy?.patient?.user?.name || "Unknown"}</td>
                    <td className="py-3">{claim.policy?.providerName}</td>
                    <td className="py-3 text-right">{formatCurrency(claim.claimAmount)}</td>
                    <td className="py-3 text-right text-green-700">{claim.settledAmount ? formatCurrency(claim.settledAmount) : "-"}</td>
                    <td className="py-3 text-xs">
                      {claim.bankName ? `${claim.bankName} - ${claim.bankAccountNumber?.slice(-4) || ""}` : "-"}
                    </td>
                    <td className="py-3"><Badge className={statusColors[claim.status] || ""} variant="outline">{claim.status}</Badge></td>
                    <td className="py-3 text-muted-foreground">{new Date(claim.submittedAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
                {claims.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No reimbursement claims found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
