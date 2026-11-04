import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Users } from "lucide-react"
import Link from "next/link"

const schemeColors: Record<string, string> = {
  PRIVATE: "bg-blue-100 text-blue-800",
  PMJAY: "bg-green-100 text-green-800",
  BSKY: "bg-orange-100 text-orange-800",
  CGHS: "bg-purple-100 text-purple-800",
  ECHS: "bg-indigo-100 text-indigo-800",
  SELF_PAY: "bg-gray-100 text-gray-800",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export default async function ActivePoliciesPage() {
  await requireAuth()

  const policies = await prisma.insurancePolicy.findMany({
    where: { isActive: true },
    include: {
      patient: { include: { user: true } },
      _count: { select: { claims: true, preAuthorizations: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const stats = await prisma.insurancePolicy.groupBy({
    by: ["schemeType"],
    where: { isActive: true },
    _count: true,
    _sum: { coverageAmount: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">Active Insurance Policies</h2>
        <p className="text-muted-foreground mt-1">All registered patients with active insurance coverage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.schemeType}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Badge className={schemeColors[s.schemeType] || ""}>{s.schemeType}</Badge>
                <span className="text-2xl font-bold">{s._count}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total Coverage: {formatCurrency(s._sum.coverageAmount || 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Policies ({policies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Patient</th>
                  <th className="pb-2 font-medium">Policy No.</th>
                  <th className="pb-2 font-medium">Scheme</th>
                  <th className="pb-2 font-medium">Provider / TPA</th>
                  <th className="pb-2 font-medium text-right">Sum Insured</th>
                  <th className="pb-2 font-medium text-right">Balance</th>
                  <th className="pb-2 font-medium">Valid Until</th>
                  <th className="pb-2 font-medium text-center">Claims</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3">
                      <p className="font-medium">{policy.patient?.user?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{policy.patient?.patientId}</p>
                    </td>
                    <td className="py-3">{policy.policyNumber}</td>
                    <td className="py-3">
                      <Badge className={schemeColors[policy.schemeType] || ""} variant="outline">
                        {policy.schemeType}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <p>{policy.providerName}</p>
                      {policy.tpaName && <p className="text-xs text-muted-foreground">{policy.tpaName}</p>}
                    </td>
                    <td className="py-3 text-right">{formatCurrency(policy.coverageAmount)}</td>
                    <td className="py-3 text-right text-green-700">
                      {formatCurrency(policy.balanceAvailable || policy.coverageAmount)}
                    </td>
                    <td className="py-3">{new Date(policy.endDate).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 text-center">{policy._count.claims}</td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No active policies found
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
