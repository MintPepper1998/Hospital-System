"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarCheck2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Banknote,
  Coins,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  HelpCircle,
} from "lucide-react"
import { closeHospitalDay } from "@/app/actions/master-finance-day-close"
import { toast } from "sonner"

interface CashAccount {
  id: string
  name: string
  type: string
  currentBalance: number
  openingBalance: number
}

interface TransactionItem {
  id: string
  date: string
  category: string
  description: string
  in: number
  out: number
}

interface DayCloseDraft {
  isClosed: boolean
  closeRecord?: any
  openingCash?: number
  cashIn?: number
  cashOut?: number
  transfersIn?: number
  transfersOut?: number
  expectedCash?: number
  categories?: Record<string, { in: number; out: number }>
  transactions?: TransactionItem[]
}

export function MasterDayCloseClient({
  dateStr,
  accountId,
  cashAccounts,
  draft,
  recent,
}: {
  dateStr: string
  accountId: string
  cashAccounts: CashAccount[]
  draft: DayCloseDraft | null
  recent: any[]
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showTxns, setShowTxns] = useState(false)

  // Physical count denominations
  const [denominations, setDenominations] = useState<{ [key: string]: number }>({
    "2000": 0,
    "500": 0,
    "200": 0,
    "100": 0,
    "50": 0,
    "20": 0,
    "10": 0,
    coins: 0,
  })
  const [notes, setNotes] = useState("")

  const handleDateChange = (newDate: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set("date", newDate)
    if (accountId) params.set("accountId", accountId)
    router.push(`?${params.toString()}`)
  }

  const handleAccountChange = (newAccountId: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set("accountId", newAccountId)
    if (dateStr) params.set("date", dateStr)
    router.push(`?${params.toString()}`)
  }

  // Calculate counted physical cash
  const totalCounted = Object.entries(denominations).reduce((acc, [denom, count]) => {
    if (denom === "coins") return acc + (Number(count) || 0)
    return acc + Number(denom) * (Number(count) || 0)
  }, 0)

  const expectedCash = draft?.expectedCash || 0
  const variance = Math.round((totalCounted - expectedCash) * 100) / 100

  // Submission handler
  const handleCloseDay = async () => {
    if (!accountId) {
      toast.error("Please select a Cash Account.")
      return
    }

    const varianceNotice =
      Math.abs(variance) >= 0.01
        ? `Warning: A variance of ₹${variance > 0 ? "+" : ""}${variance.toFixed(2)} will be adjusted as a cash variance entry.`
        : "Expected cash and counted cash are perfectly matched."

    const confirmed = window.confirm(
      `Confirm Day Close for date ${dateStr}?\n\n• Expected Cash: ₹${expectedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n• Counted Cash: ₹${totalCounted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n• Variance: ₹${variance.toFixed(2)}\n\n${varianceNotice}\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    setSubmitting(true)
    try {
      const result = await closeHospitalDay({
        dateStr,
        accountId,
        countedCash: totalCounted,
        denominations,
        notes: notes.trim() || undefined,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to close hospital day.")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAccount = cashAccounts.find((a) => a.id === accountId)
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck2 className="w-6 h-6 text-blue-600" />
            Day Close
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile physical cash with system ledger and close the business day for hospital cash counters
          </p>
        </div>
      </div>

      {/* Account & Date Selection Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-blue-600" />
            Hospital Cash Account / Drawer
          </label>
          <select
            value={accountId}
            onChange={(e) => handleAccountChange(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
          >
            {cashAccounts.length === 0 ? (
              <option value="">No active hospital cash accounts found</option>
            ) : (
              cashAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — Current Balance: ₹{acc.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <CalendarCheck2 className="w-3.5 h-3.5 text-blue-600" />
            Business Date
          </label>
          <input
            type="date"
            max={todayStr}
            value={dateStr}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          />
        </div>
      </div>

      {/* No account state */}
      {!accountId && (
        <div className="p-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50">
          No hospital cash account selected. Please select or configure a cash account in Master Finance Cash & Bank.
        </div>
      )}

      {/* State A: Day Already Closed */}
      {draft && draft.isClosed && draft.closeRecord && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">
                Day Already Closed for {selectedAccount?.name || "this account"}
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Business date <strong>{dateStr}</strong> has been successfully reconciled and closed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 font-medium uppercase">Expected Cash</div>
              <div className="text-lg font-bold text-slate-800 font-mono mt-1">
                ₹{draft.closeRecord.expectedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 font-medium uppercase">Counted Cash</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
                ₹{draft.closeRecord.countedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 font-medium uppercase">Variance</div>
              <div
                className={`text-lg font-bold font-mono mt-1 ${
                  Math.abs(draft.closeRecord.variance) >= 0.01 ? "text-amber-600" : "text-emerald-700"
                }`}
              >
                {draft.closeRecord.variance > 0 ? "+" : ""}
                ₹{draft.closeRecord.variance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 font-medium uppercase">Closed At</div>
              <div className="text-sm font-semibold text-slate-700 mt-1.5">
                {new Date(draft.closeRecord.closedAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {draft.closeRecord.notes && (
            <div className="bg-white/60 border border-emerald-100 rounded-lg p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Closure Notes:</span> {draft.closeRecord.notes}
            </div>
          )}
        </div>
      )}

      {/* State B: Day is Open & Ready for Reconciliation */}
      {draft && !draft.isClosed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Cash Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-blue-600" />
                  Ledger Cash Summary
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Calculated from hospital billing & financial entries</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {dateStr}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Opening Balance */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-600">Opening Balance (Start of Day)</span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  ₹{(draft.openingCash || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Cash In Breakdown */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  <span className="flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    Total Cash In
                  </span>
                  <span className="font-mono text-sm font-bold">
                    + ₹{(draft.cashIn || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {draft.categories &&
                  Object.entries(draft.categories)
                    .filter(([_, v]) => v.in > 0)
                    .map(([cat, v]) => (
                      <div key={cat} className="flex justify-between text-xs pl-4 text-slate-600">
                        <span>{cat.replace(/_/g, " ")}</span>
                        <span className="text-emerald-600 font-mono font-medium">
                          + ₹{v.in.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
              </div>

              {/* Cash Out Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-rose-700">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    Total Cash Out
                  </span>
                  <span className="font-mono text-sm font-bold">
                    - ₹{(draft.cashOut || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {draft.categories &&
                  Object.entries(draft.categories)
                    .filter(([_, v]) => v.out > 0)
                    .map(([cat, v]) => (
                      <div key={cat} className="flex justify-between text-xs pl-4 text-slate-600">
                        <span>{cat.replace(/_/g, " ")}</span>
                        <span className="text-rose-600 font-mono font-medium">
                          - ₹{v.out.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
              </div>

              {/* Transfers In/Out if any */}
              {((draft.transfersIn || 0) > 0 || (draft.transfersOut || 0) > 0) && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  {(draft.transfersIn || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Internal Transfers In</span>
                      <span className="font-mono text-slate-700">
                        + ₹{(draft.transfersIn || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {(draft.transfersOut || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Internal Transfers Out</span>
                      <span className="font-mono text-slate-700">
                        - ₹{(draft.transfersOut || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Expected Total */}
              <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-between bg-blue-50/50 -mx-5 -mb-5 p-5 mt-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
                    Expected Cash in Register
                  </span>
                  <span className="text-[11px] text-blue-700">Opening + In - Out</span>
                </div>
                <span className="text-xl font-extrabold text-blue-700 font-mono">
                  ₹{expectedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* View Day Transactions toggle */}
            {draft.transactions && draft.transactions.length > 0 && (
              <div className="border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTxns(!showTxns)}
                  className="w-full px-5 py-3 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 flex items-center justify-between"
                >
                  <span>View {draft.transactions.length} Transactions on this Date</span>
                  {showTxns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showTxns && (
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {draft.transactions.map((t) => (
                      <div key={t.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                        <div>
                          <div className="font-medium text-slate-800">{t.description}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(t.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} •{" "}
                            {t.category}
                          </div>
                        </div>
                        <div className="font-mono font-medium text-right">
                          {t.in > 0 ? (
                            <span className="text-emerald-600">+₹{t.in.toLocaleString("en-IN")}</span>
                          ) : (
                            <span className="text-rose-600">-₹{t.out.toLocaleString("en-IN")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Physical Count & Denominations */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                Physical Cash Count & Denominations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Count notes and coins in the physical drawer or counter</p>
            </div>

            {/* Denomination inputs */}
            <div className="space-y-2.5">
              {["2000", "500", "200", "100", "50", "20", "10"].map((denom) => {
                const count = denominations[denom] || 0
                const amount = Number(denom) * count
                return (
                  <div key={denom} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-right font-mono font-semibold text-slate-700">₹{denom}</span>
                    <span className="text-slate-400 font-bold">×</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations[denom] || ""}
                      onChange={(e) =>
                        setDenominations({
                          ...denominations,
                          [denom]: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-20 border border-slate-300 rounded px-2.5 py-1 text-center font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                    <span className="text-slate-400 font-bold">=</span>
                    <span className="flex-1 text-right font-mono font-semibold text-slate-800">
                      ₹{amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )
              })}

              {/* Coins Input */}
              <div className="flex items-center gap-2 text-xs pt-2 border-t border-slate-100">
                <span className="w-14 text-right font-semibold text-slate-700">Coins</span>
                <span className="text-slate-400 font-bold">+</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={denominations.coins || ""}
                  onChange={(e) =>
                    setDenominations({
                      ...denominations,
                      coins: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-20 border border-slate-300 rounded px-2.5 py-1 text-center font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                />
                <span className="text-slate-400 font-bold">=</span>
                <span className="flex-1 text-right font-mono font-semibold text-slate-800">
                  ₹{(denominations.coins || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Reconciliation Totals Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                <span>Total Counted Physical Cash</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  ₹{totalCounted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Expected System Cash</span>
                <span className="font-mono font-medium">
                  ₹{expectedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div
                className={`pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm ${
                  Math.abs(variance) < 0.01
                    ? "text-emerald-700"
                    : variance > 0
                    ? "text-blue-700"
                    : "text-rose-700"
                }`}
              >
                <span className="flex items-center gap-1">
                  Variance
                  {Math.abs(variance) < 0.01 ? (
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 ml-1">
                      Matched
                    </span>
                  ) : variance > 0 ? (
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-1">
                      Surplus
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 ml-1">
                      Shortage
                    </span>
                  )}
                </span>
                <span className="font-mono text-base">
                  {variance > 0 ? "+" : ""}₹{variance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Closure Notes / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for discrepancy or shift handover note"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Submit Close Day */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleCloseDay}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Closing Day..." : "Close Day & Reconcile"}
            </button>
          </div>
        </div>
      )}

      {/* Recent Closes History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            Recent Day Closes History
          </h3>
          <span className="text-xs text-slate-400">{recent.length} recent closures</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 select-none">
                <th className="text-left p-3">Business Date</th>
                <th className="text-left p-3">Account</th>
                <th className="text-right p-3">Opening</th>
                <th className="text-right p-3">Cash In</th>
                <th className="text-right p-3">Cash Out</th>
                <th className="text-right p-3">Expected</th>
                <th className="text-right p-3">Counted</th>
                <th className="text-right p-3">Variance</th>
                <th className="text-left p-3">Notes</th>
                <th className="text-right p-3">Closed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No day closure records found for this account yet.
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-800 font-mono">{r.businessDate}</td>
                    <td className="p-3 text-slate-600">{r.account?.name || selectedAccount?.name || "Cash Account"}</td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      ₹{r.openingCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-600 font-medium">
                      +₹{(r.cashIn + (r.transfersIn || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-600 font-medium">
                      -₹{(r.cashOut + (r.transfersOut || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-800">
                      ₹{r.expectedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-emerald-700">
                      ₹{r.countedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          Math.abs(r.variance) < 0.01
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.variance > 0
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {r.variance > 0 ? "+" : ""}₹{r.variance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 max-w-[150px] truncate">{r.notes || "—"}</td>
                    <td className="p-3 text-right text-slate-500 whitespace-nowrap">
                      {new Date(r.closedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}{" "}
                      {new Date(r.closedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

