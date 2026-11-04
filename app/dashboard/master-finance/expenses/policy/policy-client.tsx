"use client"

import { useState, useEffect } from "react"
import { getApprovalPolicies, updateApprovalPolicy } from "@/app/actions/master-finance-expenses"
import { ShieldCheck, Edit2, Check, X, ShieldAlert } from "lucide-react"

export function PolicyClient() {
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})

  async function fetchData() {
    setLoading(true)
    const data = await getApprovalPolicies()
    setPolicies(data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleUpdate(id: string) {
    await updateApprovalPolicy(id, {
      roleRequired: editData.roleRequired,
      maxAmount: editData.maxAmount === "" ? null : parseFloat(editData.maxAmount)
    })
    setEditingId(null)
    fetchData()
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8 bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100">
        <ShieldAlert className="w-8 h-8 text-blue-600 shrink-0" />
        <div>
          <h1 className="text-lg font-bold">Expense Approval Hierarchy</h1>
          <p className="text-sm opacity-80 mt-1">Configure limits and roles required to approve expenses. Lower levels must approve before higher levels get notified.</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading policy configuration...</div>
        ) : policies.map((policy: any, idx: number) => (
          <div key={policy.id} className="relative">
            {/* Connector Line */}
            {idx !== policies.length - 1 && (
              <div className="absolute left-[28px] top-[40px] w-0.5 h-full bg-slate-200 z-0"></div>
            )}
            
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 relative z-10 flex gap-4 items-start hover:border-blue-300 transition-colors">
              <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-xl border-4 border-white shadow-sm shrink-0">
                L{policy.level}
              </div>
              
              <div className="flex-1">
                {editingId === policy.id ? (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Required Role</label>
                      <input 
                        value={editData.roleRequired}
                        onChange={e => setEditData({...editData, roleRequired: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Approval Limit (₹)</label>
                      <input 
                        type="number"
                        value={editData.maxAmount ?? ""}
                        onChange={e => setEditData({...editData, maxAmount: e.target.value})}
                        placeholder="Leave blank for unlimited"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                      />
                      <p className="text-xs text-slate-400 mt-1">If limit is exceeded, approval is escalated to the next level.</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                      <button onClick={() => handleUpdate(policy.id)} className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1"><Check className="w-4 h-4" /> Save</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-slate-800">{policy.roleRequired.replace(/_/g, " ")}</h3>
                      <button 
                        onClick={() => { setEditingId(policy.id); setEditData(policy) }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex-1">
                        <span className="block text-xs text-slate-400 mb-0.5">Approval Capacity</span>
                        <span className="font-semibold text-slate-700">
                          {policy.maxAmount ? `Up to ₹${policy.maxAmount.toLocaleString()}` : 'Unlimited (Final Authority)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
