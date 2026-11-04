"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Building2,
  Wallet,
  Landmark,
  ChevronDown,
  ChevronUp,
  Edit3,
  RefreshCw,
  ShieldCheck,
  CreditCard,
  QrCode,
  SendHorizontal,
  Layers,
  Receipt,
  X,
  Save,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import {
  getAccountsDashboard,
  updateAccount,
  consolidateHospitalAccounts,
  type AccountsDashboardData,
  type AccountDetail,
} from "@/app/actions/accounts"

function formatINR(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function FinancialAccountsClient() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<AccountsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [consolidating, setConsolidating] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountDetail | null>(null)

  // Accordion state for breakdowns
  const [bankDropdownOpen, setBankDropdownOpen] = useState(true)
  const [cashDropdownOpen, setCashDropdownOpen] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const data = await getAccountsDashboard()
      setDashboard(data)
    } catch (err) {
      console.error("[ERROR] loadData:", err)
      toast.error("Failed to load treasury accounts data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleConsolidate() {
    if (
      !confirm(
        "Consolidate all hospital bank channels (UPI, Card, Wires) into Hospital Bank Account and all cash drawers into Hospital Cash Account? All historical transactions and general ledger integrity are strictly preserved."
      )
    ) {
      return
    }

    setConsolidating(true)
    try {
      const res = await consolidateHospitalAccounts()
      if (res.success) {
        toast.success(res.message || "Accounts consolidated successfully")
        await loadData()
        router.refresh()
      } else {
        toast.error(res.message || "Consolidation failed")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error running consolidation"
      toast.error(msg)
    } finally {
      setConsolidating(false)
    }
  }

  const accounts = dashboard?.accounts || []
  const bankAccount = accounts.find((a) => a.type === "BANK") || null
  const cashAccount = accounts.find((a) => a.type === "CASH" || a.type === "PETTY_CASH") || null

  const grandTotal = dashboard?.grandTotal || 0
  const totalBank = bankAccount?.currentBalance || 0
  const totalCash = cashAccount?.currentBalance || 0

  const bankBreakdown = dashboard?.bankBreakdown || []
  const cashBreakdown = dashboard?.cashBreakdown || []

  // Calculate percentages for treasury meter
  const bankPct = grandTotal > 0 ? Math.min(100, Math.round((totalBank / grandTotal) * 100)) : 50
  const cashPct = grandTotal > 0 ? 100 - bankPct : 50

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── TOP HEADER / MASTHEAD ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/15">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                  Hospital Cash & Bank Accounts
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Canonical Treasury
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consolidated 2-tier treasury: 1 Hospital Bank Account (with UPI & Card channels) and 1 Hospital Cash Counter.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition disabled:opacity-50"
            title="Refresh current account balances"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleConsolidate}
            disabled={consolidating || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition disabled:opacity-50"
            title="Ensure all accounts are merged into the 1 Bank + 1 Cash structure"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            {consolidating ? "Consolidating..." : "Consolidate to 1 Bank & 1 Cash"}
          </button>
        </div>
      </div>

      {/* ── MASTER TREASURY LIQUIDITY BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 md:p-8 shadow-xl shadow-slate-950/10 border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Consolidated Liquid Reserves
            </div>
            <div className="text-3xl md:text-5xl font-extrabold tracking-tight font-mono text-white">
              {loading ? "₹––,––,–––" : formatINR(grandTotal)}
            </div>
            <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
              Total operational liquidity available across physical cash drawers, digital collections (UPI & Card POS), and commercial bank depositories.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-medium">Reserve Allocation</span>
              <span className="font-mono text-[11px] text-slate-400">
                Bank {bankPct}% • Cash {cashPct}%
              </span>
            </div>

            {/* Split Progress Meter */}
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${bankPct}%` }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                title={`Bank Reserve: ${formatINR(totalBank)} (${bankPct}%)`}
              />
              <div
                style={{ width: `${cashPct}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                title={`Cash Vault: ${formatINR(totalCash)} (${cashPct}%)`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-300">
                  <Building2 className="w-3 h-3 text-blue-400" />
                  Bank Depository
                </div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {formatINR(totalBank)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                  <Wallet className="w-3 h-3 text-emerald-400" />
                  Cash in Vault
                </div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {formatINR(totalCash)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── THE TWO CANONICAL TREASURY ACCOUNTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══════════════════════════════════════════════
            ACCOUNT 1: HOSPITAL BANK ACCOUNT (CONSOLIDATED)
           ═══════════════════════════════════════════════ */}
        {bankAccount ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            {/* Card Header */}
            <div className="p-5 md:p-6 bg-gradient-to-b from-blue-50/50 to-white border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base md:text-lg font-bold text-slate-900">
                        {bankAccount.name}
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                        Consolidated Bank
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                      <span>{bankAccount.bankName || "Commercial Depository Bank"}</span>
                      {bankAccount.accountNumber && (
                        <span>• A/c: {bankAccount.accountNumber}</span>
                      )}
                      {bankAccount.ifscCode && (
                        <span>• IFSC: {bankAccount.ifscCode}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditingAccount(bankAccount)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition"
                  title="Edit Account Details & Opening Balance"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Balance Box */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Current Liquid Balance
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                    {formatINR(bankAccount.currentBalance)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Includes UPI, Card & Direct wires
                  </div>
                </div>

                <div className="sm:border-l sm:border-slate-200 sm:pl-4 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      Opening Balance
                    </div>
                    <div className="text-lg font-bold font-mono text-slate-700 mt-1 flex items-center gap-1.5">
                      <span>{formatINR(bankAccount.openingBalance)}</span>
                      <button
                        onClick={() => setEditingAccount(bankAccount)}
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 font-sans font-normal"
                        title="Click to adjust opening balance"
                      >
                        [Adjust]
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {bankAccount.transactionCount} transactions posted
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Channel Breakdown Dropdown / Accordion */}
            <div className="p-5 md:p-6 flex-1 space-y-4">
              <button
                type="button"
                onClick={() => setBankDropdownOpen(!bankDropdownOpen)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/90 transition text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900 flex items-center gap-2">
                      <span>Digital Channels Breakdown (UPI, Card & Wires)</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-200/60 text-blue-800">
                        {bankBreakdown.length} Channels
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Aggregated breakdown of all incoming and outgoing funds routed to this bank account
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-600">
                  <span className="text-xs font-semibold hidden sm:inline">
                    {bankDropdownOpen ? "Hide Breakdown" : "View Breakdown"}
                  </span>
                  {bankDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              {bankDropdownOpen && (
                <div className="space-y-3 pt-1">
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 overflow-hidden bg-white">
                    {bankBreakdown.map((item) => {
                      const isUPI = item.channel === "UPI"
                      const isCard = item.channel === "CARD"
                      const isWire = item.channel === "BANK_TRANSFER"

                      return (
                        <div
                          key={item.channel}
                          className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isUPI
                                  ? "bg-violet-100 text-violet-700"
                                  : isCard
                                  ? "bg-amber-100 text-amber-700"
                                  : isWire
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isUPI ? (
                                <QrCode className="w-4 h-4" />
                              ) : isCard ? (
                                <CreditCard className="w-4 h-4" />
                              ) : isWire ? (
                                <SendHorizontal className="w-4 h-4" />
                              ) : (
                                <Landmark className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {item.label}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                                <span>{item.count} txns</span>
                                {item.inflow > 0 && (
                                  <span className="text-emerald-600">
                                    +{formatINR(item.inflow)}
                                  </span>
                                )}
                                {item.outflow > 0 && (
                                  <span className="text-rose-600">
                                    -{formatINR(item.outflow)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold font-mono text-slate-900">
                              {formatINR(item.net)}
                            </div>
                            <span
                              className={`inline-block text-[10px] font-medium px-1.5 py-0.2 rounded font-sans ${
                                item.net > 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.net < 0
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-slate-50 text-slate-600"
                              }`}
                            >
                              Net Share
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50/60 border border-blue-100 text-xs">
                    <span className="font-semibold text-blue-900">
                      Reconciled Bank Total
                    </span>
                    <span className="font-mono font-bold text-blue-950">
                      {formatINR(bankAccount.currentBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
              <button
                onClick={() => setEditingAccount(bankAccount)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Details & Opening
              </button>

              <Link
                href="/dashboard/master-finance/cash-bank/bank-book"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>View Bank Book</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No Bank Account Found</div>
            <p className="text-xs text-slate-400">
              Consolidate accounts to create the canonical Hospital Bank Account.
            </p>
            <button
              onClick={handleConsolidate}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Consolidate Now
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            ACCOUNT 2: HOSPITAL CASH ACCOUNT (CONSOLIDATED)
           ═══════════════════════════════════════════════ */}
        {cashAccount ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            {/* Card Header */}
            <div className="p-5 md:p-6 bg-gradient-to-b from-emerald-50/50 to-white border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base md:text-lg font-bold text-slate-900">
                        {cashAccount.name}
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Consolidated Cash Counter
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                      <span>Front Desk Cash Counters & Main Safe</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditingAccount(cashAccount)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition"
                  title="Edit Account Details & Opening Balance"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Balance Box */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Current Liquid Cash
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                    {formatINR(cashAccount.currentBalance)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Physical cash in custody across counters
                  </div>
                </div>

                <div className="sm:border-l sm:border-slate-200 sm:pl-4 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      Opening Balance
                    </div>
                    <div className="text-lg font-bold font-mono text-slate-700 mt-1 flex items-center gap-1.5">
                      <span>{formatINR(cashAccount.openingBalance)}</span>
                      <button
                        onClick={() => setEditingAccount(cashAccount)}
                        className="text-xs text-emerald-600 hover:underline inline-flex items-center gap-0.5 font-sans font-normal"
                        title="Click to adjust opening balance"
                      >
                        [Adjust]
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {cashAccount.transactionCount} transactions posted
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Cash Breakdown Dropdown / Accordion */}
            <div className="p-5 md:p-6 flex-1 space-y-4">
              <button
                type="button"
                onClick={() => setCashDropdownOpen(!cashDropdownOpen)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/90 transition text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    💵
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 flex items-center gap-2">
                      <span>Cash Inflow & Outflow Breakdown</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-200/60 text-emerald-800">
                        {cashBreakdown.length} Streams
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Breakdown of counter receipts, credit clearances, and cash vouchers
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-emerald-600">
                  <span className="text-xs font-semibold hidden sm:inline">
                    {cashDropdownOpen ? "Hide Breakdown" : "View Breakdown"}
                  </span>
                  {cashDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              {cashDropdownOpen && (
                <div className="space-y-3 pt-1">
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 overflow-hidden bg-white">
                    {cashBreakdown.map((item) => (
                      <div
                        key={item.channel}
                        className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {item.label}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span>{item.count} txns</span>
                              {item.inflow > 0 && (
                                <span className="text-emerald-600">
                                  +{formatINR(item.inflow)}
                                </span>
                              )}
                              {item.outflow > 0 && (
                                <span className="text-rose-600">
                                  -{formatINR(item.outflow)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold font-mono text-slate-900">
                            {formatINR(item.net)}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-medium px-1.5 py-0.2 rounded font-sans ${
                              item.net > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : item.net < 0
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            Net Share
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs">
                    <span className="font-semibold text-emerald-900">
                      Reconciled Cash Total
                    </span>
                    <span className="font-mono font-bold text-emerald-950">
                      {formatINR(cashAccount.currentBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
              <button
                onClick={() => setEditingAccount(cashAccount)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Details & Opening
              </button>

              <Link
                href="/dashboard/master-finance/cash-bank/cash-book"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                <span>View Cash Book</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No Cash Account Found</div>
            <p className="text-xs text-slate-400">
              Consolidate accounts to create the canonical Hospital Cash Account.
            </p>
            <button
              onClick={handleConsolidate}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Consolidate Now
            </button>
          </div>
        )}
      </div>

      {/* ── RECENT TREASURY ACTIVITY LOG ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Recent Account Postings & Transactions
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Last {dashboard?.recentTransactions.length || 0} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Date / Time</th>
                <th className="py-2.5 px-4">Account</th>
                <th className="py-2.5 px-4">Channel / Method</th>
                <th className="py-2.5 px-4">Category / Note</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {(dashboard?.recentTransactions || []).slice(0, 10).map((t) => {
                const isIncome = t.type === "INCOME" || t.type === "RECEIPT" || t.type === "IN"
                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {new Date(t.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {t.accountName}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          t.paymentMethod === "UPI"
                            ? "bg-violet-50 text-violet-700 border border-violet-200"
                            : t.paymentMethod === "CARD"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : t.paymentMethod === "CASH"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                      {t.description || t.category || "Hospital Bill Posting"}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold ${
                        isIncome ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatINR(t.amount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EDIT ACCOUNT & OPENING BALANCE MODAL ── */}
      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={async () => {
            setEditingAccount(null)
            await loadData()
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// EDIT ACCOUNT & OPENING BALANCE MODAL
// ════════════════════════════════════════════════════════
function EditAccountModal({
  account,
  onClose,
  onSaved,
}: {
  account: AccountDetail
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(account.name)
  const [bankName, setBankName] = useState(account.bankName || "")
  const [accountNumber, setAccountNumber] = useState(account.accountNumber || "")
  const [ifscCode, setIfscCode] = useState(account.ifscCode || "")
  const [description, setDescription] = useState(account.description || "")
  const [openingBalance, setOpeningBalance] = useState(String(account.openingBalance ?? 0))
  const [saving, setSaving] = useState(false)

  // Live calculation of new current balance
  const parsedNewOpening = parseFloat(openingBalance) || 0
  const openingDelta = parsedNewOpening - account.openingBalance
  const previewCurrentBalance = account.currentBalance + openingDelta

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const result = await updateAccount(account.id, {
        name,
        bankName,
        accountNumber,
        ifscCode,
        description,
        openingBalance: parsedNewOpening,
      })

      if (result.success) {
        toast.success(`Account "${name}" and Opening Balance updated successfully!`)
        await onSaved()
      } else {
        toast.error(result.message || "Failed to update account")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while saving"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 md:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                {account.type === "BANK" ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
              </div>
              <h2 className="text-base font-bold">
                Edit {account.name} & Opening Balance
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Update canonical details, depository metadata, and configure opening balance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Opening Balance Field with Live Calculation Banner */}
            <div className="md:col-span-2 p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Opening Balance (₹)
                </label>
                <span className="text-[11px] font-mono text-blue-700">
                  Fiscal Start Float
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-base font-mono font-bold rounded-lg border border-blue-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Dynamic Balance Adjustment Calculation */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-200/60 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500">Current Opening</div>
                  <div className="font-mono font-semibold text-slate-700 mt-0.5">
                    {formatINR(account.openingBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Opening Delta</div>
                  <div
                    className={`font-mono font-bold mt-0.5 ${
                      openingDelta > 0
                        ? "text-emerald-600"
                        : openingDelta < 0
                        ? "text-rose-600"
                        : "text-slate-600"
                    }`}
                  >
                    {openingDelta > 0 ? "+" : ""}
                    {formatINR(openingDelta)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-900 font-semibold">
                    New Current Balance
                  </div>
                  <div className="font-mono font-extrabold text-blue-950 mt-0.5">
                    {formatINR(previewCurrentBalance)}
                  </div>
                </div>
              </div>
            </div>

            {account.type === "BANK" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India, HDFC"
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 987654321012"
                    className="w-full text-sm font-mono rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                    className="w-full text-sm font-mono uppercase rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            <div className={account.type === "BANK" ? "" : "md:col-span-2"}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Memo
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Institutional remarks"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Updating Account..." : "Save Account & Balance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
