"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { KpiCard } from "./kpi-card"
import { Money } from "./money"
import { StatusBadge } from "./status-badge"
import { fmtIST } from "@/lib/pharmacy-finance/dates"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { settleIPDMedicineBill, bulkSettleIPDMedicineBills, getCrossDepartmentAccounts } from "@/app/actions/pharmacy-finance"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/action-result"
import { AlertCircle, Clock, CheckCircle, FileText, ChevronDown, ChevronUp } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function IpdSettlementsClient({ data, kpis, searchParams }: { data: any[]; kpis: any; searchParams: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({})
  const [settleConfirmOpen, setSettledConfirmOpen] = React.useState(false)
  const [settleTarget, setSettleTarget] = React.useState<{ type: "BILL" | "ADMISSION", id: string, amount: number } | null>(null)
  const [hospitalAccounts, setHospitalAccounts] = React.useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const activeFilter = sp.get("filter") || "ALL"

  React.useEffect(() => {
    getCrossDepartmentAccounts().then(accs => setHospitalAccounts(accs.hospital))
  }, [])

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(sp.toString())
    if (val !== "ALL") params.set("filter", val)
    else params.delete("filter")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const toggleGroup = (admissionId: string) => {
    setExpandedGroups(prev => ({ ...prev, [admissionId]: !prev[admissionId] }))
  }

  // Group by admission
  const groups: Record<string, { patientName: string; ipdPaid: boolean | undefined; admissionId: string; bills: any[]; totalAmount: number; pendingAmount: number }> = {}
  
  data.forEach(b => {
    const aid = b.admissionId || "No Admission"
    if (!groups[aid]) {
      groups[aid] = {
        patientName: b.patientFullName || b.patientName,
        ipdPaid: b.ipdPaid,
        admissionId: aid,
        bills: [],
        totalAmount: 0,
        pendingAmount: 0
      }
    }
    groups[aid].bills.push(b)
    groups[aid].totalAmount += b.netAmount
    if (b.settlementStatus === "PENDING") {
      groups[aid].pendingAmount += b.netAmount
    }
  })

  const groupList = Object.values(groups).sort((a, b) => b.pendingAmount - a.pendingAmount)

  const handleSettle = async () => {
    if (!settleTarget) return
    setIsSubmitting(true)
    try {
      let res
      if (settleTarget.type === "BILL") {
        res = await settleIPDMedicineBill(settleTarget.id)
      } else {
        res = await bulkSettleIPDMedicineBills(settleTarget.id)
      }
      
      if (res.success) {
        toast.success(res.message)
        setSettledConfirmOpen(false)
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

  const openSettleConfirm = (type: "BILL" | "ADMISSION", id: string, amount: number) => {
    setSettleTarget({ type, id, amount })
    setSettledConfirmOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="IPD Settlements" 
        subtitle="Manage hospital-to-pharmacy payments for IPD medicine bills."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard 
          label="Pending Bills" 
          value={kpis.pendingCount} 
          icon={FileText} 
        />
        <KpiCard 
          label="Pending Amount" 
          value={<Money value={kpis.pendingAmount} />} 
          icon={Clock} 
        />
        <KpiCard 
          label="Settled This Month" 
          value={<Money value={kpis.settledThisMonthAmount} />} 
          icon={CheckCircle} 
        />
        <KpiCard 
          label="Avg Days to Settle" 
          value={kpis.avgDaysToSettle} 
          icon={CheckCircle} 
        />
      </div>

      <div className="flex gap-3 bg-slate-50 p-3 rounded-lg border items-center justify-between">
        <Tabs value={activeFilter} onValueChange={handleTabChange} className="w-[400px]">
          <TabsList>
            <TabsTrigger value="ALL">All Bills</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="SETTLED">Settled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {groupList.map(g => (
          <div key={g.admissionId} className="border rounded-lg bg-white overflow-hidden shadow-sm">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
              onClick={() => toggleGroup(g.admissionId)}
            >
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 p-2 rounded-md text-slate-500">
                  {expandedGroups[g.admissionId] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{g.patientName}</h3>
                  <p className="text-sm text-slate-500 font-mono">Admission: {g.admissionId === "No Admission" ? "-" : g.admissionId}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-slate-500">Pending / Total</div>
                  <div className="font-semibold">
                    <span className="text-rose-600"><Money value={g.pendingAmount} /></span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span><Money value={g.totalAmount} /></span>
                  </div>
                </div>
                {g.pendingAmount > 0 && g.admissionId !== "No Admission" && (
                  <Button 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); openSettleConfirm("ADMISSION", g.admissionId, g.pendingAmount) }}
                  >
                    Settle All
                  </Button>
                )}
              </div>
            </div>
            
            {expandedGroups[g.admissionId] && (
              <div className="border-t bg-slate-50 p-4">
                {g.ipdPaid === false && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                    <AlertCircle size={16} />
                    <span>Patient is still admitted or has unpaid hospital balance. Bill amounts may still change.</span>
                  </div>
                )}
                
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 rounded-tl-md">Bill No</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 rounded-tr-md text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.bills.map(b => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-white transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{b.billNumber}</td>
                        <td className="px-4 py-3">{fmtIST(b.billDate)}</td>
                        <td className="px-4 py-3 text-right font-medium"><Money value={b.netAmount} /></td>
                        <td className="px-4 py-3">
                          <StatusBadge status={b.settlementStatus || "PENDING"} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {b.settlementStatus === "PENDING" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openSettleConfirm("BILL", b.id, b.netAmount)}
                            >
                              Settle
                            </Button>
                          )}
                          {b.settlementStatus === "SETTLED" && b.settledAt && (
                            <span className="text-xs text-slate-500">
                              {fmtIST(b.settledAt, "dd MMM")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {groupList.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border text-slate-500">
            No IPD settlements found.
          </div>
        )}
      </div>

      <AlertDialog open={settleConfirmOpen} onOpenChange={setSettledConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to settle {settleTarget?.type === "BILL" ? "a bill" : "all pending bills"} for <strong className="text-slate-900"><Money value={settleTarget?.amount || 0} /></strong>.
              <br /><br />
              This will record a transfer from the Hospital account to the Pharmacy account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {hospitalAccounts.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-md text-sm my-4">
              <p className="font-medium mb-1">Available Hospital Accounts:</p>
              <ul className="space-y-1 text-slate-600">
                {hospitalAccounts.map(a => (
                  <li key={a.id} className="flex justify-between">
                    <span>{a.name}</span>
                    <span className={a.currentBalance < (settleTarget?.amount || 0) ? "text-rose-600 font-medium" : ""}>
                      <Money value={a.currentBalance} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSettle() }} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Confirm & Settle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
