"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2, CreditCard, Plus, Trash2, Split } from "lucide-react"
import { recordSupplierPayment } from "@/app/actions/supplier-profile"
import { toast } from "sonner"
import { AccountSelect } from "@/components/pharmacy-finance/account-select"

// ============================================
// NEOMORPHIC TOKENS
// ============================================

const neo = {
  card: "rounded-2xl bg-[#e0e5ec] border-none",
  shadow: "shadow-[6px_6px_12px_#bec3c9,-6px_-6px_12px_#ffffff]",
  shadowSm: "shadow-[3px_3px_6px_#bec3c9,-3px_-3px_6px_#ffffff]",
  inset: "shadow-[inset_3px_3px_6px_#bec3c9,inset_-3px_-3px_6px_#ffffff]",
  inputBg: "bg-[#e0e5ec]",
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer / NEFT / RTGS" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
]

type SplitRow = {
  amount: string
  paymentMethod: string
  accountId: string
  referenceNo: string
}

interface RecordPaymentDialogProps {
  invoice: {
    id: string
    invoiceNumber: string
    grandTotal: number
    amountPaid: number
    supplier?: { id: string; name: string }
  }
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RecordPaymentDialog({ invoice, open, onClose, onSuccess }: RecordPaymentDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState("CASH")
  const [accountId, setAccountId] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [referenceNumber, setReferenceNumber] = useState("")
  const [isSplitMode, setIsSplitMode] = useState(false)
  const [splits, setSplits] = useState<SplitRow[]>([
    { amount: "", paymentMethod: "CASH", accountId: "", referenceNo: "" },
    { amount: "", paymentMethod: "UPI", accountId: "", referenceNo: "" },
  ])

  const balanceDue = invoice.grandTotal - invoice.amountPaid
  const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n)

  const resetForm = () => {
    setAmount("")
    setPaymentMode("CASH")
    setAccountId("")
    setPaymentDate(new Date().toISOString().split("T")[0])
    setReferenceNumber("")
    setIsSplitMode(false)
    setSplits([
      { amount: "", paymentMethod: "CASH", accountId: "", referenceNo: "" },
      { amount: "", paymentMethod: "UPI", accountId: "", referenceNo: "" },
    ])
  }

  const updateSplit = (index: number, field: keyof SplitRow, value: string) => {
    const newSplits = [...splits]
    newSplits[index] = { ...newSplits[index], [field]: value }
    setSplits(newSplits)
  }

  const autoFillRemaining = (index: number) => {
    const otherTotal = splits.reduce((s, sp, i) => i !== index ? s + (parseFloat(sp.amount) || 0) : s, 0)
    const remaining = Math.max(0, balanceDue - otherTotal)
    updateSplit(index, "amount", remaining.toFixed(2))
  }

