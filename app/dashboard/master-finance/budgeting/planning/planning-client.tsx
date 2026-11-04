"use client"

import { useState, useEffect } from "react"
import { getBudgets, getCostCenters, createBudget, approveBudget } from "@/app/actions/master-finance-budgeting"
import { Target, Plus, CheckCircle, FileText, ChevronRight } from "lucide-react"

export function PlanningClient() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  
  const [formData, setFormData] = useState({
    costCenterId: "",
    fiscalYear: "2026-27",
    month: "0" // 0 = annual
  })
  
  const [items, setItems] = useState([{ accountGroupCode: "", budgetedAmount: 0, notes: "" }])

  async function fetchData() {
    setLoading(true)
    const [bData, cData] = await Promise.all([getBudgets(), getCostCenters()])
    setBudgets(bData)
    setCenters(cData.filter((c: any) => c.isActive))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSave() {
    if (!formData.costCenterId || items.length === 0) return
    const cleanedItems = items.filter(i => i.accountGroupCode && i.budgetedAmount > 0)
    if (cleanedItems.length === 0) return

    await createBudget({
      costCenterId: formData.costCenterId,
      fiscalYear: formData.fiscalYear,
      month: formData.month === "0" ? null : parseInt(formData.month),
      items: cleanedItems
    })
    
    setIsAdding(false)
    setItems([{ accountGroupCode: "", budgetedAmount: 0, notes: "" }])
    fetchData()
  }

  async function handleApprove(id: string) {
    if (confirm("Approve this budget? Once approved, it will be active for variance tracking.")) {
      await approveBudget(id)
      fetchData()
    }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Budget Planning
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage department budgets</p>
        </div>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Budget
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Create New Budget</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cost Center</label>
              <select 
                value={formData.costCenterId}
                onChange={e => setFormData({...formData, costCenterId: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
              >
                <option value="">Select Cost Center...</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fiscal Year</label>
              <select 
                value={formData.fiscalYear}
                onChange={e => setFormData({...formData, fiscalYear: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
              >
                <option value="2025-26">2025-26</option>
                <option value="2026-27">2026-27</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Period</label>
              <select 
                value={formData.month}
                onChange={e => setFormData({...formData, month: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
              >
                <option value="0">Annual</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                {/* ... other months ... */}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Budget Items</label>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input 
                    placeholder="Account Group Code (e.g. 5210)" 
                    value={item.accountGroupCode}
                    onChange={e => {
                      const newItems = [...items]
                      newItems[idx].accountGroupCode = e.target.value
                      setItems(newItems)
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                  <input 
                    type="number"
                    placeholder="Amount (₹)" 
                    value={item.budgetedAmount || ""}
                    onChange={e => {
                      const newItems = [...items]
                      newItems[idx].budgetedAmount = parseFloat(e.target.value) || 0
                      setItems(newItems)
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                  <input 
                    placeholder="Notes (optional)" 
                    value={item.notes}
                    onChange={e => {
                      const newItems = [...items]
                      newItems[idx].notes = e.target.value
                      setItems(newItems)
                    }}
                    className="flex-2 w-1/2 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                  {idx === items.length - 1 && (
                    <button 
                      onClick={() => setItems([...items, { accountGroupCode: "", budgetedAmount: 0, notes: "" }])}
                      className="p-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Save Draft</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map(b => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mb-2 ${
                  b.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {b.status}
                </span>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{b.costCenter.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{b.fiscalYear} • {b.month ? `Month ${b.month}` : 'Annual'}</p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {b.items.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-slate-600 truncate mr-2">Acc: {item.accountGroupCode}</span>
                  <span className="font-medium text-slate-800">₹{item.budgetedAmount.toLocaleString()}</span>
                </div>
              ))}
              {b.items.length > 3 && (
                <div className="text-xs text-slate-400 font-medium">+ {b.items.length - 3} more items</div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm text-slate-500 font-medium">Total: <span className="text-slate-800 font-bold ml-1">₹{b.items.reduce((sum: number, i: any) => sum + i.budgetedAmount, 0).toLocaleString()}</span></div>
              
              {b.status === 'DRAFT' && (
                <button 
                  onClick={() => handleApprove(b.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Approve <ChevronRight className="w-3 h-3" />
                </button>
              )}
              {b.status === 'APPROVED' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle className="w-3 h-3" /> Approved
                </span>
              )}
            </div>
          </div>
        ))}

        {!loading && budgets.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed rounded-xl bg-slate-50">
            <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No budgets found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  )
}
