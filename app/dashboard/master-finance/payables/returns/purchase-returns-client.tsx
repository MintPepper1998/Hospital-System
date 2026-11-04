"use client"

import { useState, useEffect } from "react"
import {
  getPurchaseReturns,
  createHospitalPurchaseReturn,
  getHospitalSuppliersList,
  getHospitalUnpaidInvoices,
} from "@/app/actions/master-finance-payables"
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  Filter,
  Plus,
  Trash2,
  X,
  Building2,
  FileText,
} from "lucide-react"
import { toast } from "sonner"

interface ReturnItem {
  id: string
  itemName: string | null
  quantity: number
  rate: number
  totalAmount: number
  batchNumber: string | null
  medicine: { name: string } | null
}

interface PurchaseReturnRecord {
  id: string
  returnNumber: string
  date: string
  reason: string
  totalAmount: number
  status: string
  supplier: { name: string }
  invoice: { invoiceNumber: string } | null
  items: ReturnItem[]
}

interface ReturnItemInput {
  itemName: string
  quantity: number
  rate: number
  totalAmount: number
}

export function PurchaseReturnsClient() {
  const today = new Date()
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  const [from, setFrom] = useState(threeMonthsAgo.toISOString().split("T")[0])
  const [to, setTo] = useState(today.toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [returns, setReturns] = useState<PurchaseReturnRecord[]>([])
  const [totalReturns, setTotalReturns] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modal: New Purchase Return
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [suppliersList, setSuppliersList] = useState<Array<{ id: string; name: string; gstNumber: string | null }>>([])
  const [invoicesList, setInvoicesList] = useState<Array<{ id: string; invoiceNumber: string }>>([])

  // Form State
  const [supplierId, setSupplierId] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  const [returnDate, setReturnDate] = useState(today.toISOString().split("T")[0])
  const [reason, setReason] = useState("")
  const [items, setItems] = useState<ReturnItemInput[]>([
    { itemName: "", quantity: 1, rate: 0, totalAmount: 0 },
  ])

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getPurchaseReturns({ from, to })
      setReturns(JSON.parse(JSON.stringify(data.returns)))
      setTotalReturns(data.totalReturns)
    } catch (e) {
      console.error(e)
      toast.error("Failed to load purchase returns")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleOpenModal() {
    try {
      const sups = await getHospitalSuppliersList()
      setSuppliersList(sups)
      setSupplierId("")
      setInvoiceId("")
      setInvoicesList([])
      setReturnDate(today.toISOString().split("T")[0])
      setReason("")
      setItems([{ itemName: "", quantity: 1, rate: 0, totalAmount: 0 }])
      setModalOpen(true)
    } catch (e) {
      toast.error("Failed to load suppliers for return note")
    }
  }

  async function handleSupplierChange(newSupplierId: string) {
    setSupplierId(newSupplierId)
    setInvoiceId("")
    if (!newSupplierId) {
      setInvoicesList([])
      return
    }
    try {
      const invs = await getHospitalUnpaidInvoices(newSupplierId)
      setInvoicesList(JSON.parse(JSON.stringify(invs)))
    } catch (e) {
      console.error(e)
    }
  }

  function updateItem(index: number, updates: Partial<ReturnItemInput>) {
    setItems((prev) => {
      const next = [...prev]
      const current = { ...next[index], ...updates }
      current.totalAmount = Math.round(current.quantity * current.rate * 100) / 100
      next[index] = current
      return next
    })
  }

  function addItem() {
    setItems((prev) => [...prev, { itemName: "", quantity: 1, rate: 0, totalAmount: 0 }])
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      toast.error("At least one return item is required")
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const grandReturnTotal = items.reduce((sum, item) => sum + item.totalAmount, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) {
      toast.error("Please select a supplier")
      return
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for the return")
      return
    }
    for (const [idx, item] of items.entries()) {
      if (!item.itemName.trim()) {
        toast.error(`Please provide an item description for line #${idx + 1}`)
        return
      }
      if (item.quantity <= 0) {
        toast.error(`Quantity must be greater than 0 for line #${idx + 1}`)
        return
      }
      if (item.rate <= 0) {
        toast.error(`Rate must be greater than 0 for line #${idx + 1}`)
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await createHospitalPurchaseReturn({
        supplierId,
        invoiceId: invoiceId || null,
        date: returnDate,
        reason: reason.trim(),
        items,
        totalAmount: grandReturnTotal,
      })

      if (res.success) {
        toast.success(res.message)
        setModalOpen(false)
        fetchData()
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to record purchase return")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            Purchase Returns
          </h1>
          <p className="text-sm text-slate-500 mt-1">Debit notes and return orders issued to suppliers</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          New Return Note
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-red-600" />
            TOTAL RETURNS VALUE
          </div>
          <div className="text-2xl font-bold text-red-600">
            ₹{totalReturns.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">{returns.length} debit return notes recorded</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">AVERAGE RETURN VALUE</div>
          <div className="text-2xl font-bold text-slate-800">
            ₹
            {returns.length > 0
              ? (totalReturns / returns.length).toLocaleString("en-IN", { maximumFractionDigits: 0 })
              : "0"}
          </div>
          <div className="text-xs text-slate-400 mt-1">Per return note</div>
        </div>
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

      {/* Returns List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && returns.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading returns...</div>
        ) : returns.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No purchase returns found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {returns.map((ret) => (
              <div key={ret.id}>
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === ret.id ? null : ret.id)}
                >
                  <div className="flex items-center gap-4">
                    {expandedId === ret.id ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-slate-800 font-mono">{ret.returnNumber}</div>
                      <div className="text-xs text-slate-400">
                        <span className="font-medium text-slate-700">{ret.supplier.name}</span> •{" "}
                        {new Date(ret.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                        {ret.invoice && (
                          <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px]">
                            Against Inv: {ret.invoice.invoiceNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 max-w-[200px] truncate">{ret.reason}</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        ret.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {ret.status}
                    </span>
                    <div className="text-base font-bold text-red-600 min-w-[100px] text-right">
                      ₹{ret.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {expandedId === ret.id && (
                  <div className="bg-slate-50/80 px-8 py-3.5 border-t border-slate-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200">
                          <th className="text-left py-2 font-medium">Item Description</th>
                          <th className="text-left py-2 font-medium">Batch / Ref</th>
                          <th className="text-right py-2 font-medium">Qty</th>
                          <th className="text-right py-2 font-medium">Rate (₹)</th>
                          <th className="text-right py-2 font-medium">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ret.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-100/50">
                            <td className="py-2 text-slate-800 font-medium">
                              {item.itemName || item.medicine?.name || "Item"}
                            </td>
                            <td className="py-2 text-slate-500 font-mono">{item.batchNumber || "—"}</td>
                            <td className="py-2 text-right text-slate-700">{item.quantity}</td>
                            <td className="py-2 text-right text-slate-600">₹{item.rate.toLocaleString("en-IN")}</td>
                            <td className="py-2 text-right font-bold text-red-600">
                              ₹{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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

      {/* Record Purchase Return Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                  Record Purchase Return (Debit Note)
                </h2>
                <p className="text-xs text-slate-500">Return items to supplier and debit accounts payable</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Against Invoice (Optional)</label>
                  <select
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                    disabled={!supplierId}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                  >
                    <option value="">No specific invoice</option>
                    {invoicesList.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Return <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Damaged packaging / Expired lot / Wrong specifications"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Returned Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="text-left p-2.5 font-semibold">Item Description *</th>
                        <th className="text-right p-2.5 font-semibold w-24">Qty *</th>
                        <th className="text-right p-2.5 font-semibold w-28">Rate (₹) *</th>
                        <th className="text-right p-2.5 font-semibold w-32">Total (₹)</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Sterile Latex Gloves"
                              value={item.itemName}
                              onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              value={item.rate || ""}
                              onChange={(e) => updateItem(idx, { rate: Math.max(0, Number(e.target.value)) })}
                              placeholder="0.00"
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right outline-none focus:border-blue-500 font-mono"
                            />
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-800 font-mono">
                            ₹{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-3">
                  <div className="text-sm font-bold text-slate-800 bg-red-50 text-red-700 px-4 py-2 rounded-xl border border-red-200">
                    Total Return Amount: ₹{grandReturnTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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
                  className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 shadow-sm"
                >
                  {submitting ? "Saving..." : "Record Purchase Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
