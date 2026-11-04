"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  createPharmacyDoubleVoucher,
  getPharmacyDoubleVouchers,
  cancelPharmacyDoubleVoucher,
  PharmacyVoucherEntryInput,
} from "@/app/actions/pharmacy-fin/vouchers"
import {
  PenLine,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Filter,
  ArrowRightLeft,
  Wallet,
  Landmark,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface AccountGroup {
  code: string
  name: string
  nature: string
}

interface PharmacyAccount {
  id: string
  name: string
  type: string
  bankName: string | null
  accountNumber: string | null
  currentBalance: number
}

interface VoucherEntryRow {
  id: string
  accountGroupCode: string
  financialAccountId?: string | null
  financialAccount?: { id: string; name: string; bankName: string | null; type: string } | null
  debitAmount: number
  creditAmount: number
  narration?: string | null
}

interface DoubleVoucherRow {
  id: string
  voucherNumber: string
  voucherType: string
  date: string | Date
  narration: string | null
  totalAmount: number
  status: string
  createdBy: string
  entries: VoucherEntryRow[]
}

interface LegacyVoucherRow {
  id: string
  voucherNumber: string
  type: string
  date: string | Date
  amount: number
  particulars: string
  notes?: string | null
  partyName?: string | null
  status?: string
  account?: { id: string; name: string; bankName?: string | null; type: string } | null
  contraAccount?: { id: string; name: string; bankName?: string | null; type: string } | null
}

const VOUCHER_TYPES = [
  { value: "JOURNAL", label: "Journal Voucher (PH-JV)", desc: "For non-cash adjustments" },
  { value: "RECEIPT", label: "Receipt Voucher (PH-RV)", desc: "Cash, UPI, or bank receipts into pharmacy" },
  { value: "PAYMENT", label: "Payment Voucher (PH-PV)", desc: "Cash, UPI, or bank disbursements/supplier payments" },
  { value: "CONTRA", label: "Contra Voucher (PH-CV)", desc: "Transfers between pharmacy cash drawers and bank accounts" },
]

export function PharmacyVouchersClient({
  accountGroups,
  pharmacyAccounts,
  initialDoubleVouchers = [],
  initialLegacyVouchers = [],
  initialTotal = 0,
}: {
  accountGroups: AccountGroup[]
  pharmacyAccounts: PharmacyAccount[]
  initialDoubleVouchers?: DoubleVoucherRow[]
  initialLegacyVouchers?: LegacyVoucherRow[]
  initialTotal?: number
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [vouchers, setVouchers] = useState<DoubleVoucherRow[]>(initialDoubleVouchers)
  const [legacyVouchers, setLegacyVouchers] = useState<LegacyVoucherRow[]>(initialLegacyVouchers)
  const [total, setTotal] = useState(initialTotal)
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [voucherType, setVoucherType] = useState("JOURNAL")
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0])
  const [narration, setNarration] = useState("")
  const [entries, setEntries] = useState<PharmacyVoucherEntryInput[]>([
    { accountGroupCode: "", debitAmount: 0, creditAmount: 0 },
    { accountGroupCode: "", debitAmount: 0, creditAmount: 0 },
  ])
  const [error, setError] = useState("")

  const fetchVouchers = useCallback(async () => {
    try {
      const result = await getPharmacyDoubleVouchers({
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        limit: 50,
      })
      setVouchers(JSON.parse(JSON.stringify(result.vouchers)))
      setLegacyVouchers(JSON.parse(JSON.stringify(result.legacyVouchers || [])))
      setTotal(result.total)
    } catch (e) {
      console.error("Failed to fetch pharmacy vouchers", e)
    }
  }, [typeFilter])

  useEffect(() => {
    fetchVouchers()
  }, [fetchVouchers])

  function addEntry() {
    setEntries((prev) => [...prev, { accountGroupCode: "", debitAmount: 0, creditAmount: 0 }])
  }

  function removeEntry(idx: number) {
    if (entries.length <= 2) return
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateEntry(idx: number, field: keyof PharmacyVoucherEntryInput, value: string | number | undefined) {
    setEntries((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      return updated
    })
  }

  function updateEntryFields(idx: number, fields: Partial<PharmacyVoucherEntryInput>) {
    setEntries((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], ...fields }
      return updated
    })
  }

  const totalDebit = entries.reduce((s, e) => s + (Number(e.debitAmount) || 0), 0)
  const totalCredit = entries.reduce((s, e) => s + (Number(e.creditAmount) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
  const canSubmit = isBalanced && totalDebit > 0 && entries.every((e) => e.accountGroupCode) && entries.length >= 2

  // Live account balance impact preview
  const accountImpacts = useMemo(() => {
    const map = new Map<string, { account: PharmacyAccount; debits: number; credits: number; net: number }>()
    for (const e of entries) {
      if (!e.financialAccountId) continue
      const acc = pharmacyAccounts.find((a) => a.id === e.financialAccountId)
      if (!acc) continue
      const current = map.get(acc.id) || { account: acc, debits: 0, credits: 0, net: 0 }
      current.debits += Number(e.debitAmount) || 0
      current.credits += Number(e.creditAmount) || 0
      current.net += (Number(e.debitAmount) || 0) - (Number(e.creditAmount) || 0)
      map.set(acc.id, current)
    }
    return Array.from(map.values())
  }, [entries, pharmacyAccounts])

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
      setError("Debit and Credit totals must be balanced and all lines must have a Ledger Account.")
      return
    }
    setLoading(true)
    try {
      const res = await createPharmacyDoubleVoucher({
        voucherType,
        date: voucherDate,
        narration: narration || undefined,
        entries: entries.map((e) => ({
          accountGroupCode: e.accountGroupCode,
          financialAccountId: e.financialAccountId || undefined,
          debitAmount: Number(e.debitAmount) || 0,
          creditAmount: Number(e.creditAmount) || 0,
          narration: e.narration,
        })),
      })

      if (!res.success) {
        throw new Error(res.message || "Failed to post pharmacy voucher")
      }

      setShowForm(false)
      setEntries([
        { accountGroupCode: "", debitAmount: 0, creditAmount: 0 },
        { accountGroupCode: "", debitAmount: 0, creditAmount: 0 },
      ])
      setNarration("")
      await fetchVouchers()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create pharmacy voucher")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this voucher? Account balances will be immediately reversed. This action cannot be undone.")) {
      return
    }
    try {
      await cancelPharmacyDoubleVoucher(id)
      await fetchVouchers()
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to cancel voucher")
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <PenLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Pharmacy Voucher Entry</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pharmacy Scope (Dedicated)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Double-entry voucher studio for Pharmacy Finance (Journal, Receipt, Payment, Contra). Fully isolated from Hospital Master Finance.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Close Studio" : "New Voucher"}
        </button>
      </div>

      {/* Voucher Studio Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Create Pharmacy Voucher</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every entry balances debit and credit, isolated strictly to Pharmacy Finance ledgers.
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              Prefix: {voucherType === "JOURNAL" ? "PH-JV" : voucherType === "RECEIPT" ? "PH-RV" : voucherType === "PAYMENT" ? "PH-PV" : "PH-CV"}
            </span>
          </div>

          {/* Type, Date, Narration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Voucher Type</label>
              <select
                value={voucherType}
                onChange={(e) => handleVoucherTypeChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                {VOUCHER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {VOUCHER_TYPES.find((t) => t.value === voucherType)?.desc}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Posting date in current financial period</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Narration / Particulars</label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="e.g. Medicine purchase settlement, Cash deposit to bank"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Main voucher description</p>
            </div>
          </div>

          {/* Entries Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="text-left p-3 w-10">#</th>
                  <th className="text-left p-3">Ledger Account (Chart of Accounts)</th>
                  <th className="text-left p-3">Pharmacy Bank / Cash Account</th>
                  <th className="text-right p-3 w-36">Debit (₹)</th>
                  <th className="text-right p-3 w-36">Credit (₹)</th>
                  <th className="text-center p-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-slate-400 font-mono font-medium">{idx + 1}</td>

                    {/* 1. Ledger Selector */}
                    <td className="p-3">
                      <select
                        value={entry.accountGroupCode}
                        onChange={(e) => updateEntry(idx, "accountGroupCode", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                      >
                        <option value="">— Select Ledger Group —</option>
                        {accountGroups.map((g) => (
                          <option key={g.code} value={g.code}>
                            {g.code} — {g.name} ({g.nature})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 2. Pharmacy Bank / Cash Account Selector */}
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
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      >
                        <option value="">— None (Non-Cash / Non-Bank) —</option>
                        {pharmacyAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            [{account.type}] {account.name}
                            {account.bankName ? ` (${account.bankName})` : ""} — ₹
                            {account.currentBalance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 3. Debit Amount */}
                    <td className="p-3">
                      <input
                        type="number"
                        value={entry.debitAmount || ""}
                        min={0}
                        step={0.01}
                        onChange={(e) => updateEntry(idx, "debitAmount", parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-right focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </td>

                    {/* 4. Credit Amount */}
                    <td className="p-3">
                      <input
                        type="number"
                        value={entry.creditAmount || ""}
                        min={0}
                        step={0.01}
                        onChange={(e) => updateEntry(idx, "creditAmount", parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-right focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </td>

                    {/* 5. Delete Action */}
                    <td className="p-3 text-center">
                      {entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Remove line"
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
                  <td colSpan={3} className="p-3 text-right text-xs font-semibold text-slate-700">
                    Total
                  </td>
                  <td className="p-3 text-right text-xs font-bold text-slate-900 font-mono">
                    ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right text-xs font-bold text-slate-900 font-mono">
                    ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    {isBalanced && totalDebit > 0 ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : totalDebit > 0 ? (
                      <X className="w-4 h-4 text-red-500 mx-auto" />
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={addEntry}
              type="button"
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>

            {!isBalanced && totalDebit > 0 && (
              <span className="text-xs font-medium text-red-600 flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                <AlertCircle className="w-3.5 h-3.5" />
                Difference: ₹
                {Math.abs(totalDebit - totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Must be
                ₹0.00)
              </span>
            )}
          </div>

          {/* Neutralized Balance Guard */}
          {hasSelfCancellingAccount && (
            <div className="flex items-start gap-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Neutralized Balance Warning (Net change = ₹0.00)</p>
                <p className="mt-0.5 text-amber-800">
                  You selected the same account on both Debit and Credit. The debit and credit cancel each other out. If
                  this is a Receipt or Payment, set the opposite ledger row&apos;s Bank / Cash Account to{" "}
                  <strong>&ldquo;— None (Non-Cash / Non-Bank) —&rdquo;</strong> to affect the account balance.
                </p>
              </div>
            </div>
          )}

          {/* Live Account Balance Impact Preview */}
          {accountImpacts.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                  Pharmacy Account Balance Impact Preview (Live)
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
                      className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {ai.account.type === "CASH" ? (
                            <Wallet className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Landmark className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          {ai.account.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Current: ₹
                          {ai.account.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                          {ai.net > 0
                            ? `+₹${ai.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Deposit)`
                            : ai.net < 0
                            ? `-₹${Math.abs(ai.net).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Withdrawal)`
                            : "₹0.00 (Neutral)"}
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

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {loading ? "Posting Voucher..." : "Post Pharmacy Voucher"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-600 hover:bg-slate-100 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-slate-400 max-w-md text-right hidden sm:block">
              Select <strong>Ledger Account</strong> from Chart of Accounts. Choose a <strong>Pharmacy Bank / Cash Account</strong> to adjust real-time treasury balances.
            </p>
          </div>
        </div>
      )}

      {/* Vouchers List Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header & Type Filter */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Pharmacy Vouchers ({total})</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of double-entry vouchers (PH-*) and historical pharmacy cash vouchers.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 p-1 rounded-xl text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1 font-medium text-[11px]">
              <Filter className="w-3 h-3" /> Type:
            </span>
            {["ALL", "JOURNAL", "RECEIPT", "PAYMENT", "CONTRA"].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  typeFilter === type
                    ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/75 font-semibold">
                <th className="w-8"></th>
                <th className="text-left p-3">Voucher No.</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Narration / Particulars</th>
                <th className="text-right p-3">Amount (₹)</th>
                <th className="text-center p-3">Status</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.length === 0 && legacyVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <PenLine className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium text-slate-600">No pharmacy vouchers found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;New Voucher&rdquo; to post your first pharmacy entry.</p>
                  </td>
                </tr>
              ) : (
                <>
                  {/* Double-Entry Vouchers (PH-*) */}
                  {vouchers.map((v) => {
                    const isExpanded = expandedVoucherId === v.id
                    return (
                      <React.Fragment key={v.id}>
                        <tr
                          onClick={() => setExpandedVoucherId(isExpanded ? null : v.id)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                        >
                          <td className="p-3 text-center text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 mx-auto text-emerald-600" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-900">{v.voucherNumber}</td>
                          <td className="p-3 text-slate-600 font-mono">
                            {new Date(v.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                v.voucherType === "RECEIPT"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : v.voucherType === "PAYMENT"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : v.voucherType === "CONTRA"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {v.voucherType}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 max-w-[260px] truncate">{v.narration || "—"}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{v.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                v.status === "POSTED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-600 border border-red-200"
                              }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {v.status === "POSTED" && (
                              <button
                                onClick={() => handleCancel(v.id)}
                                className="text-[11px] text-red-600 hover:text-red-800 font-medium hover:underline"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Double-Entry Lines */}
                        {isExpanded && v.entries && v.entries.length > 0 && (
                          <tr className="bg-slate-50/70 border-b border-slate-200">
                            <td colSpan={8} className="p-3 pl-11">
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 font-medium">
                                      <th className="text-left p-2.5">Ledger Group</th>
                                      <th className="text-left p-2.5">Pharmacy Bank / Cash Account</th>
                                      <th className="text-right p-2.5 w-32">Debit (₹)</th>
                                      <th className="text-right p-2.5 w-32">Credit (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {v.entries.map((e) => (
                                      <tr key={e.id} className="hover:bg-slate-50/50">
                                        <td className="p-2.5 font-mono text-slate-800 font-medium">
                                          {e.accountGroupCode} —{" "}
                                          {accountGroups.find((g) => g.code === e.accountGroupCode)?.name ||
                                            "Ledger Group"}
                                        </td>
                                        <td className="p-2.5 text-slate-600">
                                          {e.financialAccount ? (
                                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                                {e.financialAccount.type}
                                              </span>
                                              {e.financialAccount.name}
                                              {e.financialAccount.bankName ? ` (${e.financialAccount.bankName})` : ""}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 italic">—</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-slate-900">
                                          {e.debitAmount > 0
                                            ? `₹${e.debitAmount.toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                              })}`
                                            : "—"}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-slate-900">
                                          {e.creditAmount > 0
                                            ? `₹${e.creditAmount.toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                              })}`
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
                  })}

                  {/* Historical Legacy Pharmacy Vouchers (PV-*) */}
                  {legacyVouchers
                    .filter((lv) => (typeFilter !== "ALL" ? lv.type === typeFilter : true))
                    .map((lv) => {
                      const isExpanded = expandedVoucherId === lv.id
                      return (
                        <React.Fragment key={lv.id}>
                          <tr
                            onClick={() => setExpandedVoucherId(isExpanded ? null : lv.id)}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer select-none bg-slate-50/30"
                          >
                            <td className="p-3 text-center text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 mx-auto text-emerald-600" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 mx-auto" />
                              )}
                            </td>
                            <td className="p-3 font-mono font-semibold text-slate-700 flex items-center gap-1.5">
                              {lv.voucherNumber}
                              <span className="text-[9px] uppercase px-1 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200 font-sans">
                                Legacy
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-mono">
                              {new Date(lv.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                                {lv.type}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 max-w-[260px] truncate">{lv.particulars}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">
                              ₹{lv.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  lv.status === "CANCELLED"
                                    ? "bg-red-50 text-red-600 border border-red-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                {lv.status || "POSTED"}
                              </span>
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {lv.status !== "CANCELLED" && (
                                <button
                                  onClick={() => handleCancel(lv.id)}
                                  className="text-[11px] text-red-600 hover:text-red-800 font-medium hover:underline"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Legacy Details */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={8} className="p-3 pl-11">
                                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2 text-xs">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Account</span>
                                      <p className="font-medium text-slate-800 mt-0.5">
                                        {lv.account?.name || "Pharmacy Account"}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                        Contra / Party
                                      </span>
                                      <p className="font-medium text-slate-800 mt-0.5">
                                        {lv.contraAccount?.name || lv.partyName || "—"}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Notes</span>
                                      <p className="font-medium text-slate-600 mt-0.5">{lv.notes || "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Scope</span>
                                      <p className="font-medium text-emerald-700 mt-0.5">PHARMACY (Isolated)</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
