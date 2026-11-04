"use client"

import { useState, useEffect } from "react"
import { getApprovalQueue, approveExpense, rejectExpense } from "@/app/actions/master-finance-expenses"
import { ClipboardCheck, Check, X, Clock, FileText, ChevronRight } from "lucide-react"

export function ApprovalsClient() {
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [remarks, setRemarks] = useState("")
  
  // Simulated current user
  const currentUser = { id: "U-FIN-01", name: "Ravi Shankar (Finance Head)", role: "FINANCE_HEAD" }

  async function fetchData() {
    setLoading(true)
    const data = await getApprovalQueue(currentUser.role)
    setQueue(data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleAction(action: "APPROVE" | "REJECT") {
    if (!selected) return
    
    if (action === "APPROVE") {
      await approveExpense(selected.id, currentUser.id, currentUser.name, selected.currentLevel, remarks)
    } else {
      await rejectExpense(selected.id, currentUser.id, currentUser.name, selected.currentLevel, remarks)
    }
    
    setSelected(null)
    setRemarks("")
    fetchData()
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto flex gap-6 h-[calc(100vh-100px)]">
      {/* List View */}
      <div className="w-1/3 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            Approval Queue
          </h2>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{queue.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
          ) : queue.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              All caught up! No pending approvals.
            </div>
          ) : queue.map(req => (
            <div 
              key={req.id}
              onClick={() => { setSelected(req); setRemarks("") }}
              className={`p-4 rounded-lg cursor-pointer border transition-colors ${selected?.id === req.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-blue-300 hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-500">{req.category}</span>
                <span className="text-sm font-bold text-slate-800">₹{req.amount.toLocaleString()}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-800 line-clamp-1">{req.description}</h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {new Date(req.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail View */}
      <div className="w-2/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        {selected ? (
          <>
            <div className="p-6 border-b border-slate-100 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">₹{selected.amount.toLocaleString()}</h2>
                  <p className="text-sm text-slate-500">Requested by <span className="font-medium text-slate-700">{selected.requestedBy}</span> ({selected.department})</p>
                </div>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Level {selected.currentLevel} Approval</span>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 mb-6">
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Justification</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{selected.description}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Approval History</h3>
                <div className="space-y-4">
                  {selected.approvals.length === 0 ? (
                    <div className="text-sm text-slate-500 italic">No previous approvals for this request.</div>
                  ) : selected.approvals.map((app: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${app.action === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {app.action === 'APPROVED' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>
                        {idx < selected.approvals.length - 1 && <div className="w-0.5 h-full bg-slate-200 my-1"></div>}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-bold text-slate-800">{app.approverName} <span className="text-slate-400 font-normal ml-2">{new Date(app.createdAt).toLocaleDateString()}</span></p>
                        <p className="text-xs text-slate-500 mb-1">Level {app.level} • {app.action}</p>
                        {app.remarks && <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-1">{app.remarks}</p>}
                      </div>
                    </div>
                  ))}
                  
                  {/* Current step pending */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center text-amber-500">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-700">Pending Review</p>
                      <p className="text-xs text-amber-600/70">Level {selected.currentLevel}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3 rounded-b-xl">
              <input 
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Add remarks/comments (required for rejection)..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleAction("REJECT")}
                  disabled={!remarks}
                  className="px-6 py-2 bg-white border border-rose-200 text-rose-600 font-medium rounded-lg text-sm hover:bg-rose-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleAction("APPROVE")}
                  className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg text-sm hover:bg-emerald-700"
                >
                  Approve Request
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ClipboardCheck className="w-16 h-16 mb-4 opacity-20" />
            <p>Select a request from the queue to review</p>
          </div>
        )}
      </div>
    </div>
  )
}
