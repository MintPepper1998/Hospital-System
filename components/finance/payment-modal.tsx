"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CreditCard,
  Loader2,
  CheckCircle,
  Banknote,
  Smartphone,
  Building2,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { recordPayment } from "@/lib/actions/finance"

interface PaymentModalProps {
  invoiceId: string
  billNumber: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  patientName?: string
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote, color: "text-green-600" },
  { value: "CARD", label: "Card", icon: CreditCard, color: "text-blue-600" },
  { value: "UPI", label: "UPI", icon: Smartphone, color: "text-purple-600" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2, color: "text-orange-600" },
  { value: "INSURANCE", label: "Insurance / TPA", icon: ShieldCheck, color: "text-teal-600" },
]

export function PaymentModal({
  invoiceId,
  billNumber,
  totalAmount,
  paidAmount,
  balanceAmount,
  patientName,
}: PaymentModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [amount, setAmount] = useState(balanceAmount.toString())
  const [method, setMethod] = useState("CASH")
  const [transactionId, setTransactionId] = useState("")
  const [notes, setNotes] = useState("")

  const parsedAmount = parseFloat(amount) || 0
  const isValidAmount = parsedAmount > 0 && parsedAmount <= balanceAmount + 0.01
  const newBalance = Math.max(0, balanceAmount - parsedAmount)
  const willBeFullyPaid = newBalance <= 0.01

  const handleSubmit = () => {
    if (!isValidAmount) {
      toast.error("Please enter a valid amount")
      return
    }

    const formData = new FormData()
    formData.set("invoiceId", invoiceId)
    formData.set("amount", parsedAmount.toString())
    formData.set("method", method)
    if (transactionId) formData.set("transactionId", transactionId)
    if (notes) formData.set("notes", notes)

    startTransition(async () => {
      const result = await recordPayment(formData)

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        // Reset form
        setAmount(newBalance.toString())
        setTransactionId("")
        setNotes("")
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      // Reset to current balance when opening
      setAmount(balanceAmount.toString())
      setMethod("CASH")
      setTransactionId("")
      setNotes("")
    }
  }

  // Don't show button if already fully paid
  if (balanceAmount <= 0) {
    return (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Fully Paid
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <CreditCard className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {patientName && <span>Patient: <strong>{patientName}</strong> | </span>}
            Invoice: <strong>{billNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount</span>
            <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Already Paid</span>
            <span className="font-semibold text-green-600">₹{paidAmount.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base">
            <span className="font-semibold text-gray-900">Balance Due</span>
            <span className="font-bold text-red-600">₹{balanceAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">
              Payment Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <Input
                id="payment-amount"
                type="number"
                min="1"
                max={balanceAmount}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg font-semibold"
                placeholder="0.00"
              />
            </div>
            {parsedAmount > balanceAmount && (
              <p className="text-xs text-red-500">
                Amount cannot exceed ₹{balanceAmount.toFixed(2)}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setAmount(balanceAmount.toString())}
              >
                Full: ₹{balanceAmount.toFixed(2)}
              </Button>
              {balanceAmount > 1000 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setAmount(Math.round(balanceAmount / 2).toString())}
                >
                  Half: ₹{Math.round(balanceAmount / 2).toFixed(2)}
                </Button>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value}>
                    <div className="flex items-center gap-2">
                      <pm.icon className={`h-4 w-4 ${pm.color}`} />
                      <span>{pm.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction ID (shown for non-cash methods) */}
          {method !== "CASH" && (
            <div className="space-y-2">
              <Label htmlFor="transaction-id">
                Transaction / Reference ID
              </Label>
              <Input
                id="transaction-id"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder={
                  method === "UPI" ? "e.g., UPI ref number"
                    : method === "CARD" ? "e.g., Card approval code"
                      : method === "INSURANCE" ? "e.g., Claim number"
                        : "e.g., NEFT/RTGS ref"
                }
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="payment-notes">Notes (Optional)</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          {/* Preview */}
          {isValidAmount && (
            <div className={`rounded-lg p-3 text-sm ${willBeFullyPaid ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              <p className="font-medium">
                {willBeFullyPaid ? (
                  <span className="text-green-700 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Invoice will be marked as PAID
                  </span>
                ) : (
                  <span className="text-amber-700">
                    After this payment, remaining balance: ₹{newBalance.toFixed(2)}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !isValidAmount}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Payment (₹{parsedAmount.toFixed(2)})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
