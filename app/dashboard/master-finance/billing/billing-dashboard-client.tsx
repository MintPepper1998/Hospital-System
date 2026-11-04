"use client"

import { Receipt, IndianRupee, Clock, AlertTriangle, TrendingUp, ArrowUpRight } from "lucide-react"

interface BillingData {
  today: { count: number; totalAmount: number; collected: number }
  month: { count: number; totalAmount: number; collected: number }
  statusCounts: Array<{ status: string; count: number; amount: number }>
  typeCounts: Array<{ type: string; count: number; amount: number; collected: number }>
  outstanding: { count: number; amount: number }
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  PARTIALLY_PAID: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-red-50 text-red-600",
  REFUNDED: "bg-purple-50 text-purple-700",
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING_GOVERNMENT_PAYMENT: "bg-cyan-50 text-cyan-700",
}

const TYPE_COLORS: Record<string, string> = {
  OPD: "#3b82f6",
  IPD: "#8b5cf6",
  LABORATORY: "#f59e0b",
  OT: "#ef4444",
  CANTEEN: "#f97316",
  AMBULANCE: "#06b6d4",
  CASUALTY: "#ec4899",
  EMERGENCY: "#dc2626",
}

function fmt(n: number) {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toLocaleString("en-IN")}`
}

function fmtFull(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BillingDashboardClient({ data }: { data: BillingData }) {
  const todayCollectionRate = data.today.totalAmount > 0
    ? ((data.today.collected / data.today.totalAmount) * 100).toFixed(0) : "0"
  const monthCollectionRate = data.month.totalAmount > 0
    ? ((data.month.collected / data.month.totalAmount) * 100).toFixed(0) : "0"
  const maxTypeAmount = Math.max(...data.typeCounts.map((t) => t.amount), 1)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-600" />
          Billing Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Unified view of all OPD, IPD, Pharmacy, Lab, OT billing</p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <Clock className="w-3.5 h-3.5" /> TODAY
          </div>
          <div className="text-2xl font-bold text-slate-800">{fmt(data.today.totalAmount)}</div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">{data.today.count} bills</span>
            <span className="text-xs text-emerald-600 font-medium">{todayCollectionRate}% collected</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <TrendingUp className="w-3.5 h-3.5" /> THIS MONTH
          </div>
          <div className="text-2xl font-bold text-slate-800">{fmt(data.month.totalAmount)}</div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">{data.month.count} bills</span>
            <span className="text-xs text-emerald-600 font-medium">{monthCollectionRate}% collected</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <IndianRupee className="w-3.5 h-3.5" /> COLLECTED (MTD)
          </div>
          <div className="text-2xl font-bold text-emerald-600">{fmt(data.month.collected)}</div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${monthCollectionRate}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> OUTSTANDING
          </div>
          <div className="text-2xl font-bold text-amber-600">{fmt(data.outstanding.amount)}</div>
          <div className="text-xs text-slate-500 mt-2">{data.outstanding.count} pending bills</div>
        </div>
      </div>

      {/* Revenue by Department + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Department */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue by Department (MTD)</h3>
          {data.typeCounts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No billing data this month</p>
          ) : (
            <div className="space-y-3">
              {data.typeCounts.sort((a, b) => b.amount - a.amount).map((dept) => (
                <div key={dept.type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{dept.type}</span>
                    <span className="text-slate-700">{fmtFull(dept.amount)} ({dept.count} bills)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${(dept.amount / maxTypeAmount) * 100}%`, backgroundColor: TYPE_COLORS[dept.type] || "#94a3b8" }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Collected: {fmtFull(dept.collected)}</span>
                    <span>{dept.amount > 0 ? ((dept.collected / dept.amount) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Bills by Status</h3>
          {data.statusCounts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No data</p>
          ) : (
            <div className="space-y-2">
              {data.statusCounts.sort((a, b) => b.amount - a.amount).map((s) => (
                <div key={s.status} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${STATUS_COLORS[s.status] || "bg-slate-100 text-slate-600"}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-500">{s.count} bills</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{fmtFull(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
