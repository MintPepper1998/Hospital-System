import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Radiation } from "lucide-react"
import { LabTestTable } from "@/components/admin/lab-test-table"

export default async function RadiologyTestManagementPage() {
  // Fetch ONLY RADIOLOGY tests
  const radiologyTests = await prisma.labTestCatalog.findMany({
    where: {
      type: "RADIOLOGY"
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  })

  // Group by category for stats
  const categories = Array.from(new Set(radiologyTests.map(test => test.category || 'Uncategorized')))
  const activeCount = radiologyTests.filter(test => test.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-purple-600 flex items-center gap-2">
            <Radiation className="h-8 w-8" />
            Radiology Tests Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage X-Ray, CT Scan, MRI, Ultrasound, and other imaging investigations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Radiology Tests</CardTitle>
            <Radiation className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{radiologyTests.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCount} active, {radiologyTests.length - activeCount} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Radiation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              {categories.slice(0, 3).join(', ')}{categories.length > 3 ? '...' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Range</CardTitle>
            <Radiation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {radiologyTests.length > 0 
                ? `₹${Math.min(...radiologyTests.map(t => t.price))} - ₹${Math.max(...radiologyTests.map(t => t.price))}`
                : '₹0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Radiology test price range
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Radiology Test Table */}
      <Card className="border-t-4 border-t-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Radiation className="h-5 w-5 text-purple-600" />
              Radiology Test Catalog
            </span>
          </CardTitle>
          <CardDescription>
            X-Ray, CT Scan, MRI, Ultrasound, Mammography, and other imaging investigations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LabTestTable initialTests={radiologyTests} testType="RADIOLOGY" />
        </CardContent>
      </Card>
    </div>
  )
}
