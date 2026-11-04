"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Money } from "./money"
import { inr } from "@/lib/pharmacy-finance/money"
import { internalTransfer } from "@/app/actions/pharmacy-fin/accounts"
import { createPharmacyAccount, getCrossDepartmentAccounts, crossDepartmentTransfer } from "@/app/actions/pharmacy-finance"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"

const getTodayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })

export function AccountsClient({ data }: { data: any[] }) {
  const router = useRouter()
  
  const [loading, setLoading] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [intOpen, setIntOpen] = React.useState(false)
  const [hospOpen, setHospOpen] = React.useState(false)

  // Add Account form
  const [newName, setNewName] = React.useState("")
  const [newType, setNewType] = React.useState("CASH")
  const [newBank, setNewBank] = React.useState("")
  const [newAccNo, setNewAccNo] = React.useState("")
  const [newIfsc, setNewIfsc] = React.useState("")
  const [newOB, setNewOB] = React.useState("0")

  // Internal Transfer form
  const [intFrom, setIntFrom] = React.useState("")
  const [intTo, setIntTo] = React.useState("")
  const [intAmt, setIntAmt] = React.useState("")
  const [intDate, setIntDate] = React.useState(getTodayIST())
  const [intNotes, setIntNotes] = React.useState("")

  // Hospital Transfer form
  const [hospFrom, setHospFrom] = React.useState("")
  const [hospTo, setHospTo] = React.useState("")
  const [hospAmt, setHospAmt] = React.useState("")
  const [hospNotes, setHospNotes] = React.useState("")
  const [crossDepts, setCrossDepts] = React.useState<{ hospital: any[], pharmacy: any[] }>({ hospital: [], pharmacy: [] })

  React.useEffect(() => {
    if (hospOpen && crossDepts.hospital.length === 0) {
      getCrossDepartmentAccounts().then(setCrossDepts)
    }
  }, [hospOpen])

  React.useEffect(() => {
    if (intOpen) {
      setIntDate(getTodayIST())
    }
  }, [intOpen])

  const submitAdd = async () => {
    setLoading(true)
    const res = await createPharmacyAccount({
      name: newName,
      type: newType,
      bankName: newType === "BANK" ? newBank : undefined,
      accountNumber: newType === "BANK" ? newAccNo : undefined,
      ifscCode: newType === "BANK" ? newIfsc : undefined,
      openingBalance: Number(newOB)
    })
    setLoading(false)
    if (res.success) {
      toast.success("Account created")
      setAddOpen(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const submitInternal = async () => {
    if (!intFrom) {
      toast.error("Please select a source account")
      return
    }
    if (!intTo) {
      toast.error("Please select a destination account")
      return
    }
    const amountVal = Number(intAmt)
    if (!amountVal || amountVal <= 0) {
      toast.error("Please enter a valid transfer amount")
      return
    }
    const sourceAcc = data.find(a => a.id === intFrom)
    if (sourceAcc && amountVal > sourceAcc.balance) {
      toast.error(`Transfer amount exceeds available balance of ${inr(sourceAcc.balance, 2)}`)
      return
    }

    setLoading(true)
    const res = await internalTransfer({
      fromAccountId: intFrom,
      toAccountId: intTo,
      amount: amountVal,
      date: intDate,
      notes: intNotes
    })
    setLoading(false)
    if (res.success) {
      toast.success(res.message)
      setIntOpen(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const submitHospital = async () => {
    if (!hospFrom) {
      toast.error("Please select a pharmacy account")
      return
    }
    if (!hospTo) {
      toast.error("Please select a hospital account")
      return
    }
    const amountVal = Number(hospAmt)
    if (!amountVal || amountVal <= 0) {
      toast.error("Please enter a valid transfer amount")
      return
    }
    const sourceAcc = crossDepts.pharmacy.find(a => a.id === hospFrom)
    if (sourceAcc && amountVal > sourceAcc.currentBalance) {
      toast.error(`Transfer amount exceeds available balance of ${inr(sourceAcc.currentBalance, 2)}`)
      return
    }

    setLoading(true)
    const res = await crossDepartmentTransfer({
      fromAccountId: hospFrom,
      toAccountId: hospTo,
      amount: amountVal,
      notes: hospNotes
    })
    setLoading(false)
    if (res.success) {
      toast.success(res.message)
      setHospOpen(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const grandTotal = Math.round(data.reduce((sum, a) => sum + (Number(a.balance) || 0), 0) * 100) / 100
  const totalIn = Math.round(data.reduce((sum, a) => sum + (Number(a.todayIn) || 0), 0) * 100) / 100
  const totalOut = Math.round(data.reduce((sum, a) => sum + (Number(a.todayOut) || 0), 0) * 100) / 100

  const selectedFromAccount = data.find(a => a.id === intFrom)
  const selectedHospFromAccount = crossDepts.pharmacy.find(a => a.id === hospFrom)

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cash & Bank" 
        subtitle="Manage pharmacy financial accounts and transfers"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIntOpen(true)}>Internal Transfer</Button>
            <Button variant="outline" onClick={() => setHospOpen(true)}>Transfer to Hospital</Button>
            <Button onClick={() => setAddOpen(true)}>Add Account</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 bg-slate-900 text-slate-50 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-slate-300 text-sm font-semibold tracking-wide">Total Pharmacy Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              <Money value={grandTotal} noColor />
            </div>
            <div className="mt-4 text-sm text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span>Today's Cash In:</span>
                <span className="text-emerald-400 font-semibold">+<Money value={totalIn} noColor /></span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>Today's Cash Out:</span>
                <span className="text-rose-400 font-semibold">-<Money value={totalOut} noColor /></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {data.map(acc => (
          <Card key={acc.id} className="flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">{acc.name}</CardTitle>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{acc.type}</div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  <Money value={acc.balance} />
                </div>
                {acc.type === "BANK" && acc.bankDetails && (
                  <div className="text-xs text-muted-foreground mt-1 truncate" title={acc.bankDetails}>
                    {acc.bankDetails}
                  </div>
                )}
                <div className="mt-4 text-xs space-y-1.5 border-t border-slate-100 pt-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Today In:</span>
                    <span className="text-emerald-600 font-semibold">+<Money value={acc.todayIn} noColor /></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Today Out:</span>
                    <span className="text-rose-600 font-semibold">-<Money value={acc.todayOut} noColor /></span>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full mt-4 font-medium">
                <Link href={`/dashboard/pharmacy-finance/accounts/${acc.id}`}>View Ledger</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Counter Cash" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="UPI">UPI/Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newType === "BANK" && (
              <>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={newBank} onChange={e => setNewBank(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input value={newAccNo} onChange={e => setNewAccNo(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC</Label>
                    <Input value={newIfsc} onChange={e => setNewIfsc(e.target.value)} />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input type="number" step="0.01" value={newOB} onChange={e => setNewOB(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={loading || !newName}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal Transfer Dialog */}
      <Dialog open={intOpen} onOpenChange={setIntOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Internal Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label>From Account</Label>
                {selectedFromAccount && (
                  <span className="text-[11px] text-slate-500">
                    Available: <strong className="text-emerald-600">{inr(selectedFromAccount.balance, 2)}</strong>
                  </span>
                )}
              </div>
              <Select value={intFrom} onValueChange={setIntFrom}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select source account..." />
                </SelectTrigger>
                <SelectContent>
                  {data.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} (Bal: {inr(a.balance, 2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>To Account</Label>
              <Select value={intTo} onValueChange={setIntTo}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select destination account..." />
                </SelectTrigger>
                <SelectContent>
                  {data.filter(a => a.id !== intFrom).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} (Bal: {inr(a.balance, 2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  max={selectedFromAccount?.balance}
                  value={intAmt} 
                  onChange={e => setIntAmt(e.target.value)} 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={intDate} onChange={e => setIntDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={intNotes} onChange={e => setIntNotes(e.target.value)} placeholder="Optional remarks" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntOpen(false)}>Cancel</Button>
            <Button onClick={submitInternal} disabled={loading || !intFrom || !intTo || !intAmt}>
              {loading ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer to Hospital Dialog */}
      <Dialog open={hospOpen} onOpenChange={setHospOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Transfer to Hospital</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label>From (Pharmacy Account)</Label>
                {selectedHospFromAccount && (
                  <span className="text-[11px] text-slate-500">
                    Available: <strong className="text-emerald-600">{inr(selectedHospFromAccount.currentBalance, 2)}</strong>
                  </span>
                )}
              </div>
              <Select value={hospFrom} onValueChange={setHospFrom}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select pharmacy account..." />
                </SelectTrigger>
                <SelectContent>
                  {crossDepts.pharmacy.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} (Bal: {inr(a.currentBalance, 2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>To (Hospital Account)</Label>
              <Select value={hospTo} onValueChange={setHospTo}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select hospital account..." />
                </SelectTrigger>
                <SelectContent>
                  {crossDepts.hospital.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} (Bal: {inr(a.currentBalance, 2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                step="0.01" 
                min="0.01"
                max={selectedHospFromAccount?.currentBalance}
                value={hospAmt} 
                onChange={e => setHospAmt(e.target.value)} 
                placeholder="0.00" 
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={hospNotes} onChange={e => setHospNotes(e.target.value)} placeholder="e.g. Daily cash remittance to main hospital cash" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHospOpen(false)}>Cancel</Button>
            <Button onClick={submitHospital} disabled={loading || !hospFrom || !hospTo || !hospAmt}>
              {loading ? "Transferring..." : "Transfer to Hospital"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
