"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { DataTable } from "./data-table"
import { Money } from "./money"
import { StatusBadge } from "./status-badge"
import { fmtIST } from "@/lib/pharmacy-finance/dates"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AccountSelect } from "./account-select"
import { recordCreditPayment } from "@/app/actions/credit"
import { getCreditPartyStatement } from "@/app/actions/pharmacy-fin/receivables"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/action-result"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Plus, Trash2, Calendar, Split, CheckCircle2, AlertCircle, Printer, Loader2 } from "lucide-react"
import { getPatientConsolidatedDues } from "@/app/actions/pharmacy-fin/receivables"
import { PatientDuesBillModal, type PatientDuesData } from "./patient-dues-bill-modal"
import type { HospitalSettingsData } from "@/app/actions/settings"

export function ReceivablesClient({ 
  data, 
  searchParams, 
  hospitalSettings 
}: { 
  data: any
  searchParams: any
  hospitalSettings?: HospitalSettingsData | null 
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [collectOpen, setCollectOpen] = React.useState(false)
  const [selectedEntry, setSelectedEntry] = React.useState<any>(null)
  
  const [collectAmount, setCollectAmount] = React.useState("")
  const [collectMethod, setCollectMethod] = React.useState("CASH")
  const [collectAccount, setCollectAccount] = React.useState("")
  const [collectRef, setCollectRef] = React.useState("")
  const [collectNotes, setCollectNotes] = React.useState("")
  const [collectDate, setCollectDate] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [statementOpen, setStatementOpen] = React.useState(false)
  const [statementPartyId, setStatementPartyId] = React.useState<string | null>(null)
  const [statementPartyName, setStatementPartyName] = React.useState("")
  const [statementRows, setStatementRows] = React.useState<any[]>([])

  // Consolidated Patient Dues Bill Modal state
  const [duesModalOpen, setDuesModalOpen] = React.useState(false)
  const [duesData, setDuesData] = React.useState<PatientDuesData | null>(null)
  const [isLoadingDues, setIsLoadingDues] = React.useState(false)

  const openPatientDuesBill = async (partyName: string, partyId?: string | null, search?: string) => {
    setIsLoadingDues(true)
    try {
      const res = await getPatientConsolidatedDues({ partyName, partyId, search })
      if (res.success && res.patientInfo && res.items) {
        setDuesData(res as PatientDuesData)
        setDuesModalOpen(true)
      } else {
        toast.error(res.message || "No pending dues found for this patient")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load patient dues bill")
    } finally {
      setIsLoadingDues(false)
    }
  }

  const handlePrintSearchedPatient = () => {
    const searchQuery = sp.get("search")?.trim()
    if (!searchQuery && data.rows.length === 0) {
      toast.error("Please enter a patient name or select a patient")
      return
    }
    const targetParty = data.rows[0]?.partyName || searchQuery || ""
    const targetPartyId = data.rows[0]?.partyId || null
    openPatientDuesBill(targetParty, targetPartyId, searchQuery)
  }

  // Split payment state
  const [splits, setSplits] = React.useState<Array<{
    id: string
    method: string
    amount: string
    accountId: string
    reference: string
  }>>([
    { id: "1", method: "CASH", amount: "", accountId: "", reference: "" },
    { id: "2", method: "UPI", amount: "", accountId: "", reference: "" },
  ])

  const numCollectAmount = Number(collectAmount) || 0
  const splitSum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
  const splitDiff = numCollectAmount - splitSum
  const isSplitMatched = Math.abs(splitDiff) < 0.01 && numCollectAmount > 0

  const updateSplit = (idx: number, field: string, value: string) => {
    setSplits(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  const addSplit = () => {
    setSplits(prev => [
      ...prev,
      { id: String(Date.now()), method: "CARD", amount: "", accountId: "", reference: "" }
    ])
  }

  const removeSplit = (id: string) => {
    if (splits.length <= 2) return
    setSplits(prev => prev.filter(s => s.id !== id))
  }

  const autoFillRemaining = () => {
    const remaining = Math.max(0, splitDiff)
    if (remaining <= 0) return
    const emptyIdx = splits.findIndex(s => !s.amount || Number(s.amount) === 0)
    if (emptyIdx !== -1) {
      updateSplit(emptyIdx, "amount", remaining.toFixed(2))
    } else {
      setSplits(prev => [
        ...prev,
        { id: String(Date.now()), method: "UPI", amount: remaining.toFixed(2), accountId: "", reference: "" }
      ])
    }
  }

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value && value !== "ALL") params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get("q") as string
    handleFilter("search", q)
  }

  const openCollect = (row: any) => {
    setSelectedEntry(row)
    setCollectAmount(row.balanceAmount.toString())
    setCollectMethod("CASH")
    setCollectAccount("")
    setCollectRef("")
    setCollectNotes("")
    setCollectDate(new Date().toLocaleDateString('en-CA')) // Today YYYY-MM-DD
    setSplits([
      { id: "1", method: "CASH", amount: "", accountId: "", reference: "" },
      { id: "2", method: "UPI", amount: "", accountId: "", reference: "" },
    ])
    setCollectOpen(true)
  }

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEntry || !collectAmount) return

    const numAmount = Number(collectAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (numAmount > selectedEntry.balanceAmount + 0.01) {
      toast.error(`Amount exceeds pending balance of ₹${selectedEntry.balanceAmount.toFixed(2)}`)
      return
    }

    if (collectMethod === "SPLIT") {
      if (!isSplitMatched) {
        toast.error(`Split amounts total (₹${splitSum.toFixed(2)}) must match total to collect (₹${numAmount.toFixed(2)})`)
        return
      }
      for (let i = 0; i < splits.length; i++) {
        const s = splits[i]
        const a = Number(s.amount)
        if (!a || a <= 0) {
          toast.error(`Split #${i + 1} has an invalid amount`)
          return
        }
        if (!s.accountId) {
          toast.error(`Please select an account for Split #${i + 1} (${s.method})`)
          return
        }
      }
    } else {
      if (!collectAccount) {
        toast.error("Please select an account")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const res = await recordCreditPayment({
        creditEntryId: selectedEntry.id,
        amount: numAmount,
        paymentMethod: collectMethod,
        accountId: collectMethod === "SPLIT" ? undefined : collectAccount,
        reference: collectMethod === "SPLIT" ? undefined : collectRef,
        notes: collectNotes,
        paymentDate: collectDate ? new Date(collectDate) : undefined,
        splits: collectMethod === "SPLIT" ? splits.map(s => ({
          amount: Number(s.amount),
          paymentMethod: s.method,
          accountId: s.accountId,
          reference: s.reference?.trim() || undefined
        })) : undefined
      })
      if (res.success) {
        toast.success(res.message || "Payment collected successfully")
        setCollectOpen(false)
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

  const openStatement = async (partyId: string, partyName: string) => {
    if (!partyId) {
      toast.error("Walk-in customer has no statement")
      return
    }
    setStatementPartyId(partyId)
    setStatementPartyName(partyName)
    setStatementOpen(true)
    try {
      const rows = await getCreditPartyStatement(partyId)
      setStatementRows(rows)
    } catch (err) {
      toast.error("Failed to load statement")
    }
  }

  const columns = [
    { 
      header: "Party", 
      accessor: (r: any) => (
        <span 
          className="font-medium text-blue-600 hover:underline cursor-pointer"
          onClick={() => openStatement(r.partyId, r.partyName)}
        >
          {r.partyName}
        </span>
      )
    },
    { header: "Bill No", accessor: (r: any) => <span className="font-mono text-xs">{r.billNumber}</span> },
    { header: "Bill Date", accessor: (r: any) => fmtIST(r.billDate, "dd MMM yyyy") },
    { header: "Total", accessor: (r: any) => <Money value={r.totalAmount} />, className: "text-right" },
    { header: "Paid", accessor: (r: any) => <Money value={r.paidAmount} />, className: "text-right" },
    { header: "Balance", accessor: (r: any) => <Money value={r.balanceAmount} />, className: "text-right" },
    { header: "Age (Days)", accessor: (r: any) => r.ageDays, className: "text-right" },
    { header: "Aging", accessor: (r: any) => r.agingBucket },
    { header: "Status", accessor: (r: any) => <StatusBadge status={r.status} /> },
    { 
      header: "Action", 
      accessor: (r: any) => (
        <div className="flex items-center justify-center gap-1.5">
          {r.status !== "SETTLED" && (
            <Button size="sm" variant="outline" className="h-8 text-xs font-medium" onClick={() => openCollect(r)}>
              Collect
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs gap-1"
            title={`Print Consolidated Dues Bill for ${r.partyName}`}
            onClick={() => openPatientDuesBill(r.partyName, r.partyId)}
            disabled={isLoadingDues}
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden lg:inline">Print Dues</span>
          </Button>
        </div>
      ),
      className: "text-center"
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Receivables" 
        subtitle="Manage pending credit collections from patients and customers."
      />

      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-slate-500 mb-4">Aging Summary (All Open)</h3>
        <div className="flex flex-wrap gap-6 items-end">
          {data.aging.map((b: any) => (
            <div key={b.label}>
              <div className="text-xs text-slate-500 mb-1">{b.label} Days</div>
              <div className="text-lg font-bold"><Money value={b.amount} /></div>
            </div>
          ))}
          <div className="border-l pl-6 ml-2">
            <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Total Outstanding</div>
            <div className="text-2xl font-bold text-rose-600"><Money value={data.totalOutstanding} /></div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-50 p-3 rounded-lg border items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <Select value={sp.get("status") || "OPEN"} onValueChange={(v) => handleFilter("status", v)}>
            <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="SETTLED">Settled</SelectItem>
            </SelectContent>
          </Select>
          <form onSubmit={handleSearch} className="flex-1 max-w-sm flex gap-2">
            <Input 
              name="q" 
              placeholder="Search party or bill..." 
              defaultValue={sp.get("search") || ""}
              className="bg-white"
            />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>

        {/* Quick Print Pending Dues for Searched Patient */}
        {sp.get("search") && data.rows.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrintSearchedPatient}
            disabled={isLoadingDues}
            className="gap-2 border-blue-400 text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-800 text-xs h-9 font-semibold transition-colors shrink-0"
          >
            {isLoadingDues ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>Print Pending Dues ({data.rows[0]?.partyName || sp.get("search")})</span>
          </Button>
        )}
      </div>

      <DataTable 
        data={data.rows} 
        columns={columns} 
        keyExtractor={r => r.id}
        page={data.page}
        totalPages={data.totalPages}
      />

      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Collect Payment</span>
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <form onSubmit={handleCollect} className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-sm bg-slate-50 border p-3 rounded-lg">
                <div>
                  <div className="text-xs text-slate-500">Party Name</div>
                  <div className="font-semibold text-slate-800">{selectedEntry.partyName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Pending Balance</div>
                  <div className="font-bold text-rose-600"><Money value={selectedEntry.balanceAmount} /></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="collect-date">Payment Date</Label>
                    <span className="text-[10px] text-slate-500 font-medium">Backdating</span>
                  </div>
                  <Input 
                    id="collect-date"
                    type="date" 
                    required 
                    value={collectDate} 
                    onChange={e => setCollectDate(e.target.value)} 
                    max={new Date().toLocaleDateString('en-CA')}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="collect-amount">Amount to Collect (₹)</Label>
                  <Input 
                    id="collect-amount"
                    type="number" 
                    step="0.01" 
                    max={selectedEntry.balanceAmount}
                    required 
                    value={collectAmount} 
                    onChange={e => setCollectAmount(e.target.value)} 
                    className="h-9 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Option</Label>
                <Select value={collectMethod} onValueChange={setCollectMethod}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI / Digital</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                    <SelectItem value="SPLIT">Split Payment (Multiple Modes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {collectMethod !== "SPLIT" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Deposit Account</Label>
                    <AccountSelect 
                      value={collectAccount} 
                      onChange={setCollectAccount}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Reference (Optional)</Label>
                    <Input 
                      value={collectRef} 
                      onChange={e => setCollectRef(e.target.value)} 
                      placeholder="Txn ID / UTR / Cheque No"
                      className="h-9"
                    />
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-lg border bg-slate-50/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Split className="h-3.5 w-3.5 text-blue-600" />
                      Split Breakdown
                    </span>
                    <span className={isSplitMatched ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                      ₹{splitSum.toFixed(2)} / ₹{numCollectAmount.toFixed(2)}
                      {isSplitMatched && " ✓ Matched"}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {splits.map((split, idx) => (
                      <div key={split.id} className="p-2.5 bg-white rounded-md border shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">Mode #{idx + 1}</span>
                          {splits.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-[11px]"
                              onClick={() => removeSplit(split.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Method</Label>
                            <Select
                              value={split.method}
                              onValueChange={(val) => updateSplit(idx, "method", val)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="CARD">Card</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Amount (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-8 text-xs font-medium"
                              placeholder="0.00"
                              value={split.amount}
                              onChange={(e) => updateSplit(idx, "amount", e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Account</Label>
                            <AccountSelect
                              value={split.accountId}
                              onChange={(val) => updateSplit(idx, "accountId", val)}
                              placeholder="Select account"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Reference (Opt)</Label>
                            <Input
                              className="h-8 text-xs"
                              placeholder="Txn ID / Ref"
                              value={split.reference}
                              onChange={(e) => updateSplit(idx, "reference", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-white"
                      onClick={addSplit}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Mode
                    </Button>

                    {splitDiff > 0.01 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100"
                        onClick={autoFillRemaining}
                      >
                        Fill Remaining (₹{splitDiff.toFixed(2)})
                      </Button>
                    )}
                  </div>

                  {!isSplitMatched && numCollectAmount > 0 && (
                    <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      {splitDiff > 0
                        ? `⚠️ ₹${splitDiff.toFixed(2)} remaining to allocate.`
                        : `⚠️ Total exceeds by ₹${Math.abs(splitDiff).toFixed(2)}.`}
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label>Notes (Optional)</Label>
                <Input 
                  value={collectNotes} 
                  onChange={e => setCollectNotes(e.target.value)} 
                  placeholder="e.g. collected at counter, late entry"
                  className="h-9"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button variant="outline" type="button" onClick={() => setCollectOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    isSubmitting || 
                    !numCollectAmount || 
                    (collectMethod === "SPLIT" ? !isSplitMatched : !collectAccount)
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? "Saving..." : "Record Payment"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={statementOpen} onOpenChange={setStatementOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
            <SheetTitle>Statement: {statementPartyName}</SheetTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs mr-6 text-slate-700 hover:text-slate-900"
              onClick={() => openPatientDuesBill(statementPartyName, statementPartyId)}
              disabled={isLoadingDues}
            >
              {isLoadingDues ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              <span>Print Dues Bill</span>
            </Button>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {statementRows.map((r: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-3 border-b last:border-0 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{r.description}</div>
                  <div className="text-slate-500 text-xs">{fmtIST(r.date, "dd MMM yyyy")}</div>
                </div>
                <div className="text-right">
                  <div className={r.isCredit ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                    {r.isCredit ? "-" : "+"}<Money value={r.amount} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Bal: <Money value={r.runningBalance} /></div>
                </div>
              </div>
            ))}
            {statementRows.length === 0 && (
              <div className="text-center text-slate-500 py-8">Loading or no history...</div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Consolidated Patient Pending Dues Bill Modal */}
      <PatientDuesBillModal
        isOpen={duesModalOpen}
        onClose={() => setDuesModalOpen(false)}
        duesData={duesData}
        hospitalSettings={hospitalSettings}
      />
    </div>
  )
}
