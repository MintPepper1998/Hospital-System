"use client"

import { useState, useEffect } from "react"
import { getFinancialKPIs } from "@/app/actions/master-finance-analytics"
import { Activity, TrendingUp, Calendar, Download, Zap, TrendingDown, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react"

export function KpisClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const result = await getFinancialKPIs({ from: "", to: "" })
    setData(result)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  if (loading || !data) {
    return <div className="p-12 text-center text-slate-500">Loading KPIs...</div>
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Financial KPIs
          </h1>
          <p className="text-sm text-slate-500 mt-1">Key performance indicators for hospital financial health</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select className="text-sm border-none outline-none text-slate-700 bg-transparent pr-4">
            <option>This Month (Sep 2026)</option>
            <option>Last Month</option>
            <option>This Quarter</option>
            <option>YTD</option>
          </select>
          <button className="bg-slate-100 p-2 rounded hover:bg-slate-200 text-slate-600 ml-2 border-l border-slate-200">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-slate-500 font-medium mb-1">ARPOB</div>
              <div className="text-2xl font-bold text-slate-800">₹{data.arpob.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="flex items-center text-emerald-600 font-medium"><ArrowUpRight className="w-3 h-3 mr-0.5" /> 4.2%</span>
            <span className="text-slate-400">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-slate-500 font-medium mb-1">Operating Margin</div>
              <div className="text-2xl font-bold text-slate-800">{data.operatingMargin}%</div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><Zap className="w-5 h-5 text-blue-600" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="flex items-center text-emerald-600 font-medium"><ArrowUpRight className="w-3 h-3 mr-0.5" /> 1.5%</span>
            <span className="text-slate-400">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-slate-500 font-medium mb-1">EBITDA</div>
              <div className="text-2xl font-bold text-slate-800">₹{(data.ebitda / 10000000).toFixed(2)} Cr</div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg"><Activity className="w-5 h-5 text-purple-600" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="flex items-center text-emerald-600 font-medium"><ArrowUpRight className="w-3 h-3 mr-0.5" /> 8.4%</span>
            <span className="text-slate-400">vs last year</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-slate-500 font-medium mb-1">Collection Efficiency</div>
              <div className="text-2xl font-bold text-slate-800">{data.collectionEfficiency}%</div>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg"><TrendingDown className="w-5 h-5 text-rose-600" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="flex items-center text-rose-600 font-medium"><ArrowDownRight className="w-3 h-3 mr-0.5" /> -2.1%</span>
            <span className="text-slate-400">vs last month</span>
          </div>
        </div>
      </div>

      {/* Working Capital Metrics */}
      <h2 className="text-lg font-bold text-slate-800 mt-8 mb-4">Working Capital & Liquidity</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Debtor Days (DSO)</div>
            <div className="text-xl font-bold text-slate-800">{data.debtorsDays} Days</div>
            <div className="text-xs text-amber-600 font-medium mt-1">Target: &lt; 40 days</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Creditor Days (DPO)</div>
            <div className="text-xl font-bold text-slate-800">{data.creditorsDays} Days</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Optimal Range</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Working Capital Ratio</div>
            <div className="text-xl font-bold text-slate-800">{data.workingCapitalRatio}</div>
            <div className="text-xs text-blue-600 font-medium mt-1">Target: 1.5 - 2.0</div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 text-sm flex gap-3">
        <Activity className="w-5 h-5 shrink-0" />
        <p><strong>Note on ARPOB:</strong> Average Revenue Per Occupied Bed is calculated based on IPD revenue exclusively. Daycare procedures are excluded from this metric to maintain standard benchmarking.</p>
      </div>
    </div>
  )
}
