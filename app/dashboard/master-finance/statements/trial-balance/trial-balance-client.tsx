"use client"

import { useState, useEffect } from "react"
import { getTrialBalance } from "@/app/actions/master-finance-remaining"
import { Calculator, Filter, CheckCircle2, AlertTriangle } from "lucide-react"

interface TBRow { code: string; name: string; type: string; nature: string; debit: number; credit: number; count: number }

const TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-50 text-blue-700",
  LIABILITY: "bg-purple-50 text-purple-700",
  EQUITY: "bg-indigo-50 text-indigo-700",
  REVENUE: "bg-emerald-50 text-emerald-700",
  EXPENSE: "bg-red-50 text-red-700",
}

export function TrialBalanceClient() {
  const now = new Date()
  const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1)
  const [from, setFrom] = useState(fyStart.toISOString().split("T")[0])
  const [to, setTo] = useState(now.toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<TBRow[]>([])
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [difference, setDifference] = useState(0)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getTrialBalance({ from, to })
      setRows(data.rows)
      setTotalDebit(data.totalDebit)
      setTotalCredit(data.totalCredit)
      setDifference(data.difference)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const isBalanced = Math.abs(difference) < 0.01

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600" />
          Trial Balance
        </h1>
        <p className="text-sm text-slate-500 mt-1">All account groups — debit/credit summary</p>
      </div>

      {/* Balance Status */}
      <div className={`rounded-xl border p-4 shadow-sm flex items-center gap-3 ${isBalanced ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        {isBalanced ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
        <div>
          <div className={`text-sm font-semibold ${isBalanced ? "text-emerald-700" : "text-amber-700"}`}>
            {isBalanced ? "Trial Balance is Balanced ✓" : `Difference: ₹${Math.abs(difference).toLocaleString("en-IN")}`}
          </div>
          <div className="text-xs text-slate-500">
            Total Debit: ₹{totalDebit.toLocaleString("en-IN")} | Total Credit: ₹{totalCredit.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Filter className="w-4 h-4" /> Generate
          </button>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Account Group</th>
                <th className="text-center p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Debit (₹)</th>
                <th className="text-right p-3 font-medium">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No transactions found for period</td></tr>
              ) : rows.map((row) => (
                <tr key={row.code} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-3 text-xs font-mono text-slate-500">{row.code}</td>
                  <td className="p-3 text-xs text-slate-700 font-medium">{row.name}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_COLORS[row.type] || "bg-slate-100 text-slate-600"}`}>{row.type}</span>
                  </td>
                  <td className="p-3 text-right text-xs font-semibold text-blue-600">{row.debit > 0 ? `₹${row.debit.toLocaleString("en-IN")}` : ""}</td>
                  <td className="p-3 text-right text-xs font-semibold text-purple-600">{row.credit > 0 ? `₹${row.credit.toLocaleString("en-IN")}` : ""}</td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-300">
                  <td colSpan={3} className="p-3 text-xs text-slate-800">TOTAL</td>
                  <td className="p-3 text-right text-xs text-blue-700">₹{totalDebit.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-xs text-purple-700">₹{totalCredit.toLocaleString("en-IN")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
