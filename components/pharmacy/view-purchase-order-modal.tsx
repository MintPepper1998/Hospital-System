"use client"

import { useState, useRef } from "react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, X, Loader2 } from "lucide-react"

interface ViewPurchaseOrderModalProps {
  isOpen: boolean
  onClose: () => void
  po: any | null
}

export function ViewPurchaseOrderModal({ isOpen, onClose, po }: ViewPurchaseOrderModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  if (!po) return null

  const handlePrint = () => {
    setIsPrinting(true)
    if (iframeRef.current) {
      // The iframe will load the print page, and the print page's PrintTrigger
      // will call window.print(), which when called inside an iframe prints the iframe's content.
      iframeRef.current.src = `/dashboard/pharmacy/purchase-orders/${po.id}/print`
      // Reset isPrinting after a delay to allow print dialog to open
      setTimeout(() => setIsPrinting(false), 2000)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-xl border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-800">
              Purchase Order: {po.orderNumber}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-8">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Supplier Details</h3>
              <p className="font-bold text-slate-800 text-lg">{po.supplier.name}</p>
              {po.supplier.contactPerson && <p className="text-slate-600">{po.supplier.contactPerson}</p>}
              {po.supplier.phone && <p className="text-slate-600">{po.supplier.phone}</p>}
              {po.supplier.email && <p className="text-slate-600">{po.supplier.email}</p>}
              {po.supplier.address && <p className="text-slate-600 mt-2 whitespace-pre-line">{po.supplier.address}</p>}
            </div>

            <div className="space-y-1 text-right">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Order Details</h3>
              <p className="text-slate-700"><span className="font-medium">PO Number:</span> {po.orderNumber}</p>
              <p className="text-slate-700"><span className="font-medium">Date:</span> {format(new Date(po.date), "dd MMM yyyy, hh:mm a")}</p>
              {po.expectedDate && (
                <p className="text-slate-700"><span className="font-medium">Expected By:</span> {format(new Date(po.expectedDate), "dd MMM yyyy")}</p>
              )}
              <p className="text-slate-700"><span className="font-medium">Status:</span> {po.status}</p>
              <p className="text-slate-700"><span className="font-medium">Created By:</span> {po.createdBy}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-medium text-slate-800">{item.medicine?.name || "Unknown"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalCost)}</TableCell>
                  </TableRow>
                ))}
                
                {/* Totals Row */}
                <TableRow className="bg-slate-50 border-t border-slate-200">
                  <TableCell colSpan={4} className="text-right font-bold text-slate-800 uppercase tracking-wider text-sm">
                    Grand Total
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-indigo-700">
                    {formatCurrency(po.totalAmount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          {po.notes && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-1">Notes / Instructions:</h4>
              <p className="text-slate-600 whitespace-pre-wrap text-sm">{po.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button 
            onClick={handlePrint} 
            disabled={isPrinting}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print PO
          </Button>
          <iframe ref={iframeRef} style={{ display: 'none' }} title="Print frame" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
