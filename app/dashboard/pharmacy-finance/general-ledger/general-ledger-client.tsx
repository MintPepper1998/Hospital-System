"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getPharmacyGeneralLedger } from "@/app/actions/pharmacy-fin/ledger"
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  Calendar,
  ShieldCheck,
} from "lucide-react"

interface LedgerTransaction {
  id: string
  date: Date | string
  type: string
  amount: number
  category: string
  paymentMethod: string
  description: string | null
  accountGroupCode: string | null
  scope: string
  account: { id: string; name: string; type: string; bankName: string | null }
}

interface FinancialAccountInfo {
  id: string
  name: string
  bankName?: string | null
  type: string
}

interface VoucherEntryRow {
  id: string
  accountGroupCode: string
  debitAmount: number
  creditAmount: number
  narration: string | null
  financialAccount?: FinancialAccountInfo | null
  voucher: {
    id: string
    voucherNumber: string
    date: Date | string
    voucherType: string
    narration: string | null
    totalAmount: number
  }
}

interface LegacyPharmacyVoucherRow {
  id: string
  voucherNumber: string
  type: string
  date: Date | string
  amount: number
  particulars: string
  notes?: string | null
  partyName?: string | null
  account?: { id: string; name: string; type: string } | null
  contraAccount?: { id: string; name: string; type: string } | null
}

function formatDate(d: string | Date) {
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return String(d)
  }
}

