"use client"

import { useState, useTransition, useRef } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  HandCoins,
  Plus,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Trash2,
  Banknote,
  Clock,
  CheckCircle2,
  CircleDot,
  History,
  Printer,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createCreditEntry,
  recordCreditPayment,
  deleteCreditEntry,
  type CreditDashboardData,
  type CreditEntryData,
  type CreditPaymentReceipt,
} from "@/app/actions/credit"

// ============================================
// HELPERS
// ============================================

function formatINR(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  OPEN: { label: "Open", className: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
  PARTIAL: { label: "Partial", className: "bg-blue-100 text-blue-700 border-blue-200", icon: <CircleDot className="h-3 w-3" /> },
  SETTLED: { label: "Settled", className: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash", UPI: "UPI", CARD: "Card", BANK_TRANSFER: "Bank Transfer", CREDIT: "Credit",
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CreditClient({ data }: { data: CreditDashboardData }) {
  const router = useRouter()
  const [tab, setTab] = useState<"receivable" | "payable" | "records">("receivable")
  const [showCreate, setShowCreate] = useState(false)
  const [payEntry, setPayEntry] = useState<CreditEntryData | null>(null)
  const [receipt, setReceipt] = useState<{ data: CreditPaymentReceipt; paymentId: string } | null>(null)

  const entries = tab === "receivable" ? data.receivables : tab === "payable" ? data.payables : data.settledEntries

  const handlePaymentComplete = (receiptData: CreditPaymentReceipt, paymentId: string) => {
    setPayEntry(null)
    setReceipt({ data: receiptData, paymentId })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <HandCoins className="h-6 w-6 text-amber-600" />
            Credit / Dues
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track receivables from patients and payables to suppliers
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-600 hover:bg-amber-700 gap-1.5">
          <Plus className="h-4 w-4" /> New Credit Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Receivable</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{formatINR(data.totalReceivable)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data.openReceivableCount} open entries</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Payable</p>
            <p className="text-xl font-bold text-red-700 mt-1">{formatINR(data.totalPayable)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data.openPayableCount} open entries</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue Receivable</p>
            </div>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatINR(data.overdueReceivable)}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue Payable</p>
            </div>
            <p className="text-xl font-bold text-orange-700 mt-1">{formatINR(data.overduePayable)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("receivable")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${tab === "receivable" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <ArrowDownLeft className="h-3.5 w-3.5 inline mr-1" />
          Receivable ({data.openReceivableCount})
        </button>
        <button
          type="button"
          onClick={() => setTab("payable")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${tab === "payable" ? "bg-red-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />
          Payable ({data.openPayableCount})
        </button>
        <button
          type="button"
          onClick={() => setTab("records")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${tab === "records" ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <History className="h-3.5 w-3.5 inline mr-1" />
          Records ({data.settledEntries.length})
        </button>
      </div>

      {/* Entry Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {tab === "receivable" ? "Patients / Others Owe Us" : tab === "payable" ? "We Owe Suppliers / Others" : "Settled Credit Records"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {tab === "records" ? "No settled entries yet." : `No ${tab} entries found.`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Party</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Paid</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                    <TableHead className="text-xs">{tab === "records" ? "Settled On" : "Due Date"}</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const sb = STATUS_BADGE[entry.status] || STATUS_BADGE.OPEN
                    const isOverdue = entry.dueDate && new Date(entry.dueDate) < new Date() && entry.status !== "SETTLED"
                    return (
                      <TableRow key={entry.id} className={isOverdue ? "bg-red-50/50" : ""}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{entry.partyName}</p>
                            <p className="text-xs text-muted-foreground">{entry.partyType}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{entry.type === "RECEIVABLE" ? "Receivable" : "Payable"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.referenceType || "—"}
                          {entry.notes && <p className="text-[10px] text-gray-400 mt-0.5 max-w-[150px] truncate">{entry.notes}</p>}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatINR(entry.totalAmount)}</TableCell>
                        <TableCell className="text-right text-sm text-green-700">{formatINR(entry.paidAmount)}</TableCell>
                        <TableCell className="text-right text-sm font-bold text-red-700">
                          {entry.status === "SETTLED" ? <span className="text-green-700">₹0</span> : formatINR(entry.balanceAmount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {tab === "records" ? (
                            entry.settledAt ? format(new Date(entry.settledAt), "dd MMM yyyy") : "—"
                          ) : (
                            entry.dueDate ? (
                              <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                                {format(new Date(entry.dueDate), "dd MMM yyyy")}
                                {isOverdue && " ⚠"}
                              </span>
                            ) : "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 text-xs ${sb.className}`}>
                            {sb.icon} {sb.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {entry.status !== "SETTLED" && (
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1" onClick={() => setPayEntry(entry)}>
                                <Banknote className="h-3 w-3" /> Pay
                              </Button>
                            )}
                            {entry.status === "SETTLED" && entry.payments.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  const lastPayment = entry.payments[0]
                                  setReceipt({
                                    data: {
                                      partyName: entry.partyName,
                                      partyType: entry.partyType,
                                      creditType: entry.type,
                                      totalAmount: entry.totalAmount,
                                      paidNow: lastPayment.amount,
                                      totalPaid: entry.paidAmount,
                                      remainingBalance: 0,
                                      newStatus: "SETTLED",
                                      paymentMethod: lastPayment.paymentMethod,
                                      reference: lastPayment.reference,
                                      paymentDate: String(lastPayment.paymentDate),
                                      linkedBillNumber: entry.notes?.match(/[A-Z]+-\d{4}-\d{4}/)?.[0] || null,
                                    },
                                    paymentId: lastPayment.id,
                                  })
                                }}
                              >
                                <Printer className="h-3 w-3" /> Receipt
                              </Button>
                            )}
                            {entry.payments.length === 0 && entry.status !== "SETTLED" && (
                              <DeleteCreditButton id={entry.id} name={entry.partyName} onComplete={() => router.refresh()} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateCreditDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultType={tab === "payable" ? "PAYABLE" : "RECEIVABLE"}
        onComplete={() => router.refresh()}
      />
      {payEntry && (
        <RecordPaymentDialog
          entry={payEntry}
          accounts={data.accounts}
          onClose={() => setPayEntry(null)}
          onComplete={handlePaymentComplete}
        />
      )}
      {receipt && (
        <PaymentReceiptDialog
          receipt={receipt.data}
          paymentId={receipt.paymentId}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  )
}

// ============================================
// CREATE CREDIT DIALOG
// ============================================

function CreateCreditDialog({
  open,
  onOpenChange,
  defaultType,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType: "RECEIVABLE" | "PAYABLE"
  onComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<"RECEIVABLE" | "PAYABLE">(defaultType)
  const [partyName, setPartyName] = useState("")
  const [partyType, setPartyType] = useState<"PATIENT" | "SUPPLIER" | "OTHER">(defaultType === "RECEIVABLE" ? "PATIENT" : "SUPPLIER")
  const [totalAmount, setTotalAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")

  const reset = () => { setPartyName(""); setTotalAmount(""); setDueDate(""); setNotes("") }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!partyName.trim()) return toast.error("Party name is required")
    if (!totalAmount || parseFloat(totalAmount) <= 0) return toast.error("Enter a valid amount")

    startTransition(async () => {
      const result = await createCreditEntry({
        type,
        partyName: partyName.trim(),
        partyType,
        totalAmount: parseFloat(totalAmount),
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      })
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        reset()
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-amber-600" /> New Credit Entry
          </DialogTitle>
          <DialogDescription>Record a new receivable or payable credit entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Credit Type <span className="text-red-500">*</span></Label>
              <Select value={type} onValueChange={(v) => {
                setType(v as "RECEIVABLE" | "PAYABLE")
                setPartyType(v === "RECEIVABLE" ? "PATIENT" : "SUPPLIER")
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVABLE">Receivable (they owe us)</SelectItem>
                  <SelectItem value="PAYABLE">Payable (we owe them)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Party Type <span className="text-red-500">*</span></Label>
              <Select value={partyType} onValueChange={(v) => setPartyType(v as "PATIENT" | "SUPPLIER" | "OTHER")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PATIENT">Patient</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Party Name <span className="text-red-500">*</span></Label>
            <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Patient or Supplier name..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Amount (₹) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// RECORD PAYMENT DIALOG
// ============================================

function RecordPaymentDialog({
  entry,
  accounts,
  onClose,
  onComplete,
}: {
  entry: CreditEntryData
  accounts: { id: string; name: string; type: string }[]
  onClose: () => void
  onComplete: (receipt: CreditPaymentReceipt, paymentId: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(String(entry.balanceAmount))
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [accountId, setAccountId] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter a valid amount")
    if (parseFloat(amount) > entry.balanceAmount + 0.01) return toast.error("Amount exceeds remaining balance")

    startTransition(async () => {
      const result = await recordCreditPayment({
        creditEntryId: entry.id,
        amount: parseFloat(amount),
        paymentMethod,
        accountId: accountId || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      })
      if (result.success) {
        toast.success(result.message)
        if (result.receipt && result.paymentId) {
          onComplete(result.receipt, result.paymentId)
        } else {
          toast.error("Failed to generate receipt")
        }
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600" /> Record Payment
          </DialogTitle>
          <DialogDescription>
            {entry.partyName} — Balance: <span className="font-bold text-red-700">{formatINR(entry.balanceAmount)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment Amount (₹) <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" min="0.01" max={entry.balanceAmount} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Deposit to Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Receipt / UTR Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference number..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</> : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// PAYMENT RECEIPT DIALOG (Printable)
// ============================================

function PaymentReceiptDialog({
  receipt,
  paymentId,
  onClose,
}: {
  receipt: CreditPaymentReceipt
  paymentId: string
  onClose: () => void
}) {
  const handlePrint = () => {
    window.open(`/dashboard/finance/credit/print/${paymentId}`, '_blank')
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" /> Payment Recorded Successfully
          </DialogTitle>
          <DialogDescription>
            Review the receipt below and print for the {receipt.creditType === "RECEIVABLE" ? "patient" : "supplier"}.
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Content (for previewing) */}
        <div className="mt-2">
          <div className="border rounded-lg p-4 bg-white space-y-2">
            <div className="receipt-header">
              <h2 style={{ fontSize: "16px", fontWeight: 700, textAlign: "center" }}>Shree Kamal Hospital</h2>
              <p style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>Credit Payment Receipt</p>
            </div>

            <div className="receipt-title" style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, background: "#f0f0f0", padding: "6px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
              {receipt.creditType === "RECEIVABLE" ? "DUE PAYMENT RECEIVED" : "PAYMENT MADE"}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{format(new Date(receipt.paymentDate), "dd MMM yyyy, hh:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Party:</span>
                <span className="font-medium">{receipt.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{receipt.partyType}</span>
              </div>
              {receipt.linkedBillNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linked Bill:</span>
                  <span className="font-mono font-medium">{receipt.linkedBillNumber}</span>
                </div>
              )}

              <hr className="border-dashed my-2" />

              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Due Amount:</span>
                <span className="font-medium">{formatINR(receipt.totalAmount)}</span>
              </div>
              <div className="flex justify-between bg-green-50 p-2 rounded font-bold text-green-700">
                <span>Amount Paid Now:</span>
                <span>{formatINR(receipt.paidNow)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium">{METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod}</span>
              </div>
              {receipt.reference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-mono text-xs">{receipt.reference}</span>
                </div>
              )}

              <hr className="border-dashed my-2" />

              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid So Far:</span>
                <span className="font-medium">{formatINR(receipt.totalPaid)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Remaining Balance:</span>
                <span className={receipt.remainingBalance <= 0 ? "text-green-700" : "text-red-700"}>
                  {receipt.remainingBalance <= 0 ? "₹0 (Fully Settled)" : formatINR(receipt.remainingBalance)}
                </span>
              </div>
            </div>

            <div className={`text-center py-2 rounded font-bold text-sm mt-2 ${receipt.newStatus === "SETTLED" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
              {receipt.newStatus === "SETTLED" ? "✅ FULLY SETTLED" : "🔵 PARTIALLY PAID"}
            </div>

            <div className="receipt-footer" style={{ textAlign: "center", fontSize: "10px", color: "#999", marginTop: "12px", paddingTop: "10px", borderTop: "2px dashed #ccc" }}>
              <p>Thank you for your payment</p>
              <p>This is a computer-generated receipt</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// DELETE CREDIT BUTTON
// ============================================

function DeleteCreditButton({
  id,
  name,
  onComplete,
}: {
  id: string
  name: string
  onComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCreditEntry(id)
      if (result.success) {
        toast.success(result.message)
        setConfirm(false)
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  if (confirm) {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirm(false)}>No</Button>
        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleDelete} disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
        </Button>
      </div>
    )
  }

  return (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" title="Delete" onClick={() => setConfirm(true)}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
