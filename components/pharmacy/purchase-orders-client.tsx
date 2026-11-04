"use client"

import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Filter, Eye, AlertTriangle, Pencil, Trash2, Loader2 } from "lucide-react"
import { ViewPurchaseOrderModal } from "./view-purchase-order-modal"
import { deletePurchaseOrder } from "@/app/actions/purchase-order"

export function PurchaseOrdersClient({ initialOrders }: { initialOrders: any[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [viewPo, setViewPo] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleAutoPo = () => {
    router.push("/dashboard/pharmacy/purchase-orders/new?auto=true")
  }

  const handleEdit = (po: any) => {
    router.push(`/dashboard/pharmacy/purchase-orders/${po.id}/edit`)
  }

  const handleNewPO = () => {
    router.push("/dashboard/pharmacy/purchase-orders/new")
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase order?")) return
    
    setIsDeleting(id)
    const result = await deletePurchaseOrder(id)
    if (result.success) {
      toast.success("Purchase order deleted successfully")
    } else {
      toast.error(result.message || "Failed to delete purchase order")
    }
    setIsDeleting(null)
  }

  const filtered = initialOrders.filter(po => 
    po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT": return <Badge variant="outline" className="bg-slate-100 text-slate-700">Draft</Badge>
      case "SENT": return <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200">Sent</Badge>
      case "PARTIAL": return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Partial</Badge>
      case "FULFILLED": return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Fulfilled</Badge>
      case "CANCELLED": return <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">Cancelled</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by PO number or supplier..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-11 border-slate-200 bg-white/50 backdrop-blur-xl focus-visible:ring-indigo-500 rounded-xl"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            onClick={handleAutoPo}
            className="h-11 rounded-xl text-amber-700 border-amber-200 hover:bg-amber-50"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Auto-PO from Low Stock
          </Button>
          <Button 
            onClick={handleNewPO}
            className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-white/50 backdrop-blur-xl border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">Purchase Orders</CardTitle>
          <CardDescription>Track orders sent to suppliers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-600 h-12">PO Number</TableHead>
                  <TableHead className="font-semibold text-slate-600">Date</TableHead>
                  <TableHead className="font-semibold text-slate-600">Supplier</TableHead>
                  <TableHead className="font-semibold text-slate-600">Items</TableHead>
                  <TableHead className="font-semibold text-slate-600">Total Amount</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((po) => (
                    <TableRow key={po.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-700">
                        {po.orderNumber}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {format(new Date(po.date), "dd MMM yyyy")}
                        {po.expectedDate && (
                          <div className="text-xs text-slate-400 mt-1">
                            Exp: {format(new Date(po.expectedDate), "dd MMM yyyy")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800">{po.supplier.name}</div>
                        {po.supplier.phone && <div className="text-xs text-slate-500">{po.supplier.phone}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                          {po.items.length} items
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">
                        {formatCurrency(po.totalAmount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(po.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-indigo-600 rounded-lg hover:bg-indigo-50"
                            onClick={() => setViewPo(po)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-indigo-600 rounded-lg hover:bg-indigo-50"
                            onClick={() => handleEdit(po)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-rose-500 rounded-lg hover:bg-rose-50"
                            onClick={() => handleDelete(po.id)}
                            disabled={isDeleting === po.id}
                          >
                            {isDeleting === po.id ? (
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

      <ViewPurchaseOrderModal
        isOpen={!!viewPo}
        onClose={() => setViewPo(null)}
        po={viewPo}
      />
    </div>
  )
}
