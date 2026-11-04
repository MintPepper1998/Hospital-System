"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { IndianRupee, Plus, FileText, CreditCard } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createIPDCharge, recordIPDPayment } from "@/app/actions/ipd-billing-system"

export function IPDBillingClient({ admission }: { admission: any }) {
  const router = useRouter()
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Current main bill
  const currentBill = admission.billings?.find((b: any) => b.status === "PENDING") || admission.billings?.[0]

  const handleAddCharge = async (formData: FormData) => {
    formData.append("admissionId", admission.id)
    const result = await createIPDCharge(formData)
    if (result.success) {
      toast.success("Charge added successfully")
      setIsChargeDialogOpen(false)
      router.refresh()
    } else {
      toast.error(result.message || "Failed to add charge")
    }
  }

  const handleAddPayment = async (formData: FormData) => {
    formData.append("admissionId", admission.id)
    if (currentBill) {
      formData.append("billingId", currentBill.id)
    } else {
      toast.error("No active bill found")
      return
    }

    const result = await recordIPDPayment(formData)
    if (result.success) {
      toast.success("Payment recorded successfully")
      setIsPaymentDialogOpen(false)
      router.refresh()
    } else {
      toast.error(result.message || "Failed to record payment")
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-blue-900">
          IPD Billing - {admission.patient.name}
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <FileText className="mr-2 h-4 w-4" /> Download Final Bill
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Charges</CardTitle>
            <IndianRupee className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">₹{admission.totalBillAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">₹{admission.amountPaid.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Balance Due</CardTitle>
            <IndianRupee className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">₹{admission.balanceDue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Charges & Items</CardTitle>
              <CardDescription>All billed items for this admission.</CardDescription>
            </div>
            <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Charge</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Charge</DialogTitle>
                </DialogHeader>
                <form action={handleAddCharge} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                      <option value="BED">Bed / Room Charges</option>
                      <option value="LAB">Lab Investigations</option>
                      <option value="PHARMACY">Pharmacy / Medicines</option>
                      <option value="NURSING">Nursing Charges</option>
                      <option value="OTHER">Other Charges</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input name="description" required placeholder="e.g. ICU Bed Day 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input type="number" name="amount" required placeholder="0.00" />
                  </div>
                  <Button type="submit" className="w-full">Add Charge</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {currentBill?.items?.length > 0 ? (
              <div className="space-y-4">
                {currentBill.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-bold">₹{item.totalPrice.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No charges recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Payments</CardTitle>
              <CardDescription>Payment history for this admission.</CardDescription>
            </div>
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><CreditCard className="mr-2 h-4 w-4" /> Record Payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <form action={handleAddPayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <select name="paymentMethod" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Credit/Debit Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input type="number" name="amount" required defaultValue={admission.balanceDue} />
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction ID (Optional)</Label>
                    <Input name="transactionId" placeholder="e.g. UTR Number" />
                  </div>
                  <Button type="submit" className="w-full">Record Payment</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {currentBill?.payments?.length > 0 ? (
              <div className="space-y-4">
                {currentBill.payments.map((payment: any) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 border rounded-md bg-green-50/30">
                    <div>
                      <p className="font-medium text-sm">Receipt: {payment.receiptNumber}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(payment.paymentDate), "dd MMM yyyy, hh:mm a")} • {payment.paymentMethod}</p>
                    </div>
                    <div className="font-bold text-green-700">₹{payment.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No payments recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
