"use client"

import { useState, useEffect } from "react"
import { generatePnlReport, PnlReport } from "@/app/actions/financial-reports"
import { TrendingUp, TrendingDown, Filter, IndianRupee, ChevronDown, ChevronRight } from "lucide-react"

export function PnlClient() {
  const now = new Date()
  // Indian FY: Apr 1 - Mar 31
  const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1)
  const [from, setFrom] = useState(fyStart.toISOString().split("T")[0])
  const [to, setTo] = useState(now.toISOString().split("T")[0])
  const [scope, setScope] = useState<"HOSPITAL" | "COMBINED">("COMBINED")
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<PnlReport | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["revenue", "directExpenses", "indirectExpenses"]))

  async function fetchData() {
    setLoading(true)
    try {
      const result = await generatePnlReport({ from, to, scope })
      if (result.success && result.data) {
        setReport(JSON.parse(JSON.stringify(result.data)))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const toggleSection = (key: string) => {
    const next = new Set(expandedSections)
    next.has(key) ? next.delete(key) : next.add(key)
    setExpandedSections(next)
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Profit & Loss Statement
        </h1>
        <p className="text-sm text-slate-500 mt-1">{report?.period?.label || "Current FY"}</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Scope</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as any)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="COMBINED">Combined</option>
              <option value="HOSPITAL">Hospital</option>
            </select>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Filter className="w-4 h-4" /> Generate
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1">REVENUE</div>
              <div className="text-2xl font-bold text-emerald-600">₹{report.revenue.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1">GROSS PROFIT</div>
              <div className={`text-2xl font-bold ${report.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{report.grossProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-slate-400 mt-1">Margin: {report.ratios.grossMargin.toFixed(1)}%</div>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${report.netProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                {report.netProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                NET {report.netProfit >= 0 ? "PROFIT" : "LOSS"}
              </div>
              <div className={`text-2xl font-bold ${report.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>₹{Math.abs(report.netProfit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-slate-400 mt-1">Net Margin: {report.ratios.netMargin.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1">SALARY / REVENUE</div>
              <div className="text-2xl font-bold text-slate-800">{report.ratios.salaryToRevenue.toFixed(1)}%</div>
              <div className="text-xs text-slate-400 mt-1">OpEx: {report.ratios.operatingExpenseRatio.toFixed(1)}%</div>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Revenue */}
            <SectionBlock title="Revenue" section={report.revenue} expanded={expandedSections.has("revenue")} onToggle={() => toggleSection("revenue")} colorClass="text-emerald-700" bgClass="bg-emerald-50" />
            
            {/* Direct Expenses / COGS */}
            <SectionBlock title="Direct Expenses (COGS)" section={report.directExpenses} expanded={expandedSections.has("directExpenses")} onToggle={() => toggleSection("directExpenses")} colorClass="text-red-700" bgClass="bg-red-50" />

            {/* Gross Profit */}
            <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-y border-blue-100">
              <span className="text-sm font-bold text-blue-800">Gross Profit</span>
              <span className={`text-sm font-bold ${report.grossProfit >= 0 ? "text-blue-800" : "text-red-700"}`}>₹{report.grossProfit.toLocaleString("en-IN")}</span>
            </div>

            {/* Indirect Expenses */}
            <SectionBlock title="Indirect / Operating Expenses" section={report.indirectExpenses} expanded={expandedSections.has("indirectExpenses")} onToggle={() => toggleSection("indirectExpenses")} colorClass="text-orange-700" bgClass="bg-orange-50" />

            {/* Net Profit */}
            <div className={`flex items-center justify-between px-5 py-4 border-t-2 ${report.netProfit >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
              <span className={`text-base font-bold ${report.netProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                Net {report.netProfit >= 0 ? "Profit" : "Loss"}
              </span>
              <span className={`text-base font-bold ${report.netProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                ₹{Math.abs(report.netProfit).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Department Breakdown */}
          {report.departmentBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Department Breakdown</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                    <th className="text-right p-3 font-medium">Expense</th>
                    <th className="text-right p-3 font-medium">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {report.departmentBreakdown.map((d) => (
                    <tr key={d.department} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="p-3 text-xs font-medium text-slate-700">{d.department}</td>
                      <td className="p-3 text-right text-xs text-emerald-600">₹{d.revenue.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right text-xs text-red-600">₹{d.expense.toLocaleString("en-IN")}</td>
                      <td className={`p-3 text-right text-xs font-semibold ${d.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{d.profit.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SectionBlock({ title, section, expanded, onToggle, colorClass, bgClass }: {
  title: string; section: { title: string; items: any[]; total: number }
  expanded: boolean; onToggle: () => void; colorClass: string; bgClass: string
}) {
  return (
    <div>
      <div className={`flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50/50 border-b border-slate-100`} onClick={onToggle}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        <span className={`text-sm font-bold ${colorClass}`}>₹{section.total.toLocaleString("en-IN")}</span>
      </div>
      {expanded && section.items.length > 0 && (
        <div className="px-8 py-2 border-b border-slate-100">
          {section.items.map((item) => (
            <div key={item.code} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-600">{item.code} — {item.name}</span>
              <span className="text-xs text-slate-700 font-medium">₹{item.amount.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
