"use client"

import { useState, useEffect } from "react"
import { getCostCenters, saveCostAllocations } from "@/app/actions/master-finance-budgeting"
import { PieChart, Save, RefreshCw, AlertCircle } from "lucide-react"

type CostCenter = { id: string, name: string }
type AllocationMap = Record<string, Record<string, number>> // expenseType -> costCenterId -> percentage

const EXPENSE_TYPES = ["RENT", "ELECTRICITY", "HOUSEKEEPING", "SECURITY", "IT", "INSURANCE"]

export function AllocationsClient() {
  const [centers, setCenters] = useState<CostCenter[]>([])
  const [allocations, setAllocations] = useState<AllocationMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    const data = await getCostCenters()
    setCenters(data.filter(c => c.isActive))
    
    const newAllocations: AllocationMap = {}
    EXPENSE_TYPES.forEach(type => {
      newAllocations[type] = {}
      data.forEach(cc => {
        const found = cc.allocations?.find((a: any) => a.expenseType === type)
        newAllocations[type][cc.id] = found ? found.percentage : 0
      })
    })
    setAllocations(newAllocations)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function updateAllocation(expenseType: string, costCenterId: string, value: string) {
    let num = parseFloat(value) || 0
    if (num < 0) num = 0
    if (num > 100) num = 100

    setAllocations(prev => ({
      ...prev,
      [expenseType]: {
        ...prev[expenseType],
        [costCenterId]: num
      }
    }))
  }

  function getTotal(expenseType: string) {
    if (!allocations[expenseType]) return 0
    return Object.values(allocations[expenseType]).reduce((sum, val) => sum + val, 0)
  }

  async function handleSave() {
    // Validate totals
    for (const type of EXPENSE_TYPES) {
      const total = getTotal(type)
      if (total !== 0 && Math.abs(total - 100) > 0.01) {
        setError(`Total for ${type} must be exactly 100% or 0% (currently ${total}%)`)
        return
      }
    }
    
    setError(null)
    setSaving(true)
    
    const payload: { costCenterId: string, expenseType: string, percentage: number }[] = []
    
    Object.entries(allocations).forEach(([expenseType, centersMap]) => {
      Object.entries(centersMap).forEach(([costCenterId, percentage]) => {
        if (percentage > 0) {
          payload.push({ costCenterId, expenseType, percentage })
        }
      })
    })
    
    await saveCostAllocations(payload)
    setSaving(false)
    alert("Allocations saved successfully")
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-blue-600" />
            Cost Allocation Rules
          </h1>
          <p className="text-sm text-slate-500 mt-1">Define percentage split for shared expenses across cost centers</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200">
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Rules"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium sticky left-0 bg-slate-50 z-10 min-w-[200px]">Cost Center</th>
              {EXPENSE_TYPES.map(type => (
                <th key={type} className="px-4 py-4 font-medium text-center min-w-[120px]">{type}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {centers.map(cc => (
              <tr key={cc.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-medium text-slate-800 sticky left-0 bg-white">{cc.name}</td>
                {EXPENSE_TYPES.map(type => (
                  <td key={type} className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input 
                        type="number" 
                        min="0" max="100" step="1"
                        value={allocations[type]?.[cc.id] || ""}
                        onChange={(e) => updateAllocation(type, cc.id, e.target.value)}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200 font-medium">
            <tr>
              <td className="px-6 py-4 sticky left-0 bg-slate-50 z-10 text-slate-700">TOTAL</td>
              {EXPENSE_TYPES.map(type => {
                const total = getTotal(type)
                const isError = total !== 0 && Math.abs(total - 100) > 0.01
                return (
                  <td key={type} className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-sm ${isError ? 'bg-red-100 text-red-700 font-bold' : total === 100 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>
                      {total.toFixed(1)}%
                    </span>
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
