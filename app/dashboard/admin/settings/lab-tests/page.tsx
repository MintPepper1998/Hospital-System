import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Microscope } from "lucide-react"
import { LabTestTable } from "@/components/admin/lab-test-table"
import { LabSignatureSettings } from "@/components/admin/lab-signature-settings"
import { getHospitalSettings } from "@/app/actions/settings"

export default async function PathologyTestManagementPage() {
  // Fetch ONLY PATHOLOGY tests
  const labTests = await prisma.labTestCatalog.findMany({
    where: {
      type: "PATHOLOGY"
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  })

  // Fetch hospital info for report preview & settings
  const hospital = await getHospitalSettings()

  // Group by category for stats
  const categories = Array.from(new Set(labTests.map(test => test.category || 'Uncategorized')))
  const activeCount = labTests.filter(test => test.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-600 flex items-center gap-2">
            <Microscope className="h-8 w-8" />
            Pathology Tests Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage blood tests, urine tests, and other pathology investigations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pathology Tests</CardTitle>
            <Microscope className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{labTests.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCount} active, {labTests.length - activeCount} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Microscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground truncate">
              {categories.slice(0, 3).join(', ')}{categories.length > 3 ? '...' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Range</CardTitle>
            <Microscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {labTests.length > 0 
                ? `₹${Math.min(...labTests.map(t => t.price))} - ₹${Math.max(...labTests.map(t => t.price))}`
                : '₹0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Pathology test price range
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Signature Settings */}
      <LabSignatureSettings settings={hospital} />

      {/* Lab Test Table */}
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-blue-600" />
              Pathology Test Catalog
            </span>
          </CardTitle>
          <CardDescription>
            Blood tests, urine tests, biochemistry, hematology, serology, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LabTestTable initialTests={labTests} testType="PATHOLOGY" hospital={hospital} />
        </CardContent>
      </Card>
    </div>
  )
}
