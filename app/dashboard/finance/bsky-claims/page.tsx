import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Landmark, Clock3, CheckCircle2, IndianRupee, Filter } from "lucide-react"
import { getBskyClaimsDashboardData } from "@/app/actions/finance"
import { BskyClaimSettleDialog } from "@/components/finance/bsky-claim-settle-dialog"
import { BskyClaimsExportButton } from "@/components/finance/bsky-claims-export-button"

interface PageProps {
  searchParams: Promise<{
    status?: "PENDING" | "SETTLED" | "ALL"
  }>
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export default async function BskyClaimsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = params.status === "SETTLED" || params.status === "ALL" ? params.status : "PENDING"

  const { stats, claims, bankAccounts } = await getBskyClaimsDashboardData(status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="h-6 w-6 text-teal-600" />
            BSKY Claims & Receivables
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track pending government payouts and settle receivables against bank ledgers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Link href="/dashboard/finance/bsky-claims?status=PENDING">
            <Button variant={status === "PENDING" ? "default" : "outline"} size="sm">Pending Claims</Button>
          </Link>
          <Link href="/dashboard/finance/bsky-claims?status=SETTLED">
            <Button variant={status === "SETTLED" ? "default" : "outline"} size="sm">Settled Claims</Button>
          </Link>
          <Link href="/dashboard/finance/bsky-claims?status=ALL">
            <Button variant={status === "ALL" ? "default" : "outline"} size="sm">All</Button>
          </Link>
          <BskyClaimsExportButton claims={claims} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Pending Claims</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatINR(stats.totalPendingClaims)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Settled Claims</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatINR(stats.totalSettledClaims)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending Claim Count</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.pendingClaimCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Settled Claim Count</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{stats.settledClaimCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">BSKY Claim Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No claims found for this filter</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Admission/Bill Ref</TableHead>
                    <TableHead className="text-right">Total Billed</TableHead>
                    <TableHead className="text-center">Claim Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => {
                    const isPending = claim.status === "PENDING"
                    return (
                      <TableRow key={claim.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(claim.billDate), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/finance/billing/patient/${claim.patientDbId}`} className="hover:underline">
                            <p className="font-medium text-sm text-blue-700 hover:text-blue-900">{claim.patientName}</p>
                            <p className="text-xs text-muted-foreground">{claim.patientId}</p>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="font-mono text-xs">{claim.billNumber}</Badge>
                            <p className="text-[11px] text-muted-foreground font-mono">{claim.id.slice(-8)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatINR(claim.totalBilledAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isPending ? (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                              <Clock3 className="h-3 w-3 mr-1" />
                              {claim.claimStatusLabel}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {claim.claimStatusLabel}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <BskyClaimSettleDialog
                              billId={claim.id}
                              billNumber={claim.billNumber}
                              patientName={claim.patientName}
                              amount={claim.pendingAmount}
                              accounts={bankAccounts}
                            />
                          ) : (
                            <Badge variant="outline" className="text-green-700 border-green-200">
                              Settled
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
