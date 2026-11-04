"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { DataTable } from "./data-table"
import { Money } from "./money"
import { fmtIST } from "@/lib/pharmacy-finance/dates"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AccountSelect } from "./account-select"
import { recordSupplierRefund } from "@/app/actions/pharmacy-fin/payables"
import { recordSupplierPayment, getSupplierOpenInvoices } from "@/app/actions/supplier-profile"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/action-result"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Plus, Trash2, Split } from "lucide-react"

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
]

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

type SplitRow = {
  amount: string
  paymentMethod: string
  accountId: string
  referenceNo: string
}

export function PayablesClient({ data, searchParams }: { data: any; searchParams: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [payOpen, setPayOpen] = React.useState(false)
  const [refundOpen, setRefundOpen] = React.useState(false)
  const [selectedSupplier, setSelectedSupplier] = React.useState<any>(null)
  
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string>("")
  const [openInvoices, setOpenInvoices] = React.useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = React.useState(false)

  const [payAmount, setPayAmount] = React.useState("")
  const [payMethod, setPayMethod] = React.useState("BANK_TRANSFER")
  const [payAccount, setPayAccount] = React.useState("")
  const [payRef, setPayRef] = React.useState("")
  const [payNotes, setPayNotes] = React.useState("")
  const [payDate, setPayDate] = React.useState(new Date().toISOString().split("T")[0])
  const [isSplitMode, setIsSplitMode] = React.useState(false)
  const [splits, setSplits] = React.useState<SplitRow[]>([
    { amount: "", paymentMethod: "BANK_TRANSFER", accountId: "", referenceNo: "" },
    { amount: "", paymentMethod: "UPI", accountId: "", referenceNo: "" },
  ])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)
  const getMaxPayable = () => {
    if (selectedInvoiceId && selectedInvoiceId !== "__GENERAL__") {
      const inv = openInvoices.find((i) => i.id === selectedInvoiceId)
      if (inv) return Math.max(0, inv.balanceDue)
    }
    return selectedSupplier ? Math.max(0, selectedSupplier.outstanding) : 0
  }
  const maxPayable = getMaxPayable()

  const handleFilter = (key: string, value: string | boolean) => {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value.toString())
    else params.delete(key)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get("q") as string
    handleFilter("search", q)
  }

  const resetPayForm = () => {
    setPayAmount("")
    setPayMethod("BANK_TRANSFER")
    setPayAccount("")
    setPayRef("")
    setPayNotes("")
    setPayDate(new Date().toISOString().split("T")[0])
    setSelectedInvoiceId("")
    setIsSplitMode(false)
    setSplits([
      { amount: "", paymentMethod: "BANK_TRANSFER", accountId: "", referenceNo: "" },
      { amount: "", paymentMethod: "UPI", accountId: "", referenceNo: "" },
    ])
  }

  const openPay = async (row: any) => {
    setSelectedSupplier(row)
    setSelectedInvoiceId("")
    setOpenInvoices([])
    resetPayForm()
    setPayAmount(Math.max(0, row.outstanding).toString())
    setPayOpen(true)
    setLoadingInvoices(true)
    try {
      const res = await getSupplierOpenInvoices(row.id)
      if (res.success && res.data) {
        setOpenInvoices(res.data)
      }
    } finally {
      setLoadingInvoices(false)
    }
  }

  const openRefund = (row: any) => {
    setSelectedSupplier(row)
    setPayAmount(Math.abs(row.outstanding).toString())
    setPayAccount("")
    setPayRef("")
    setPayNotes("")
    setRefundOpen(true)
  }

  const updateSplit = (index: number, field: keyof SplitRow, value: string) => {
    const newSplits = [...splits]
    newSplits[index] = { ...newSplits[index], [field]: value }
    setSplits(newSplits)
  }

  const autoFillRemaining = (index: number) => {
    const otherTotal = splits.reduce((s, sp, i) => i !== index ? s + (parseFloat(sp.amount) || 0) : s, 0)
    const remaining = Math.max(0, maxPayable - otherTotal)
    updateSplit(index, "amount", remaining.toFixed(2))
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier) return
    setIsSubmitting(true)

    try {
      if (isSplitMode) {
        const validSplits = splits.filter((s) => parseFloat(s.amount) > 0)
        if (validSplits.length === 0) { toast.error("Add at least one payment split"); setIsSubmitting(false); return }
        for (const s of validSplits) {
          if (!s.accountId) { toast.error("Select an account for each split"); setIsSubmitting(false); return }
        }
        if (splitTotal > maxPayable + 0.01) {
          toast.error(`Total ${formatCurrency(splitTotal)} exceeds outstanding ${formatCurrency(maxPayable)}`)
          setIsSubmitting(false); return
        }

        const invoiceId = selectedInvoiceId && selectedInvoiceId !== "__GENERAL__" ? selectedInvoiceId : null
        const res = await recordSupplierPayment({
          supplierId: selectedSupplier.id,
          invoiceId,
          amount: splitTotal,
          paymentMethod: "SPLIT",
          accountId: validSplits[0].accountId,
          notes: payNotes,
          date: payDate,
          splits: validSplits.map((s) => ({
            amount: parseFloat(s.amount),
            paymentMethod: s.paymentMethod,
            accountId: s.accountId,
            referenceNo: s.referenceNo,
          })),
        })
        if (res.success) {
          toast.success("Payment recorded successfully")
          setPayOpen(false)
          resetPayForm()
          router.refresh()
        } else {
          toast.error(res.message)
        }
      } else {
        if (!payAccount || !payAmount) { setIsSubmitting(false); return }
        if (Number(payAmount) > maxPayable + 0.01) {
          toast.error(`Amount exceeds maximum payable ${formatCurrency(maxPayable)}`)
          setIsSubmitting(false); return
        }
        const invoiceId = selectedInvoiceId && selectedInvoiceId !== "__GENERAL__" ? selectedInvoiceId : null
        const res = await recordSupplierPayment({
          supplierId: selectedSupplier.id,
          invoiceId,
          amount: Number(payAmount),
          paymentMethod: payMethod,
          accountId: payAccount,
          referenceNo: payRef,
          notes: payNotes,
          date: payDate,
        })
        if (res.success) {
          toast.success("Payment recorded successfully")
          setPayOpen(false)
          resetPayForm()
          router.refresh()
        } else {
          toast.error(res.message)
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier || !payAccount || !payAmount) return
    setIsSubmitting(true)
    try {
      const res = await recordSupplierRefund({
        supplierId: selectedSupplier.id,
        amount: Number(payAmount),
        accountId: payAccount,
        reference: payRef,
        notes: payNotes
      })
      if (res.success) {
        toast.success("Refund recorded successfully")
        setRefundOpen(false)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { header: "Supplier", accessor: (r: any) => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: "GSTIN", accessor: (r: any) => <span className="font-mono text-xs">{r.gstin || "-"}</span> },
    { header: "Invoices", accessor: (r: any) => <Money value={r.invoices} />, className: "text-right" },
    { header: "Paid", accessor: (r: any) => <Money value={r.paid} />, className: "text-right" },
    { header: "Returns", accessor: (r: any) => <Money value={r.returns} />, className: "text-right" },
    { header: "Outstanding", accessor: (r: any) => <span className="font-bold"><Money value={r.outstanding} /></span>, className: "text-right" },
    { 
      header: "Overdue Amount", 
      accessor: (r: any) => r.overdueAmount > 0 ? <span className="text-rose-600 font-medium"><Money value={r.overdueAmount} /></span> : <span className="text-slate-400">-</span>, 
      className: "text-right" 
    },
    { header: "Oldest Due", accessor: (r: any) => r.oldestDueDate ? fmtIST(r.oldestDueDate, "dd MMM yyyy") : "-" },
    { 
      header: "Action", 
      accessor: (r: any) => (
        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/dashboard/pharmacy-finance/payables/${r.id}`}>Statement</Link>
          </Button>
          {r.outstanding > 0.01 && (
            <Button size="sm" variant="default" onClick={() => openPay(r)}>Pay</Button>
          )}
          {r.outstanding < -0.01 && (
            <Button size="sm" variant="outline" onClick={() => openRefund(r)}>Refund</Button>
          )}
        </div>
      ),
      className: "text-right w-[180px]"
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Payables" 
        subtitle="Manage supplier outstanding balances and payments."
      />

      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-slate-500 mb-4">Aging Summary (Based on Due Dates)</h3>
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <div className="text-xs text-slate-500 mb-1">Not Due</div>
            <div className="text-lg font-bold"><Money value={data.notDueAmount} /></div>
          </div>
          {data.aging.map((b: any) => (
            <div key={b.label}>
              <div className="text-xs text-rose-500 mb-1 font-medium">{b.label} Days Overdue</div>
              <div className="text-lg font-bold text-rose-600"><Money value={b.amount} /></div>
            </div>
          ))}
          <div className="border-l pl-6 ml-2">
            <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Total Outstanding</div>
            <div className="text-2xl font-bold"><Money value={data.totalOutstanding} /></div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 bg-slate-50 p-3 rounded-lg border items-center justify-between">
        <div className="flex items-center gap-2 px-2">
          <Switch 
            id="only-outstanding" 
            checked={sp.get("outstanding") === "true"} 
            onCheckedChange={(c) => handleFilter("outstanding", c)} 
          />
          <Label htmlFor="only-outstanding" className="cursor-pointer">Only show outstanding</Label>
        </div>
        
        <form onSubmit={handleSearch} className="flex-1 max-w-sm flex gap-2">
          <Input 
            name="q" 
            placeholder="Search supplier..." 
            defaultValue={sp.get("search") || ""}
            className="bg-white"
          />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </div>

      <DataTable 
        data={data.rows} 
        columns={columns} 
        keyExtractor={r => r.id}
      />

      {/* Pay Dialog */}
      <Dialog open={payOpen} onOpenChange={(open) => { setPayOpen(open); if (!open) resetPayForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Supplier Payment</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <form onSubmit={handlePay} className="space-y-4 pt-4">
              <div className="flex justify-between text-sm bg-slate-50 p-3 rounded border">
                <span className="text-slate-500">{selectedSupplier.name}</span>
                <span className="font-medium">Due: <Money value={selectedSupplier.outstanding} /></span>
              </div>

              {/* Pay Against / Invoice Selection */}
              <div className="space-y-1.5">
                <Label>Pay Against</Label>
                <Select
                  value={selectedInvoiceId || "__GENERAL__"}
                  onValueChange={(val) => {
                    const id = val === "__GENERAL__" ? "" : val
                    setSelectedInvoiceId(id)
                    if (id) {
                      const inv = openInvoices.find((i) => i.id === id)
                      if (inv) setPayAmount(inv.balanceDue.toFixed(2))
                    } else {
                      setPayAmount(Math.max(0, selectedSupplier.outstanding).toFixed(2))
                    }
                  }}
                  disabled={loadingInvoices}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingInvoices ? "Loading invoices..." : "Select Invoice or On Account"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__GENERAL__">
                      On Account / General Payment (Balance: ₹{selectedSupplier.outstanding.toLocaleString("en-IN")})
                    </SelectItem>
                    {openInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        Inv #{inv.invoiceNumber} — Due: ₹{inv.balanceDue.toLocaleString("en-IN")} ({new Date(inv.date).toLocaleDateString("en-IN")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedInvoiceId && (
                  <p className="text-xs text-indigo-600 font-medium">
                    Allocating payment directly to invoice #{openInvoices.find((i) => i.id === selectedInvoiceId)?.invoiceNumber}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>

              {/* Split toggle */}
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border">
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
                <span className="text-xs text-muted-foreground">
                  {isSplitMode ? "Split across methods" : "Single method"}
                </span>
              </div>
              
              {!isSplitMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      max={maxPayable}
                      required 
                      value={payAmount} 
                      onChange={e => setPayAmount(e.target.value)} 
                    />
                    {Number(payAmount) > maxPayable + 0.01 && (
                      <p className="text-xs text-red-600">Exceeds outstanding amount</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Pay From Account</Label>
                    <AccountSelect 
                      value={payAccount} 
                      onChange={setPayAccount}
                      requireBalance={Number(payAmount) || 0}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input 
                      value={payRef} 
                      onChange={e => setPayRef(e.target.value)} 
                      placeholder="Txn ID / UTR"
                    />
                  </div>
                </>
              ) : (
                /* Split Mode */
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
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => setSplits(splits.filter((_, i) => i !== idx))}>
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
                        <AccountSelect
                          value={split.accountId}
                          onChange={(v) => updateSplit(idx, "accountId", v)}
                          requireBalance={parseFloat(split.amount) || 0}
                        />
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
                  <Button type="button" variant="outline" size="sm" onClick={() => setSplits([...splits, { amount: "", paymentMethod: "CASH", accountId: "", referenceNo: "" }])} className="w-full">
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
                <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional notes" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" type="button" onClick={() => { setPayOpen(false); resetPayForm() }}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || (isSplitMode ? splitTotal <= 0 || splitTotal > maxPayable + 0.01 : !payAmount || !payAccount || Number(payAmount) > maxPayable + 0.01)}
                >
                  {isSubmitting ? "Saving..." : isSplitMode ? `Record Split (${formatCurrency(splitTotal)})` : "Record Payment"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Supplier Refund</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <form onSubmit={handleRefund} className="space-y-4 pt-4">
              <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded border border-blue-200">
                You have overpaid this supplier by <strong className="font-medium"><Money value={Math.abs(selectedSupplier.outstanding)} /></strong>. 
                Record cash/bank transfer returned to you.
              </div>
              
              <div className="space-y-2">
                <Label>Amount Returned (₹)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Receive Into Account</Label>
                <AccountSelect 
                  value={payAccount} 
                  onChange={setPayAccount}
                />
              </div>

              <div className="space-y-2">
                <Label>Reference</Label>
                <Input 
                  value={payRef} 
                  onChange={e => setPayRef(e.target.value)} 
                  placeholder="Txn ID / UTR"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" type="button" onClick={() => setRefundOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !payAmount || !payAccount}>
                  {isSubmitting ? "Saving..." : "Record Refund"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