  const handleSubmit = () => {
    if (!invoice.supplier?.id) {
      toast.error("Supplier information is missing from this invoice.")
      return
    }

    if (balanceDue <= 0.01) {
      toast.error("This invoice has already been fully paid.")
      return
    }

    if (isSplitMode) {
      const validSplits = splits.filter((s) => parseFloat(s.amount) > 0)
      if (validSplits.length === 0) { toast.error("Add at least one payment split"); return }
      for (const s of validSplits) {
        if (!s.accountId) { toast.error("Select an account for each split"); return }
      }
      if (splitTotal > balanceDue + 0.01) {
        toast.error(`Total ${formatCurrency(splitTotal)} exceeds balance due ${formatCurrency(balanceDue)}`)
        return
      }

      startTransition(async () => {
        const result = await recordSupplierPayment({
          supplierId: invoice.supplier!.id,
          invoiceId: invoice.id,
          amount: splitTotal,
          paymentMethod: "SPLIT",
          accountId: validSplits[0].accountId,
          date: paymentDate,
          splits: validSplits.map((s) => ({
            amount: parseFloat(s.amount),
            paymentMethod: s.paymentMethod,
            accountId: s.accountId,
            referenceNo: s.referenceNo,
          })),
        })

        if (result.success) {
          toast.success(result.message)
          resetForm()
          onSuccess()
        } else {
          toast.error(result.message)
        }
      })
    } else {
      const paymentAmount = parseFloat(amount)
      if (!paymentAmount || paymentAmount <= 0) {
        toast.error("Enter a valid payment amount")
        return
      }
      if (!accountId) {
        toast.error("Please select an account to pay from.")
        return
      }
      if (paymentAmount > balanceDue + 0.01) {
        toast.error(`Payment cannot exceed balance due (${formatCurrency(balanceDue)})`)
        return
      }

      startTransition(async () => {
        const result = await recordSupplierPayment({
          supplierId: invoice.supplier!.id,
          invoiceId: invoice.id,
          amount: paymentAmount,
          paymentMethod: paymentMode,
          accountId: accountId,
          referenceNo: referenceNumber,
          date: paymentDate,
        })

        if (result.success) {
          toast.success(result.message)
          resetForm()
          onSuccess()
        } else {
          toast.error(result.message)
        }
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose() } }}>
      <DialogContent className={`max-w-md max-h-[90vh] overflow-y-auto ${neo.card} ${neo.shadow}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${neo.card} ${neo.shadowSm} flex items-center justify-center`}>
              <CreditCard className="h-4 w-4 text-indigo-600" />
            </div>
            Record Payment
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Record a payment for invoice <strong>{invoice.invoiceNumber}</strong>
            {invoice.supplier?.name && <> from <strong>{invoice.supplier.name}</strong></>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Summary */}
          <div className={`grid grid-cols-3 gap-3 p-4 rounded-xl ${neo.inset} text-sm`}>
            <div>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Grand Total</p>
              <p className="font-extrabold text-slate-800">₹{invoice.grandTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Paid</p>
              <p className="font-extrabold text-emerald-600">₹{invoice.amountPaid.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Balance Due</p>
              <p className="font-extrabold text-red-600">₹{balanceDue.toFixed(2)}</p>
            </div>
          </div>

          {balanceDue <= 0.01 ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-sm font-bold text-emerald-800">Invoice Fully Paid</p>
              <p className="text-xs text-emerald-600 mt-1">This invoice has no outstanding balance due.</p>
            </div>
          ) : (
            <>
              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label htmlFor="paymentDate" className="text-xs font-semibold text-slate-600">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`${neo.inputBg} ${neo.inset} border-none rounded-xl h-11 text-slate-800`}
                />
              </div>

              {/* Split toggle */}
              <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isSplitMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSplitMode(!isSplitMode)}
              className="gap-1.5"
            >
              <Split className="h-3.5 w-3.5" />
              {isSplitMode ? "Split ON" : "Split Payment"}
            </Button>
            <span className="text-xs text-slate-400">
              {isSplitMode ? "Split across multiple methods" : "Single payment method"}
            </span>
          </div>

          {!isSplitMode ? (
            <>
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="paymentAmount" className="text-xs font-semibold text-slate-600">Payment Amount (₹) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balanceDue}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max ₹${balanceDue.toFixed(2)}`}
                  className={`${neo.inputBg} ${neo.inset} border-none rounded-xl h-11 text-slate-800 placeholder:text-slate-400`}
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className={`${neo.inputBg} ${neo.inset} border-none rounded-xl h-11 text-slate-800`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`rounded-xl border-none ${neo.card} ${neo.shadow}`}>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pay From Account */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Pay From Account</Label>
                <div className={`${neo.inputBg} ${neo.inset} rounded-xl overflow-hidden`}>
                  <AccountSelect
                    value={accountId}
                    onChange={setAccountId}
                    requireBalance={parseFloat(amount) || 0}
                    placeholder="Select Pharmacy Account"
                  />
                </div>
              </div>

              {/* Reference Number */}
              <div className="space-y-2">
                <Label htmlFor="refNumber" className="text-xs font-semibold text-slate-600">Reference / Transaction No.</Label>
                <Input
                  id="refNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g., UPI Txn ID, Cheque No."
                  className={`${neo.inputBg} ${neo.inset} border-none rounded-xl h-11 text-slate-800 placeholder:text-slate-400`}
                />
              </div>

              {/* Quick pay buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(balanceDue.toFixed(2))}
                  className={`flex-1 rounded-xl ${neo.card} ${neo.shadowSm} border-none text-slate-600 hover:text-indigo-600 transition-all hover:translate-y-[-1px]`}
                >
                  Pay Full (₹{balanceDue.toFixed(2)})
                </Button>
                {balanceDue > 1000 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount((balanceDue / 2).toFixed(2))}
                    className={`flex-1 rounded-xl ${neo.card} ${neo.shadowSm} border-none text-slate-600 hover:text-indigo-600 transition-all hover:translate-y-[-1px]`}
                  >
                    Pay Half
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Split Payment Mode */
            <div className="space-y-3">
              {splits.map((split, idx) => (
                <div key={idx} className={`p-3 rounded-xl ${neo.inset} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Split {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-indigo-600" onClick={() => autoFillRemaining(idx)}>
                        Fill rest
                      </Button>
                      {splits.length > 2 && (
                        <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400" onClick={() => setSplits(splits.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={split.amount}
                      onChange={(e) => updateSplit(idx, "amount", e.target.value)}
                      className={`${neo.inputBg} border-none rounded-lg h-9 text-sm`}
                    />
                    <Select value={split.paymentMethod} onValueChange={(v) => updateSplit(idx, "paymentMethod", v)}>
                      <SelectTrigger className={`${neo.inputBg} border-none rounded-lg h-9 text-sm`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={`${neo.inputBg} rounded-lg overflow-hidden`}>
                    <AccountSelect
                      value={split.accountId}
                      onChange={(v) => updateSplit(idx, "accountId", v)}
                      requireBalance={parseFloat(split.amount) || 0}
                      placeholder="Account"
                    />
                  </div>
                  <Input
                    placeholder="Reference / UTR"
                    value={split.referenceNo}
                    onChange={(e) => updateSplit(idx, "referenceNo", e.target.value)}
                    className={`${neo.inputBg} border-none rounded-lg h-8 text-xs`}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSplits([...splits, { amount: "", paymentMethod: "CASH", accountId: "", referenceNo: "" }])}
                className={`w-full rounded-xl ${neo.card} ${neo.shadowSm} border-none text-slate-500`}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Split
              </Button>
              <div className={`flex items-center justify-between p-2 rounded-lg text-sm font-semibold ${
                splitTotal > balanceDue + 0.01
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                <span>Total: ₹{splitTotal.toFixed(2)}</span>
                <span>Due: ₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>
          )}
          </>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onClose() }}
            disabled={isPending}
            className={`rounded-xl ${neo.card} ${neo.shadowSm} border-none text-slate-600 hover:text-slate-800`}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || balanceDue <= 0.01 || (isSplitMode ? splitTotal <= 0 || splitTotal > balanceDue + 0.01 : !amount || !accountId)}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : isSplitMode ? (
              `Record Split (₹${splitTotal.toFixed(2)})`
            ) : (
              "Record Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
