"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, RotateCcw, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { processSalesReturn } from "@/app/actions/sales-returns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function PharmacyBillEditClient({ bill }: { bill: any }) {
  const router = useRouter()
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundDialog, setRefundDialog] = useState<{ open: boolean, item: any | null }>({
    open: false,
    item: null,
  })
  const [refundQuantity, setRefundQuantity] = useState<number | "">("")
  const [returnType, setReturnType] = useState<"RETURN" | "EXCHANGE">("RETURN")
  const [returnReason, setReturnReason] = useState<string>("Patient Request")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-700">Paid</Badge>
      case "PARTIALLY_PAID":
        return <Badge className="bg-orange-100 text-orange-700">Partially Paid</Badge>
      case "PENDING":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const openRefundDialog = (item: any) => {
    setRefundDialog({ open: true, item })
    setRefundQuantity("")
    setReturnType("RETURN")
    setReturnReason("Patient Request")
  }

  const handleRefund = async () => {
    if (!refundDialog.item || typeof refundQuantity !== "number") return

    if (refundQuantity <= 0) {
      toast.error("Refund quantity must be greater than 0")
      return
    }

    if (refundQuantity > refundDialog.item.quantity) {
      toast.error(`Cannot refund more than ${refundDialog.item.quantity} units`)
      return
    }

    if (!bill.patientId) {
      toast.error("Cannot return a walk-in bill without patient profile. Please contact Admin.")
      return
    }

    setIsRefunding(true)
    try {
      const result = await processSalesReturn(
        bill.id,
        bill.patientId,
        returnType,
        [
          {
            billingItemId: refundDialog.item.id,
            returnQuantity: Number(refundQuantity),
            returnReason
          }
        ]
      )
      if (result.success) {
        toast.success(result.message)
        setRefundDialog({ open: false, item: null })
        router.refresh()
      } else {
        toast.error(result.message || "Failed to process return")
      }
    } catch (error) {
      toast.error("An error occurred while processing the return")
    } finally {
      setIsRefunding(false)
    }
  }

  // Calculate if an item can be refunded
  const canBeRefunded = (item: any) => {
    // Only PHARMACY items with a referenceId (batch ID) can be auto-restocked/refunded
    return item.serviceCategory === "PHARMACY" && item.referenceId && item.quantity > 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bill: {bill.billNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(bill.createdAt), "PPP p")}
            </p>
          </div>
        </div>
        {getStatusBadge(bill.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{bill.patient?.user?.name || "Walk-In"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span>{bill.patient?.phone || "N/A"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span>₹{bill.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span>₹{bill.discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (GST):</span>
              <span>₹{bill.taxAmount.toFixed(2)}</span>
            </div>
            {bill.roundOff !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round Off:</span>
                <span>₹{bill.roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Net Amount:</span>
              <span>₹{bill.netAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-medium">
              <span>Paid Amount:</span>
              <span>₹{bill.paidAmount.toFixed(2)}</span>
            </div>
            {bill.paidAmount > bill.netAmount && (
              <div className="flex justify-between text-orange-600 font-bold bg-orange-50 p-2 rounded-md mt-2">
                <span>Overpaid / To Refund:</span>
                <span>₹{(bill.paidAmount - bill.netAmount).toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billed Items</CardTitle>
          <CardDescription>
            View billed medicines and process refunds for specific items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No items left in this bill.
                  </TableCell>
                </TableRow>
              ) : (
                bill.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{item.gstAmount.toFixed(2)} ({item.gstRate}%)</TableCell>
                    <TableCell className="text-right font-bold">₹{item.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {canBeRefunded(item) ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => openRefundDialog(item)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Take Back
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Non-refundable</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={refundDialog.open} onOpenChange={(open) => !isRefunding && setRefundDialog({ open, item: refundDialog.item })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Back Medicine</DialogTitle>
            <DialogDescription>
              Specify how many units of <strong>{refundDialog.item?.description?.split(" - ")[0]}</strong> the patient is returning. 
              The stock will be automatically restored to the inventory batch.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex justify-between text-sm bg-muted p-3 rounded-md">
              <span className="text-muted-foreground">Billed Quantity:</span>
              <span className="font-bold">{refundDialog.item?.quantity} units</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Type</label>
                <Select value={returnType} onValueChange={(v: "RETURN" | "EXCHANGE") => setReturnType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETURN">Return</SelectItem>
                    <SelectItem value="EXCHANGE">Exchange</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity to {returnType === "RETURN" ? "Return" : "Exchange"}</label>
                <Input 
                  type="number"
                  min="1"
                  max={refundDialog.item?.quantity}
                  value={refundQuantity}
                  onChange={(e) => setRefundQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter amount..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Input 
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Patient Request, Damaged, Doctor changed prescription..."
                />
              </div>
            </div>

            {typeof refundQuantity === "number" && refundQuantity > 0 && (
              <div className="text-sm text-orange-600 flex items-start gap-2 bg-orange-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Returning <strong>{refundQuantity}</strong> units will decrease the bill total by approx. <strong>₹{((refundDialog.item?.unitPrice || 0) * refundQuantity * (1 + (refundDialog.item?.gstRate || 0)/100)).toFixed(2)}</strong>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog({ open: false, item: null })} disabled={isRefunding}>
              Cancel
            </Button>
            <Button onClick={handleRefund} disabled={isRefunding || !refundQuantity} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isRefunding ? "Processing..." : `Process ${returnType === "RETURN" ? "Return" : "Exchange"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
