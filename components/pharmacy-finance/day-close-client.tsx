"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DataTable } from "./data-table"
import { Money } from "./money"
import { useRouter } from "next/navigation"
import { closeDay } from "@/app/actions/pharmacy-fin/day-close"
import { toast } from "sonner"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export function DayCloseClient({ 
  dateStr, 
  accountId, 
  cashAccounts, 
  draft, 
  recent 
}: { 
  dateStr: string
  accountId: string
  cashAccounts: any[]
  draft: any
  recent: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const [denominations, setDenominations] = React.useState({
    "2000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "coins": 0
  })
  const [notes, setNotes] = React.useState("")

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const u = new URLSearchParams(window.location.search)
    u.set("date", e.target.value)
    router.push(`?${u.toString()}`)
  }

  const handleAccountChange = (val: string) => {
    const u = new URLSearchParams(window.location.search)
    u.set("accountId", val)
    router.push(`?${u.toString()}`)
  }

  const totalCounted = Object.entries(denominations).reduce((acc, [k, v]) => {
    if (k === "coins") return acc + v
    return acc + (Number(k) * v)
  }, 0)

  const expectedCash = draft?.expectedCash || 0
  const variance = totalCounted - expectedCash

  const submitClose = async () => {
    if (!confirm(`Are you sure you want to close the day with a variance of ₹${variance.toFixed(2)}? This action cannot be undone.`)) return
    
    setLoading(true)
    const res = await closeDay({
      dateStr,
      accountId,
      countedCash: totalCounted,
      denominations,
      notes
    })
    setLoading(false)

    if (res.success) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const historyColumns = [
    { header: "Date", accessor: (r: any) => r.businessDate },
    { header: "Opening", accessor: (r: any) => <Money value={r.openingCash} />, className: "text-right" },
    { header: "In", accessor: (r: any) => <Money value={r.cashIn + r.transfersIn} />, className: "text-right" },
    { header: "Out", accessor: (r: any) => <Money value={r.cashOut + r.transfersOut} />, className: "text-right" },
    { header: "Expected", accessor: (r: any) => <Money value={r.expectedCash} />, className: "text-right" },
    { header: "Counted", accessor: (r: any) => <Money value={r.countedCash} />, className: "text-right" },
    { 
      header: "Variance", 
      accessor: (r: any) => (
        <span className={Math.abs(r.variance) > 0.01 ? "text-rose-600 font-bold" : "text-emerald-600"}>
          <Money value={r.variance} />
        </span>
      ), 
      className: "text-right" 
    },
    { header: "Notes", accessor: (r: any) => r.notes }
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Day Close" 
        subtitle="Daily cash register reconciliation"
      />

      <div className="bg-white p-4 rounded-lg border flex gap-4 items-end">
        <div className="space-y-2 flex-1">
          <Label>Cash Account</Label>
          <Select value={accountId} onValueChange={handleAccountChange}>
            <SelectTrigger><SelectValue placeholder="Select Cash Account" /></SelectTrigger>
            <SelectContent>
              {cashAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 flex-1">
          <Label>Business Date</Label>
          <Input type="date" value={dateStr} onChange={handleDateChange} max={new Date().toISOString().split("T")[0]} />
        </div>
      </div>

      {!draft && accountId && (
        <div className="p-8 text-center text-muted-foreground border rounded-lg bg-slate-50">
          Loading draft...
        </div>
      )}

      {draft && draft.isClosed && (
        <div className="p-6 border border-emerald-200 bg-emerald-50 rounded-lg flex items-center gap-4 text-emerald-800">
          <CheckCircle2 className="h-8 w-8" />
          <div>
            <h3 className="font-semibold text-lg">Day Already Closed</h3>
            <p>The selected date ({dateStr}) has already been closed for this account.</p>
            <p className="text-sm mt-2 font-medium">Counted: ₹{draft.closeRecord.countedCash} | Expected: ₹{draft.closeRecord.expectedCash} | Variance: ₹{draft.closeRecord.variance}</p>
          </div>
        </div>
      )}

      {draft && !draft.isClosed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between font-medium">
                <span>Opening Cash</span>
                <span>₹{draft.openingCash.toLocaleString("en-IN")}</span>
              </div>
              <div className="pt-2 border-t space-y-1">
                <div className="text-sm text-muted-foreground font-medium mb-2">Cash In</div>
                {Object.entries(draft.categories).filter(([_, v]: any) => v.in > 0).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between text-sm pl-4">
                    <span>{k.replace(/_/g, " ")}</span>
                    <span className="text-emerald-600">+ ₹{v.in.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t space-y-1">
                <div className="text-sm text-muted-foreground font-medium mb-2">Cash Out</div>
                {Object.entries(draft.categories).filter(([_, v]: any) => v.out > 0).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between text-sm pl-4">
                    <span>{k.replace(/_/g, " ")}</span>
                    <span className="text-rose-600">- ₹{v.out.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t flex justify-between font-bold text-lg">
                <span>Expected Cash</span>
                <span>₹{expectedCash.toLocaleString("en-IN")}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Physical Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {["2000", "500", "200", "100", "50", "20", "10"].map(denom => (
                  <div key={denom} className="flex items-center gap-2">
                    <Label className="w-16 text-right">₹{denom}</Label>
                    <span className="text-muted-foreground">×</span>
                    <Input 
                      type="number" 
                      min="0" 
                      className="w-20 h-8"
                      value={denominations[denom as keyof typeof denominations] || ""}
                      onChange={e => setDenominations({...denominations, [denom]: Number(e.target.value)})}
                    />
                    <span className="text-sm text-muted-foreground w-20 text-right">
                      = ₹{(Number(denom) * (denominations[denom as keyof typeof denominations] || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2 col-span-2 mt-2 pt-2 border-t">
                  <Label className="w-16 text-right">Coins</Label>
                  <span className="text-muted-foreground w-[13px] text-center">+</span>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    className="w-20 h-8"
                    value={denominations.coins || ""}
                    onChange={e => setDenominations({...denominations, coins: Number(e.target.value)})}
                  />
                  <span className="text-sm text-muted-foreground w-20 text-right">
                    = ₹{(denominations.coins || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-50 rounded-lg border space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Counted</span>
                  <span>₹{totalCounted.toLocaleString("en-IN")}</span>
                </div>
                <div className={`flex justify-between font-medium ${Math.abs(variance) > 100 ? "text-rose-600 font-bold" : Math.abs(variance) > 0.01 ? "text-amber-600" : "text-emerald-600"}`}>
                  <span>Variance</span>
                  <span>{variance > 0 ? "+" : ""}₹{variance.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for variance, if any" />
              </div>

              <Button 
                className="w-full mt-6" 
                onClick={submitClose} 
                disabled={loading}
              >
                Close Day
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {recent && recent.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Closes</CardTitle></CardHeader>
          <CardContent>
            <DataTable data={recent} columns={historyColumns} keyExtractor={(r: any) => r.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
