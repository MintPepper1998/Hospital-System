"use client"

import { useState, useEffect } from "react"
import { getGSTSummary } from "@/app/actions/master-finance-remaining"
import { Calculator, Filter, ArrowUpRight, ArrowDownRight, IndianRupee } from "lucide-react"

interface GSTData {
  outputGST: number; inputGST: number; netGST: number
  salesCount: number; salesValue: number; purchaseCount: number; purchaseValue: number
  hsnBreakdown: Array<{ hsnCode: string; amount: number; count: number }>
}

export function GSTDashboardClient() {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(now.toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<GSTData | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await getGSTSummary({ from, to })
      setData(res)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600" />
          GST Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Input/Output GST summary & HSN breakdown</p>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Filter className="w-4 h-4" /> Apply
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* GST Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-red-500" />OUTPUT GST (Collected)</div>
              <div className="text-2xl font-bold text-red-600">₹{data.outputGST.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-slate-400 mt-1">{data.salesCount} sales • ₹{data.salesValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} revenue</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />INPUT GST (Paid)</div>
              <div className="text-2xl font-bold text-emerald-600">₹{data.inputGST.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-slate-400 mt-1">{data.purchaseCount} purchases • ₹{data.purchaseValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} value</div>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${data.netGST >= 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
              <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />NET GST {data.netGST >= 0 ? "PAYABLE" : "CREDIT"}</div>
              <div className={`text-2xl font-bold ${data.netGST >= 0 ? "text-amber-700" : "text-emerald-700"}`}>₹{Math.abs(data.netGST).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-slate-400 mt-1">{data.netGST >= 0 ? "To be remitted to govt" : "Input Tax Credit available"}</div>
            </div>
          </div>

          {/* Visual Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">GST Input vs Output</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-600 font-medium">Output GST</span>
                  <span className="text-slate-500">₹{data.outputGST.toLocaleString("en-IN")}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4">
                  <div className="bg-red-500 h-4 rounded-full transition-all" style={{ width: `${Math.max(data.outputGST, data.inputGST) > 0 ? (data.outputGST / Math.max(data.outputGST, data.inputGST)) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-600 font-medium">Input GST</span>
                  <span className="text-slate-500">₹{data.inputGST.toLocaleString("en-IN")}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4">
                  <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: `${Math.max(data.outputGST, data.inputGST) > 0 ? (data.inputGST / Math.max(data.outputGST, data.inputGST)) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* HSN Breakdown */}
          {data.hsnBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">HSN-wise Purchase Breakdown</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                      <th className="text-left p-3 font-medium">HSN Code</th>
                      <th className="text-right p-3 font-medium">Items</th>
                      <th className="text-right p-3 font-medium">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hsnBreakdown.sort((a, b) => b.amount - a.amount).map((hsn) => (
                      <tr key={hsn.hsnCode} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3 text-xs font-mono text-slate-700">{hsn.hsnCode}</td>
                        <td className="p-3 text-right text-xs text-slate-600">{hsn.count}</td>
                        <td className="p-3 text-right text-xs font-semibold text-slate-800">₹{hsn.amount.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
