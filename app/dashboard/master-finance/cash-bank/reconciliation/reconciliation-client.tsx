"use client"

import { useState, useEffect } from "react"
import { getBankReconciliationData, getBankBook } from "@/app/actions/master-finance-cashbank"
import { ArrowLeftRight, Building2, CheckCircle2, AlertTriangle, IndianRupee } from "lucide-react"

interface BankAccount { id: string; name: string; bankName: string | null; accountNumber: string | null; currentBalance: number }

interface ReconTxn {
  id: string; date: string; type: string; amount: number; category: string
  description: string | null; paymentMethod: string
}

interface ReconData {
  account: BankAccount | null; transactions: ReconTxn[]
  totalCredits: number; totalDebits: number; month: string
}

export function BankReconciliationClient() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")
  const [data, setData] = useState<ReconData | null>(null)
  const [statementBalance, setStatementBalance] = useState("")
  const [loading, setLoading] = useState(false)

  // Fetch bank accounts on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await getBankBook({ from: "2020-01-01", to: "2099-12-31" })
        setBankAccounts(JSON.parse(JSON.stringify(res.bankAccounts)))
        if (res.bankAccounts.length > 0) setSelectedAccount(res.bankAccounts[0].id)
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  async function fetchRecon() {
    if (!selectedAccount) return
    setLoading(true)
    try {
      const res = await getBankReconciliationData({ accountId: selectedAccount, month })
      setData(JSON.parse(JSON.stringify(res)))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (selectedAccount) fetchRecon() }, [selectedAccount, month])

  const systemBalance = data ? data.totalCredits - data.totalDebits : 0
  const stmtBal = parseFloat(statementBalance) || 0
  const difference = stmtBal ? stmtBal - systemBalance : 0

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-blue-600" />
          Bank Reconciliation
        </h1>
        <p className="text-sm text-slate-500 mt-1">Compare bank statement with system transactions</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bank Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]">
              {bankAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} {acc.bankName ? `(${acc.bankName})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bank Statement Balance (₹)</label>
            <input type="number" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} placeholder="Enter from bank statement"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]" />
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Reconciliation Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />SYSTEM BALANCE</div>
              <div className="text-2xl font-bold text-blue-600">₹{systemBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              <div className="text-[10px] text-slate-400 mt-1">Credits: ₹{data.totalCredits.toLocaleString("en-IN")} | Debits: ₹{data.totalDebits.toLocaleString("en-IN")}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />STATEMENT BALANCE</div>
              <div className="text-2xl font-bold text-slate-800">{stmtBal ? `₹${stmtBal.toLocaleString("en-IN")}` : "Not entered"}</div>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${difference === 0 && stmtBal ? "bg-emerald-50 border-emerald-200" : difference !== 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                {difference === 0 && stmtBal ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                DIFFERENCE
              </div>
              <div className={`text-2xl font-bold ${difference === 0 && stmtBal ? "text-emerald-600" : "text-amber-600"}`}>
                {stmtBal ? `₹${Math.abs(difference).toLocaleString("en-IN")}` : "—"}
              </div>
              {difference !== 0 && stmtBal !== 0 && (
                <div className="text-[10px] text-amber-600 mt-1">{difference > 0 ? "Bank shows more" : "System shows more"}</div>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">{data.transactions.length} system transactions in {new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">Method</th>
                    <th className="text-right p-3 font-medium">Credit</th>
                    <th className="text-right p-3 font-medium">Debit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No transactions</td></tr>
                  ) : data.transactions.map((txn) => {
                    const isCredit = txn.type === "INCOME" || txn.type === "RECEIPT"
                    return (
                      <tr key={txn.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3 text-xs text-slate-600">{new Date(txn.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
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
        </>
      )}
    </div>
  )
}
