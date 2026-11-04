"use client"

import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileWarning, Search, Plus, Filter, ArrowUpRight, ArrowDownRight, Pencil, Trash2, Loader2 } from "lucide-react"
import { NewAdjustmentModal } from "./new-adjustment-modal"
import { deleteStockAdjustment } from "@/app/actions/stock-adjustment"

export function StockAdjustmentsClient({ initialAdjustments }: { initialAdjustments: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [adjustmentToEdit, setAdjustmentToEdit] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleEdit = (adj: any) => {
    setAdjustmentToEdit(adj)
    setIsNewModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this adjustment? This will revert the stock quantities.")) return
    
    setIsDeleting(id)
    const result = await deleteStockAdjustment(id)
    if (result.success) {
      toast.success("Adjustment deleted and stock reverted")
    } else {
      toast.error(result.message || "Failed to delete adjustment")
    }
    setIsDeleting(null)
  }

  const filtered = initialAdjustments.filter(adj => 
    adj.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (adj.notes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    adj.adjustedBy.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by reason, notes, or staff..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-11 border-slate-200 bg-white/50 backdrop-blur-xl focus-visible:ring-indigo-500 rounded-xl"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="h-11 rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button 
            onClick={() => {
              setAdjustmentToEdit(null)
              setIsNewModalOpen(true)
            }}
            className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Adjustment
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-white/50 backdrop-blur-xl border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">Adjustment History</CardTitle>
          <CardDescription>Record of all manual stock changes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-600 h-12">Date</TableHead>
                  <TableHead className="font-semibold text-slate-600">Reason</TableHead>
                  <TableHead className="font-semibold text-slate-600">Items Adjusted</TableHead>
                  <TableHead className="font-semibold text-slate-600">Staff</TableHead>
                  <TableHead className="font-semibold text-slate-600">Notes</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      No adjustments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((adj) => (
                    <TableRow key={adj.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-700">
                        <div className="flex flex-col">
                          <span>{format(new Date(adj.date), "dd MMM yyyy")}</span>
                          <span className="text-xs text-slate-400">{format(new Date(adj.date), "hh:mm a")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-semibold rounded-lg">
                          {adj.reason}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {adj.items.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-800 truncate max-w-[150px]" title={item.inventoryBatch?.medicine?.name}>
                                {item.inventoryBatch?.medicine?.name}
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-md bg-slate-100">
                                {item.inventoryBatch?.batchNumber}
                              </Badge>
                              <span className={`flex items-center text-xs font-bold ${item.quantityChange > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {item.quantityChange > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                                {Math.abs(item.quantityChange)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{adj.adjustedBy}</TableCell>
                      <TableCell className="text-slate-500 max-w-[200px] truncate" title={adj.notes || ""}>
                        {adj.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => handleEdit(adj)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(adj.id)}
                            disabled={isDeleting === adj.id}
                          >
                            {isDeleting === adj.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NewAdjustmentModal 
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        adjustmentToEdit={adjustmentToEdit}
      />
    </div>
  )
}
