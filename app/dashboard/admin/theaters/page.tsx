import { getTheaters } from "@/lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TheaterDialog } from "@/components/admin/theater-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, AlertCircle, CheckCircle2 } from "lucide-react"

export default async function TheatersPage() {
  const result = await getTheaters()
  const theaters = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operation Theater Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage operation theaters and their configurations
          </p>
        </div>
        <TheaterDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Theaters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{theaters?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {theaters?.filter((t: any) => t.isOperational).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {theaters?.filter((t: any) => !t.isOperational).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theaters Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Operation Theaters</CardTitle>
          <CardDescription>
            List of all operation theaters in the hospital
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active Surgeries</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {theaters && theaters.length > 0 ? (
                theaters.map((theater: any) => (
                  <TableRow key={theater.id}>
                    <TableCell className="font-medium">{theater.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        theater.type === 'MAJOR' ? 'default' : 
                        theater.type === 'MINOR' ? 'secondary' : 
                        'outline'
                      }>
                        {theater.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{theater.floor || "—"}</TableCell>
                    <TableCell>
                      {theater.isOperational ? (
                        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Operational
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Maintenance
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {theater.surgeries?.length > 0 ? (
                        <Badge variant="destructive">{theater.surgeries.length} Active</Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {theater.equipment || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <TheaterDialog theater={theater}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TheaterDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No operation theaters found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
