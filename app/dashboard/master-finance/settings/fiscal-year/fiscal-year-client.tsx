"use client"

import { useState } from "react"
import { createFiscalYear, closeFiscalYear } from "@/app/actions/master-finance"
import { CalendarRange, Plus, Lock, Check, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface FiscalYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  isClosed: boolean
  createdAt: string
}

export function FiscalYearClient({ fiscalYears }: { fiscalYears: FiscalYear[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Default to Indian FY: next April-March
  const currentYear = new Date().getFullYear()
  const defaultFYStart = new Date().getMonth() >= 3
    ? `${currentYear}-04-01`
    : `${currentYear - 1}-04-01`
  const defaultFYEnd = new Date().getMonth() >= 3
    ? `${currentYear + 1}-03-31`
    : `${currentYear}-03-31`
  const defaultFYName = new Date().getMonth() >= 3
    ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
    : `${currentYear - 1}-${currentYear.toString().slice(-2)}`

  const [formData, setFormData] = useState({
    name: defaultFYName,
    startDate: defaultFYStart,
    endDate: defaultFYEnd,
  })

  async function handleCreate() {
    setLoading(true)
    try {
      await createFiscalYear(formData)
      setShowForm(false)
      router.refresh()
    } catch (e: any) {
      alert(e.message || "Failed to create fiscal year")
    } finally {
      setLoading(false)
    }
  }

  async function handleClose(id: string) {
    if (!confirm("Are you sure you want to close this fiscal year? This will lock all entries for this period.")) return
    setLoading(true)
    try {
      await closeFiscalYear(id)
      router.refresh()
    } catch (e: any) {
      alert(e.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-blue-600" />
            Fiscal Year Setup
          </h1>
          <p className="text-sm text-slate-500 mt-1">Indian Financial Year (April 1 – March 31)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Fiscal Year
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Create New Fiscal Year</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">FY Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="2026-27"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create & Set Active"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FY List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
              <th className="text-left p-4 font-medium">Fiscal Year</th>
              <th className="text-left p-4 font-medium">Period</th>
              <th className="text-center p-4 font-medium">Status</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fiscalYears.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No fiscal year configured</p>
                  <p className="text-slate-400 text-xs mt-1">Create one to start using Master Finance</p>
                </td>
              </tr>
            ) : (
              fiscalYears.map((fy) => (
                <tr key={fy.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-4 font-semibold text-slate-800">{fy.name}</td>
                  <td className="p-4 text-slate-600">
                    {new Date(fy.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    {" → "}
                    {new Date(fy.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="p-4 text-center">
                    {fy.isClosed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <Lock className="w-3 h-3" /> Closed
                      </span>
                    ) : fy.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Inactive</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {fy.isActive && !fy.isClosed && (
                      <button
                        onClick={() => handleClose(fy.id)}
                        disabled={loading}
                        className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline disabled:opacity-50"
                      >
                        Close Year
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
