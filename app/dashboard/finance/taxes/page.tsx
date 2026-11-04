import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IndianRupee, Download, Receipt, FileSpreadsheet } from "lucide-react"
import { hospitalPurchaseWhere, hospitalTransactionWhere } from "@/lib/finance-scope"

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 1, 0, 0, 0, 0)
  return { start, end }
}

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

type Props = {
  searchParams?: Promise<{
    month?: string
    year?: string
  }>
}

export default async function TaxDashboardPage({ searchParams }: Props) {
  const resolved = (await searchParams) || {}
  const now = new Date()
  const selectedMonth = Number(resolved.month || now.getMonth() + 1)
  const selectedYear = Number(resolved.year || now.getFullYear())

  const month = selectedMonth >= 1 && selectedMonth <= 12 ? selectedMonth : now.getMonth() + 1
  const year = selectedYear >= 2000 && selectedYear <= 2100 ? selectedYear : now.getFullYear()
  const { start, end } = getMonthRange(month, year)

  const [purchaseAgg, revenueAgg] = await Promise.all([
    prisma.purchaseInvoice.aggregate({
      where: hospitalPurchaseWhere({ date: { gte: start, lt: end } }),
      _sum: {
        grandTotal: true,
        taxTotal: true,
      },
      _count: { id: true },
    }),
    prisma.transaction.aggregate({
      where: hospitalTransactionWhere({
        type: "INCOME",
        date: { gte: start, lt: end },
      }),
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  const totalPurchases = purchaseAgg._sum.grandTotal || 0
  const inputTaxCredit = purchaseAgg._sum.taxTotal || 0
  const totalRevenue = revenueAgg._sum.amount || 0

  const yearOptions = Array.from({ length: 8 }, (_, i) => now.getFullYear() - 4 + i)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Tax &amp; CA Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Monthly GST-ready summary and downloadable Excel workbook.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="GET">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Month</label>
          <select
            name="month"
            defaultValue={String(month)}
            className="h-10 w-[180px] rounded-md border bg-background px-3 text-sm"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={String(m.value)}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Year</label>
          <select
            name="year"
            defaultValue={String(year)}
            className="h-10 w-[140px] rounded-md border bg-background px-3 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="outline">
          Apply
        </Button>

        <Button
          type="submit"
          formAction="/api/finance/tax-report"
          formMethod="GET"
          className="ml-auto h-11 px-6 text-base bg-emerald-600 hover:bg-emerald-700"
        >
          <Download className="h-5 w-5 mr-2" />
          Download Excel for CA
        </Button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Purchases (Taxable)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              <p className="text-2xl font-bold">{formatINR(totalPurchases)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {purchaseAgg._count.id} purchase invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Input Tax Credit (ITC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-amber-600" />
              <p className="text-2xl font-bold">{formatINR(inputTaxCredit)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From purchase tax totals
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-bold">{formatINR(totalRevenue)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {revenueAgg._count.id} income transactions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
