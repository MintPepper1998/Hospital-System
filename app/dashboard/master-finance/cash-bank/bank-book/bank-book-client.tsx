"use client"

import { useState, useEffect } from "react"
import { getBankBook } from "@/app/actions/master-finance-cashbank"
import { BanknoteIcon, Filter, ArrowUpRight, ArrowDownRight, Building2 } from "lucide-react"

interface BankAccount { id: string; name: string; bankName: string | null; accountNumber: string | null; currentBalance: number; ifscCode: string | null }

interface Txn {
  id: string; date: string; type: string; amount: number; category: string
  description: string | null; paymentMethod: string; referenceId: string | null
  account: { name: string; bankName: string | null; accountNumber: string | null }
}

export function BankBookClient() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(today.toISOString().split("T")[0])
  const [selectedAccount, setSelectedAccount] = useState("")
  const [loading, setLoading] = useState(true)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<Txn[]>([])
  const [totalCredits, setTotalCredits] = useState(0)
  const [totalDebits, setTotalDebits] = useState(0)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getBankBook({ from, to, accountId: selectedAccount || undefined })
      setBankAccounts(JSON.parse(JSON.stringify(data.bankAccounts)))
      setTransactions(JSON.parse(JSON.stringify(data.transactions)))
      setTotalCredits(data.totalCredits)
      setTotalDebits(data.totalDebits)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BanknoteIcon className="w-6 h-6 text-blue-600" />
          Bank Book
        </h1>
        <p className="text-sm text-slate-500 mt-1">Per-bank transaction ledger</p>
      </div>

      {/* Bank Account Cards */}
      {bankAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {bankAccounts.map((acc) => (
            <button key={acc.id} onClick={() => { setSelectedAccount(selectedAccount === acc.id ? "" : acc.id) }}
              className={`text-left p-4 rounded-xl border transition-all ${selectedAccount === acc.id ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-700">{acc.name}</span>
              </div>
              {acc.bankName && <div className="text-[10px] text-slate-400">{acc.bankName}</div>}
              {acc.accountNumber && <div className="text-[10px] font-mono text-slate-400">A/C: ****{acc.accountNumber.slice(-4)}</div>}
              <div className="text-lg font-bold text-slate-800 mt-2">₹{acc.currentBalance.toLocaleString("en-IN")}</div>
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />CREDITS</div>
          <div className="text-2xl font-bold text-emerald-600">₹{totalCredits.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5 text-red-500" />DEBITS</div>
          <div className="text-2xl font-bold text-red-600">₹{totalDebits.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">NET MOVEMENT</div>
          <div className={`text-2xl font-bold ${totalCredits - totalDebits >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            ₹{Math.abs(totalCredits - totalDebits).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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

      {/* Transaction Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Account</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-left p-3 font-medium">Method</th>
                <th className="text-right p-3 font-medium">Credit (₹)</th>
                <th className="text-right p-3 font-medium">Debit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">No bank transactions found</td></tr>
              ) : transactions.map((txn) => {
                const isCredit = txn.type === "INCOME" || txn.type === "RECEIPT"
                return (
                  <tr key={txn.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-xs text-slate-600">{new Date(txn.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                    <td className="p-3 text-xs text-slate-700 font-medium">{txn.account.name}</td>
                    <td className="p-3"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${isCredit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{txn.type}</span></td>
                    <td className="p-3 text-xs text-slate-600">{txn.category}</td>
                    <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{txn.description || "—"}</td>
                    <td className="p-3 text-xs text-slate-500">{txn.paymentMethod}</td>
                    <td className="p-3 text-right text-xs font-semibold text-emerald-600">{isCredit ? `₹${txn.amount.toLocaleString("en-IN")}` : ""}</td>
                    <td className="p-3 text-right text-xs font-semibold text-red-600">{!isCredit ? `₹${txn.amount.toLocaleString("en-IN")}` : ""}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
