"use client"

import { useState, useEffect } from "react"
import { getRevenueLeakage } from "@/app/actions/master-finance-analytics"
import { ShieldAlert, AlertTriangle, Search, Filter, ArrowRight, ShieldCheck } from "lucide-react"

export function LeakageClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")

  async function fetchData() {
    setLoading(true)
    const result = await getRevenueLeakage({ from: "", to: "" })
    setData(result)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  if (loading || !data) {
    return <div className="p-12 text-center text-slate-500">Scanning for leakage anomalies...</div>
  }

  const filteredIncidents = data.incidents.filter((inc: any) => filter === "ALL" || inc.status === filter)

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            Revenue Leakage Detection
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI-driven anomaly detection for unbilled services and undercharging</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-xl shadow-md p-6 text-white flex items-center justify-between">
        <div>
          <div className="text-rose-100 font-medium mb-1">Total Potential Leakage (Last 30 Days)</div>
          <div className="text-4xl font-bold">₹{data.totalLeakageDetected.toLocaleString()}</div>
          <p className="text-sm text-rose-100 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Action required on {data.incidents.filter((i:any) => i.status !== 'RESOLVED').length} unresolved incidents
          </p>
        </div>
        <div className="hidden md:block p-4 bg-white/10 rounded-full border border-white/20">
          <ShieldAlert className="w-16 h-16 text-white" />
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text"
            placeholder="Search Patient ID or Dept..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-slate-50"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "UNRESOLVED", "INVESTIGATING", "RESOLVED"].map(status => (
            <button 
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                filter === status 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-12 text-center text-emerald-800">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <h3 className="text-lg font-bold">No issues found</h3>
            <p className="text-sm mt-1">All clear for the selected filter.</p>
          </div>
        ) : filteredIncidents.map((inc: any) => (
          <div key={inc.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  inc.type === 'UNBILLED_SERVICES' ? 'bg-rose-50 text-rose-600' : 
                  inc.type === 'UNDERCHARGING' ? 'bg-amber-50 text-amber-600' : 
                  'bg-blue-50 text-blue-600'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{inc.id}</span>
                    <span className="text-xs font-bold text-slate-500">{new Date(inc.date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{inc.type.replace(/_/g, ' ')}</h3>
                  <p className="text-sm text-slate-500">Patient: <span className="font-semibold text-blue-600">{inc.patientId}</span> • Dept: <span className="font-semibold text-slate-700">{inc.department}</span></p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500 mb-1">Potential Value</div>
                <div className="text-xl font-bold text-slate-800">₹{inc.amount.toLocaleString()}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  inc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                  inc.status === 'INVESTIGATING' ? 'bg-amber-100 text-amber-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {inc.status}
                </span>
              </div>
              {inc.status !== 'RESOLVED' && (
                <button className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Investigate <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
