"use client"

import { useState, useEffect } from "react"
import { getBalanceSheet } from "@/app/actions/master-finance-remaining"
import {
  PieChart,
  Filter,
  IndianRupee,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  Scale,
  RefreshCw,
} from "lucide-react"

interface BSItem {
  code: string
  name: string
  amount: number
  category?: string
  subItems?: Array<{ name: string; amount: number; type?: string }>
}

interface BSData {
  assets: BSItem[]
  liabilities: BSItem[]
  equity: BSItem[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  netProfitLoss?: number
  totalRevenue?: number
  totalExpenses?: number
  isBalanced?: boolean
  asOf: string
}

function formatDate(d: string) {
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

export function BalanceSheetClient() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const defaultToday = `${year}-${month}-${day}`

  const [asOf, setAsOf] = useState(defaultToday)
  const [scope, setScope] = useState<"ALL" | "HOSPITAL" | "PHARMACY">("ALL")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BSData | null>(null)
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({
    "1100": true,
    "3200": true,
  })

  async function fetchData() {
    setLoading(true)
    try {
      const res = await getBalanceSheet({ asOf, scope: scope === "ALL" ? undefined : scope })
      setData(res)
    } catch (e) {
      console.error("[BalanceSheet] fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [asOf, scope])

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  const handleExportCSV = () => {
    if (!data) return
    const rows = [
      ["BALANCE SHEET STATEMENT OF FINANCIAL POSITION"],
      [`As of: ${formatDate(data.asOf)}`, `Scope: ${scope}`],
      [],
      ["ASSETS (APPLICATION OF FUNDS)", "CODE", "AMOUNT (INR)"],
      ...data.assets.map((a) => [a.name, a.code, a.amount.toFixed(2)]),
      ["TOTAL ASSETS", "", data.totalAssets.toFixed(2)],
      [],
      ["LIABILITIES & EQUITY (SOURCES OF FUNDS)", "CODE", "AMOUNT (INR)"],
      ...data.liabilities.map((l) => [l.name, l.code, l.amount.toFixed(2)]),
      ["TOTAL LIABILITIES", "", data.totalLiabilities.toFixed(2)],
      ...data.equity.map((e) => [e.name, e.code, e.amount.toFixed(2)]),
      ["TOTAL EQUITY", "", data.totalEquity.toFixed(2)],
      ["TOTAL LIABILITIES & EQUITY", "", (data.totalLiabilities + data.totalEquity).toFixed(2)],
    ]
    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.map((x) => `"${x}"`).join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Balance_Sheet_${asOf}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalLiabEquity = data ? data.totalLiabilities + data.totalEquity : 0
  const isBalanced = data ? Math.abs(data.totalAssets - totalLiabEquity) < 0.05 : false
  const currentRatio =
    data && data.totalLiabilities > 0
      ? (data.totalAssets / data.totalLiabilities).toFixed(2)
      : "N/A"

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Executive Financial Header */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.03)] p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-slate-700">
              <Scale className="w-3 h-3 text-slate-800" />
              Statutory Financial Reporting &bull; Balance Sheet
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Balance Sheet
            </h1>
            <p className="text-xs md:text-sm text-slate-500 max-w-2xl">
              Audited statement of financial position as on{" "}
              <span className="font-semibold text-slate-800 font-mono">{formatDate(asOf)}</span>. Reconciles asset capitalization, trade debt, patient dues, and retained reserves.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!data}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Statement As of Date</label>
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            {/* Scope Tabs */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Entity Scope</label>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => setScope("ALL")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    scope === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Consolidated
                </button>
                <button
                  type="button"
                  onClick={() => setScope("HOSPITAL")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    scope === "HOSPITAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hospital Core
                </button>
                <button
                  type="button"
                  onClick={() => setScope("PHARMACY")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    scope === "PHARMACY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pharmacy Book
                </button>
              </div>
            </div>
          </div>

          {/* Balanced Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
                isBalanced
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {isBalanced ? "Equation Balanced: Assets = Liab + Equity" : "Reviewing Allocations"}
            </span>
          </div>
        </div>

        {/* High-Impact KPI Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Total Assets</p>
              <p className="text-xl md:text-2xl font-bold font-mono text-slate-900 mt-1">
                ₹{data.totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{data.assets.length} active schedules</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Total Liabilities</p>
              <p className="text-xl md:text-2xl font-bold font-mono text-slate-900 mt-1">
                ₹{data.totalLiabilities.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{data.liabilities.length} active schedules</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">Owner's Equity & Reserves</p>
              <p className="text-xl md:text-2xl font-bold font-mono text-emerald-900 mt-1">
                ₹{data.totalEquity.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Capital & Accumulated Surplus</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Current Ratio</p>
              <p className="text-xl md:text-2xl font-bold font-mono text-slate-900 mt-1">
                {currentRatio}x
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Solvency Coverage</p>
            </div>
          </div>
        )}
      </div>

      {/* Dual Statement Schedules */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: ASSETS (Application of Funds) */}
          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-4 md:p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold tracking-tight">ASSETS</h3>
                <p className="text-[10px] font-mono text-slate-300">Schedule I &bull; Application of Funds</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-white">
                  ₹{data.totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] text-slate-300">100% of Asset Base</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {data.assets.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No asset accounts recorded.</div>
              ) : (
                data.assets.map((item) => {
                  const hasSubItems = item.subItems && item.subItems.length > 0
                  const isExpanded = Boolean(expandedCodes[item.code])
                  const pct = data.totalAssets > 0 ? (item.amount / data.totalAssets) * 100 : 0

                  return (
                    <div key={item.code} className="transition-colors hover:bg-slate-50/40">
                      <div
                        onClick={() => hasSubItems && toggleExpand(item.code)}
                        className={`p-4 flex items-center justify-between gap-4 ${
                          hasSubItems ? "cursor-pointer select-none" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {hasSubItems ? (
                            <span className="p-1 rounded-md bg-slate-100 text-slate-600">
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </span>
                          ) : (
                            <span className="w-5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {item.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-mono font-bold text-xs text-slate-900">
                            ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">{pct.toFixed(1)}%</p>
                        </div>
                      </div>

                      {/* Sub-Items Accordion */}
                      {hasSubItems && isExpanded && (
                        <div className="bg-slate-50/70 border-t border-b border-slate-100 px-6 py-2.5 space-y-1.5">
                          {item.subItems!.map((sub, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between text-[11px] text-slate-600 py-1"
                            >
                              <span className="font-medium truncate mr-3">{sub.name}</span>
                              <span className="font-mono font-semibold text-slate-800 whitespace-nowrap">
                                ₹{sub.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200/90 flex justify-between items-center text-xs font-bold font-mono text-slate-900">
              <span>TOTAL ASSETS</span>
              <span>₹{data.totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* RIGHT: LIABILITIES & EQUITY (Sources of Funds) */}
          <div className="space-y-6">
            {/* Liabilities */}
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.03)] overflow-hidden">
              <div className="p-4 md:p-5 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">LIABILITIES</h3>
                  <p className="text-[10px] font-mono text-slate-300">Schedule II &bull; External Liabilities</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-white">
                    ₹{data.totalLiabilities.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {data.liabilities.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No outstanding liabilities.</div>
                ) : (
                  data.liabilities.map((item) => (
                    <div key={item.code} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{item.code}</span>
                          <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-xs text-slate-900">
                          ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3.5 bg-slate-50 border-t border-slate-200/90 flex justify-between items-center text-xs font-bold font-mono text-slate-900">
                <span>TOTAL LIABILITIES</span>
                <span>₹{data.totalLiabilities.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Equity */}
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.03)] overflow-hidden">
              <div className="p-4 md:p-5 bg-emerald-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">EQUITY & RESERVES</h3>
                  <p className="text-[10px] font-mono text-emerald-200">Schedule III &bull; Capital & Retained Earnings</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-white">
                    ₹{data.totalEquity.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {data.equity.map((item) => {
                  const hasSubItems = item.subItems && item.subItems.length > 0
                  const isExpanded = Boolean(expandedCodes[item.code])

                  return (
                    <div key={item.code} className="transition-colors hover:bg-slate-50/40">
                      <div
                        onClick={() => hasSubItems && toggleExpand(item.code)}
                        className={`p-4 flex items-center justify-between gap-4 ${
                          hasSubItems ? "cursor-pointer select-none" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {hasSubItems ? (
                            <span className="p-1 rounded-md bg-emerald-50 text-emerald-800">
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </span>
                          ) : (
                            <span className="w-5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">{item.code}</span>
                              <span className="text-xs font-semibold text-slate-800 truncate">{item.name}</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{item.category}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-mono font-bold text-xs text-emerald-900">
                            ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {hasSubItems && isExpanded && (
                        <div className="bg-emerald-50/40 border-t border-b border-emerald-100 px-6 py-2.5 space-y-1.5">
                          {item.subItems!.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between text-[11px] text-slate-600 py-1">
                              <span className="font-medium truncate mr-3">{sub.name}</span>
                              <span
                                className={`font-mono font-semibold whitespace-nowrap ${
                                  sub.amount < 0 ? "text-red-600" : "text-emerald-900"
                                }`}
                              >
                                ₹{sub.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="p-3.5 bg-slate-50 border-t border-slate-200/90 flex justify-between items-center text-xs font-bold font-mono text-slate-900">
                <span>TOTAL EQUITY</span>
                <span>₹{data.totalEquity.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Reconciliation Verification Bar */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                isBalanced
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-amber-50/80 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">
                  Liabilities (₹{data.totalLiabilities.toLocaleString("en-IN")}) + Equity (₹{data.totalEquity.toLocaleString("en-IN")}) = ₹{totalLiabEquity.toLocaleString("en-IN")}
                </span>
              </div>
              <span className="text-xs font-mono font-bold">
                {isBalanced ? "Balanced" : `Variance: ₹${Math.abs(data.totalAssets - totalLiabEquity).toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
