"use client"

import { useState, useEffect } from "react"
import { getBudgetVsActuals } from "@/app/actions/master-finance-budgeting"
import { BarChart3, Filter, ArrowUpRight, ArrowDownRight, Building2 } from "lucide-react"

export function VarianceClient() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [filters, setFilters] = useState({
    fiscalYear: "2026-27",
    month: "0" // 0 = all
  })

  async function fetchData() {
    setLoading(true)
    const result = await getBudgetVsActuals({
      fiscalYear: filters.fiscalYear,
      month: filters.month === "0" ? undefined : parseInt(filters.month)
    })
    // Only show approved budgets for variance analysis
    setData(result.filter((b: any) => b.status === "APPROVED"))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [filters])

  const totalBudgeted = data.reduce((sum, d) => sum + d.totalBudgeted, 0)
  const totalActual = data.reduce((sum, d) => sum + d.totalActual, 0)
  const totalVariance = totalBudgeted - totalActual
  const isOverBudget = totalActual > totalBudgeted

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Budget vs Actuals
          </h1>
          <p className="text-sm text-slate-500 mt-1">Variance analysis for approved department budgets</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select 
            value={filters.fiscalYear}
            onChange={(e) => setFilters(prev => ({...prev, fiscalYear: e.target.value}))}
            className="text-sm border-none outline-none text-slate-700 bg-transparent py-1"
          >
            <option value="2025-26">2025-26</option>
            <option value="2026-27">2026-27</option>
          </select>
          <span className="text-slate-300">|</span>
          <select 
            value={filters.month}
            onChange={(e) => setFilters(prev => ({...prev, month: e.target.value}))}
            className="text-sm border-none outline-none text-slate-700 bg-transparent py-1 mr-2"
          >
            <option value="0">Annual View</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">Total Budgeted</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">₹{totalBudgeted.toLocaleString("en-IN", {maximumFractionDigits: 0})}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">Total Actual Spend</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">₹{totalActual.toLocaleString("en-IN", {maximumFractionDigits: 0})}</div>
        </div>
        <div className={`p-5 rounded-xl border shadow-sm text-white ${isOverBudget ? 'bg-gradient-to-br from-rose-500 to-red-600 border-red-500' : 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-500'}`}>
          <div className="text-sm font-medium opacity-90">Total Variance</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold">₹{Math.abs(totalVariance).toLocaleString("en-IN", {maximumFractionDigits: 0})}</span>
            {isOverBudget ? (
              <span className="flex items-center text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full"><ArrowUpRight className="w-3 h-3 mr-1" /> OVER</span>
            ) : (
              <span className="flex items-center text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full"><ArrowDownRight className="w-3 h-3 mr-1" /> UNDER</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading variance data...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed">
            No approved budgets found for the selected period.
          </div>
        ) : data.map((budget: any) => {
          const isDeptOver = budget.totalActual > budget.totalBudgeted
          const pct = Math.min((budget.totalActual / budget.totalBudgeted) * 100, 100)
          
          return (
            <div key={budget.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{budget.costCenter.name}</h3>
                    <p className="text-sm text-slate-500">{budget.fiscalYear} • {budget.month ? `Month ${budget.month}` : 'Annual'}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-slate-500">Utilization</div>
                  <div className={`text-lg font-bold ${isDeptOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {((budget.totalActual / budget.totalBudgeted) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100">
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                  <span>Actual: ₹{budget.totalActual.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                  <span>Budget: ₹{budget.totalBudgeted.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isDeptOver ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 font-medium">Account Group</th>
                      <th className="px-5 py-3 font-medium text-right">Budgeted (₹)</th>
                      <th className="px-5 py-3 font-medium text-right">Actuals (₹)</th>
                      <th className="px-5 py-3 font-medium text-right">Variance (₹)</th>
                      <th className="px-5 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {budget.items.map((item: any) => {
                      const itemOver = item.actualAmount > item.budgetedAmount
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-medium text-slate-700">{item.accountGroupCode}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{item.budgetedAmount.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="px-5 py-3 text-right font-medium text-slate-800">{item.actualAmount.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={itemOver ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                              {itemOver ? '+' : ''}{Math.abs(item.variance).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              itemOver ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {itemOver ? 'OVER BUDGET' : 'UNDER BUDGET'}
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
        })}
      </div>
    </div>
  )
}
