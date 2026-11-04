"use client"

import { useState } from "react"
import { BarChart3, ChevronDown, ChevronRight, AlertTriangle, Clock, AlertCircle, XCircle } from "lucide-react"

interface AgingBill {
  id: string; billNumber: string; patientName: string; uhid: string | null
  type: string; billDate: string; netAmount: number; balance: number; daysPastDue: number
}

interface Bucket { count: number; amount: number; bills: AgingBill[] }

interface AgingData {
  buckets: { current: Bucket; days31_60: Bucket; days61_90: Bucket; over90: Bucket }
  totalOutstanding: number; totalBills: number
}

const BUCKET_CONFIG = [
  { key: "current", label: "0–30 Days", color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50", icon: <Clock className="w-4 h-4" /> },
  { key: "days31_60", label: "31–60 Days", color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50", icon: <AlertTriangle className="w-4 h-4" /> },
  { key: "days61_90", label: "61–90 Days", color: "bg-orange-500", textColor: "text-orange-700", bgLight: "bg-orange-50", icon: <AlertCircle className="w-4 h-4" /> },
  { key: "over90", label: "90+ Days", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50", icon: <XCircle className="w-4 h-4" /> },
] as const

export function ARAgingClient({ data }: { data: AgingData }) {
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null)
  const maxAmount = Math.max(...Object.values(data.buckets).map((b) => b.amount), 1)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          AR Aging Report
        </h1>
        <p className="text-sm text-slate-500 mt-1">Accounts receivable aged by billing date</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">TOTAL OUTSTANDING</div>
          <div className="text-3xl font-bold text-amber-600">₹{data.totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-400 mt-1">{data.totalBills} bills</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">OVERDUE (60+ DAYS)</div>
          <div className="text-3xl font-bold text-red-600">
            ₹{(data.buckets.days61_90.amount + data.buckets.over90.amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">{data.buckets.days61_90.count + data.buckets.over90.count} bills</div>
        </div>
      </div>

      {/* Aging Bars */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Aging Distribution</h3>

        {/* Stacked bar visual */}
        <div className="flex h-8 rounded-lg overflow-hidden">
          {BUCKET_CONFIG.map(({ key, color }) => {
            const bucket = data.buckets[key]
            const pct = data.totalOutstanding > 0 ? (bucket.amount / data.totalOutstanding) * 100 : 0
            if (pct <= 0) return null
            return (
              <div key={key} className={`${color} relative group cursor-pointer transition-all hover:opacity-80`} style={{ width: `${pct}%` }}
                onClick={() => setExpandedBucket(expandedBucket === key ? null : key)}>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {pct.toFixed(0)}%
                </div>
              </div>
            )
          })}
        </div>

        {/* Bucket breakdown cards */}
        <div className="grid grid-cols-4 gap-3">
          {BUCKET_CONFIG.map(({ key, label, color, textColor, bgLight, icon }) => {
            const bucket = data.buckets[key]
            const pct = data.totalOutstanding > 0 ? (bucket.amount / data.totalOutstanding) * 100 : 0
            const isExpanded = expandedBucket === key

            return (
              <div key={key}>
                <button onClick={() => setExpandedBucket(isExpanded ? null : key)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${isExpanded ? `${bgLight} border-current ring-2 ring-current/20 ${textColor}` : "bg-white border-slate-200 hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="text-xs font-medium text-slate-600">{label}</span>
                  </div>
                  <div className={`text-xl font-bold ${textColor}`}>₹{bucket.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{bucket.count} bills</span>
                    <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded Bucket Bills */}
      {expandedBucket && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${BUCKET_CONFIG.find((b) => b.key === expandedBucket)?.color}`} />
            <span className="text-sm font-semibold text-slate-700">{BUCKET_CONFIG.find((b) => b.key === expandedBucket)?.label} — {data.buckets[expandedBucket as keyof typeof data.buckets].count} bills</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <th className="text-left p-3 font-medium">Bill #</th>
                  <th className="text-left p-3 font-medium">Patient</th>
                  <th className="text-left p-3 font-medium">UHID</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Bill Date</th>
                  <th className="text-right p-3 font-medium">Net Amount</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                  <th className="text-right p-3 font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {data.buckets[expandedBucket as keyof typeof data.buckets].bills.map((bill) => (
                  <tr key={bill.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-xs font-mono text-slate-700 font-medium">{bill.billNumber}</td>
                    <td className="p-3 text-xs text-slate-700">{bill.patientName}</td>
                    <td className="p-3 text-xs text-slate-400">{bill.uhid || "—"}</td>
                    <td className="p-3 text-xs text-slate-500">{bill.type}</td>
                    <td className="p-3 text-xs text-slate-600">{new Date(bill.billDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                    <td className="p-3 text-right text-xs text-slate-700">₹{bill.netAmount.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right text-xs font-semibold text-amber-600">₹{bill.balance.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right">
                      <span className={`text-xs font-semibold ${bill.daysPastDue > 90 ? "text-red-600" : bill.daysPastDue > 60 ? "text-orange-600" : bill.daysPastDue > 30 ? "text-amber-600" : "text-emerald-600"}`}>
                        {bill.daysPastDue}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