export function PharmacyGeneralLedgerClient() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = String(now.getDate()).padStart(2, "0")
  const defaultToday = `${year}-${String(month + 1).padStart(2, "0")}-${day}`
  const defaultFirstOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`

  // Indian Financial Year: Starts 1st April
  const fyStartYear = month < 3 ? year - 1 : year
  const defaultFyStart = `${fyStartYear}-04-01`
  const fyLabel = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`

  const [from, setFrom] = useState(defaultFyStart)
  const [to, setTo] = useState(defaultToday)
  const [accountFilter, setAccountFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([])
  const [voucherEntries, setVoucherEntries] = useState<VoucherEntryRow[]>([])
  const [legacyVouchers, setLegacyVouchers] = useState<LegacyPharmacyVoucherRow[]>([])
  const [groupMap, setGroupMap] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPharmacyGeneralLedger({
        from,
        to,
        accountGroupCode: accountFilter || undefined,
      })
      setTransactions(result.transactions || [])
      setVoucherEntries(result.voucherEntries || [])
      setLegacyVouchers(result.legacyVouchers || [])
      setGroupMap(result.groupMap || {})
    } catch (e) {
      console.error("[PharmacyGeneralLedger] fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [from, to, accountFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Quick Preset Handlers
  const handlePreset = (type: "today" | "thisMonth" | "lastMonth" | "ytd") => {
    const cur = new Date()
    const cYear = cur.getFullYear()
    const cMonth = cur.getMonth()
    const cDay = String(cur.getDate()).padStart(2, "0")

    if (type === "today") {
      const t = `${cYear}-${String(cMonth + 1).padStart(2, "0")}-${cDay}`
      setFrom(t)
      setTo(t)
    } else if (type === "thisMonth") {
      setFrom(`${cYear}-${String(cMonth + 1).padStart(2, "0")}-01`)
      setTo(`${cYear}-${String(cMonth + 1).padStart(2, "0")}-${cDay}`)
    } else if (type === "lastMonth") {
      const prevM = cMonth === 0 ? 11 : cMonth - 1
      const prevY = cMonth === 0 ? cYear - 1 : cYear
      const lastDayPrevM = new Date(prevY, prevM + 1, 0).getDate()
      setFrom(`${prevY}-${String(prevM + 1).padStart(2, "0")}-01`)
      setTo(`${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(lastDayPrevM).padStart(2, "0")}`)
    } else if (type === "ytd") {
      const fyStart = cur.getMonth() < 3 ? cYear - 1 : cYear
      setFrom(`${fyStart}-04-01`)
      setTo(`${cYear}-${String(cMonth + 1).padStart(2, "0")}-${cDay}`)
    }
  }

  // Unified Double-Entry Structure
  type UnifiedEntry = {
    key: string
    date: string
    refNo: string
    debitAccount: string
    creditAccount: string
    amount: number
    narration: string
    source: "TXN" | "VOUCHER" | "LEGACY_VOUCHER"
    typeLabel: string
  }

  const unified: UnifiedEntry[] = useMemo(() => {
    const list: UnifiedEntry[] = []

    // 1. Pharmacy Standard Transactions (Sales, refunds, supplier payments, expenses)
    for (const tx of transactions) {
      const acctName = tx.accountGroupCode
        ? groupMap[tx.accountGroupCode] || tx.accountGroupCode
        : tx.category

      list.push({
        key: `txn-${tx.id}`,
        date: String(tx.date),
        refNo: tx.id.slice(-6).toUpperCase(),
        debitAccount: tx.type === "EXPENSE" ? acctName : tx.account.name,
        creditAccount: tx.type === "INCOME" ? acctName : tx.account.name,
        amount: tx.amount,
        narration: tx.description || `${tx.type} — ${tx.category}`,
        source: "TXN",
        typeLabel: tx.type === "INCOME" ? "Receipt" : "Payment",
      })
    }

    // 2. Pharmacy Double-Entry Vouchers (PH- prefix)
    const vouchersById = new Map<string, VoucherEntryRow[]>()
    for (const ve of voucherEntries) {
      const vId = ve.voucher.id
      if (!vouchersById.has(vId)) vouchersById.set(vId, [])
      vouchersById.get(vId)?.push(ve)
    }

    for (const [vId, entries] of vouchersById.entries()) {
      const v = entries[0].voucher
      const debits = entries.filter((e) => e.debitAmount > 0)
      const credits = entries.filter((e) => e.creditAmount > 0)

      if (debits.length === 1 && credits.length === 1) {
        const d = debits[0]
        const c = credits[0]

        let dName = ""
        let cName = ""

        if (v.voucherType === "RECEIPT") {
          dName = d.financialAccount?.name || (groupMap[d.accountGroupCode] ? `${d.accountGroupCode} — ${groupMap[d.accountGroupCode]}` : d.accountGroupCode)
          cName = (c.accountGroupCode && groupMap[c.accountGroupCode])
            ? `${c.accountGroupCode} — ${groupMap[c.accountGroupCode]}`
            : c.financialAccount?.name || c.accountGroupCode
        } else if (v.voucherType === "PAYMENT") {
          dName = (d.accountGroupCode && groupMap[d.accountGroupCode])
            ? `${d.accountGroupCode} — ${groupMap[d.accountGroupCode]}`
            : d.financialAccount?.name || d.accountGroupCode
          cName = c.financialAccount?.name || (groupMap[c.accountGroupCode] ? `${c.accountGroupCode} — ${groupMap[c.accountGroupCode]}` : c.accountGroupCode)
        } else {
          dName = d.financialAccount?.name || (groupMap[d.accountGroupCode] ? `${d.accountGroupCode} — ${groupMap[d.accountGroupCode]}` : d.accountGroupCode)
          cName = c.financialAccount?.name || (groupMap[c.accountGroupCode] ? `${c.accountGroupCode} — ${groupMap[c.accountGroupCode]}` : c.accountGroupCode)
        }

        list.push({
          key: `v-${vId}`,
          date: String(v.date),
          refNo: v.voucherNumber,
          debitAccount: dName,
          creditAccount: cName,
          amount: v.totalAmount,
          narration: v.narration || d.narration || c.narration || `${v.voucherType} Voucher`,
          source: "VOUCHER",
          typeLabel: v.voucherType,
        })
      } else {
        for (const ve of entries) {
          const isDebit = ve.debitAmount > 0
          const acctName = (ve.accountGroupCode && groupMap[ve.accountGroupCode])
            ? `${ve.accountGroupCode} — ${groupMap[ve.accountGroupCode]}`
            : ve.financialAccount?.name || ve.accountGroupCode

          list.push({
            key: `ve-${ve.id}`,
            date: String(v.date),
            refNo: v.voucherNumber,
            debitAccount: isDebit ? (ve.financialAccount?.name || acctName) : "—",
            creditAccount: !isDebit ? acctName : "—",
            amount: isDebit ? ve.debitAmount : ve.creditAmount,
            narration: ve.narration || v.narration || `${v.voucherType} Entry`,
            source: "VOUCHER",
            typeLabel: `${v.voucherType} (${isDebit ? "Dr" : "Cr"})`,
          })
        }
      }
    }

    // 3. Historical Pharmacy Vouchers
    for (const pv of legacyVouchers) {
      let debit = "—"
      let credit = "—"

      if (pv.type === "RECEIPT") {
        debit = pv.account?.name || "Pharmacy Account"
        credit = pv.partyName || pv.particulars || "Customer / Payer"
      } else if (pv.type === "PAYMENT") {
        debit = pv.particulars || pv.partyName || "Expense / Vendor"
        credit = pv.account?.name || "Pharmacy Account"
      } else if (pv.type === "CONTRA") {
        debit = pv.contraAccount?.name || "Destination Account"
        credit = pv.account?.name || "Source Account"
      } else {
        debit = pv.particulars || "Ledger Dr"
        credit = pv.partyName || pv.account?.name || "Ledger Cr"
      }

      list.push({
        key: `leg-${pv.id}`,
        date: String(pv.date),
        refNo: pv.voucherNumber,
        debitAccount: debit,
        creditAccount: credit,
        amount: pv.amount,
        narration: pv.particulars + (pv.notes ? ` • ${pv.notes}` : ""),
        source: "LEGACY_VOUCHER",
        typeLabel: `PV ${pv.type}`,
      })
    }

    // Sort chronologically ascending
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return list
  }, [transactions, voucherEntries, legacyVouchers, groupMap])

  // Filtered by Search Term
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return unified
    const q = searchQuery.toLowerCase()
    return unified.filter(
      (u) =>
        u.refNo.toLowerCase().includes(q) ||
        u.debitAccount.toLowerCase().includes(q) ||
        u.creditAccount.toLowerCase().includes(q) ||
        u.narration.toLowerCase().includes(q)
    )
  }, [unified, searchQuery])

  // Financial Metrics
  const totalVolume = filteredList.reduce((s, u) => s + u.amount, 0)
  const voucherCount = filteredList.filter(
    (u) => u.source === "VOUCHER" || u.source === "LEGACY_VOUCHER"
  ).length
  const autoTxnCount = filteredList.filter((u) => u.source === "TXN").length

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Date", "Ref No", "Debit Account", "Credit Account", "Narration", "Amount", "Type", "Scope"]
    const rows = filteredList.map((u) => [
      `"${formatDate(u.date)}"`,
      `"${u.refNo}"`,
      `"${u.debitAccount}"`,
      `"${u.creditAccount}"`,
      `"${u.narration.replace(/"/g, '""')}"`,
      u.amount.toFixed(2),
      `"${u.typeLabel}"`,
      `"PHARMACY"`,
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Pharmacy_General_Ledger_${from}_to_${to}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const accountCodes = Object.entries(groupMap).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Editorial Financial Header */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.03)] p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Pharmacy Books &bull; Isolated Double-Entry Audit Trail
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Pharmacy General Ledger
            </h1>
            <p className="text-xs md:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Chronological ledger tracking pharmacy sales, customer returns, supplier purchases, expense vouchers, and pharmacy drawer disbursements.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Total Turn Volume</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-slate-900 mt-1">
              ₹{totalVolume.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{filteredList.length} verified lines</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Pharmacy Vouchers
            </p>
            <p className="text-xl md:text-2xl font-bold font-mono text-emerald-900 mt-1">
              {voucherCount}
            </p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">JV &bull; RV &bull; PV &bull; Contra</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-600 font-semibold">Auto Sales & Returns</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-slate-900 mt-1">
              {autoTxnCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">POS & Purchase Feeds</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Selected Period</p>
            <p className="text-sm font-bold font-mono text-slate-800 mt-1 truncate">
              {formatDate(from)} &rarr; {formatDate(to)}
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Scope: Pharmacy (Strict)</p>
          </div>
        </div>

        {/* Filter Console */}
        <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Presets:
              </span>
              <button
                type="button"
                onClick={() => handlePreset("today")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  from === defaultToday && to === defaultToday
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePreset("thisMonth")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  from === defaultFirstOfMonth && to === defaultToday && defaultFirstOfMonth !== defaultToday
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset("lastMonth")}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset("ytd")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  from === defaultFyStart && to === defaultToday
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                FY {fyLabel}
              </button>
            </div>

            {/* Scope Indicator Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Pharmacy Scope (Strictly Isolated)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ledger Group Filter</label>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                <option value="">— All Ledger Groups —</option>
                {accountCodes.map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} &bull; {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Search Entries</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. PV-00001, Vendor, Cash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Unified Double-Entry Table */}
        <div className="rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Voucher / Ref</th>
                <th className="py-3 px-4 font-semibold">Debit Account (Dr)</th>
                <th className="py-3 px-4 font-semibold">Credit Account (Cr)</th>
                <th className="py-3 px-4 font-semibold">Narration / Particulars</th>
                <th className="py-3 px-4 font-semibold text-right">Amount (₹)</th>
                <th className="py-3 px-4 font-semibold text-center">Nature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    <p className="text-xs font-mono font-medium">Reconciling Pharmacy General Ledger...</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No Ledger Entries Found</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      No posted vouchers or accounting transactions matched the selected date window ({formatDate(from)} to {formatDate(to)}).
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((entry) => {
                  const isVoucher = entry.source === "VOUCHER" || entry.source === "LEGACY_VOUCHER"
                  return (
                    <tr
                      key={entry.key}
                      className="hover:bg-slate-50/80 transition-colors text-xs font-medium text-slate-700"
                    >
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] ${
                            isVoucher
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {entry.refNo}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {entry.debitAccount}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {entry.creditAccount}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={entry.narration}>
                        {entry.narration}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            entry.source === "VOUCHER"
                              ? "bg-slate-900 text-white"
                              : entry.source === "LEGACY_VOUCHER"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {entry.typeLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {filteredList.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200/90 text-xs font-mono font-bold text-slate-900">
                  <td colSpan={5} className="py-3.5 px-4 uppercase tracking-wider text-slate-600">
                    Grand Total ({filteredList.length} Entries)
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm font-bold text-slate-900">
                    ₹{totalVolume.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
