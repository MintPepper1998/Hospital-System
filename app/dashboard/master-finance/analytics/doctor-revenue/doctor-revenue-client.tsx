"use client"

import { useState, useEffect } from "react"
import { getDoctorRevenue } from "@/app/actions/master-finance-analytics"
import { Stethoscope, Calendar, Search, Download, DollarSign } from "lucide-react"

export function DoctorRevenueClient() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function fetchData() {
    setLoading(true)
    const result = await getDoctorRevenue({ from: "", to: "" })
    setData(result)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = data.filter(d => 
    d.doctorName.toLowerCase().includes(search.toLowerCase()) || 
    d.department.toLowerCase().includes(search.toLowerCase())
  )

  const totalGenerated = filtered.reduce((sum, d) => sum + d.totalRevenueGenerated, 0)
  const totalShare = filtered.reduce((sum, d) => sum + d.doctorShareAmount, 0)
  const totalHospitalShare = filtered.reduce((sum, d) => sum + d.hospitalShareAmount, 0)

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-600" />
            Doctor Revenue Share
          </h1>
          <p className="text-sm text-slate-500 mt-1">Consultation and procedure revenue sharing analytics</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select className="text-sm border-none outline-none text-slate-700 bg-transparent pr-4">
            <option>Sep 2026</option>
            <option>Aug 2026</option>
            <option>Jul 2026</option>
          </select>
          <button className="bg-slate-100 p-2 rounded hover:bg-slate-200 text-slate-600 ml-2 border-l border-slate-200">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">Total Doctor Revenue</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">₹{totalGenerated.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">Hospital Share</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">₹{totalHospitalShare.toLocaleString("en-IN")}</div>
          <div className="text-xs text-slate-400 mt-1">Retained by hospital</div>
        </div>
        <div className="bg-blue-600 p-5 rounded-xl shadow-sm text-white">
          <div className="text-sm text-blue-100 font-medium">Doctor Payouts (Share)</div>
          <div className="text-2xl font-bold mt-1">₹{totalShare.toLocaleString("en-IN")}</div>
          <div className="text-xs text-blue-200 mt-1">Total liability to doctors</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search doctors or departments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-72 bg-white"
            />
          </div>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Doctor Name</th>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium text-right">Total Generated (₹)</th>
              <th className="px-6 py-4 font-medium text-center">Share % (Avg)</th>
              <th className="px-6 py-4 font-medium text-right text-emerald-700">Hospital Share (₹)</th>
              <th className="px-6 py-4 font-medium text-right text-blue-700">Doctor Share (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Calculating revenue shares...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No doctors found.</td></tr>
            ) : filtered.map((d, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                    {d.doctorName.split(' ').map((n:string)=>n[0]).join('')}
                  </div>
                  {d.doctorName}
                </td>
                <td className="px-6 py-4 text-slate-600">{d.department}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-800">{d.totalRevenueGenerated.toLocaleString()}</td>
                <td className="px-6 py-4 text-center text-slate-600 bg-slate-50/50">{d.averageSharePercentage}%</td>
                <td className="px-6 py-4 text-right font-medium text-emerald-600">{d.hospitalShareAmount.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-bold text-blue-600">{d.doctorShareAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
