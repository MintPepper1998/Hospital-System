import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSearch,
  IndianRupee,
  TrendingUp,
} from "lucide-react"
import { format } from "date-fns"
import { getActiveClaims, getClaimStats } from "@/lib/actions/insurance"
import { ClaimActionDialog } from "@/components/finance/claim-action-dialog"

// Status badge styling
function getStatusBadge(status: string) {
  switch (status) {
    case "SUBMITTED":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <Clock className="h-3 w-3 mr-1" />
          Submitted
        </Badge>
      )
    case "UNDER_REVIEW":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          <FileSearch className="h-3 w-3 mr-1" />
          Under Review
        </Badge>
      )
    case "IN_PROCESS":
      return (
        <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
          <ShieldCheck className="h-3 w-3 mr-1" />
          In Process
        </Badge>
      )
    case "QUERY_RAISED":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Query Raised
        </Badge>
      )
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      )
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function InsuranceTPAPage() {
  const [claimsResult, statsResult] = await Promise.all([
    getActiveClaims(),
    getClaimStats(),
  ])

  const claims = claimsResult.data || []
  const stats = statsResult.data

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-teal-600" />
          Insurance Claims Desk
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track and manage all active insurance claims. Approve claims to auto-record payments.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 uppercase">Submitted</span>
            </div>
            <p className="text-2xl font-bold text-blue-800 mt-1">{stats.submitted}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700 uppercase">Under Review</span>
            </div>
            <p className="text-2xl font-bold text-purple-800 mt-1">{stats.underReview}</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-medium text-indigo-700 uppercase">In Process</span>
            </div>
            <p className="text-2xl font-bold text-indigo-800 mt-1">{stats.inProcess}</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 uppercase">Query Raised</span>
            </div>
            <p className="text-2xl font-bold text-amber-800 mt-1">{stats.queryRaised}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase">Approved Total</span>
            </div>
            <p className="text-2xl font-bold text-green-800 mt-1">
              ₹{stats.totalApprovedAmount.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-medium text-teal-700 uppercase">Pending Value</span>
            </div>
            <p className="text-2xl font-bold text-teal-800 mt-1">
              ₹{stats.totalPendingAmount.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Active Claims Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              Active Claims
              <Badge variant="secondary" className="ml-1">{claims.length}</Badge>
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              Showing claims that are Submitted, Under Review, In Process, or Query Raised
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No active claims</p>
              <p className="text-sm mt-1">
                All insurance claims have been processed. New claims will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider / TPA</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Claim Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim: any) => {
                    const patient = claim.policy?.patient
                    const patientName = patient?.user?.name || "Unknown"
                    const providerName = claim.policy?.providerName || "N/A"
                    const invoiceNumber = claim.billing?.billNumber || "—"

                    return (
                      <TableRow key={claim.id} className="hover:bg-gray-50/50">
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(claim.submittedAt), "dd MMM yy")}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">{claim.claimNumber}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{patientName}</p>
                            <p className="text-xs text-muted-foreground">
                              Policy: {claim.policy?.policyNumber || "N/A"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{providerName}</TableCell>
                        <TableCell>
                          {claim.billing ? (
                            <a
                              href={`/dashboard/finance/billing/${claim.billing.id}`}
                              className="text-sm text-blue-600 hover:underline font-medium"
                            >
                              {invoiceNumber}
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">No invoice</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">₹{claim.claimAmount.toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(claim.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <ClaimActionDialog
                            claimId={claim.id}
                            claimNumber={claim.claimNumber}
                            claimAmount={claim.claimAmount}
                            providerName={providerName}
                            patientName={patientName}
                            currentStatus={claim.status}
                            invoiceNumber={claim.billing?.billNumber}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Quick Legend */}
          {claims.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
              <span className="font-medium">Legend:</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Submitted</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Under Review</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> In Process</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Query Raised</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
