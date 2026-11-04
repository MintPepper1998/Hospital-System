import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateWardDialog } from "@/components/ipd/create-ward-dialog"
import { CreateBedDialog } from "@/components/ipd/create-bed-dialog"
import { EditBedDialog } from "@/components/ipd/edit-bed-dialog"
import { EditWardDialog } from "@/components/ipd/edit-ward-dialog"
import { DeleteBedDialog } from "@/components/ipd/delete-bed-dialog"
import { DeleteWardDialog } from "@/components/ipd/delete-ward-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Bed, Building2 } from "lucide-react"

export default async function BedsManagementPage() {
  // Fetch all wards with their beds
  const wards = await prisma.ward.findMany({
    where: { isActive: true },
    include: {
      beds: {
        orderBy: { bedNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  // Calculate stats
  const totalBeds = await prisma.bed.count()
  const availableBeds = await prisma.bed.count({ where: { status: "AVAILABLE" } })
  const occupiedBeds = await prisma.bed.count({ where: { status: "OCCUPIED" } })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bed & Ward Management</h2>
          <p className="text-muted-foreground mt-2">
            Configure wards and beds for the IPD department
          </p>
        </div>
        <div className="flex gap-2">
          <CreateWardDialog />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeds}</div>
            <p className="text-xs text-muted-foreground">Across all wards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Bed className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableBeds}</div>
            <p className="text-xs text-muted-foreground">Ready for admission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Bed className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>
      </div>

      {/* Wards List */}
      {wards.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No Wards Created</h3>
              <p className="text-muted-foreground mt-2">
                Get started by creating your first ward
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        wards.map((ward) => (
          <Card key={ward.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <CardTitle>{ward.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {ward.type} | {ward.floor || "Floor not specified"} |{" "}
                      {ward.capacity} Bed{ward.capacity !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <EditWardDialog
                    ward={{
                      id: ward.id,
                      name: ward.name,
                      type: ward.type,
                      floor: ward.floor,
                      description: ward.description,
                    }}
                  />
                  <DeleteWardDialog
                    ward={{
                      id: ward.id,
                      name: ward.name,
                      type: ward.type,
                      bedCount: ward.beds.length,
                      occupiedCount: ward.beds.filter((b) => b.status === "OCCUPIED").length,
                    }}
                  />
                  <CreateBedDialog wardId={ward.id} wardName={ward.name} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ward.beds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bed className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No beds added yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bed Number</TableHead>
                      <TableHead>Price/Day</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ward.beds.map((bed) => (
                      <TableRow key={bed.id}>
                        <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                        <TableCell>₹{bed.pricePerDay.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {bed.features || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bed.status === "AVAILABLE"
                                ? "default"
                                : bed.status === "OCCUPIED"
                                ? "destructive"
                                : "secondary"
                            }
                            className={
                              bed.status === "AVAILABLE"
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : bed.status === "OCCUPIED"
                                ? "bg-red-100 text-red-700 hover:bg-red-100"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                            }
                          >
                            {bed.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <EditBedDialog bed={bed} wardName={ward.name} />
                            <DeleteBedDialog bed={bed} wardName={ward.name} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
