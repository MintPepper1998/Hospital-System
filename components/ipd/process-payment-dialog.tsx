"use client"

import { useState } from "react"
import { toast } from "sonner"
import { processIpdPayment } from "@/app/actions/billing"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, CheckCircle2, Loader2, CreditCard, Banknote, Landmark, Wallet } from "lucide-react"

export function ProcessPaymentDialog({ 
  open, 
  onOpenChange, 
  admission,
  onSuccess 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  admission: any
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<string>(admission?.balanceDue?.toString() || "")
  const [paymentMode, setPaymentMode] = useState("CASH")
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  // Split payment state
  const [splitCash, setSplitCash] = useState("")
  const [splitUpi, setSplitUpi] = useState("")
  const [splitCard, setSplitCard] = useState("")

  const minDate = admission?.admissionDate ? new Date(admission.admissionDate).toISOString().split("T")[0] : undefined
  const maxDate = new Date().toISOString().split("T")[0]

  const isSplit = paymentMode === "SPLIT"
  const numAmount = parseFloat(amount) || 0
  const splitTotal = (parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0)
  const splitMatched = isSplit && Math.abs(splitTotal - numAmount) <= 1
  const splitNonZeroCount = [parseFloat(splitCash) || 0, parseFloat(splitUpi) || 0, parseFloat(splitCard) || 0].filter(v => v > 0).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0.")
      return
    }

    // Split validation
    if (isSplit) {
      if (splitNonZeroCount < 2) {
        toast.error("Split payment requires at least two payment methods with amounts greater than 0.")
        return
      }
      if (!splitMatched) {
        toast.error(`Split total (₹${splitTotal.toFixed(2)}) does not match payment amount (₹${numAmount.toFixed(2)}).`)
        return
      }
    }

    setLoading(true)
    try {
      const splitPayments = isSplit ? {
        cash: parseFloat(splitCash) || 0,
        upi: parseFloat(splitUpi) || 0,
        card: parseFloat(splitCard) || 0,
      } : undefined

      const res = await processIpdPayment(admission.id, numAmount, paymentMode, notes, splitPayments, paymentDate)
      if (res.success) {
        toast.success(`Successfully recorded payment of ₹${numAmount.toFixed(2)}`)
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(res.message || "Failed to process payment")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Reset split fields when switching away from SPLIT
  const handlePaymentModeChange = (mode: string) => {
    setPaymentMode(mode)
    if (mode !== "SPLIT") {
      setSplitCash("")
      setSplitUpi("")
      setSplitCard("")
    }
  }

  const paymentMethods = [
    { id: "CASH", label: "Cash", icon: Banknote },
    { id: "CARD", label: "Card", icon: CreditCard },
    { id: "UPI", label: "UPI", icon: Landmark },
    { id: "BANK_TRANSFER", label: "Bank Transfer", icon: Landmark },
    { id: "SPLIT", label: "Split", icon: Wallet },
  ]

  if (!admission) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)] rounded-[2rem]">
        <div className="px-8 pt-8 pb-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900">
              Process Payment
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 font-medium">
              Recording payment for {admission.patientName} (IPD: {admission.id.slice(-6).toUpperCase()})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Date Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-[0.15em] text-gray-400 font-bold">
                  Collection / Payment Date
                </Label>
                <span className="text-[11px] text-gray-400 font-medium">Backdating Supported</span>
              </div>
              <Input
                type="date"
                value={paymentDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-12 bg-gray-50/50 border-gray-200/60 rounded-[1rem] text-sm font-semibold focus-visible:ring-black focus-visible:ring-offset-0 transition-all duration-300"
                required
              />
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-[0.15em] text-gray-400 font-bold">
                Amount Received (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 h-14 bg-gray-50/50 border-gray-200/60 rounded-[1rem] text-lg font-semibold focus-visible:ring-black focus-visible:ring-offset-0 transition-all duration-300"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="flex justify-between text-xs font-medium mt-2 px-1">
                <span className="text-gray-400">Total Due</span>
                <span className="text-red-500">₹{admission.balanceDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-[0.15em] text-gray-400 font-bold">
                Payment Method
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon
                  const isActive = paymentMode === method.id
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handlePaymentModeChange(method.id)}
                      className={`flex items-center gap-3 p-3 rounded-[1rem] border transition-all duration-300 ${
                        isActive 
                          ? "bg-black text-white border-black shadow-md" 
                          : "bg-white text-gray-600 border-gray-200/60 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                      <span className="text-sm font-semibold">{method.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Split Payment Details */}
            {isSplit && (
              <div className="space-y-3 p-4 bg-amber-50/80 border border-amber-200/60 rounded-[1rem]">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  Split Amount Across Methods
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 font-semibold">Cash ₹</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      className="h-11 bg-white border-gray-200/60 rounded-[0.75rem] text-sm font-semibold focus-visible:ring-black focus-visible:ring-offset-0"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 font-semibold">UPI ₹</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(e.target.value)}
                      className="h-11 bg-white border-gray-200/60 rounded-[0.75rem] text-sm font-semibold focus-visible:ring-black focus-visible:ring-offset-0"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 font-semibold">Card ₹</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      className="h-11 bg-white border-gray-200/60 rounded-[0.75rem] text-sm font-semibold focus-visible:ring-black focus-visible:ring-offset-0"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-amber-200/60">
                  <span className="text-xs font-semibold text-gray-500">Split Total</span>
                  <span className={`text-sm font-bold ${splitMatched ? "text-green-600" : "text-red-500"}`}>
                    ₹{splitTotal.toFixed(2)} {splitMatched ? "✓" : `≠ ₹${numAmount.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-[0.15em] text-gray-400 font-bold">
                Transaction Notes <span className="text-gray-300 normal-case tracking-normal">(Optional)</span>
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-12 bg-gray-50/50 border-gray-200/60 rounded-[1rem] focus-visible:ring-black focus-visible:ring-offset-0 transition-all duration-300"
                placeholder="e.g. UTR Number, Cash Receipt ID..."
              />
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (isSplit && !splitMatched)}
                className="group relative w-full flex items-center justify-center gap-2 h-14 bg-black text-white rounded-[1.25rem] font-bold text-sm tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                ) : (
                  <>
                    <span>Confirm Payment</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
