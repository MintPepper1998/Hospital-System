"use client"

import { useState, useEffect } from "react"
import { createExpenseRequest } from "@/app/actions/master-finance-expenses"
import { getCostCenters } from "@/app/actions/master-finance-budgeting"
import { Receipt, Upload, Paperclip, Send } from "lucide-react"

export function RaiseExpenseClient() {
  const [centers, setCenters] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    requestedBy: "Dr. Arvind Mehta", // Hardcoded for demo
    department: "Cardiology",
    category: "OPEX",
    description: "",
    amount: "",
    costCenterId: ""
  })

  useEffect(() => {
    getCostCenters().then(data => setCenters(data.filter((c: any) => c.isActive)))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.description || !formData.amount || !formData.costCenterId) return
    
    setSubmitting(true)
    await createExpenseRequest({
      ...formData,
      amount: parseFloat(formData.amount)
    })
    
    setSubmitting(false)
    alert("Expense request submitted successfully. It has been routed for approval.")
    setFormData({ ...formData, description: "", amount: "", costCenterId: "" })
  }

  return (
    <div className="p-6 max-w-[800px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-600" />
          Raise Expense Request
        </h1>
        <p className="text-sm text-slate-500 mt-1">Submit a new request for capital or operational expenditure</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Requested By</label>
              <input 
                type="text" 
                value={formData.requestedBy}
                readOnly
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <input 
                type="text" 
                value={formData.department}
                readOnly
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expense Category <span className="text-red-500">*</span></label>
              <select 
                required
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="OPEX">Operational Exp. (OPEX)</option>
                <option value="CAPEX">Capital Exp. (CAPEX)</option>
                <option value="TRAVEL">Travel & Logistics</option>
                <option value="SUPPLIES">Medical Supplies</option>
                <option value="REPAIR">Maintenance & Repair</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Charge to Cost Center <span className="text-red-500">*</span></label>
              <select 
                required
                value={formData.costCenterId}
                onChange={e => setFormData({...formData, costCenterId: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select Cost Center...</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              required
              min="1"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              placeholder="e.g. 15000"
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Justification / Description <span className="text-red-500">*</span></label>
            <textarea 
              required
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Describe what this expense is for and why it is needed..."
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Attachments (Quotations, Invoices, etc.)</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600 font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : <><Send className="w-4 h-4" /> Submit Request</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
