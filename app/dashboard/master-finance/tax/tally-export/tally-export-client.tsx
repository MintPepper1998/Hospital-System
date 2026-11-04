"use client"

import { useState } from "react"
import { FileText, Download, Info } from "lucide-react"

export function TallyExportClient() {
  const now = new Date()
  const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1)
  const [from, setFrom] = useState(fyStart.toISOString().split("T")[0])
  const [to, setTo] = useState(now.toISOString().split("T")[0])
  const [format, setFormat] = useState<"xml" | "csv">("xml")
  const [scope, setScope] = useState<"all" | "sales" | "purchases" | "payments" | "receipts">("all")

  async function handleExport() {
    // Build query string and trigger download
    const params = new URLSearchParams({ from, to, format, scope })
    try {
      const res = await fetch(`/api/finance/tally-export?${params.toString()}`)
      if (!res.ok) {
        alert("Export failed. API endpoint not yet configured.")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tally-export-${from}-to-${to}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Tally export API will be configured in the next release. This page shows the export configuration UI.")
    }
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Tally Export
        </h1>
        <p className="text-sm text-slate-500 mt-1">Export vouchers for Tally ERP9 import</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-blue-800">Tally ERP9 Compatible Export</div>
          <p className="text-xs text-blue-600 mt-1">
            Generates XML files in Tally&apos;s proprietary format. Supports Sales Vouchers, Purchase Vouchers,
            Payment Vouchers, and Receipt Vouchers. The export maps your Chart of Accounts to Tally ledger groups automatically.
          </p>
        </div>
      </div>

      {/* Export Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-semibold text-slate-700">Export Configuration</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Export Format</label>
          <div className="flex gap-3">
            <button onClick={() => setFormat("xml")}
              className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${format === "xml" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="text-sm font-semibold text-slate-700">XML (Tally Native)</div>
              <div className="text-xs text-slate-500 mt-1">Direct import into Tally ERP9/Prime</div>
            </button>
            <button onClick={() => setFormat("csv")}
              className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${format === "csv" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="text-sm font-semibold text-slate-700">CSV (Universal)</div>
              <div className="text-xs text-slate-500 mt-1">For manual review or other software</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Voucher Types</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "all", label: "All Vouchers" },
              { value: "sales", label: "Sales" },
              { value: "purchases", label: "Purchases" },
              { value: "payments", label: "Payments" },
              { value: "receipts", label: "Receipts" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => setScope(opt.value as any)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${scope === opt.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4" /> Export to Tally
        </button>
      </div>

      {/* Mapping Preview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Ledger Mapping Preview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="text-left p-2 font-medium">System Account</th>
                <th className="text-left p-2 font-medium">→</th>
                <th className="text-left p-2 font-medium">Tally Ledger Group</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Cash Account", "Cash-in-Hand"],
                ["Bank Account", "Bank Accounts"],
                ["Sales Revenue", "Sales Accounts"],
                ["Purchase Expense", "Purchase Accounts"],
                ["CGST Payable", "Duties & Taxes"],
                ["SGST Payable", "Duties & Taxes"],
                ["Sundry Debtors", "Sundry Debtors"],
                ["Sundry Creditors", "Sundry Creditors"],
                ["Salary Expense", "Indirect Expenses"],
              ].map(([from, to]) => (
                <tr key={from} className="border-b border-slate-50">
                  <td className="p-2 text-slate-700">{from}</td>
                  <td className="p-2 text-slate-400">→</td>
                  <td className="p-2 text-blue-600 font-medium">{to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
