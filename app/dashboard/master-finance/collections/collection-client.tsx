"use client"

import { useState } from "react"
import { searchInvoices, recordPayment } from "@/app/actions/master-finance-revenue"
import { HandCoins, Search, Check, IndianRupee } from "lucide-react"
import { useRouter } from "next/navigation"

interface Invoice {
  id: string; billNumber: string; type: string; billDate: string
  netAmount: number; paidAmount: number; balanceAmount: number; status: string
  patient: { id: string; name: string; phone: string | null; uhid: string | null }
}

const METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER"]

export function PaymentCollectionClient() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Invoice[]>([])
  const [selectedBill, setSelectedBill] = useState<Invoice | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("CASH")
  const [payRef, setPayRef] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSearch() {
    setLoading(true)
    try {
      const result = await searchInvoices({ search: searchTerm, status: "PENDING", limit: 20 })
      // Also fetch partially paid
      const result2 = await searchInvoices({ search: searchTerm, status: "PARTIALLY_PAID", limit: 20 })
      const combined = [...JSON.parse(JSON.stringify(result.invoices)), ...JSON.parse(JSON.stringify(result2.invoices))]
      setResults(combined)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleCollect() {
    if (!selectedBill || !payAmount) return
    setLoading(true)
    setSuccess("")
    try {
      const result = await recordPayment({
        billingId: selectedBill.id,
        amount: parseFloat(payAmount),
        method: payMethod,
        reference: payRef || undefined,
        notes: payNotes || undefined,
      })
      setSuccess(`Payment of ₹${parseFloat(payAmount).toLocaleString("en-IN")} recorded. Bill is now ${result.newStatus}. Remaining: ₹${result.newBalance.toLocaleString("en-IN")}`)
      setSelectedBill(null)
      setPayAmount("")
      setPayRef("")
      setPayNotes("")
      handleSearch() // refresh
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <HandCoins className="w-6 h-6 text-blue-600" />
          Payment Collection
        </h1>
        <p className="text-sm text-slate-500 mt-1">Record payments against outstanding bills</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-3">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by bill number, patient name, or phone..."
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <button onClick={handleSearch} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Search className="w-4 h-4" /> Find Bills
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 text-xs text-slate-500">{results.length} outstanding bills found</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Bill #</th>
                <th className="text-left p-3 font-medium">Patient</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Net</th>
                <th className="text-right p-3 font-medium">Paid</th>
                <th className="text-right p-3 font-medium">Balance</th>
                <th className="text-center p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((inv) => (
                <tr key={inv.id} className={`border-b border-slate-50 transition-colors ${selectedBill?.id === inv.id ? "bg-blue-50" : "hover:bg-slate-50/50"}`}>
                  <td className="p-3 text-xs font-mono text-slate-700">{inv.billNumber}</td>
                  <td className="p-3 text-xs text-slate-700">{inv.patient.name}</td>
                  <td className="p-3 text-xs text-slate-500">{inv.type}</td>
                  <td className="p-3 text-right text-xs text-slate-700">₹{inv.netAmount.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-xs text-emerald-600">₹{inv.paidAmount.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-xs font-semibold text-amber-600">₹{inv.balanceAmount.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setSelectedBill(inv); setPayAmount(inv.balanceAmount.toString()) }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
                      Collect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Form */}
      {selectedBill && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-blue-600" />
            Record Payment for {selectedBill.billNumber}
          </h3>
          <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
            Patient: <strong>{selectedBill.patient.name}</strong> | Balance: <strong>₹{selectedBill.balanceAmount.toLocaleString("en-IN")}</strong>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
              <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min={1} max={selectedBill.balanceAmount}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                {METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reference / Transaction ID</label>
              <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Optional"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Optional"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCollect} disabled={loading || !payAmount} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "Processing..." : `Collect ₹${parseFloat(payAmount || "0").toLocaleString("en-IN")}`}
            </button>
            <button onClick={() => setSelectedBill(null)} className="text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
