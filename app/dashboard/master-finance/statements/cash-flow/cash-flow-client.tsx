"use client"

import { useState, useEffect } from "react"
import { getCashFlowStatement } from "@/app/actions/master-finance-remaining"
import { ArrowLeftRight, Filter, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight } from "lucide-react"

interface CashFlowSection {
  inflows: number; outflows: number; net: number
  items: Array<{ name: string; amount: number }>
}

interface CashFlowData {
  operating: CashFlowSection; investing: CashFlowSection; financing: CashFlowSection
  netCashFlow: number
}

export function CashFlowClient() {
  const now = new Date()
  const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1)
  const [from, setFrom] = useState(fyStart.toISOString().split("T")[0])
  const [to, setTo] = useState(now.toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CashFlowData | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["operating"]))

  async function fetchData() {
    setLoading(true)
    try {
      const res = await getCashFlowStatement({ from, to })
      setData(res)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const toggle = (key: string) => {
    const next = new Set(expanded)
    next.has(key) ? next.delete(key) : next.add(key)
    setExpanded(next)
  }

  const sections = data ? [
    { key: "operating", label: "Operating Activities", section: data.operating, color: "blue" },
    { key: "investing", label: "Investing Activities", section: data.investing, color: "purple" },
    { key: "financing", label: "Financing Activities", section: data.financing, color: "indigo" },
  ] : []

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-blue-600" />
          Cash Flow Statement
        </h1>
        <p className="text-sm text-slate-500 mt-1">Sources and uses of cash</p>
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
            <Filter className="w-4 h-4" /> Generate
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Net Cash Flow */}
          <div className={`rounded-xl border p-5 shadow-sm ${data.netCashFlow >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
              {data.netCashFlow >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
              NET CASH FLOW
            </div>
            <div className={`text-3xl font-bold ${data.netCashFlow >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {data.netCashFlow >= 0 ? "+" : "-"}₹{Math.abs(data.netCashFlow).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Section Cards */}
          <div className="grid grid-cols-3 gap-4">
            {sections.map(({ key, label, section, color }) => (
              <div key={key} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="text-xs text-slate-500 font-medium mb-1">{label.toUpperCase()}</div>
                <div className={`text-2xl font-bold ${section.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {section.net >= 0 ? "+" : "-"}₹{Math.abs(section.net).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
                <div className="flex gap-3 mt-1 text-[10px]">
                  <span className="text-emerald-500">In: ₹{section.inflows.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  <span className="text-red-500">Out: ₹{section.outflows.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Sections */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {sections.map(({ key, label, section }) => (
              <div key={key} className="border-b border-slate-100 last:border-b-0">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => toggle(key)}>
                  <div className="flex items-center gap-2">
                    {expanded.has(key) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                  </div>
                  <span className={`text-sm font-bold ${section.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {section.net >= 0 ? "+" : "-"}₹{Math.abs(section.net).toLocaleString("en-IN")}
                  </span>
                </div>
                {expanded.has(key) && section.items.length > 0 && (
                  <div className="px-8 py-2 border-t border-slate-100 bg-slate-50/50">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-xs text-slate-600">{item.name}</span>
                        <span className={`text-xs font-medium ${item.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {item.amount >= 0 ? "+" : "-"}₹{Math.abs(item.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Grand Total */}
            <div className={`flex items-center justify-between px-5 py-4 border-t-2 ${data.netCashFlow >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
              <span className={`text-base font-bold ${data.netCashFlow >= 0 ? "text-emerald-800" : "text-red-800"}`}>Net Cash Flow</span>
              <span className={`text-base font-bold ${data.netCashFlow >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                {data.netCashFlow >= 0 ? "+" : "-"}₹{Math.abs(data.netCashFlow).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
