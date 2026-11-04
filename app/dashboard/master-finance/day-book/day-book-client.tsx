"use client"

import { useState, useEffect } from "react"
import { getDayBook } from "@/app/actions/master-finance"
import { ClipboardList, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface Transaction {
  id: string
  date: string
  type: string
  amount: number
  category: string
  paymentMethod: string
  description: string | null
  account: { name: string }
}

interface Voucher {
  id: string
  voucherNumber: string
  voucherType: string
  date: string
  narration: string | null
  totalAmount: number
  status: string
  entries: Array<{
    id: string
    accountGroupCode: string
    debitAmount: number
    creditAmount: number
  }>
}

interface DayBookData {
  transactions: Transaction[]
  vouchers: Voucher[]
  totalIncome: number
  totalExpense: number
  netFlow: number
}

export function DayBookClient() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DayBookData | null>(null)

  async function fetchData(date: string) {
    setLoading(true)
    try {
      const result = await getDayBook(date)
      setData(JSON.parse(JSON.stringify(result)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(selectedDate) }, [selectedDate])

  function changeDate(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split("T")[0])
  }

  const displayDate = new Date(selectedDate).toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  })

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          Day Book
        </h1>
        <p className="text-sm text-slate-500 mt-1">Daily register of all financial entries</p>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="text-center">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-medium text-slate-700 border-none bg-transparent text-center cursor-pointer outline-none" />
          <div className="text-xs text-slate-500">{displayDate}</div>
        </div>
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> TOTAL INCOME
            </div>
            <div className="text-xl font-bold text-emerald-700">
              ₹{data.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1">
              <ArrowDownRight className="w-3.5 h-3.5" /> TOTAL EXPENSE
            </div>
            <div className="text-xl font-bold text-red-700">
              ₹{data.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className={`${data.netFlow >= 0 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"} border rounded-xl p-4`}>
            <div className={`text-xs font-medium mb-1 ${data.netFlow >= 0 ? "text-blue-600" : "text-amber-600"}`}>
              NET FLOW
            </div>
            <div className={`text-xl font-bold ${data.netFlow >= 0 ? "text-blue-700" : "text-amber-700"}`}>
              {data.netFlow >= 0 ? "+" : ""}₹{data.netFlow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Auto Transactions ({data?.transactions.length || 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Account</th>
                <th className="text-left p-3 font-medium">Method</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    {loading ? "Loading..." : "No transactions on this day"}
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(tx.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${tx.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-600">{tx.category}</td>
                    <td className="p-3 text-xs text-slate-600">{tx.account.name}</td>
                    <td className="p-3 text-xs text-slate-500">{tx.paymentMethod}</td>
                    <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{tx.description || "—"}</td>
                    <td className={`p-3 text-right text-xs font-semibold ${tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "INCOME" ? "+" : "−"}₹{tx.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Vouchers */}
      {data && data.vouchers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              Manual Vouchers ({data.vouchers.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left p-3 font-medium">Voucher No.</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Narration</th>
                  <th className="text-right p-3 font-medium">Amount (₹)</th>
                  <th className="text-center p-3 font-medium">Entries</th>
                </tr>
              </thead>
              <tbody>
                {data.vouchers.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-xs font-mono text-slate-600">{v.voucherNumber}</td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700">
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{v.narration || "—"}</td>
                    <td className="p-3 text-right text-xs font-semibold text-slate-800">
                      ₹{v.totalAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-center text-xs text-slate-500">{v.entries.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
