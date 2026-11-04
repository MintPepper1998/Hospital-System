"use client"

import { useState, useEffect } from "react"
import { getDepartmentPnl } from "@/app/actions/master-finance-budgeting"
import { TrendingUp, Calendar, Download, Building2 } from "lucide-react"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"

export function DeptPnlClient() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd")
  })

  async function fetchData() {
    setLoading(true)
    const result = await getDepartmentPnl(dateRange)
    setData(result)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [dateRange])

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalDirectCosts = data.reduce((sum, d) => sum + d.directCosts, 0)
  const totalAllocated = data.reduce((sum, d) => sum + d.allocatedCosts, 0)
  const totalNet = data.reduce((sum, d) => sum + d.netProfit, 0)

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Department P&L
          </h1>
          <p className="text-sm text-slate-500 mt-1">Revenue vs Costs per cost center</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <input 
            type="date" 
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({...prev, from: e.target.value}))}
            className="text-sm border-none outline-none text-slate-700 bg-transparent"
          />
          <span className="text-slate-400">to</span>
          <input 
            type="date" 
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({...prev, to: e.target.value}))}
            className="text-sm border-none outline-none text-slate-700 bg-transparent mr-2"
          />
          <button className="bg-slate-100 p-2 rounded hover:bg-slate-200 text-slate-600">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">Total Revenue</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">₹{totalRevenue.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">Direct Costs</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">₹{totalDirectCosts.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">Allocated Costs</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">₹{totalAllocated.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-xl border border-blue-500 shadow-md text-white">
          <div className="text-sm text-blue-100 font-medium">Net Dept Profit</div>
          <div className="text-2xl font-bold mt-1">₹{totalNet.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Cost Center</th>
              <th className="px-6 py-4 font-medium text-right">Revenue (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Direct Costs (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Allocated Costs (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Net Profit (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading P&L...</td></tr>
            ) : data.map((d, i) => {
              const margin = d.revenue > 0 ? (d.netProfit / d.revenue) * 100 : 0
              return (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {d.costCenter.name}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-medium">{d.revenue.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 text-right text-rose-600">{d.directCosts.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 text-right text-amber-600">{d.allocatedCosts.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800">{d.netProfit.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      margin > 20 ? 'bg-emerald-100 text-emerald-800' :
                      margin > 0 ? 'bg-blue-100 text-blue-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
