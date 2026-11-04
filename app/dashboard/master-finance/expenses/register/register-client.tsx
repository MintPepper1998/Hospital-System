"use client"

import { useState, useEffect } from "react"
import { getExpenseRequests } from "@/app/actions/master-finance-expenses"
import { BookOpen, Search, Download, Filter } from "lucide-react"
import { format } from "date-fns"

export function RegisterClient() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  async function fetchData() {
    setLoading(true)
    const data = await getExpenseRequests()
    setRequests(data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = requests.filter(r => {
    const matchesSearch = r.description.toLowerCase().includes(search.toLowerCase()) || 
                          r.requestedBy.toLowerCase().includes(search.toLowerCase()) ||
                          r.department.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Expense Register
          </h1>
          <p className="text-sm text-slate-500 mt-1">Master view of all expense requests across the organization</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border-none outline-none bg-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <button className="p-2 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 text-slate-600">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Requested By</th>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium text-right">Amount (₹)</th>
              <th className="px-6 py-4 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading records...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No matching records found.</td></tr>
            ) : filtered.map(req => (
              <tr key={req.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{format(new Date(req.createdAt), 'dd MMM yyyy')}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{req.requestedBy}</td>
                <td className="px-6 py-4 text-slate-600">{req.department}</td>
                <td className="px-6 py-4 text-slate-600">{req.category}</td>
                <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={req.description}>{req.description}</td>
                <td className="px-6 py-4 font-bold text-slate-800 text-right">{req.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
