"use client"

import { useState, useEffect } from "react"
import { getGovtClaims } from "@/app/actions/master-finance-revenue"
import { Landmark, Clock, CheckCircle2, XCircle, AlertCircle, IndianRupee } from "lucide-react"

interface Claim {
  id: string; claimNumber: string; claimType: string; claimDate: string
  claimAmount: number; approvedAmount: number | null; settledAmount: number | null
  status: string; remarks: string | null; tpaReferenceNumber: string | null
  policy: {
    schemeType: string; providerName: string
    patient: { name: string; uhid: string | null; phone: string | null }
  }
  billing: { billNumber: string; netAmount: number; type: string } | null
}

interface Summary { status: string; _count: number; _sum: { claimAmount: number | null; settledAmount: number | null } }

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

export function GovtClaimsClient() {
  const [scheme, setScheme] = useState<"" | "BSKY" | "PMJAY">("")
  const [statusFilter, setStatusFilter] = useState("")
  const [claims, setClaims] = useState<Claim[]>([])
  const [summary, setSummary] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getGovtClaims({ scheme: scheme || undefined, status: statusFilter || undefined })
      setClaims(JSON.parse(JSON.stringify(data.claims)))
      setSummary(data.summary)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [scheme, statusFilter])

  const totalClaimed = summary.reduce((s, r) => s + (r._sum.claimAmount || 0), 0)
  const totalSettled = summary.reduce((s, r) => s + (r._sum.settledAmount || 0), 0)
  const pendingCount = summary.filter((s) => !["SETTLED", "REJECTED"].includes(s.status)).reduce((sum, s) => sum + s._count, 0)
  const pendingAmount = summary.filter((s) => !["SETTLED", "REJECTED"].includes(s.status)).reduce((sum, s) => sum + (s._sum.claimAmount || 0), 0)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Landmark className="w-6 h-6 text-blue-600" />
          Government Claims
        </h1>
        <p className="text-sm text-slate-500 mt-1">BSKY & PMJAY claim lifecycle tracking</p>
      </div>

      {/* Scheme Tabs */}
      <div className="flex gap-2">
        {(["", "BSKY", "PMJAY"] as const).map((s) => (
          <button key={s || "ALL"} onClick={() => setScheme(s)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors border ${scheme === s
              ? s === "BSKY" ? "bg-orange-600 text-white border-orange-600" : s === "PMJAY" ? "bg-green-600 text-white border-green-600" : "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {s || "All Schemes"}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><IndianRupee className="w-3 h-3" />TOTAL CLAIMED</div>
          <div className="text-2xl font-bold text-slate-800">₹{totalClaimed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-400 mt-1">{summary.reduce((s, r) => s + r._count, 0)} claims</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />SETTLED</div>
          <div className="text-2xl font-bold text-green-600">₹{totalSettled.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />PENDING</div>
          <div className="text-2xl font-bold text-amber-600">₹{pendingAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-400 mt-1">{pendingCount} claims</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />SETTLEMENT RATE</div>
          <div className="text-2xl font-bold text-slate-800">{totalClaimed > 0 ? ((totalSettled / totalClaimed) * 100).toFixed(0) : 0}%</div>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${!statusFilter ? "ring-2 ring-blue-500 bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
          All
        </button>
        {summary.map((s) => (
          <button key={s.status} onClick={() => setStatusFilter(statusFilter === s.status ? "" : s.status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${statusFilter === s.status ? "ring-2 ring-blue-500 border-blue-200" : "border-transparent"} ${STATUS_COLORS[s.status] || "bg-slate-100 text-slate-600"}`}>
            {s.status.replace(/_/g, " ")} ({s._count})
          </button>
        ))}
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
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Bill #</th>
                <th className="text-right p-3 font-medium">Claimed (₹)</th>
                <th className="text-right p-3 font-medium">Settled (₹)</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400 text-sm">No government claims found</td></tr>
              ) : claims.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-3 text-xs font-mono text-slate-700 font-medium">{c.claimNumber}</td>
                  <td className="p-3">
                    <div className="text-xs text-slate-700">{c.policy.patient.name}</div>
                    <div className="text-[10px] text-slate-400">{c.policy.patient.uhid || "—"} {c.policy.patient.phone ? `• ${c.policy.patient.phone}` : ""}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${c.policy.schemeType === "BSKY" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                      {c.policy.schemeType}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{c.claimType}</td>
                  <td className="p-3 text-xs font-mono text-slate-500">{c.billing?.billNumber || "—"}</td>
                  <td className="p-3 text-right text-xs font-semibold text-slate-800">₹{c.claimAmount.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-xs text-green-600">{c.settledAmount != null ? `₹${c.settledAmount.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{new Date(c.claimDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                  <td className="p-3 text-xs text-slate-400 max-w-[150px] truncate">{c.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
