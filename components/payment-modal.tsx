"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Wallet, Smartphone, Banknote, Loader2, HandCoins } from "lucide-react"
import { toast } from "sonner"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  grandTotal: number
  onConfirm: (paymentDetails: PaymentDetail) => void
  isProcessing: boolean
}

interface PaymentDetail {
  mode: "CASH" | "UPI" | "CARD" | "SPLIT" | "CREDIT"
  cashAmount?: number
  upiAmount?: number
  cardAmount?: number
}

export function PaymentModal({
  isOpen,
  onClose,
  grandTotal,
  onConfirm,
  isProcessing,
}: PaymentModalProps) {
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD" | "SPLIT" | "CREDIT">("CASH")
  const [cashAmount, setCashAmount] = useState(grandTotal)
  const [upiAmount, setUpiAmount] = useState(0)
  const [cardAmount, setCardAmount] = useState(0)
  const [cashReceived, setCashReceived] = useState(grandTotal)

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMode("CASH")
      setCashAmount(grandTotal)
      setUpiAmount(0)
      setCardAmount(0)
      setCashReceived(grandTotal)
    }
  }, [isOpen, grandTotal])

  // Calculate change for cash payment
  const changeToReturn = paymentMode === "CASH" ? cashReceived - grandTotal : 0
  const isCredit = paymentMode === "CREDIT"

  // Calculate split payment total
  const splitTotal = cashAmount + upiAmount + cardAmount
  const splitDifference = grandTotal - splitTotal

  const handleConfirm = () => {
    // Validate payment
    if (paymentMode === "CASH") {
      if (cashReceived < grandTotal) {
        toast.error("Insufficient cash received")
        return
      }
    } else if (paymentMode === "SPLIT") {
      if (Math.abs(splitDifference) > 0.01) {
        // Allow 0.01 tolerance for floating point
        toast.error(`Payment mismatch: ₹${splitDifference.toFixed(2)} ${splitDifference > 0 ? "short" : "excess"}`)
        return
      }
    }

    const paymentDetails: PaymentDetail = {
      mode: paymentMode,
      ...(paymentMode === "CASH" && { cashAmount: grandTotal }),
      ...(paymentMode === "SPLIT" && { cashAmount, upiAmount, cardAmount }),
    }

    onConfirm(paymentDetails)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Payment</DialogTitle>
          <DialogDescription>
            Complete the payment for this sale
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Grand Total Display */}
          <div className="bg-[#0066CC] text-white p-4 rounded-lg text-center">
            <p className="text-sm opacity-90">Amount to Pay</p>
            <p className="text-3xl font-bold">₹{grandTotal.toFixed(2)}</p>
          </div>

          {/* Payment Mode Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={paymentMode}
              onValueChange={(value) => setPaymentMode(value as any)}
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="UPI">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    UPI / Digital
                  </div>
                </SelectItem>
                <SelectItem value="CARD">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Card (Debit/Credit)
                  </div>
                </SelectItem>
                <SelectItem value="SPLIT">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Split Payment
                  </div>
                </SelectItem>
                <SelectItem value="CREDIT">
                  <div className="flex items-center gap-2">
                    <HandCoins className="h-4 w-4" />
                    Credit (Pay Later)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cash Payment Details */}
          {paymentMode === "CASH" && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="cash-received">Cash Received</Label>
                <Input
                  id="cash-received"
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  disabled={isProcessing}
                  className="text-lg font-semibold"
                />
              </div>
              {changeToReturn >= 0 && (
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Change to Return:</span>
                  <span className={`font-bold ${changeToReturn > 0 ? "text-green-600" : ""}`}>
                    ₹{changeToReturn.toFixed(2)}
                  </span>
                </div>
              )}
              {changeToReturn < 0 && (
                <div className="text-red-500 text-sm">
                  ⚠️ Insufficient amount (₹{Math.abs(changeToReturn).toFixed(2)} short)
                </div>
              )}
            </div>
          )}

          {/* Split Payment Details */}
          {paymentMode === "SPLIT" && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="split-cash">Cash Amount</Label>
                <Input
                  id="split-cash"
                  type="number"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="split-upi">UPI Amount</Label>
                <Input
                  id="split-upi"
                  type="number"
                  step="0.01"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(parseFloat(e.target.value) || 0)}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="split-card">Card Amount</Label>
                <Input
                  id="split-card"
                  type="number"
                  step="0.01"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                  disabled={isProcessing}
                />
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Received:</span>
                  <span className="font-semibold">₹{splitTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount Due:</span>
                  <span className="font-semibold">₹{grandTotal.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Balance:</span>
                  <span className={splitDifference === 0 ? "text-green-600" : "text-red-600"}>
                    {splitDifference === 0 ? "✓ Matched" : `₹${splitDifference.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* UPI/Card Payment Info */}
          {(paymentMode === "UPI" || paymentMode === "CARD") && (
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                {paymentMode === "UPI"
                  ? "✓ Confirm UPI payment received"
                  : "✓ Confirm card payment completed"}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Amount: ₹{grandTotal.toFixed(2)}
              </p>
            </div>
          )}

          {/* Credit Confirmation */}
          {isCredit && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1">
                <HandCoins className="h-4 w-4" />
                Credit Sale — No Payment Now
              </div>
              <p className="text-xs text-amber-700">
                Amount <span className="font-bold">₹{grandTotal.toFixed(2)}</span> will be recorded as credit (due). 
                The bill will be marked as <span className="font-semibold">PENDING</span> and visible in Finance → Credit / Dues.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            className="bg-[#0066CC] hover:bg-[#0052A3]"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Confirm & Complete Sale
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
