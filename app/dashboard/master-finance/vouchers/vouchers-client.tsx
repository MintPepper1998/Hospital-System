"use client"

import React, { useState, useEffect } from "react"
import { createVoucher, getVouchers, cancelVoucher } from "@/app/actions/master-finance"
import { PenLine, Plus, Trash2, Check, X, AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface AccountGroup {
  code: string
  name: string
  nature: string
}

interface VoucherEntry {
  accountGroupCode: string
  financialAccountId?: string
  debitAmount: number
  creditAmount: number
  narration?: string
}

interface BankAccount {
  id: string
  name: string
  type: string
  bankName: string | null
  accountNumber: string | null
  currentBalance: number
}

interface VoucherRow {
  id: string
  voucherNumber: string
  voucherType: string
  date: string
  narration: string | null
  totalAmount: number
  status: string
  createdBy: string
  entries: Array<{
    id: string
    accountGroupCode: string
    financialAccountId?: string | null
    financialAccount?: { id: string; name: string; bankName: string | null; type: string } | null
    debitAmount: number
    creditAmount: number
    narration: string | null
  }>
}

const VOUCHER_TYPES = [
  { value: "JOURNAL", label: "Journal Voucher (JV)", desc: "For non-cash adjustments" },
  { value: "RECEIPT", label: "Receipt Voucher (RV)", desc: "Cash/bank receipts" },
  { value: "PAYMENT", label: "Payment Voucher (PV)", desc: "Cash/bank payments" },
  { value: "CONTRA", label: "Contra Voucher (CV)", desc: "Fund transfers between accounts" },
]

export function VouchersClient({
  accountGroups,
  bankAccounts,
}: {
  accountGroups: AccountGroup[]
  bankAccounts: BankAccount[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [vouchers, setVouchers] = useState<VoucherRow[]>([])
  const [total, setTotal] = useState(0)
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null)

  const [voucherType, setVoucherType] = useState("JOURNAL")
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0])
  const [narration, setNarration] = useState("")
  const [entries, setEntries] = useState<VoucherEntry[]>([
    { accountGroupCode: "", debitAmount: 0, creditAmount: 0 },
    { accountGroupCode: "", debitAmount: 0, creditAmount: 0 },
  ])
  const [error, setError] = useState("")

  async function fetchVouchers() {
    try {
      const result = await getVouchers({ limit: 20 })
      setVouchers(JSON.parse(JSON.stringify(result.vouchers)))
      setTotal(result.total)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { fetchVouchers() }, [])

  function addEntry() {
    setEntries([...entries, { accountGroupCode: "", debitAmount: 0, creditAmount: 0 }])
  }

  function removeEntry(idx: number) {
    if (entries.length <= 2) return
    setEntries(entries.filter((_, i) => i !== idx))
  }

  function updateEntry(idx: number, field: keyof VoucherEntry, value: VoucherEntry[keyof VoucherEntry]) {
    const updated = [...entries]
    updated[idx] = { ...updated[idx], [field]: value }
    setEntries(updated)
  }

  function updateEntryFields(idx: number, fields: Partial<VoucherEntry>) {
    const updated = [...entries]
    updated[idx] = { ...updated[idx], ...fields }
    setEntries(updated)
  }

  const totalDebit = entries.reduce((s, e) => s + (Number(e.debitAmount) || 0), 0)
  const totalCredit = entries.reduce((s, e) => s + (Number(e.creditAmount) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
  const canSubmit = isBalanced && totalDebit > 0 && entries.every((e) => e.accountGroupCode) && entries.length >= 2

  // Real-time balance impact calculation for selected bank/cash accounts
  const accountImpacts = React.useMemo(() => {
    const map = new Map<string, { account: BankAccount; debits: number; credits: number; net: number }>()
    for (const e of entries) {
      if (!e.financialAccountId) continue
      const acc = bankAccounts.find((a) => a.id === e.financialAccountId)
      if (!acc) continue
      const current = map.get(acc.id) || { account: acc, debits: 0, credits: 0, net: 0 }
      current.debits += Number(e.debitAmount) || 0
      current.credits += Number(e.creditAmount) || 0
      current.net += (Number(e.debitAmount) || 0) - (Number(e.creditAmount) || 0)
      map.set(acc.id, current)
    }
    return Array.from(map.values())
  }, [entries, bankAccounts])

  const hasSelfCancellingAccount = accountImpacts.some(
    (ai) => ai.debits > 0 && ai.credits > 0 && Math.abs(ai.net) < 0.01
  )

  function handleVoucherTypeChange(nextType: string) {
    setVoucherType(nextType)
    setEntries(entries.map(() => ({ accountGroupCode: "", debitAmount: 0, creditAmount: 0 })))
  }

  async function handleSubmit() {
    setError("")
    if (!canSubmit) {
      setError("Debit and Credit must be equal and all accounts must be selected.")
      return
    }
    setLoading(true)
    try {
      await createVoucher({
        voucherType,
        date: voucherDate,
        narration: narration || undefined,
        entries: entries.map((e) => ({
          accountGroupCode: e.accountGroupCode,
          financialAccountId: e.financialAccountId,
          debitAmount: Number(e.debitAmount) || 0,
          creditAmount: Number(e.creditAmount) || 0,
          narration: e.narration,
        })),
      })
      setShowForm(false)
      setEntries([
        { accountGroupCode: "", debitAmount: 0, creditAmount: 0 },
        { accountGroupCode: "", debitAmount: 0, creditAmount: 0 },
      ])
      setNarration("")
      await fetchVouchers()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create voucher")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this voucher? This cannot be undone.")) return
    try {
      await cancelVoucher(id)
      await fetchVouchers()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to cancel voucher")
    }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PenLine className="w-6 h-6 text-blue-600" />
            Voucher Entry
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create manual journal entries (JV, Receipt, Payment, Contra)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Voucher
        </button>
      </div>

      {/* Voucher Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-semibold text-slate-700">Create Voucher</h3>

          {/* Type, Date, Narration */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Voucher Type</label>
               <select value={voucherType} onChange={(e) => handleVoucherTypeChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                {VOUCHER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {VOUCHER_TYPES.find((t) => t.value === voucherType)?.desc}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Narration</label>
              <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)}
                placeholder="Reason / description"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Entries Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <th className="text-left p-3 font-medium w-10">#</th>
                  <th className="text-left p-3 font-medium">Ledger Account</th>
                  <th className="text-left p-3 font-medium">Bank / Cash Account</th>
                  <th className="text-right p-3 font-medium w-36">Debit (₹)</th>
                  <th className="text-right p-3 font-medium w-36">Credit (₹)</th>
                  <th className="text-center p-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                    <td className="p-3 text-xs text-slate-400 font-medium">{idx + 1}</td>
                    
                    {/* 1. Ledger Selector */}
                    <td className="p-3">
                      <select
                        value={entry.accountGroupCode}
                        onChange={(e) => updateEntry(idx, "accountGroupCode", e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                      >
                        <option value="">— Select Ledger —</option>
                        {accountGroups.map((g) => (
                          <option key={g.code} value={g.code}>
                            {g.code} — {g.name} ({g.nature})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 2. Bank / Cash Account Selector */}
                    <td className="p-3">
                      <select
                        value={entry.financialAccountId || ""}
                        onChange={(e) => {
                          const selectedBankId = e.target.value || undefined
                          let nextLedger = entry.accountGroupCode
                          if (selectedBankId && !nextLedger) {
                            const assetGroup = accountGroups.find((g) => g.nature === "ASSET" || g.code === "1000")
                            nextLedger = assetGroup?.code || "1000"
                          }
                          updateEntryFields(idx, {
                            financialAccountId: selectedBankId,
                            accountGroupCode: nextLedger,
                          })
                        }}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">— None (Non-Cash / Bank) —</option>
                        {bankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            [{account.type}] {account.name}{account.bankName ? ` (${account.bankName})` : ""} — ₹{account.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        value={entry.debitAmount || ""}
                        min={0}
                        step={0.01}
                        onChange={(e) => updateEntry(idx, "debitAmount", parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-right focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={entry.creditAmount || ""}
                        min={0}
                        step={0.01}
                        onChange={(e) => updateEntry(idx, "creditAmount", parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-right focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-3 text-center">
                      {entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="p-3 text-right text-xs font-semibold text-slate-600">Total</td>
                  <td className="p-3 text-right text-xs font-bold text-slate-800 font-mono">
                    ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right text-xs font-bold text-slate-800 font-mono">
                    ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    {isBalanced && totalDebit > 0 ? (
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : totalDebit > 0 ? (
                      <X className="w-4 h-4 text-red-500 mx-auto" />
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button onClick={addEntry} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Row
          </button>

          {/* Account Balance Impact Preview & Warning */}
          {hasSelfCancellingAccount && (
            <div className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3.5 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Neutralized Balance Warning (Net change = ₹0.00)</p>
                <p className="mt-0.5 text-amber-700">
                  You selected the same account on both Debit and Credit. The debit and credit cancel each other out. If this is a Receipt or Payment, set the opposite ledger row&apos;s Bank / Cash Account to <strong>&ldquo;— None (Non-Cash / Bank) —&rdquo;</strong> to affect the account balance.
                </p>
              </div>
            </div>
          )}

          {accountImpacts.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  ⚡ Account Balance Impact Preview (Live)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Debit (+) increases balance &bull; Credit (-) decreases balance
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {accountImpacts.map((ai) => {
                  const projectedBalance = ai.account.currentBalance + ai.net
                  return (
                    <div
                      key={ai.account.id}
                      className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{ai.account.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Current: ₹{ai.account.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div
                          className={`font-bold ${
                            ai.net > 0
                              ? "text-emerald-600"
                              : ai.net < 0
                              ? "text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {ai.net > 0 ? `+₹${ai.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Deposit)` : ai.net < 0 ? `-₹${Math.abs(ai.net).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Withdrawal)` : "₹0.00 (Neutral)"}
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold mt-0.5">
                          New: ₹{projectedBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!isBalanced && totalDebit > 0 && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              Difference: ₹{Math.abs(totalDebit - totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })} — Debit and Credit must be equal
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={loading || !canSubmit}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? "Posting..." : "Post Voucher"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-100">
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Select the <strong>Ledger Account</strong> from Chart of Accounts. For transactions affecting hospital bank or cash funds, select the corresponding <strong>Bank / Cash Account</strong> to automatically update its real-time balance.
          </p>
        </div>
      )}

      {/* Voucher List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent Vouchers ({total})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                <th className="w-8"></th>
                <th className="text-left p-3 font-medium">Voucher No.</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Narration</th>
                <th className="text-right p-3 font-medium">Amount (₹)</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No vouchers created yet
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const isExpanded = expandedVoucherId === v.id
                  return (
                    <React.Fragment key={v.id}>
                      <tr
                        onClick={() => setExpandedVoucherId(isExpanded ? null : v.id)}
                        className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors cursor-pointer select-none"
                      >
                        <td className="p-3 text-center text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 mx-auto text-blue-600" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 mx-auto" />
                          )}
                        </td>
                        <td className="p-3 text-xs font-mono text-slate-700 font-semibold">{v.voucherNumber}</td>
                        <td className="p-3 text-xs text-slate-600">
                          {new Date(v.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                            {v.voucherType}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{v.narration || "—"}</td>
                        <td className="p-3 text-right text-xs font-semibold text-slate-800 font-mono">
                          ₹{v.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              v.status === "POSTED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : v.status === "CANCELLED"
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {v.status === "POSTED" && (
                            <button
                              onClick={() => handleCancel(v.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Line Items */}
                      {isExpanded && v.entries && v.entries.length > 0 && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={8} className="p-3 pl-11">
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-100/70 text-slate-500 border-b border-slate-200">
                                    <th className="text-left p-2.5 font-medium">Ledger Account</th>
                                    <th className="text-left p-2.5 font-medium">Bank / Cash Account</th>
                                    <th className="text-right p-2.5 font-medium w-32">Debit (₹)</th>
                                    <th className="text-right p-2.5 font-medium w-32">Credit (₹)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {v.entries.map((e) => (
                                    <tr key={e.id} className="hover:bg-slate-50/50">
                                      <td className="p-2.5 font-mono text-slate-700 font-medium">
                                        {e.accountGroupCode} —{" "}
                                        {accountGroups.find((g) => g.code === e.accountGroupCode)?.name || "Ledger Account"}
                                      </td>
                                      <td className="p-2.5 text-slate-600">
                                        {e.financialAccount ? (
                                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                              {e.financialAccount.type}
                                            </span>
                                            {e.financialAccount.name}
                                            {e.financialAccount.bankName ? ` (${e.financialAccount.bankName})` : ""}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic">—</span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-800">
                                        {e.debitAmount > 0
                                          ? `₹${e.debitAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                          : "—"}
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-800">
                                        {e.creditAmount > 0
                                          ? `₹${e.creditAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                          : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
