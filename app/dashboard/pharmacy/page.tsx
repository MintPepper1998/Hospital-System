import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PillBottle, TrendingUp, AlertTriangle, DollarSign, Package } from "lucide-react"
import { format } from "date-fns"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getTopSellingMedicines } from "@/app/actions/pharmacy-analytics"
import { PharmacyRevenueCard } from "@/components/pharmacy/pharmacy-revenue-card"

export default async function PharmacyDashboardPage() {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user || (user.role !== "PHARMACIST" && user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard")
  }

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // Fetch pharmacy data
  const [todaySales, recentSales, lowStockMedicines, expiringBatches, totalRevenue, topSellingResult, todayPayments] = await Promise.all([
    // Today's sales count
    prisma.billing.count({
      where: {
        type: 'PHARMACY',
        billDate: {
          gte: today,
          lt: tomorrow
        }
      }
    }),

    // Recent sales (last 10)
    prisma.billing.findMany({
      where: {
        type: 'PHARMACY'
      },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    }),

    // Low stock medicines — match inventory page logic (totalStock <= minStockLevel)
    prisma.medicine.findMany({
      where: {
        isActive: true
      },
      include: {
        inventoryBatches: {
          where: {
            isActive: true,
            isExpired: false,
            quantity: {
              gt: 0
            }
          }
        }
      }
    }).then(medicines => {
      return medicines
        .map(med => ({
          ...med,
          totalStock: med.inventoryBatches.reduce((sum, batch) => sum + batch.quantity, 0)
        }))
        .filter(med => med.totalStock <= med.minStockLevel)
        .sort((a, b) => a.totalStock - b.totalStock)
        .slice(0, 10)
    }),

    // Expiring batches (next 90 days — matches inventory page)
    prisma.inventoryBatch.findMany({
      where: {
        isActive: true,
        isExpired: false,
        quantity: {
          gt: 0
        },
        expiryDate: {
          gte: today,
          lte: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        medicine: true
      },
      orderBy: {
        expiryDate: 'asc'
      },
      take: 20
    }),

    // Total revenue (today)
    prisma.billing.aggregate({
      where: {
        type: 'PHARMACY',
        billDate: {
          gte: today,
          lt: tomorrow
        },
        status: 'PAID'
      },
      _sum: {
        netAmount: true
      }
    }),

    // Top Selling Medicines
    getTopSellingMedicines(5),

    // Today's pharmacy bills with payment method (for revenue breakdown)
    // Pharmacy POS stores paymentMethod on the Billing record directly
    prisma.billing.findMany({
      where: {
        type: 'PHARMACY',
        billDate: {
          gte: today,
          lt: tomorrow
        },
        status: 'PAID'
      },
      select: {
        paymentMethod: true,
        netAmount: true,
        notes: true,
        splitCashAmount: true,
        splitUpiAmount: true,
        splitCardAmount: true
      }
    })
  ])

  const topSellingMedicines = (topSellingResult.success ? topSellingResult.data : []) || []

  // Build payment breakdown by method, tracking split sub-amounts
  const breakdownMap = new Map<string, { total: number; count: number; splitCash: number; splitUpi: number; splitCard: number }>()
  for (const b of todayPayments) {
    const key = b.paymentMethod || "CASH"
    const existing = breakdownMap.get(key) || { total: 0, count: 0, splitCash: 0, splitUpi: 0, splitCard: 0 }
    existing.total += b.netAmount
    existing.count += 1

    // Use structured split fields first, fall back to parsing notes for legacy records
    if (key === "SPLIT") {
      if (b.splitCashAmount != null || b.splitUpiAmount != null || b.splitCardAmount != null) {
        existing.splitCash += b.splitCashAmount || 0
        existing.splitUpi += b.splitUpiAmount || 0
        existing.splitCard += b.splitCardAmount || 0
      } else if (b.notes) {
        const cashMatch = b.notes.match(/Cash:\s*₹?([\d.]+)/)
        const upiMatch = b.notes.match(/UPI:\s*₹?([\d.]+)/)
        const cardMatch = b.notes.match(/Card:\s*₹?([\d.]+)/)
        existing.splitCash += cashMatch ? parseFloat(cashMatch[1]) : 0
        existing.splitUpi += upiMatch ? parseFloat(upiMatch[1]) : 0
        existing.splitCard += cardMatch ? parseFloat(cardMatch[1]) : 0
      }
    }

    breakdownMap.set(key, existing)
  }
  const paymentBreakdown = Array.from(breakdownMap.entries())
    .map(([method, data]) => ({ method, ...data }))
    .sort((a, b) => b.total - a.total)

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return "₹0"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <PillBottle className="h-8 w-8" />
            Pharmacy Dashboard
          </h2>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/pharmacy/pos/billing">
            <Button className="bg-green-600 hover:bg-green-700">
              <DollarSign className="mr-2 h-4 w-4" />
              New Sale
            </Button>
          </Link>
          <Link href="/dashboard/pharmacy/inventory">
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Inventory
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todaySales}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total transactions
            </p>
          </CardContent>
        </Card>

        <PharmacyRevenueCard
          totalRevenue={totalRevenue._sum.netAmount || 0}
          breakdown={paymentBreakdown}
        />

        <Card className="border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockMedicines.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Below minimum level
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Package className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiringBatches.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Within 90 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales, Alerts & Top Selling */}
      <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#0066CC]" />
              Recent Sales
            </CardTitle>
            <CardDescription>Last 10 transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PillBottle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sales yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{sale.billNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.patient.user.name} • {sale.items.length} items
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.createdAt), "MMM dd, hh:mm a")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(sale.netAmount)}</p>
                      <Badge variant={sale.status === 'PAID' ? 'outline' : 'secondary'} className={sale.status === 'PAID' ? 'bg-green-600 text-white' : ''}>
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Medicines below minimum level</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockMedicines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>All medicines adequately stocked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockMedicines.map((medicine) => (
                  <div key={medicine.id} className="flex items-center justify-between p-3 border border-orange-200 dark:border-orange-900 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                    <div>
                      <p className="font-medium text-sm">{medicine.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {medicine.genericName}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">
                        {medicine.totalStock} / {medicine.minStockLevel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      {/* Top Selling Medicines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Top Selling
            </CardTitle>
            <CardDescription>Highest volume in last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {topSellingMedicines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PillBottle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sales data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topSellingMedicines.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-purple-200 dark:border-purple-900 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <div>
                      <p className="font-medium text-sm truncate max-w-[150px]" title={item.name}>{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} units sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-purple-700 dark:text-purple-400">{formatCurrency(item.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-red-600" />
            Expiring Batches (Next 90 Days)
          </CardTitle>
          <CardDescription>Review and take action on expiring stock</CardDescription>
        </CardHeader>
        <CardContent>
          {expiringBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No batches expiring soon</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringBatches.map((batch) => {
                  const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.medicine.name}</TableCell>
                      <TableCell>{batch.batchNumber}</TableCell>
                      <TableCell>{batch.quantity}</TableCell>
                      <TableCell>{format(new Date(batch.expiryDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={daysLeft <= 7 ? 'border-red-500 text-red-700 dark:text-red-400' : 'border-orange-500 text-orange-700 dark:text-orange-400'}>
                          {daysLeft} days
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
