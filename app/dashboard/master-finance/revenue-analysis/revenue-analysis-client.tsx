"use client"

import { useState, useEffect } from "react"
import { getRevenueAnalysis } from "@/app/actions/master-finance-revenue"
import { TrendingUp, IndianRupee, BarChart3, PieChart, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface RevenueData {
  byType: Array<{ type: string; count: number; revenue: number; collected: number; discount: number }>
  byPaymentMethod: Array<{ method: string; count: number; amount: number }>
  dailyTrend: Array<{ date: string; amount: number; count: number }>
  totalRevenue: number; totalCollected: number; totalDiscount: number
}

const TYPE_COLORS: Record<string, string> = {
  OPD: "#3b82f6", IPD: "#8b5cf6", LABORATORY: "#f59e0b",
  OT: "#ef4444", CANTEEN: "#f97316", AMBULANCE: "#06b6d4", CASUALTY: "#ec4899", EMERGENCY: "#dc2626",
}

const METHOD_COLORS: Record<string, string> = {
  CASH: "#10b981", UPI: "#8b5cf6", CARD: "#3b82f6", BANK_TRANSFER: "#f59e0b",
  INSURANCE: "#06b6d4", BSKY: "#f97316", PMJAY: "#22c55e", SPLIT: "#64748b",
}

function fmt(n: number) {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toLocaleString("en-IN")}`
}

export function RevenueAnalysisClient() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(today.toISOString().split("T")[0])
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  // Quick range helpers
  function setRange(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setFrom(start.toISOString().split("T")[0])
    setTo(end.toISOString().split("T")[0])
  }
  function setThisMonth() {
    setFrom(firstOfMonth.toISOString().split("T")[0])
    setTo(today.toISOString().split("T")[0])
  }
  function setLastMonth() {
    const lastStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    setFrom(lastStart.toISOString().split("T")[0])
    setTo(lastEnd.toISOString().split("T")[0])
  }

  async function fetchData() {
    setLoading(true)
    try {
      const result = await getRevenueAnalysis({ from, to })
      setData(result)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [from, to])

  const collectionRate = data && data.totalRevenue > 0 ? ((data.totalCollected / data.totalRevenue) * 100).toFixed(1) : "0"
  const maxDailyAmount = data ? Math.max(...data.dailyTrend.map((d) => d.amount), 1) : 1
  const maxTypeRevenue = data ? Math.max(...data.byType.map((t) => t.revenue), 1) : 1
  const totalMethodAmount = data ? data.byPaymentMethod.reduce((s, p) => s + p.amount, 0) : 1

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Revenue Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">Department-wise, service-wise, and payment mode revenue breakdown</p>
        </div>
      </div>

      {/* Date Range */}
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
          <div className="flex gap-1.5">
            <button onClick={() => setRange(7)} className="px-3 py-2 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 font-medium">7D</button>
            <button onClick={() => setRange(30)} className="px-3 py-2 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 font-medium">30D</button>
            <button onClick={setThisMonth} className="px-3 py-2 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 font-medium">MTD</button>
            <button onClick={setLastMonth} className="px-3 py-2 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 font-medium">Last Month</button>
            <button onClick={() => setRange(90)} className="px-3 py-2 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 font-medium">90D</button>
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-400">Loading revenue data...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><IndianRupee className="w-3 h-3" />TOTAL REVENUE</div>
              <div className="text-2xl font-bold text-slate-800">{fmt(data.totalRevenue)}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-emerald-500" />COLLECTED</div>
              <div className="text-2xl font-bold text-emerald-600">{fmt(data.totalCollected)}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1">COLLECTION RATE</div>
              <div className="text-2xl font-bold text-blue-600">{collectionRate}%</div>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${collectionRate}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-red-500" />DISCOUNTS</div>
              <div className="text-2xl font-bold text-red-500">{fmt(data.totalDiscount)}</div>
            </div>
          </div>

          {/* Revenue by Department */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" />Revenue by Department</h3>
              {data.byType.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No data</p>
              ) : (
                <div className="space-y-3">
                  {data.byType.sort((a, b) => b.revenue - a.revenue).map((dept) => (
                    <div key={dept.type}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-700 font-medium">{dept.type}</span>
                        <span className="text-slate-500">{fmt(dept.revenue)} ({dept.count})</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 relative overflow-hidden">
                        <div className="h-full rounded-full transition-all opacity-30" style={{ width: `${(dept.revenue / maxTypeRevenue) * 100}%`, backgroundColor: TYPE_COLORS[dept.type] || "#94a3b8" }} />
                        <div className="h-full rounded-full transition-all absolute top-0 left-0" style={{ width: `${(dept.collected / maxTypeRevenue) * 100}%`, backgroundColor: TYPE_COLORS[dept.type] || "#94a3b8" }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>Collected: {fmt(dept.collected)}</span>
                        <span>Discount: {fmt(dept.discount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-purple-500" />Collection by Payment Mode</h3>
              {data.byPaymentMethod.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No data</p>
              ) : (
                <div className="space-y-2">
                  {data.byPaymentMethod.sort((a, b) => b.amount - a.amount).map((pm) => {
                    const pct = totalMethodAmount > 0 ? (pm.amount / totalMethodAmount) * 100 : 0
                    return (
                      <div key={pm.method} className="flex items-center gap-3 py-2 border-b border-slate-50">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: METHOD_COLORS[pm.method] || "#94a3b8" }} />
                        <div className="flex-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-700 font-medium">{pm.method.replace(/_/g, " ")}</span>
                            <span className="text-slate-500">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: METHOD_COLORS[pm.method] || "#94a3b8" }} />
                          </div>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <div className="text-xs font-semibold text-slate-800">{fmt(pm.amount)}</div>
                          <div className="text-[10px] text-slate-400">{pm.count} txns</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Daily Revenue Trend */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" />Daily Revenue Trend</h3>
            {data.dailyTrend.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No data for this period</p>
            ) : (
              <div className="flex items-end gap-1 h-40">
                {data.dailyTrend.map((day) => {
                  const heightPct = maxDailyAmount > 0 ? (day.amount / maxDailyAmount) * 100 : 0
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {new Date(day.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} — ₹{day.amount.toLocaleString("en-IN")} ({day.count} bills)
                      </div>
                      <div className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all cursor-pointer"
                        style={{ height: `${Math.max(heightPct, 2)}%` }} />
                      {data.dailyTrend.length <= 31 && (
                        <div className="text-[8px] text-slate-400 mt-1 -rotate-45 origin-top-left whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
