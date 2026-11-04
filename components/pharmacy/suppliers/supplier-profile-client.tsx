"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  User,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  Landmark,
  Smartphone,
  FileText,
  RotateCcw,
  Plus,
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Trash2,
  Split,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  recordSupplierPayment,
  type SupplierProfileData,
} from "@/app/actions/supplier-profile"

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

const METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <Banknote className="h-4 w-4 text-green-600" />,
  BANK_TRANSFER: <Landmark className="h-4 w-4 text-blue-600" />,
  UPI: <Smartphone className="h-4 w-4 text-purple-600" />,
  CHEQUE: <FileText className="h-4 w-4 text-amber-600" />,
  CARD: <CreditCard className="h-4 w-4 text-indigo-600" />,
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
]

type SplitRow = {
  amount: string
  paymentMethod: string
  accountId: string
  referenceNo: string
}

export function SupplierProfileClient({
  supplier,
  accounts,
}: {
  supplier: SupplierProfileData
  accounts: { id: string; name: string; type: string; currentBalance: number; scope: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPayment, setShowPayment] = useState(false)
  const [isSplitMode, setIsSplitMode] = useState(false)

  // Single payment state
  const [payForm, setPayForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    accountId: "",
    invoiceId: "",
    referenceNo: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  })

  // Split payment state
  const [splits, setSplits] = useState<SplitRow[]>([
    { amount: "", paymentMethod: "CASH", accountId: "", referenceNo: "" },
    { amount: "", paymentMethod: "UPI", accountId: "", referenceNo: "" },
  ])

  const pharmacyAccounts = accounts.filter((acc) => acc.scope === "PHARMACY")
  const unpaidInvoices = supplier.invoices.filter((inv) => inv.status !== "PAID")

  // Calculate the max payable amount
  const getMaxPayable = () => {
    if (payForm.invoiceId && payForm.invoiceId !== "__GENERAL__") {
      const inv = supplier.invoices.find((i) => i.id === payForm.invoiceId)
      if (inv) return Math.max(0, inv.grandTotal - inv.amountPaid)
    }
    return Math.max(0, supplier.balanceDue)
  }

  const maxPayable = getMaxPayable()

  // Split total
  const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)

  const resetForm = () => {
    setPayForm({ amount: "", paymentMethod: "CASH", accountId: "", invoiceId: "", referenceNo: "", notes: "", date: new Date().toISOString().split("T")[0] })
    setSplits([
      { amount: "", paymentMethod: "CASH", accountId: "", referenceNo: "" },
      { amount: "", paymentMethod: "UPI", accountId: "", referenceNo: "" },
    ])
    setIsSplitMode(false)
  }

  const handleRecordPayment = () => {
    const invoiceId = payForm.invoiceId && payForm.invoiceId !== "__GENERAL__" ? payForm.invoiceId : null

    if (isSplitMode) {
      // Validate splits
      const validSplits = splits.filter((s) => parseFloat(s.amount) > 0)
      if (validSplits.length === 0) { toast.error("Add at least one payment split"); return }
      for (const s of validSplits) {
        if (!s.accountId) { toast.error("Select an account for each split"); return }
      }
      if (splitTotal > maxPayable + 0.01) {
        toast.error(`Total ₹${splitTotal.toFixed(2)} exceeds maximum payable ₹${maxPayable.toFixed(2)}`)
        return
      }

      startTransition(async () => {
        const result = await recordSupplierPayment({
          supplierId: supplier.id,
          invoiceId,
          amount: splitTotal,
          paymentMethod: "SPLIT",
          accountId: validSplits[0].accountId,
          notes: payForm.notes,
          date: payForm.date,
          splits: validSplits.map((s) => ({
            amount: parseFloat(s.amount),
            paymentMethod: s.paymentMethod,
            accountId: s.accountId,
            referenceNo: s.referenceNo,
          })),
        })
        if (result.success) {
          toast.success(result.message)
          setShowPayment(false)
          resetForm()
          router.refresh()
        } else {
          toast.error(result.message)
        }
      })
    } else {
      // Single payment
      const amount = parseFloat(payForm.amount)
      if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return }
      if (!payForm.accountId) { toast.error("Select the account to debit"); return }
      if (amount > maxPayable + 0.01) {
        toast.error(`Amount ₹${amount.toFixed(2)} exceeds maximum payable ₹${maxPayable.toFixed(2)}`)
        return
      }

      startTransition(async () => {
        const result = await recordSupplierPayment({
          supplierId: supplier.id,
          amount,
          paymentMethod: payForm.paymentMethod,
          accountId: payForm.accountId,
          invoiceId,
          referenceNo: payForm.referenceNo,
          notes: payForm.notes,
          date: payForm.date,
        })
        if (result.success) {
          toast.success(result.message)
          setShowPayment(false)
          resetForm()
          router.refresh()
        } else {
          toast.error(result.message)
        }
      })
    }
  }

  const addSplit = () => {
    setSplits([...splits, { amount: "", paymentMethod: "CASH", accountId: "", referenceNo: "" }])
  }

  const removeSplit = (index: number) => {
    if (splits.length <= 2) return
    setSplits(splits.filter((_, i) => i !== index))
  }

  const updateSplit = (index: number, field: keyof SplitRow, value: string) => {
    const newSplits = [...splits]
    newSplits[index] = { ...newSplits[index], [field]: value }
    setSplits(newSplits)
  }

  // Auto-fill remaining on last split
  const autoFillRemaining = (index: number) => {
    const otherTotal = splits.reduce((s, sp, i) => i !== index ? s + (parseFloat(sp.amount) || 0) : s, 0)
    const remaining = Math.max(0, maxPayable - otherTotal)
    updateSplit(index, "amount", remaining.toFixed(2))
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/pharmacy/suppliers">
            <Button variant="ghost" size="sm" className="mb-2 text-muted-foreground">
              <ArrowLeft className="mr-1 h-3 w-3" /> Back to Suppliers
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <User className="h-8 w-8" />
            {supplier.name}
          </h2>
          <p className="text-muted-foreground mt-1">
            Supplier since {format(new Date(supplier.createdAt), "dd MMM yyyy")}
            {supplier.creditDays && <span> • {supplier.creditDays} credit days</span>}
          </p>
        </div>
        <Dialog open={showPayment} onOpenChange={(open) => { setShowPayment(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700" disabled={supplier.balanceDue <= 0}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Payment to {supplier.name}</DialogTitle>
              <DialogDescription>
                Total balance due: {formatCurrency(supplier.balanceDue)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Invoice Selection */}
              {unpaidInvoices.length > 0 && (
                <div className="space-y-2">
                  <Label>Against Invoice</Label>
                  <Select value={payForm.invoiceId || "__GENERAL__"} onValueChange={(v) => setPayForm({ ...payForm, invoiceId: v, amount: "" })}>
                    <SelectTrigger><SelectValue placeholder="General payment" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__GENERAL__">General payment (total balance)</SelectItem>
                      {unpaidInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          #{inv.invoiceNumber} — Due: {formatCurrency(inv.grandTotal - inv.amountPaid)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {payForm.invoiceId && payForm.invoiceId !== "__GENERAL__" && (
                    <p className="text-xs text-muted-foreground">
                      Max payable for this invoice: <strong>{formatCurrency(maxPayable)}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={payForm.date}
                  onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                />
              </div>

              {/* Split toggle */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                <Button
                  type="button"
                  variant={isSplitMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSplitMode(!isSplitMode)}
                  className="gap-1.5"
                >
                  <Split className="h-3.5 w-3.5" />
                  {isSplitMode ? "Split Payment ON" : "Split Payment"}
                </Button>
                {!isSplitMode && (
                  <span className="text-xs text-muted-foreground">Pay with a single method</span>
                )}
                {isSplitMode && (
                  <span className="text-xs text-muted-foreground">Split across multiple methods/accounts</span>
                )}
              </div>

              {!isSplitMode ? (
                /* Single Payment */
                <>
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      step="0.01"
                      max={maxPayable}
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPayForm({ ...payForm, amount: maxPayable.toFixed(2) })}>
                        Pay Full ({formatCurrency(maxPayable)})
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method *</Label>
                    <Select value={payForm.paymentMethod} onValueChange={(v) => setPayForm({ ...payForm, paymentMethod: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Debit From Account *</Label>
                    <Select value={payForm.accountId} onValueChange={(v) => setPayForm({ ...payForm, accountId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {pharmacyAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type}) — {formatCurrency(acc.currentBalance)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference No. (UTR/Cheque)</Label>
                    <Input
                      placeholder="Transaction reference"
                      value={payForm.referenceNo}
                      onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                /* Split Payment */
                <div className="space-y-3">
                  {splits.map((split, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Split {idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600" onClick={() => autoFillRemaining(idx)}>
                            Fill remaining
                          </Button>
                          {splits.length > 2 && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => removeSplit(idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={split.amount}
                            onChange={(e) => updateSplit(idx, "amount", e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Method</Label>
                          <Select value={split.paymentMethod} onValueChange={(v) => updateSplit(idx, "paymentMethod", v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px]">Account</Label>
                        <Select value={split.accountId} onValueChange={(v) => updateSplit(idx, "accountId", v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select account" /></SelectTrigger>
                          <SelectContent>
                            {pharmacyAccounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.name} — {formatCurrency(acc.currentBalance)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Reference</Label>
                        <Input
                          placeholder="UTR / Txn ID"
                          value={split.referenceNo}
                          onChange={(e) => updateSplit(idx, "referenceNo", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addSplit} className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Add Split
                  </Button>
                  <div className={`flex items-center justify-between p-2 rounded-lg border text-sm font-medium ${
                    splitTotal > maxPayable + 0.01 ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
                  }`}>
                    <span>Total: {formatCurrency(splitTotal)}</span>
                    <span>Max: {formatCurrency(maxPayable)}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Optional notes"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                />
              </div>

              <Button
                onClick={handleRecordPayment}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isPending || (isSplitMode ? splitTotal <= 0 : !payForm.amount || !payForm.accountId)}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSplitMode ? `Record Split Payment (${formatCurrency(splitTotal)})` : "Record Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supplier Info Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {supplier.contactPerson && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Contact Person</p>
                  <p className="text-sm font-medium">{supplier.contactPerson}</p>
                </div>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{supplier.phone}</p>
                </div>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{supplier.email}</p>
                </div>
              </div>
            )}
            {supplier.gstNumber && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">GST Number</p>
                  <p className="text-sm font-medium font-mono">{supplier.gstNumber}</p>
                </div>
              </div>
            )}
            {(supplier.address || supplier.city || supplier.state) && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">
                    {[supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(supplier.totalPurchased)}</div>
            <p className="text-xs text-muted-foreground mt-1">{supplier.invoices.length} invoice(s)</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(supplier.totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">{supplier.payments.length} payment(s) recorded</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returns</CardTitle>
            <RotateCcw className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(supplier.totalReturns)}</div>
            <p className="text-xs text-muted-foreground mt-1">{supplier.returns.length} return(s)</p>
          </CardContent>
        </Card>

        <Card className={`border-t-4 ${supplier.balanceDue > 1 ? "border-t-red-500" : "border-t-green-500"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
            {supplier.balanceDue > 1 ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${supplier.balanceDue > 1 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(supplier.balanceDue)}
            </div>
            {supplier.openingBalance > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Opening bal: {formatCurrency(supplier.openingBalance)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Breakdown */}
      {supplier.paymentBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {supplier.paymentBreakdown.map((pb) => (
                <div key={pb.method} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="rounded-full bg-slate-100 p-2">
                    {METHOD_ICONS[pb.method] || <IndianRupee className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{METHOD_LABELS[pb.method] || pb.method}</p>
                    <p className="text-lg font-bold">{formatCurrency(pb.total)}</p>
                    <p className="text-xs text-muted-foreground">{pb.count} payment(s)</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Invoices, Payments, Returns, Challans */}
      <Tabs defaultValue="invoices">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices">
            Invoices ({supplier.invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({supplier.payments.length})
          </TabsTrigger>
          <TabsTrigger value="returns">
            Returns ({supplier.returns.length})
          </TabsTrigger>
          <TabsTrigger value="challans">
            Challans ({supplier.challans.length})
          </TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Purchase Invoices</CardTitle>
              <CardDescription>All purchase bills from {supplier.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No purchase invoices from this supplier
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplier.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-sm">{format(new Date(inv.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.grandTotal)}</TableCell>
                        <TableCell className="text-right text-sm text-green-600">{formatCurrency(inv.amountPaid)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {inv.grandTotal - inv.amountPaid > 0.01 ? (
                            <span className="text-red-600">{formatCurrency(inv.grandTotal - inv.amountPaid)}</span>
                          ) : (
                            <span className="text-green-600">₹0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              inv.status === "PAID"
                                ? "border-green-300 text-green-700 bg-green-50"
                                : inv.status === "PARTIAL"
                                  ? "border-amber-300 text-amber-700 bg-amber-50"
                                  : "border-red-300 text-red-700 bg-red-50"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{inv.itemCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment History</CardTitle>
              <CardDescription>All recorded payments to {supplier.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Against Invoice</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No payments recorded yet. Use &quot;Record Payment&quot; to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplier.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(p.date), "dd MMM yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {METHOD_ICONS[p.paymentMethod] || <IndianRupee className="h-4 w-4" />}
                            <span className="text-sm">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.referenceNo || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.invoiceNumber ? (
                            <Badge variant="outline" className="text-xs">#{p.invoiceNumber}</Badge>
                          ) : (
                            <span className="text-muted-foreground">General</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{p.accountName || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {p.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Purchase Returns</CardTitle>
              <CardDescription>Goods returned to {supplier.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.returns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No purchase returns to this supplier
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplier.returns.map((ret) => (
                      <TableRow key={ret.id}>
                        <TableCell className="font-mono text-xs">{ret.returnNumber}</TableCell>
                        <TableCell className="text-sm">{format(new Date(ret.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(ret.totalAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                          {ret.reason}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Challans Tab */}
        <TabsContent value="challans">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Challans</CardTitle>
              <CardDescription>Delivery challans from {supplier.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challan #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.challans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No challans from this supplier
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplier.challans.map((ch) => (
                      <TableRow key={ch.id}>
                        <TableCell className="font-mono text-xs">{ch.challanNumber}</TableCell>
                        <TableCell className="text-sm">{format(new Date(ch.date), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              ch.status === "CONVERTED"
                                ? "border-green-300 text-green-700"
                                : "border-amber-300 text-amber-700"
                            }
                          >
                            {ch.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{ch.itemCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
