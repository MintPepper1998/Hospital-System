"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { DateRangeFilter } from "./date-range-filter"
import { DataTable } from "./data-table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AccountSelect } from "./account-select"
import { EXPENSE_HEADS } from "@/lib/pharmacy-finance/constants"
import { recordPharmacyExpense, voidPharmacyExpense } from "@/app/actions/pharmacy-fin/expenses"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Money } from "./money"
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ExpensesClient({ range, data, searchParams }: { range: any; data: any; searchParams: any }) {
  const router = useRouter()
  const [expenseOpen, setExpenseOpen] = React.useState(false)
  
  // Form state
  const [head, setHead] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [accountId, setAccountId] = React.useState("")
  const [method, setMethod] = React.useState("CASH")
  const [payee, setPayee] = React.useState("")
  const [ref, setRef] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = React.useState(false)

  const [voidTarget, setVoidTarget] = React.useState<string | null>(null)
  const [voidReason, setVoidReason] = React.useState("")

  const submitExpense = async () => {
    if (!head || !amount || !accountId) return toast.error("Head, Amount and Account are required")
    
    setLoading(true)
    const res = await recordPharmacyExpense({
      head,
      amount: Number(amount),
      accountId,
      paymentMethod: method,
      payee,
      reference: ref,
      notes,
      date
    })
    setLoading(false)

    if (res.success) {
      toast.success(res.message)
      setExpenseOpen(false)
      setHead("")
      setAmount("")
      setPayee("")
      setRef("")
      setNotes("")
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const submitVoid = async () => {
    if (!voidTarget || !voidReason) return
    setLoading(true)
    const res = await voidPharmacyExpense(voidTarget, voidReason)
    setLoading(false)
    if (res.success) {
      toast.success(res.message)
      setVoidTarget(null)
      setVoidReason("")
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const columns = [
    { header: "Date", accessor: (r: any) => new Date(r.date).toLocaleDateString("en-IN") },
    { header: "Head", accessor: (r: any) => EXPENSE_HEADS[r.head]?.label || r.head },
    { header: "Payee", accessor: (r: any) => r.payee },
    { header: "Account", accessor: (r: any) => r.accountName },
    { header: "Method", accessor: (r: any) => r.method },
    { header: "Amount", accessor: (r: any) => <Money value={r.amount} />, className: "text-right" },
    { header: "Ref/Notes", accessor: (r: any) => <div className="max-w-[200px] truncate" title={r.notes}>{r.reference} {r.notes !== "-" ? `(${r.notes})` : ""}</div> },
    { 
      header: "Status/Action", 
      accessor: (r: any) => r.isVoided 
        ? <span className="text-red-500 text-xs font-medium border border-red-200 bg-red-50 px-2 py-1 rounded">VOIDED</span>
        : <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 h-7" onClick={() => setVoidTarget(r.id)}>Void</Button>,
      className: "text-right"
    }
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c']

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Expenses" 
        subtitle="Manage pharmacy operational expenses"
        action={
          <div className="flex items-center gap-3">
            <DateRangeFilter />
            <Button onClick={() => setExpenseOpen(true)}>Add Expense</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expenses by Head</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center">
            {data.totalsByHead.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.totalsByHead}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="label"
                  >
                    {data.totalsByHead.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  {/* @ts-ignore */}
                  <RechartsTooltip formatter={(val: number) => `₹${val.toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full text-center text-muted-foreground text-sm">No data</div>
            )}
            <div className="w-1/2 max-h-full overflow-auto text-xs space-y-1">
              {data.totalsByHead.map((entry: any, i: number) => (
                <div key={entry.head} className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1 overflow-hidden">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="truncate" title={entry.label}>{entry.label}</span>
                  </div>
                  <span className="font-medium">₹{entry.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">6-Month Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.momTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={60} />
                {/* @ts-ignore */}
                <RechartsTooltip formatter={(val: number) => `₹${val.toLocaleString("en-IN")}`} cursor={{fill: 'transparent'}} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="w-[200px]">
          <Select 
            value={searchParams.head || "ALL"} 
            onValueChange={v => {
              const u = new URLSearchParams(window.location.search);
              if (v === "ALL") u.delete("head"); else u.set("head", v);
              router.push(`?${u.toString()}`);
            }}
          >
            <SelectTrigger><SelectValue placeholder="All Heads" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Heads</SelectItem>
              {Object.keys(EXPENSE_HEADS).map(k => (
                <SelectItem key={k} value={k}>{EXPENSE_HEADS[k as keyof typeof EXPENSE_HEADS].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable 
        data={data.rows} 
        columns={columns} 
        keyExtractor={(r: any) => r.id}
        emptyState="No expenses found for this period"
      />

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expense Head</Label>
                <Select value={head} onValueChange={setHead}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(EXPENSE_HEADS).map(k => (
                      <SelectItem key={k} value={k}>{EXPENSE_HEADS[k as keyof typeof EXPENSE_HEADS].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split("T")[0]} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Source Account</Label>
              <AccountSelect value={accountId} onChange={setAccountId} requireBalance={Number(amount) || 0} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payee</Label>
                <Input placeholder="E.g. vendor name" value={payee} onChange={e => setPayee(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes & Reference</Label>
              <div className="flex gap-2">
                <Input placeholder="Ref / Bill no." value={ref} onChange={e => setRef(e.target.value)} className="w-1/3" />
                <Input placeholder="Remarks" value={notes} onChange={e => setNotes(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
            <Button onClick={submitExpense} disabled={loading || !head || !amount || !accountId}>Record Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidTarget} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Expense</DialogTitle>
            <DialogDescription>
              This will create a reversing income transaction to restore the account balance. The original row will remain but be marked as voided.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for voiding</Label>
              <Input value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="E.g. Wrong amount entered" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitVoid} disabled={loading || !voidReason}>Confirm Void</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
