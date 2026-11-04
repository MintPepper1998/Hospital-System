import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileText, Eye, DollarSign, Receipt, CreditCard, Plus } from "lucide-react"
import { format } from "date-fns"
import { BillingType, BillingStatus } from "@prisma/client"
import { cn } from "@/lib/utils"
import { BillingRowActions } from "@/components/finance/billing-row-actions"
import { hospitalBillingWhere } from "@/lib/finance-scope"

interface BillingPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    from?: string
    to?: string
  }>
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams
  const q = (params.q || "").trim()
  const statusFilter = params.status || "ALL"
  const from = params.from || ""
  const to = params.to || ""

  let billings: any[] = []
  let totalRevenue = 0
  let pendingAmount = 0
  let opdRevenue = 0
  let pharmacyRevenue = 0
  let dbError = false
  let errorMessage = ""

  try {
    // Fetch all billings with patient details
    billings = await prisma.billing.findMany({
      where: hospitalBillingWhere(),
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        pharmacyCustomer: true,
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200, // Limit to recent invoices
    })

    billings = billings.filter((b) => {
      const matchesQ =
        !q ||
        b.billNumber.toLowerCase().includes(q.toLowerCase()) ||
        (b.patient.user.name || "").toLowerCase().includes(q.toLowerCase()) ||
        (b.patient.patientId || "").toLowerCase().includes(q.toLowerCase()) ||
        (b.pharmacyCustomer?.name || "").toLowerCase().includes(q.toLowerCase())

      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter
      const billDate = new Date(b.billDate).getTime()
      const fromOk = !from || billDate >= new Date(from).getTime()
      const toDate = to ? new Date(to) : null
      if (toDate) toDate.setHours(23, 59, 59, 999)
      const toOk = !toDate || billDate <= toDate.getTime()

      return matchesQ && matchesStatus && fromOk && toOk
    })

    // Calculate stats
    totalRevenue = billings
      .filter((b) => b.status === BillingStatus.PAID)
      .reduce((sum, b) => sum + b.paidAmount, 0)

    pendingAmount = billings
      .filter((b) => b.status === BillingStatus.PENDING)
      .reduce((sum, b) => sum + b.balanceAmount, 0)

    opdRevenue = billings
      .filter((b) => b.type === BillingType.OPD && b.status === BillingStatus.PAID)
      .reduce((sum, b) => sum + b.paidAmount, 0)

    pharmacyRevenue = billings
      .filter((b) => b.type === BillingType.PHARMACY && b.status === BillingStatus.PAID)
      .reduce((sum, b) => sum + b.paidAmount, 0)
  } catch (error: any) {
    dbError = true
    errorMessage = error.message || "Failed to connect to database"
    console.error("Billing page error:", error)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
            Billing & Invoicing
          </h2>
          <p className="text-muted-foreground">
            View all invoices, receipts, and track revenue
          </p>
        </div>
        <Link href="/dashboard/finance/billing/create">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Test Bill
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search bill / patient</label>
              <input
                name="q"
                defaultValue={q}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="Bill no, patient name, UHID"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <select name="status" defaultValue={statusFilter} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="ALL">All</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Unpaid/Pending</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
              <input type="date" name="from" defaultValue={from} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
              <input type="date" name="to" defaultValue={to} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Apply</Button>
              <Link
                href={`/api/finance/billing-export?q=${encodeURIComponent(q)}&status=${statusFilter}&from=${from}&to=${to}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Export CSV
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Database Error Alert */}
      {dbError && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Database Connection Error
                </h3>
                <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                  {errorMessage}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    To fix this issue:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
                    <li>Make sure Docker Desktop is running</li>
                    <li>Start the database: <code className="bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">docker-compose up -d</code></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Paid)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {billings.filter((b) => b.status === BillingStatus.PAID).length} paid invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{pendingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {billings.filter((b) => b.status === BillingStatus.PENDING).length} pending bills
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OPD Revenue</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{opdRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Consultation fees collected
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pharmacy Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₹{pharmacyRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Medicine sales revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="border-t-4 border-t-[#0066CC]">
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            Complete list of OPD and Pharmacy invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billings.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No invoices found
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billings.map((billing) => (
                    <TableRow key={billing.id}>
                      <TableCell className="font-medium">
                        {billing.billNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            billing.type === BillingType.OPD
                              ? "border-blue-500 text-blue-700 bg-blue-50"
                              : "border-purple-500 text-purple-700 bg-purple-50"
                          }
                        >
                          {billing.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/finance/billing/patient/${billing.patientId}`} className="hover:underline">
                          <p className="font-medium text-blue-700 hover:text-blue-900">{billing.pharmacyCustomer?.name || billing.patient.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {billing.pharmacyCustomer ? billing.pharmacyCustomer.phone || "Pharmacy Customer" : billing.patient.patientId}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {format(new Date(billing.billDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{billing.netAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        ₹{billing.paidAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            billing.status === BillingStatus.PAID
                              ? "default"
                              : "secondary"
                          }
                          className={
                            billing.status === BillingStatus.PAID
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-orange-500 hover:bg-orange-600"
                          }
                        >
                          {billing.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {billing.paymentMethod || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/finance/billing/${billing.id}`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              "text-[#0066CC] hover:text-[#0052A3] hover:bg-blue-50 h-8 px-2"
                            )}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Link>
                          <BillingRowActions
                            billing={{
                              id: billing.id,
                              billNumber: billing.billNumber,
                              status: billing.status,
                              paymentMethod: billing.paymentMethod,
                              notes: billing.notes,
                              paidAmount: billing.paidAmount,
                              netAmount: billing.netAmount,
                              balanceAmount: billing.balanceAmount,
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
