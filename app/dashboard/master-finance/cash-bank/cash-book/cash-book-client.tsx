"use client"

import { useState, useEffect } from "react"
import { getCashBook } from "@/app/actions/master-finance-cashbank"
import { Wallet, Filter, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, IndianRupee } from "lucide-react"

interface DailyEntry {
  date: string; receipts: number; payments: number
  txns: Array<{ id: string; date: string; type: string; amount: number; category: string; description: string | null; paymentMethod: string; account: { name: string; type: string } }>
}

export function CashBookClient() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(today.toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([])
  const [totalReceipts, setTotalReceipts] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getCashBook({ from, to })
      setDailyEntries(JSON.parse(JSON.stringify(data.dailyEntries)))
      setTotalReceipts(data.totalReceipts)
      setTotalPayments(data.totalPayments)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          Cash Book
        </h1>
        <p className="text-sm text-slate-500 mt-1">Daily cash register — receipts and payments</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />TOTAL RECEIPTS</div>
          <div className="text-2xl font-bold text-emerald-600">₹{totalReceipts.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5 text-red-500" />TOTAL PAYMENTS</div>
          <div className="text-2xl font-bold text-red-600">₹{totalPayments.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />NET</div>
          <div className={`text-2xl font-bold ${totalReceipts - totalPayments >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            ₹{Math.abs(totalReceipts - totalPayments).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
            <Filter className="w-4 h-4" /> Apply
          </button>
        </div>
      </div>

      {/* Daily Entries */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && dailyEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : dailyEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No cash transactions found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dailyEntries.map((day) => {
              const net = day.receipts - day.payments
              return (
                <div key={day.date}>
                  <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}>
                    <div className="flex items-center gap-4">
                      {expandedDate === day.date ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-xs text-slate-400">{day.txns.length} transactions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-right">
                        <div className="text-emerald-600 font-medium">+₹{day.receipts.toLocaleString("en-IN")}</div>
                        <div className="text-red-500 font-medium">-₹{day.payments.toLocaleString("en-IN")}</div>
                      </div>
                      <div className={`text-lg font-bold min-w-[100px] text-right ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {net >= 0 ? "+" : "-"}₹{Math.abs(net).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {expandedDate === day.date && (
                    <div className="bg-slate-50 px-8 py-3 border-t border-slate-100">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="text-left py-2 font-medium">Type</th>
                            <th className="text-left py-2 font-medium">Category</th>
                            <th className="text-left py-2 font-medium">Description</th>
                            <th className="text-left py-2 font-medium">Method</th>
                            <th className="text-left py-2 font-medium">Account</th>
                            <th className="text-right py-2 font-medium">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.txns.map((txn) => {
                            const isReceipt = txn.type === "INCOME" || txn.type === "RECEIPT"
                            return (
                              <tr key={txn.id} className="border-b border-slate-100">
                                <td className="py-2">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${isReceipt ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                    {txn.type}
                                  </span>
                                </td>
                                <td className="py-2 text-slate-600">{txn.category}</td>
                                <td className="py-2 text-slate-500 max-w-[200px] truncate">{txn.description || "—"}</td>
                                <td className="py-2 text-slate-500">{txn.paymentMethod}</td>
                                <td className="py-2 text-slate-500">{txn.account.name}</td>
                                <td className={`py-2 text-right font-semibold ${isReceipt ? "text-emerald-600" : "text-red-600"}`}>
                                  {isReceipt ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
