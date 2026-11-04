import { getMedicines, getSuppliers, getInventoryBatches, getMedicineTypes } from "@/lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  PackagePlus,
  Plus
} from "lucide-react"
import { AddMedicineDialog } from "@/components/pharmacy/add-medicine-dialog"
import { AddSupplierDialog } from "@/components/pharmacy/add-supplier-dialog"
import { MedicinesTable } from "@/components/pharmacy/medicines-table"
import { SuppliersTable } from "@/components/pharmacy/suppliers-table"
import { InventoryBatchesTable } from "@/components/pharmacy/inventory-batches-table"
import Link from "next/link"
import { InventoryAlertCards } from "@/components/pharmacy/inventory-alert-cards"

export default async function PharmacyInventoryPage() {
  const [medicinesResult, suppliersResult, batchesResult, typesResult] = await Promise.all([
    getMedicines(),
    getSuppliers(),
    getInventoryBatches(),
    getMedicineTypes()
  ])

  const medicines = (medicinesResult.success ? medicinesResult.data : []) || []
  const suppliers = (suppliersResult.success ? suppliersResult.data : []) || []
  const batches = (batchesResult.success ? batchesResult.data : []) || []
  const medicineTypes = (typesResult.success && Array.isArray(typesResult.data) ? typesResult.data : []) || []

  // Calculate statistics
  const totalMedicines = (medicines || []).length
  const outOfStockCount = (medicines || []).filter((m: any) => m.totalStock === 0).length
  
  // Calculate total inventory value from batches (sellingPrice is per-unit, quantity is in units)
  // Display value at strip-level MRP: sellingPrice * medicinesPerStrip = strip MRP, then * strips
  const totalInventoryValue = (batches || []).reduce((sum: number, b: any) => {
    const sellingPrice = Number(b.sellingPrice) || 0
    const quantity = Number(b.quantity) || 0
    return sum + (sellingPrice * quantity)  // per-unit price × total units = total value
  }, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pharmacy Inventory</h2>
          <p className="text-muted-foreground">
            Manage medicines, suppliers, and stock batches
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/pharmacy/purchase-orders">
            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <PackagePlus className="mr-2 h-4 w-4" />
              Purchase Orders
            </Button>
          </Link>
          <Link href="/dashboard/pharmacy/adjustments">
            <Button variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Stock Adjustments
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalInventoryValue)}
            </div>
            <p className="text-xs text-muted-foreground">Based on MRP</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMedicines}</div>
            <p className="text-xs text-muted-foreground">Active drugs</p>
          </CardContent>
        </Card>

        <InventoryAlertCards medicines={medicines} batches={batches} />
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="medicines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="medicines">
            <Package className="h-4 w-4 mr-2" />
            Medicines ({totalMedicines})
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Users className="h-4 w-4 mr-2" />
            Suppliers ({(suppliers || []).length})
          </TabsTrigger>
          <TabsTrigger value="batches">
            <PackagePlus className="h-4 w-4 mr-2" />
            Stock Batches ({(batches || []).length})
          </TabsTrigger>
        </TabsList>

        {/* Medicines Tab */}
        <TabsContent value="medicines" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Medicine Master</CardTitle>
                  <CardDescription>
                    All medicines in the catalog with stock levels
                  </CardDescription>
                </div>
                <AddMedicineDialog medicineTypes={medicineTypes} />
              </div>
            </CardHeader>
            <CardContent>
              <MedicinesTable medicines={medicines || []} medicineTypes={medicineTypes} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Supplier Master</CardTitle>
                  <CardDescription>
                    All vendors and suppliers with contact details
                  </CardDescription>
                </div>
                <AddSupplierDialog />
              </div>
            </CardHeader>
            <CardContent>
              <SuppliersTable suppliers={suppliers || []} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Batches Tab */}
        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inventory Batches</CardTitle>
                  <CardDescription>
                    All stock batches with expiry dates and quantities
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/pharmacy/inventory/add-stock">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stock
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <InventoryBatchesTable batches={batches || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
