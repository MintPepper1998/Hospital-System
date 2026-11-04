"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export function InventoryAlertCards({ medicines, batches }: { medicines: any[], batches: any[] }) {
  const [openDialog, setOpenDialog] = useState<"LOW_STOCK" | "EXPIRING" | "EXPIRED" | null>(null)

  const lowStockMedicines = medicines.filter(m => m.isLowStock)
  const expiringBatches = batches.filter(b => b.isExpiringSoon && !b.isExpired)
  const expiredBatches = batches.filter(b => b.isExpired)

  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-orange-50/50 transition-colors border-orange-100 hover:border-orange-200"
        onClick={() => setOpenDialog("LOW_STOCK")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{lowStockMedicines.length}</div>
          <p className="text-xs text-muted-foreground">Need reorder</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:bg-yellow-50/50 transition-colors border-yellow-100 hover:border-yellow-200"
        onClick={() => setOpenDialog("EXPIRING")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{expiringBatches.length}</div>
          <p className="text-xs text-muted-foreground">Next 90 days</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:bg-red-50/50 transition-colors border-red-100 hover:border-red-200"
        onClick={() => setOpenDialog("EXPIRED")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expired</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{expiredBatches.length}</div>
          <p className="text-xs text-muted-foreground">Remove stock</p>
        </CardContent>
      </Card>

      {/* Dialog for Details */}
      <Dialog open={openDialog !== null} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="sm:!max-w-5xl w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "LOW_STOCK" && "Low Stock Medicines"}
              {openDialog === "EXPIRING" && "Expiring Soon (Next 90 Days)"}
              {openDialog === "EXPIRED" && "Expired Batches"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            {openDialog === "LOW_STOCK" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Medicine</TableHead>
                    <TableHead className="w-[30%]">Batch No.</TableHead>
                    <TableHead className="text-right w-[15%]">Current Stock</TableHead>
                    <TableHead className="text-right w-[15%]">Min Stock Level</TableHead>
                    <TableHead className="text-center w-[10%]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockMedicines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No medicines are currently running low.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockMedicines.map(m => {
                      const medBatches = batches.filter(b => b.medicineId === m.id && b.quantity > 0)
                      const batchStrings = medBatches.map(b => b.batchNumber).join(", ") || "-"

                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium whitespace-normal break-words">{m.name}</TableCell>
                          <TableCell className="whitespace-normal break-words text-muted-foreground text-xs">{batchStrings}</TableCell>
                          <TableCell className="text-right font-bold text-orange-600">{m.totalStock}</TableCell>
                          <TableCell className="text-right">{m.minStockLevel}</TableCell>
                          <TableCell className="text-center">
                            {m.totalStock === 0 ? (
                              <Badge variant="destructive" className="whitespace-nowrap">Out of Stock</Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-200 whitespace-nowrap">Low Stock</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}

            {(openDialog === "EXPIRING" || openDialog === "EXPIRED") && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openDialog === "EXPIRING" && expiringBatches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No batches expiring soon.
                      </TableCell>
                    </TableRow>
                  )}
                  {openDialog === "EXPIRED" && expiredBatches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No expired batches.
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {(openDialog === "EXPIRING" ? expiringBatches : expiredBatches).map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.medicine?.name || 'Unknown'}</TableCell>
                      <TableCell>{b.batchNumber}</TableCell>
                      <TableCell className="text-right font-bold">{b.quantity}</TableCell>
                      <TableCell className={openDialog === "EXPIRED" ? "text-red-600" : "text-yellow-600"}>
                        {format(new Date(b.expiryDate), "MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-center">
                        {openDialog === "EXPIRED" ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200">Expiring Soon</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
