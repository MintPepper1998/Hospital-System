"use client"

import { useState, useEffect, Fragment } from "react"
import { searchInvoices } from "@/app/actions/master-finance-revenue"
import { Search, Filter, ChevronLeft, ChevronRight, Eye } from "lucide-react"

const BILLING_TYPES = ["OPD", "IPD", "LABORATORY", "OT", "CANTEEN", "AMBULANCE", "CASUALTY", "EMERGENCY"]
const BILLING_STATUSES = ["PENDING", "PAID", "PARTIALLY_PAID", "CANCELLED", "REFUNDED", "PENDING_GOVERNMENT_PAYMENT"]

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  PARTIALLY_PAID: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-red-50 text-red-600",
  REFUNDED: "bg-purple-50 text-purple-700",
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING_GOVERNMENT_PAYMENT: "bg-cyan-50 text-cyan-700",
}

interface Invoice {
  id: string; billNumber: string; type: string; billDate: string; totalAmount: number
  discountAmount: number; netAmount: number; paidAmount: number; balanceAmount: number
  status: string; paymentMethod: string | null
  patient: { id: string; name: string; phone: string | null; uhid: string | null }
  payments: Array<{ id: string; amount: number; method: string; paymentDate: string }>
}

export function InvoiceSearchClient() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(today.toISOString().split("T")[0])
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function fetchData(p = page) {
    setLoading(true)
    try {
      const result = await searchInvoices({ from, to, type: type || undefined, status: status || undefined, search: searchTerm || undefined, page: p, limit: 25 })
      setInvoices(JSON.parse(JSON.stringify(result.invoices)))
      setTotal(result.total)
      setTotalPages(result.totalPages)
      setPage(p)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData(1) }, [])

  function handleSearch() { fetchData(1) }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-600" />
          Invoice Registry
        </h1>
        <p className="text-sm text-slate-500 mt-1">Search and manage all bills across departments</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[130px]">
              <option value="">All Types</option>
              {BILLING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[150px]">
              <option value="">All Statuses</option>
              {BILLING_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Bill number, patient name, or phone..."
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={handleSearch} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Filter className="w-4 h-4" /> {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">{total} invoices found</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => fetchData(page - 1)} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-slate-600">Page {page} of {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => fetchData(page + 1)} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Bill #</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Patient</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Net (₹)</th>
                <th className="text-right p-3 font-medium">Paid (₹)</th>
                <th className="text-right p-3 font-medium">Balance (₹)</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400 text-sm">{loading ? "Loading..." : "No invoices found"}</td></tr>
              ) : invoices.map((inv) => (
                <Fragment key={inv.id}>
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}>
                    <td className="p-3 text-xs font-mono text-slate-700 font-medium">{inv.billNumber}</td>
                    <td className="p-3 text-xs text-slate-600">{new Date(inv.billDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                    <td className="p-3">
                      <div className="text-xs text-slate-700 font-medium">{inv.patient.name}</div>
                      <div className="text-[10px] text-slate-400">{inv.patient.uhid || inv.patient.phone || "—"}</div>
                    </td>
                    <td className="p-3"><span className="text-xs text-slate-600">{inv.type}</span></td>
                    <td className="p-3 text-right text-xs font-semibold text-slate-800">₹{inv.netAmount.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right text-xs text-emerald-600 font-medium">₹{inv.paidAmount.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right text-xs text-amber-600 font-medium">{inv.balanceAmount > 0 ? `₹${inv.balanceAmount.toLocaleString("en-IN")}` : "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-600"}`}>{inv.status.replace(/_/g, " ")}</span>
                    </td>
                    <td className="p-3 text-center"><Eye className="w-3.5 h-3.5 text-slate-400" /></td>
                  </tr>
                  {expandedId === inv.id && inv.payments.length > 0 && (
                    <tr key={`${inv.id}-pay`}>
                      <td colSpan={9} className="bg-slate-50 px-6 py-3">
                        <div className="text-xs font-medium text-slate-600 mb-2">Payment History ({inv.payments.length})</div>
                        <div className="space-y-1">
                          {inv.payments.map((p) => (
                            <div key={p.id} className="flex items-center gap-4 text-xs">
                              <span className="text-slate-500 w-24">{new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                              <span className="text-slate-500 w-16">{p.method}</span>
                              <span className={`font-semibold ${p.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>{p.amount >= 0 ? "+" : ""}₹{Math.abs(p.amount).toLocaleString("en-IN")}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
