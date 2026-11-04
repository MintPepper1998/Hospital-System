"use client"

import { useState, useEffect } from "react"
import { getPayrollJournal } from "@/app/actions/master-finance-remaining"
import { FileText, IndianRupee, Filter } from "lucide-react"

interface MonthData { month: string; count: number; amountPaid: number; bonus: number; deductions: number; gross: number }

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function PayrollJournalClient() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])
  const [totalAnnual, setTotalAnnual] = useState(0)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getPayrollJournal({ year })
      setMonthlyData(data.monthlyData)
      setTotalAnnual(data.totalAnnual)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const maxGross = Math.max(...monthlyData.map((m) => m.gross), 1)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Payroll Journal
        </h1>
        <p className="text-sm text-slate-500 mt-1">Annual payroll summary — FY {year}</p>
      </div>

      {/* Annual Total */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />ANNUAL PAYROLL ({year})</div>
        <div className="text-3xl font-bold text-slate-800">₹{totalAnnual.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
      </div>

      {/* Year Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              {[new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Filter className="w-4 h-4" /> Apply
          </button>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Trend</h3>
        <div className="flex items-end gap-2 h-40">
          {monthlyData.map((m, i) => (
            <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="w-full relative group">
                <div className="bg-blue-500 rounded-t w-full transition-all hover:bg-blue-600"
                  style={{ height: `${maxGross > 0 ? (m.gross / maxGross) * 130 : 0}px`, minHeight: m.gross > 0 ? "4px" : "0" }} />
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  ₹{m.gross.toLocaleString("en-IN")} ({m.count})
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-medium">{MONTH_NAMES[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Month</th>
                <th className="text-right p-3 font-medium">Employees</th>
                <th className="text-right p-3 font-medium">Net Paid (₹)</th>
                <th className="text-right p-3 font-medium">Bonus (₹)</th>
                <th className="text-right p-3 font-medium">Deductions (₹)</th>
                <th className="text-right p-3 font-medium">Gross (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : monthlyData.map((m, i) => (
                <tr key={m.month} className={`border-b border-slate-50 ${m.count > 0 ? "hover:bg-slate-50/50" : "opacity-50"}`}>
                  <td className="p-3 text-xs font-medium text-slate-700">{MONTH_NAMES[i]} {year}</td>
                  <td className="p-3 text-right text-xs text-slate-600">{m.count}</td>
                  <td className="p-3 text-right text-xs text-slate-700 font-semibold">₹{m.amountPaid.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-xs text-emerald-600">₹{m.bonus.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-xs text-red-600">₹{m.deductions.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-xs font-bold text-blue-600">₹{m.gross.toLocaleString("en-IN")}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="p-3 text-xs text-slate-800">TOTAL</td>
                <td className="p-3 text-right text-xs text-slate-600">{monthlyData.reduce((s, m) => s + m.count, 0)}</td>
                <td className="p-3 text-right text-xs text-slate-800">₹{monthlyData.reduce((s, m) => s + m.amountPaid, 0).toLocaleString("en-IN")}</td>
                <td className="p-3 text-right text-xs text-emerald-600">₹{monthlyData.reduce((s, m) => s + m.bonus, 0).toLocaleString("en-IN")}</td>
                <td className="p-3 text-right text-xs text-red-600">₹{monthlyData.reduce((s, m) => s + m.deductions, 0).toLocaleString("en-IN")}</td>
                <td className="p-3 text-right text-xs text-blue-600">₹{monthlyData.reduce((s, m) => s + m.gross, 0).toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
