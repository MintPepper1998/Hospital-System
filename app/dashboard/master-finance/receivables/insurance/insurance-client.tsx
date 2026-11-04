"use client"

import { useState, useEffect } from "react"
import { getInsuranceReceivables } from "@/app/actions/master-finance-revenue"
import { ShieldCheck, Filter, IndianRupee, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

interface Claim {
  id: string; claimNumber: string; claimType: string; claimDate: string
  claimAmount: number; approvedAmount: number | null; settledAmount: number | null
  status: string; remarks: string | null; tpaReferenceNumber: string | null
  policy: {
    schemeType: string; providerName: string; tpaName: string | null
    patient: { name: string; uhid: string | null }
  }
  billing: { billNumber: string; netAmount: number; type: string } | null
}

interface Summary { status: string; _count: number; _sum: { claimAmount: number | null; approvedAmount: number | null; settledAmount: number | null } }

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700",
  UNDER_REVIEW: "bg-amber-50 text-amber-700",
  IN_PROCESS: "bg-cyan-50 text-cyan-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600",
  SETTLED: "bg-green-50 text-green-700",
  QUERY_RAISED: "bg-orange-50 text-orange-700",
  DISCHARGE_APPROVED: "bg-teal-50 text-teal-700",
  ENHANCEMENT_PENDING: "bg-violet-50 text-violet-700",
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  SUBMITTED: <Clock className="w-3 h-3" />,
  APPROVED: <CheckCircle2 className="w-3 h-3" />,
  REJECTED: <XCircle className="w-3 h-3" />,
  SETTLED: <CheckCircle2 className="w-3 h-3" />,
  QUERY_RAISED: <AlertCircle className="w-3 h-3" />,
}

const SCHEME_TYPES = ["", "PRIVATE", "PMJAY", "BSKY", "CGHS", "ECHS"]
const STATUSES = ["", "SUBMITTED", "UNDER_REVIEW", "IN_PROCESS", "APPROVED", "REJECTED", "SETTLED", "QUERY_RAISED"]

export function InsuranceReceivablesClient() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [summary, setSummary] = useState<Summary[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [statusFilter, setStatusFilter] = useState("")
  const [schemeFilter, setSchemeFilter] = useState("")
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getInsuranceReceivables({ status: statusFilter || undefined, schemeType: schemeFilter || undefined })
      setClaims(JSON.parse(JSON.stringify(data.claims)))
      setSummary(data.summary)
      setTotalPending(data.totalPending)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [statusFilter, schemeFilter])

  const totalClaimed = summary.reduce((s, r) => s + (r._sum.claimAmount || 0), 0)
  const totalApproved = summary.reduce((s, r) => s + (r._sum.approvedAmount || 0), 0)
  const totalSettled = summary.reduce((s, r) => s + (r._sum.settledAmount || 0), 0)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          Insurance Receivables
        </h1>
        <p className="text-sm text-slate-500 mt-1">TPA and insurance claim tracking — all schemes</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">TOTAL CLAIMED</div>
          <div className="text-2xl font-bold text-slate-800">₹{totalClaimed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">APPROVED</div>
          <div className="text-2xl font-bold text-emerald-600">₹{totalApproved.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">SETTLED</div>
          <div className="text-2xl font-bold text-green-600">₹{totalSettled.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">PENDING RECEIVABLE</div>
          <div className="text-2xl font-bold text-amber-600">₹{totalPending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Claims by Status</h3>
        <div className="flex flex-wrap gap-2">
          {summary.map((s) => (
            <button key={s.status} onClick={() => setStatusFilter(statusFilter === s.status ? "" : s.status)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${statusFilter === s.status ? "ring-2 ring-blue-500 border-blue-300" : "border-transparent"} ${STATUS_COLORS[s.status] || "bg-slate-100 text-slate-600"}`}>
              {STATUS_ICONS[s.status]}
              {s.status.replace(/_/g, " ")} ({s._count})
              <span className="ml-1 opacity-70">₹{((s._sum.claimAmount || 0) / 1000).toFixed(0)}K</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={schemeFilter} onChange={(e) => setSchemeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Schemes</option>
          {SCHEME_TYPES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(statusFilter || schemeFilter) && (
          <button onClick={() => { setStatusFilter(""); setSchemeFilter("") }} className="text-xs text-blue-600 hover:underline">Clear filters</button>
        )}
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Claim #</th>
                <th className="text-left p-3 font-medium">Patient</th>
                <th className="text-left p-3 font-medium">Scheme</th>
                <th className="text-left p-3 font-medium">Provider / TPA</th>
                <th className="text-left p-3 font-medium">Bill #</th>
                <th className="text-right p-3 font-medium">Claimed</th>
                <th className="text-right p-3 font-medium">Approved</th>
                <th className="text-right p-3 font-medium">Settled</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400 text-sm">No claims found</td></tr>
              ) : claims.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-3 text-xs font-mono text-slate-700 font-medium">{c.claimNumber}</td>
                  <td className="p-3">
                    <div className="text-xs text-slate-700">{c.policy.patient.name}</div>
                    <div className="text-[10px] text-slate-400">{c.policy.patient.uhid || "—"}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${c.policy.schemeType === "BSKY" ? "bg-orange-100 text-orange-700" : c.policy.schemeType === "PMJAY" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {c.policy.schemeType}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {c.policy.providerName}
                    {c.policy.tpaName && <div className="text-[10px] text-slate-400">TPA: {c.policy.tpaName}</div>}
                  </td>
                  <td className="p-3 text-xs font-mono text-slate-500">{c.billing?.billNumber || "—"}</td>
                  <td className="p-3 text-right text-xs font-semibold text-slate-800">₹{c.claimAmount.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-xs text-emerald-600">{c.approvedAmount != null ? `₹${c.approvedAmount.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="p-3 text-right text-xs text-green-600">{c.settledAmount != null ? `₹${c.settledAmount.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"}`}>
                      {STATUS_ICONS[c.status]}
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{new Date(c.claimDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
