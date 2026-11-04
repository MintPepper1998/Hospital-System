"use client"

import { useState, useMemo, useRef, useEffect, useTransition } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, RotateCcw, CheckCircle2, Eye, Loader2, Plus, X, Package, Calendar, Receipt, User } from "lucide-react"
import { toast } from "sonner"
import { approveSalesRefund } from "@/app/actions/sales-returns"

// ============================================
// NEOMORPHIC STYLE TOKENS
// ============================================

const neo = {
  card: "rounded-2xl bg-[#e0e5ec] border-none",
  shadow: "shadow-[6px_6px_12px_#bec3c9,-6px_-6px_12px_#ffffff]",
  shadowSm: "shadow-[3px_3px_6px_#bec3c9,-3px_-3px_6px_#ffffff]",
  inset: "shadow-[inset_3px_3px_6px_#bec3c9,inset_-3px_-3px_6px_#ffffff]",
  inputBg: "bg-[#e0e5ec]",
  buttonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-[4px_4px_8px_#bec3c9,-4px_-4px_8px_#ffffff]",
  buttonSuccess: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[4px_4px_8px_#bec3c9,-4px_-4px_8px_#ffffff]",
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SalesReturnsClient({ initialReturns, userRole, canReturn = false }: { initialReturns: any[], userRole: string, canReturn?: boolean }) {
  const [returns, setReturns] = useState(initialReturns)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [viewReturn, setViewReturn] = useState<any | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  const filteredReturns = useMemo(() => {
    if (!debouncedQuery) return returns
    const q = debouncedQuery.toLowerCase()
    return returns.filter((r) => 
      r.returnNumber.toLowerCase().includes(q) || 
      r.patient.user.name.toLowerCase().includes(q) ||
      r.originalBill.billNumber.toLowerCase().includes(q)
    )
  }, [returns, debouncedQuery])

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const res = await approveSalesRefund(id)
      if (res.success) {
        toast.success(res.message)
        // Optimistic update
        setReturns(returns.map(r => r.id === id ? { ...r, refundStatus: "APPROVED" } : r))
        // Also update viewReturn if it's the same one
        if (viewReturn?.id === id) {
          setViewReturn({ ...viewReturn, refundStatus: "APPROVED" })
        }
      } else {
        toast.error(res.message)
      }
    })
  }

  const getStatusBadge = (status: string) => {
    if (status === "PENDING_APPROVAL") return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-none">Pending Approval</Badge>
    if (status === "APPROVED") return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-none">Approved & Refunded</Badge>
    return <Badge variant="secondary">{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Search */}
        <div className={`relative flex-1 max-w-md ${neo.inset} rounded-xl flex items-center px-4 py-1.5`}>
          <Search className="h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by return no, patient, bill no..." 
            className={`border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm h-9 placeholder:text-slate-400`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Optional Action Button */}
        <Button 
          className={`${neo.buttonPrimary} h-10 px-6 rounded-xl font-medium`}
          disabled={!canReturn}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Return / Exchange
        </Button>
      </div>

      {/* Main Table */}
      <div className={`${neo.card} ${neo.shadow} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[#d1d9e6]/50 text-slate-500 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Return No.</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Original Bill</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold text-right">Refund Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d1d9e6]/30">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <RotateCcw className="h-12 w-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No customer returns found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{r.returnNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(r.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{r.patient.user.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-600">{r.originalBill.billNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-100">
                        {r.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-slate-700">{formatINR(r.refundAmount)}</div>
                      <div className="text-xs text-slate-400">{r.items.length} items</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(r.refundStatus)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Only SUPER_ADMIN can approve if pending */}
                        {userRole === "SUPER_ADMIN" && r.refundStatus === "PENDING_APPROVAL" && (
                          <Button 
                            variant="default"
                            size="sm"
                            className={`${neo.buttonSuccess} h-8 px-3 rounded-lg`}
                            disabled={isPending}
                            onClick={() => handleApprove(r.id)}
                          >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                            Approve
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-slate-200 rounded-lg"
                          onClick={() => setViewReturn(r)}
                        >
                          <Eye className="h-4 w-4 text-slate-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── View Return Detail Modal ── */}
      {viewReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setViewReturn(null)}>
          <div 
            className="bg-[#e0e5ec] rounded-2xl shadow-[8px_8px_16px_#bec3c9,-8px_-8px_16px_#ffffff] max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#d1d9e6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e0e5ec] shadow-[3px_3px_6px_#bec3c9,-3px_-3px_6px_#ffffff] flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Return Details</h2>
                  <p className="text-xs text-slate-400 font-mono">{viewReturn.returnNumber}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-200" onClick={() => setViewReturn(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`${neo.inset} rounded-xl p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{format(new Date(viewReturn.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div className={`${neo.inset} rounded-xl p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Patient</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{viewReturn.patient.user.name}</p>
                </div>
                <div className={`${neo.inset} rounded-xl p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Original Bill</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{viewReturn.originalBill.billNumber}</p>
                </div>
                <div className={`${neo.inset} rounded-xl p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Type / Status</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-100 text-xs">{viewReturn.type}</Badge>
                    {getStatusBadge(viewReturn.refundStatus)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Returned Items</h3>
                <div className={`${neo.card} ${neo.shadowSm} overflow-hidden rounded-xl`}>
                  <table className="w-full text-sm">
                    <thead className="bg-[#d1d9e6]/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Medicine</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Batch</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d1d9e6]/30">
                      {viewReturn.items.map((item: any, idx: number) => (
                        <tr key={item.id} className="hover:bg-white/30 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{item.itemName}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs font-mono">{item.batchNumber || "—"}</td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-700">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatINR(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">{formatINR(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refund Summary */}
              <div className={`${neo.inset} rounded-xl p-4 flex items-center justify-between`}>
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Total Refund Amount</span>
                <span className="text-xl font-extrabold text-indigo-700">{formatINR(viewReturn.refundAmount)}</span>
              </div>

              {/* Approve Action (if pending and admin) */}
              {userRole === "SUPER_ADMIN" && viewReturn.refundStatus === "PENDING_APPROVAL" && (
                <div className="flex justify-end pt-2">
                  <Button 
                    className={`${neo.buttonSuccess} h-10 px-6 rounded-xl font-medium`}
                    disabled={isPending}
                    onClick={() => handleApprove(viewReturn.id)}
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Approve & Process Refund
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
