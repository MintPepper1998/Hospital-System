"use client"

import { useState, useEffect } from "react"
import { getOpeningBalances, updateOpeningBalance } from "@/app/actions/master-finance-remaining"
import { Settings, Save, CheckCircle2, IndianRupee } from "lucide-react"

interface Account { id: string; name: string; type: string; scope: string; openingBalance: number; currentBalance: number; isActive: boolean }
interface SupplierOB { id: string; name: string; openingBalance: number }

export function OpeningBalancesClient() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOB[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getOpeningBalances()
      setAccounts(JSON.parse(JSON.stringify(data.accounts)))
      setSuppliers(JSON.parse(JSON.stringify(data.suppliers)))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSave(accountId: string) {
    setSaving(true)
    try {
      await updateOpeningBalance({ accountId, openingBalance: parseFloat(editValue) || 0 })
      setSaved(accountId)
      setEditingId(null)
      fetchData()
      setTimeout(() => setSaved(null), 2000)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const grouped = accounts.reduce((acc, a) => {
    const key = a.type
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {} as Record<string, Account[]>)

  const totalOpening = accounts.reduce((s, a) => s + a.openingBalance, 0)

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Opening Balances
        </h1>
        <p className="text-sm text-slate-500 mt-1">Set opening balances for financial accounts at start of fiscal year</p>
      </div>

      {/* Total */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />TOTAL OPENING BALANCE</div>
        <div className="text-3xl font-bold text-slate-800">₹{totalOpening.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        <div className="text-xs text-slate-400 mt-1">{accounts.length} accounts configured</div>
      </div>

      {/* Accounts by Type */}
      {Object.entries(grouped).map(([type, accts]) => (
        <div key={type} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">{type} Accounts</span>
            <span className="text-xs text-slate-400 ml-2">({accts.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200">
                  <th className="text-left p-3 font-medium">Account</th>
                  <th className="text-left p-3 font-medium">Scope</th>
                  <th className="text-right p-3 font-medium">Opening Balance (₹)</th>
                  <th className="text-right p-3 font-medium">Current Balance (₹)</th>
                  <th className="text-center p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {accts.map((acc) => (
                  <tr key={acc.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${!acc.isActive ? "opacity-50" : ""}`}>
                    <td className="p-3 text-xs font-medium text-slate-700">{acc.name} {!acc.isActive && <span className="text-red-500">(Inactive)</span>}</td>
                    <td className="p-3 text-xs text-slate-500">{acc.scope}</td>
                    <td className="p-3 text-right">
                      {editingId === acc.id ? (
                        <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          className="w-28 border border-blue-300 rounded px-2 py-1 text-xs text-right focus:ring-2 focus:ring-blue-500 outline-none"
                          autoFocus onKeyDown={(e) => e.key === "Enter" && handleSave(acc.id)} />
                      ) : (
                        <span className="text-xs font-semibold text-slate-700">₹{acc.openingBalance.toLocaleString("en-IN")}</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-xs text-blue-600 font-semibold">₹{acc.currentBalance.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-center">
                      {saved === acc.id ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                      ) : editingId === acc.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleSave(acc.id)} disabled={saving}
                            className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"><Save className="w-3 h-3 inline" /></button>
                          <button onClick={() => setEditingId(null)} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(acc.id); setEditValue(String(acc.openingBalance)) }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Supplier Opening Balances */}
      {suppliers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Supplier Opening Balances</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200">
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-right p-3 font-medium">Opening Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-xs font-medium text-slate-700">{sup.name}</td>
                    <td className="p-3 text-right text-xs font-semibold text-amber-600">₹{sup.openingBalance.toLocaleString("en-IN")}</td>
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
