"use client"

import { useState, useEffect } from "react"
import { getPatientDues, recordPayment } from "@/app/actions/master-finance-revenue"
import { CreditCard, Search, ChevronDown, ChevronRight, IndianRupee, AlertTriangle, Users, Check } from "lucide-react"
import { useRouter } from "next/navigation"

interface PatientDue {
  patientId: string; patientName: string; uhid: string; phone: string | null
  totalDue: number; billCount: number; oldestBillDate: string
  bills: Array<{
    id: string; billNumber: string; type: string; billDate: string
    netAmount: number; paidAmount: number; balanceAmount: number; status: string
  }>
}

const METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER"]

export function PatientDuesClient() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<PatientDue[]>([])
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [totalPatients, setTotalPatients] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Payment modal state
  const [payBillId, setPayBillId] = useState<string | null>(null)
  const [payBillNumber, setPayBillNumber] = useState("")
  const [payBalance, setPayBalance] = useState(0)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("CASH")
  const [payRef, setPayRef] = useState("")
  const [success, setSuccess] = useState("")

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getPatientDues({ search: search || undefined, limit: 100 })
      setPatients(JSON.parse(JSON.stringify(data.patients)))
      setTotalOutstanding(data.totalOutstanding)
      setTotalPatients(data.totalPatients)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  function handleSearch() { fetchData() }

  async function handleCollect() {
    if (!payBillId || !payAmount) return
    setLoading(true)
    try {
      await recordPayment({ billingId: payBillId, amount: parseFloat(payAmount), method: payMethod, reference: payRef || undefined })
      setSuccess(`₹${parseFloat(payAmount).toLocaleString("en-IN")} collected against ${payBillNumber}`)
      setPayBillId(null); setPayAmount(""); setPayRef("")
      fetchData()
      router.refresh()
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  function daysSince(dateStr: string) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-blue-600" />
          Patient Dues
        </h1>
        <p className="text-sm text-slate-500 mt-1">Outstanding patient balances grouped by patient</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm">
          <Check className="w-5 h-5" />{success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2"><AlertTriangle className="w-3.5 h-3.5" /> TOTAL OUTSTANDING</div>
          <div className="text-2xl font-bold text-amber-600">₹{totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2"><Users className="w-3.5 h-3.5" /> PATIENTS WITH DUES</div>
          <div className="text-2xl font-bold text-slate-800">{totalPatients}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2"><IndianRupee className="w-3.5 h-3.5" /> AVG DUE PER PATIENT</div>
          <div className="text-2xl font-bold text-slate-800">₹{totalPatients > 0 ? (totalOutstanding / totalPatients).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0"}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by patient name, phone, or bill number..."
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <button onClick={handleSearch} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && patients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No outstanding dues found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((pt) => (
              <div key={pt.patientId}>
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === pt.patientId ? null : pt.patientId)}>
                  <div className="flex items-center gap-4">
                    {expandedId === pt.patientId ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{pt.patientName}</div>
                      <div className="text-xs text-slate-400">{pt.uhid || "—"} {pt.phone ? `• ${pt.phone}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">{pt.billCount} bill{pt.billCount > 1 ? "s" : ""}</div>
                      <div className="text-xs text-slate-400">Oldest: {daysSince(pt.oldestBillDate)}d ago</div>
                    </div>
                    <div className="text-lg font-bold text-amber-600 min-w-[120px] text-right">₹{pt.totalDue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>

                {expandedId === pt.patientId && (
                  <div className="bg-slate-50 px-8 py-3 border-t border-slate-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200">
                          <th className="text-left py-2 font-medium">Bill #</th>
                          <th className="text-left py-2 font-medium">Date</th>
                          <th className="text-left py-2 font-medium">Type</th>
                          <th className="text-right py-2 font-medium">Net (₹)</th>
                          <th className="text-right py-2 font-medium">Paid (₹)</th>
                          <th className="text-right py-2 font-medium">Balance (₹)</th>
                          <th className="text-right py-2 font-medium">Age</th>
                          <th className="text-center py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pt.bills.map((bill) => (
                          <tr key={bill.id} className="border-b border-slate-100">
                            <td className="py-2 font-mono text-slate-700">{bill.billNumber}</td>
                            <td className="py-2 text-slate-600">{new Date(bill.billDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                            <td className="py-2 text-slate-500">{bill.type}</td>
                            <td className="py-2 text-right text-slate-700">₹{bill.netAmount.toLocaleString("en-IN")}</td>
                            <td className="py-2 text-right text-emerald-600">₹{bill.paidAmount.toLocaleString("en-IN")}</td>
                            <td className="py-2 text-right font-semibold text-amber-600">₹{bill.balanceAmount.toLocaleString("en-IN")}</td>
                            <td className="py-2 text-right text-slate-400">{daysSince(bill.billDate)}d</td>
                            <td className="py-2 text-center">
                              <button onClick={(e) => { e.stopPropagation(); setPayBillId(bill.id); setPayBillNumber(bill.billNumber); setPayBalance(bill.balanceAmount); setPayAmount(bill.balanceAmount.toString()); }}
                                className="text-blue-600 hover:underline font-medium">Collect</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Payment Modal */}
      {payBillId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setPayBillId(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-slate-700">Collect Payment — {payBillNumber}</h3>
            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">Balance: <strong>₹{payBalance.toLocaleString("en-IN")}</strong></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reference</label>
              <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Optional" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleCollect} disabled={loading || !payAmount} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex-1">
                {loading ? "Processing..." : "Collect"}
              </button>
              <button onClick={() => setPayBillId(null)} className="text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
