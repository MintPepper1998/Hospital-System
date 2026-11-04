"use client"

import { useState, useEffect } from "react"
import { searchInvoices, processRefund, getRefunds } from "@/app/actions/master-finance-revenue"
import { ArrowLeftRight, Search, AlertCircle, Check } from "lucide-react"
import { useRouter } from "next/navigation"

const METHODS = ["CASH", "UPI", "BANK_TRANSFER"]

interface RefundRecord {
  id: string; amount: number; paymentDate: string; notes: string | null; method: string
  billing: { billNumber: string; type: string; patient: { name: string; uhid: string | null } }
}

export function RefundsClient() {
  const router = useRouter()
  const [tab, setTab] = useState<"process" | "history">("process")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [selectedBill, setSelectedBill] = useState<any | null>(null)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")
  const [refundMethod, setRefundMethod] = useState("CASH")
  const [success, setSuccess] = useState("")
  const [refunds, setRefunds] = useState<RefundRecord[]>([])

  async function handleSearch() {
    setLoading(true)
    try {
      const result = await searchInvoices({ search: searchTerm, status: "PAID", limit: 20 })
      const result2 = await searchInvoices({ search: searchTerm, status: "PARTIALLY_PAID", limit: 20 })
      setResults([...JSON.parse(JSON.stringify(result.invoices)), ...JSON.parse(JSON.stringify(result2.invoices))])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function fetchRefunds() {
    try {
      const data = await getRefunds({ limit: 50 })
      setRefunds(JSON.parse(JSON.stringify(data)))
    } catch (e) { console.error(e) }
  }

  useEffect(() => { if (tab === "history") fetchRefunds() }, [tab])

  async function handleRefund() {
    if (!selectedBill || !refundAmount || !refundReason) return
    setLoading(true)
    try {
      await processRefund({ billingId: selectedBill.id, amount: parseFloat(refundAmount), reason: refundReason, method: refundMethod })
      setSuccess(`Refund of ₹${parseFloat(refundAmount).toLocaleString("en-IN")} processed for ${selectedBill.billNumber}`)
      setSelectedBill(null); setRefundAmount(""); setRefundReason("")
      router.refresh()
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-blue-600" />
          Refunds
        </h1>
        <p className="text-sm text-slate-500 mt-1">Process and track refunds</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(["process", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t === "process" ? "Process Refund" : "Refund History"}
          </button>
        ))}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm">
          <Check className="w-5 h-5" />{success}
        </div>
      )}

      {tab === "process" && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex gap-3">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search paid bill by number, patient name..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <button onClick={handleSearch} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Search className="w-4 h-4" /> Find
              </button>
            </div>
          </div>

          {results.length > 0 && !selectedBill && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                    <th className="text-left p-3 font-medium">Bill #</th>
                    <th className="text-left p-3 font-medium">Patient</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Paid (₹)</th>
                    <th className="text-center p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((inv: any) => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="p-3 text-xs font-mono">{inv.billNumber}</td>
                      <td className="p-3 text-xs">{inv.patient.name}</td>
                      <td className="p-3 text-xs text-slate-500">{inv.type}</td>
                      <td className="p-3 text-right text-xs text-emerald-600 font-medium">₹{inv.paidAmount.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => { setSelectedBill(inv); setRefundAmount("") }} className="text-xs text-red-600 hover:underline font-medium">Refund</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedBill && (
            <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Process Refund — {selectedBill.billNumber}</h3>
              <div className="bg-red-50 p-3 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Patient: <strong>{selectedBill.patient.name}</strong> | Max refundable: <strong>₹{selectedBill.paidAmount.toLocaleString("en-IN")}</strong>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Refund Amount (₹)</label>
                  <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} min={1} max={selectedBill.paidAmount}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
                  <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason for Refund *</label>
                <input type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Patient discharge, duplicate billing, service not availed"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleRefund} disabled={loading || !refundAmount || !refundReason}
                  className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {loading ? "Processing..." : "Process Refund"}
                </button>
                <button onClick={() => setSelectedBill(null)} className="text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-100">Cancel</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Bill #</th>
                <th className="text-left p-3 font-medium">Patient</th>
                <th className="text-left p-3 font-medium">Method</th>
                <th className="text-left p-3 font-medium">Reason</th>
                <th className="text-right p-3 font-medium">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-sm">No refunds recorded</td></tr>
              ) : refunds.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-3 text-xs text-slate-600">{new Date(r.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                  <td className="p-3 text-xs font-mono text-slate-700">{r.billing.billNumber}</td>
                  <td className="p-3 text-xs text-slate-700">{r.billing.patient.name}</td>
                  <td className="p-3 text-xs text-slate-500">{r.method}</td>
                  <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{r.notes?.replace("REFUND: ", "") || "—"}</td>
                  <td className="p-3 text-right text-xs font-semibold text-red-600">₹{Math.abs(r.amount).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
