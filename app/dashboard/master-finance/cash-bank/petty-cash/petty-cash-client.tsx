"use client"

import { useState, useEffect } from "react"
import { getPettyCashData } from "@/app/actions/master-finance-cashbank"
import { BadgeIndianRupee, Filter, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react"

interface PettyTxn {
  id: string; date: string; type: string; amount: number; category: string
  description: string | null; paymentMethod: string
  account: { name: string }
}

interface Category { name: string; count: number; amount: number }

export function PettyCashClient() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(today.toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<PettyTxn[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalReplenished, setTotalReplenished] = useState(0)
  const [currentBalance, setCurrentBalance] = useState(0)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getPettyCashData({ from, to })
      setTransactions(JSON.parse(JSON.stringify(data.transactions)))
      setCategories(data.categories)
      setTotalSpent(data.totalSpent)
      setTotalReplenished(data.totalReplenished)
      setCurrentBalance(data.currentBalance)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const maxCatAmount = categories.length > 0 ? Math.max(...categories.map((c) => c.amount)) : 1

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BadgeIndianRupee className="w-6 h-6 text-blue-600" />
          Petty Cash
        </h1>
        <p className="text-sm text-slate-500 mt-1">Small expenses — imprest system with category tracking</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" />CURRENT BALANCE</div>
          <div className="text-2xl font-bold text-blue-600">₹{currentBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5 text-red-500" />SPENT</div>
          <div className="text-2xl font-bold text-red-600">₹{totalSpent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />REPLENISHED</div>
          <div className="text-2xl font-bold text-emerald-600">₹{totalReplenished.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">TRANSACTIONS</div>
          <div className="text-2xl font-bold text-slate-800">{transactions.length}</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Expense by Category</h3>
          {categories.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No expenses</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{cat.name}</span>
                    <span className="text-slate-500">₹{cat.amount.toLocaleString("en-IN")} ({cat.count})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(cat.amount / maxCatAmount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Transactions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">No transactions</td></tr>
                ) : transactions.map((txn) => {
                  const isCredit = txn.type === "INCOME" || txn.type === "RECEIPT"
                  return (
                    <tr key={txn.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="p-3 text-xs text-slate-600">{new Date(txn.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                      <td className="p-3"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${isCredit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{isCredit ? "REPLENISH" : "EXPENSE"}</span></td>
                      <td className="p-3 text-xs text-slate-600">{txn.category}</td>
                      <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{txn.description || "—"}</td>
                      <td className={`p-3 text-right text-xs font-semibold ${isCredit ? "text-emerald-600" : "text-red-600"}`}>{isCredit ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN")}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
