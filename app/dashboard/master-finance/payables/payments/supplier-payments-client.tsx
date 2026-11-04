"use client"

import { useState, useEffect } from "react"
import {
  getSupplierPayments,
  recordHospitalSupplierPayment,
  getHospitalSuppliersList,
  getHospitalAccountsForPayment,
  getHospitalUnpaidInvoices,
} from "@/app/actions/master-finance-payables"
import { BanknoteIcon, Filter, IndianRupee, Plus, X, CreditCard, Building2, Calendar, FileText } from "lucide-react"
import { toast } from "sonner"

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  referenceNo: string | null
  notes: string | null
  date: string
  supplier: { name: string }
  invoice: { invoiceNumber: string } | null
  account: { name: string; type: string } | null
}

interface UnpaidInvoice {
  id: string
  invoiceNumber: string
  date: Date
  grandTotal: number
  amountPaid: number
  status: string
}

const METHOD_COLORS: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPI: "bg-purple-50 text-purple-700 border-purple-200",
  BANK_TRANSFER: "bg-blue-50 text-blue-700 border-blue-200",
  CHEQUE: "bg-amber-50 text-amber-700 border-amber-200",
  CARD: "bg-cyan-50 text-cyan-700 border-cyan-200",
}

export function SupplierPaymentsClient() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(today.toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalPaid, setTotalPaid] = useState(0)

  // Record Payment Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [suppliersList, setSuppliersList] = useState<Array<{ id: string; name: string; gstNumber: string | null; openingBalance: number }>>([])
  const [accountsList, setAccountsList] = useState<Array<{ id: string; name: string; type: string; currentBalance: number }>>([])

  // Form
  const [supplierId, setSupplierId] = useState("")
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([])
  const [invoiceId, setInvoiceId] = useState("")
  const [amount, setAmount] = useState("")
  const [accountId, setAccountId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER")
  const [referenceNo, setReferenceNo] = useState("")
  const [date, setDate] = useState(today.toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getSupplierPayments({ from, to })
      setPayments(JSON.parse(JSON.stringify(data.payments)))
      setTotalPaid(data.totalPaid)
    } catch (e) {
      console.error(e)
      toast.error("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleOpenModal() {
    try {
      const [sups, accs] = await Promise.all([
        getHospitalSuppliersList(),
        getHospitalAccountsForPayment(),
      ])
      setSuppliersList(sups)
      setAccountsList(accs)
      if (accs.length > 0 && !accountId) {
        setAccountId(accs[0].id)
      }
      setSupplierId("")
      setUnpaidInvoices([])
      setInvoiceId("")
      setAmount("")
      setReferenceNo("")
      setNotes("")
      setDate(today.toISOString().split("T")[0])
      setModalOpen(true)
    } catch (e) {
      toast.error("Failed to load options for payment")
    }
  }

  // When supplier changes, fetch their pending invoices
  async function handleSupplierChange(newSupplierId: string) {
    setSupplierId(newSupplierId)
    setInvoiceId("")
    setAmount("")
    if (!newSupplierId) {
      setUnpaidInvoices([])
      return
    }
    try {
      const invs = await getHospitalUnpaidInvoices(newSupplierId)
      setUnpaidInvoices(JSON.parse(JSON.stringify(invs)))
    } catch (e) {
      console.error(e)
    }
  }

  // When invoice changes, prefill balance
  function handleInvoiceChange(newInvoiceId: string) {
    setInvoiceId(newInvoiceId)
    if (newInvoiceId) {
      const inv = unpaidInvoices.find((i) => i.id === newInvoiceId)
      if (inv) {
        const remaining = Math.round((inv.grandTotal - inv.amountPaid) * 100) / 100
        setAmount(String(remaining))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) {
      toast.error("Please select a supplier")
      return
    }
    const payAmount = Number(amount)
    if (!payAmount || payAmount <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }
    if (!accountId) {
      toast.error("Please select a payment account")
      return
    }

    setSubmitting(true)
    try {
      const res = await recordHospitalSupplierPayment({
        supplierId,
        invoiceId: invoiceId || null,
        amount: payAmount,
        accountId,
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        date,
      })

      if (res.success) {
        toast.success(res.message)
        setModalOpen(false)
        fetchData()
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  // Method breakdown
  const methodBreakdown = payments.reduce((acc, p) => {
    acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BanknoteIcon className="w-6 h-6 text-blue-600" />
            Supplier Payments
          </h1>
          <p className="text-sm text-slate-500 mt-1">Disbursements and payments issued to hospital suppliers</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
            TOTAL PAID
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            ₹{totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">{payments.length} transactions in range</div>
        </div>
        {Object.entries(methodBreakdown)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([method, amount]) => (
            <div key={method} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-medium mb-1">{method.replace(/_/g, " ")}</div>
              <div className="text-xl font-bold text-slate-800">
                ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
          >
            <Filter className="w-4 h-4" /> Apply
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Supplier</th>
                <th className="text-left p-3 font-medium">Invoice #</th>
                <th className="text-center p-3 font-medium">Method</th>
                <th className="text-left p-3 font-medium">Reference</th>
                <th className="text-left p-3 font-medium">Paid From Account</th>
                <th className="text-right p-3 font-medium">Amount (₹)</th>
                <th className="text-left p-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    No supplier payments found
                  </td>
                </tr>
              ) : (
                payments.map((pm) => (
                  <tr key={pm.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-xs text-slate-600">
                      {new Date(pm.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="p-3 text-xs text-slate-800 font-semibold">{pm.supplier.name}</td>
                    <td className="p-3 text-xs font-mono text-slate-600">
                      {pm.invoice?.invoiceNumber ? (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {pm.invoice.invoiceNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unlinked / Direct</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          METHOD_COLORS[pm.paymentMethod] || "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {pm.paymentMethod.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono text-slate-500">{pm.referenceNo || "—"}</td>
                    <td className="p-3 text-xs text-slate-600 font-medium">{pm.account?.name || "—"}</td>
                    <td className="p-3 text-right text-xs font-bold text-emerald-700">
                      ₹{pm.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-xs text-slate-400 max-w-[200px] truncate">{pm.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BanknoteIcon className="w-5 h-5 text-blue-600" />
                  Record Supplier Payment
                </h2>
                <p className="text-xs text-slate-500">Disburse payment to a supplier or against an invoice</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.gstNumber ? `(${s.gstNumber})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Linked Invoice (Optional)
                </label>
                <select
                  value={invoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  disabled={!supplierId}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">Direct / Unlinked Payment (Advance or On-Account)</option>
                  {unpaidInvoices.map((inv) => {
                    const due = inv.grandTotal - inv.amountPaid
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — Due: ₹{due.toLocaleString("en-IN")} (Total: ₹{inv.grandTotal.toLocaleString("en-IN")})
                      </option>
                    )
                  })}
                </select>
                {supplierId && unpaidInvoices.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">No pending invoices for this supplier</p>
                )}
              </div>

              {/* Amount & Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paid From Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {accountsList.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (₹{acc.currentBalance.toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Method & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference / UTR / Cheque #
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. UTR-98217342 or Cheque # 001923"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment description or remittance notes..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 shadow-sm"
                >
                  {submitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
