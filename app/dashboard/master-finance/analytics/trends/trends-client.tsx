"use client"

import { useState, useEffect } from "react"
import { getTrendAnalysis } from "@/app/actions/master-finance-analytics"
import { LineChart, Calendar, Download } from "lucide-react"

export function TrendsClient() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(2026)

  async function fetchData() {
    setLoading(true)
    const result = await getTrendAnalysis({ year })
    setData(result)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [year])

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LineChart className="w-6 h-6 text-blue-600" />
            Trend Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">Month-over-month revenue and expense tracking</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select 
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="text-sm border-none outline-none text-slate-700 bg-transparent pr-4"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
          <button className="bg-slate-100 p-2 rounded hover:bg-slate-200 text-slate-600 ml-2 border-l border-slate-200">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 overflow-x-auto">
        {loading ? (
          <div className="py-24 text-center text-slate-500">Loading trend data...</div>
        ) : (
          <div className="min-w-[800px]">
            {/* Very basic pseudo-chart using HTML/CSS for demonstration */}
            <div className="flex items-end justify-between h-64 border-b border-slate-200 pb-2 mb-4 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between z-0">
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
              </div>
              
              {data.map((d, i) => {
                const maxVal = 30000000 // 3 Cr
                const revHeight = (d.revenue / maxVal) * 100
                const expHeight = (d.expenses / maxVal) * 100
                const targetHeight = (d.targetRevenue / maxVal) * 100

                return (
                  <div key={i} className="flex flex-col items-center gap-2 z-10 w-full group">
                    <div className="flex gap-1 items-end h-[200px] relative w-12 justify-center">
                      {/* Target Marker */}
                      <div className="absolute w-full border-t-2 border-dashed border-amber-400 z-20" style={{ bottom: `${targetHeight}%` }}></div>
                      
                      {/* Expense Bar */}
                      <div 
                        className="w-4 bg-rose-400 rounded-t-sm group-hover:bg-rose-500 transition-colors" 
                        style={{ height: `${expHeight}%` }}
                        title={`Expenses: ₹${(d.expenses/100000).toFixed(2)}L`}
                      ></div>
                      
                      {/* Revenue Bar */}
                      <div 
                        className="w-4 bg-emerald-400 rounded-t-sm group-hover:bg-emerald-500 transition-colors" 
                        style={{ height: `${revHeight}%` }}
                        title={`Revenue: ₹${(d.revenue/100000).toFixed(2)}L`}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{d.month}</span>
                  </div>
                )
              })}
            </div>
            
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
                <span className="text-sm font-medium text-slate-600">Actual Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-400 rounded-sm"></div>
                <span className="text-sm font-medium text-slate-600">Actual Expenses</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 border-t-2 border-dashed border-amber-400"></div>
                <span className="text-sm font-medium text-slate-600">Target Revenue</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Month</th>
              <th className="px-6 py-4 font-medium text-right">Target Revenue (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Actual Revenue (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Actual Expenses (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Net Margin (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Achievement %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading data...</td></tr>
            ) : data.map((d, i) => {
              const margin = d.revenue - d.expenses
              const achievement = (d.revenue / d.targetRevenue) * 100

              return (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-700">{d.month} {year}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{d.targetRevenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600">{d.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-rose-600">{d.expenses.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800">{margin.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                      achievement >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {achievement.toFixed(1)}%
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
