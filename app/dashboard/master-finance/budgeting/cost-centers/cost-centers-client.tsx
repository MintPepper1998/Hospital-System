"use client"

import { useState, useEffect } from "react"
import { getCostCenters, createCostCenter, updateCostCenter, deleteCostCenter } from "@/app/actions/master-finance-budgeting"
import { Building2, Plus, Edit2, Trash2, Check, X, ShieldAlert } from "lucide-react"

type CostCenter = {
  id: string
  name: string
  code: string
  type: string
  isActive: boolean
}

export function CostCentersClient() {
  const [centers, setCenters] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newCC, setNewCC] = useState({ name: "", code: "", type: "REVENUE" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<CostCenter>>({})

  async function fetchCenters() {
    setLoading(true)
    const data = await getCostCenters()
    setCenters(data)
    setLoading(false)
  }

  useEffect(() => { fetchCenters() }, [])

  async function handleAdd() {
    if (!newCC.name || !newCC.code) return
    await createCostCenter(newCC)
    setIsAdding(false)
    setNewCC({ name: "", code: "", type: "REVENUE" })
    fetchCenters()
  }

  async function handleUpdate(id: string) {
    if (!editData.name || !editData.code || !editData.type) return
    await updateCostCenter(id, editData as any)
    setEditingId(null)
    fetchCenters()
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this cost center?")) {
      await deleteCostCenter(id)
      fetchCenters()
    }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Cost Centers
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage departments and operational units for budget tracking</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Cost Center
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isAdding && (
              <tr className="bg-blue-50/50">
                <td className="px-6 py-3">
                  <input autoFocus value={newCC.code} onChange={e => setNewCC({...newCC, code: e.target.value})} className="w-24 px-2 py-1 border rounded text-xs" placeholder="e.g. OP01" />
                </td>
                <td className="px-6 py-3">
                  <input value={newCC.name} onChange={e => setNewCC({...newCC, name: e.target.value})} className="w-48 px-2 py-1 border rounded text-xs" placeholder="Department Name" />
                </td>
                <td className="px-6 py-3">
                  <select value={newCC.type} onChange={e => setNewCC({...newCC, type: e.target.value})} className="px-2 py-1 border rounded text-xs bg-white">
                    <option value="REVENUE">Revenue</option>
                    <option value="SUPPORT">Support</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">Active</span>
                </td>
                <td className="px-6 py-3 text-right space-x-2">
                  <button onClick={handleAdd} className="text-emerald-600 hover:text-emerald-700 p-1"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
                </td>
              </tr>
            )}

            {centers.length === 0 && !isAdding && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No cost centers defined yet
                </td>
              </tr>
            )}

            {centers.map(cc => (
              <tr key={cc.id} className="hover:bg-slate-50/50 transition-colors">
                {editingId === cc.id ? (
                  <>
                    <td className="px-6 py-3"><input value={editData.code} onChange={e => setEditData({...editData, code: e.target.value})} className="w-24 px-2 py-1 border rounded text-xs" /></td>
                    <td className="px-6 py-3"><input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-48 px-2 py-1 border rounded text-xs" /></td>
                    <td className="px-6 py-3">
                      <select value={editData.type} onChange={e => setEditData({...editData, type: e.target.value})} className="px-2 py-1 border rounded text-xs bg-white">
                        <option value="REVENUE">Revenue</option>
                        <option value="SUPPORT">Support</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                       <select value={editData.isActive ? "true" : "false"} onChange={e => setEditData({...editData, isActive: e.target.value === "true"})} className="px-2 py-1 border rounded text-xs bg-white">
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button onClick={() => handleUpdate(cc.id)} className="text-emerald-600 hover:text-emerald-700 p-1"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{cc.code}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{cc.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold ${
                        cc.type === 'REVENUE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        cc.type === 'SUPPORT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {cc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cc.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {cc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setEditingId(cc.id); setEditData(cc) }} className="text-slate-400 hover:text-blue-600 p-1 mx-1"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(cc.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
