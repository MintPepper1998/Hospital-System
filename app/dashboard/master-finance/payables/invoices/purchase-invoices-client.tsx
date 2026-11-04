"use client"

import { useState, useEffect } from "react"
import {
  getPurchaseInvoices,
  getPurchaseInvoiceSummary,
  createHospitalPurchaseInvoice,
  getHospitalSuppliersList,
  getHospitalAccountsForPayment,
  getHospitalPurchaseInvoiceDetails,
} from "@/app/actions/master-finance-payables"
import {
  FilePen,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  Trash2,
  X,
  Eye,
  Building2,
  CreditCard,
  Printer,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"

interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  grandTotal: number
  amountPaid: number
  status: string
  subTotal: number
  taxTotal: number
  discountAmount: number
  supplier: { id: string; name: string; gstNumber: string | null }
  _count: { items: number; supplierPayments: number }
}

interface ItemRow {
  itemName: string
  hsnCode: string
  quantity: number
  rate: number
  taxPercent: number
  totalAmount: number
}

const TAX_OPTIONS = [0, 5, 12, 18, 28]

const STATUS_COLORS: Record<string, string> = {
  UNPAID: "bg-red-50 text-red-700 border-red-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

export function PurchaseInvoicesClient() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0])
  const [to, setTo] = useState(today.toISOString().split("T")[0])
  const [status, setStatus] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [summary, setSummary] = useState({ unpaidCount: 0, unpaidAmount: 0, monthCount: 0, monthAmount: 0, totalOutstanding: 0 })

  // Modal: New Invoice
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [suppliersList, setSuppliersList] = useState<Array<{ id: string; name: string; gstNumber: string | null }>>([])
  const [accountsList, setAccountsList] = useState<Array<{ id: string; name: string; type: string; currentBalance: number }>>([])

  // Form Fields
  const [formSupplierId, setFormSupplierId] = useState("")
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("")
  const [formDate, setFormDate] = useState(today.toISOString().split("T")[0])
  const [items, setItems] = useState<ItemRow[]>([
    { itemName: "", hsnCode: "", quantity: 1, rate: 0, taxPercent: 12, totalAmount: 0 },
  ])
  const [discountAmount, setDiscountAmount] = useState<number>(0)

  // Payment section in form
  const [paymentChoice, setPaymentChoice] = useState<"UNPAID" | "FULL" | "PARTIAL">("UNPAID")
  const [formAmountPaid, setFormAmountPaid] = useState<string>("")
  const [formAccountId, setFormAccountId] = useState("")
  const [formPaymentMethod, setFormPaymentMethod] = useState("BANK_TRANSFER")
  const [formReferenceNo, setFormReferenceNo] = useState("")
  const [formNotes, setFormNotes] = useState("")

  // Details Drawer
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<any | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  async function fetchData(p = page) {
    setLoading(true)
    try {
      const [res, sum] = await Promise.all([
        getPurchaseInvoices({ from, to, status: status || undefined, search: searchTerm || undefined, page: p, limit: 25 }),
        getPurchaseInvoiceSummary(),
      ])
      setInvoices(JSON.parse(JSON.stringify(res.invoices)))
      setTotal(res.total)
      setTotalPages(res.totalPages)
      setPage(p)
      setSummary(sum)
    } catch (e) {
      console.error(e)
      toast.error("Failed to fetch purchase invoices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1)
  }, [])

  async function openCreateModal() {
    try {
      const [sups, accs] = await Promise.all([
        getHospitalSuppliersList(),
        getHospitalAccountsForPayment(),
      ])
      setSuppliersList(sups)
      setAccountsList(accs)
      if (accs.length > 0 && !formAccountId) {
        setFormAccountId(accs[0].id)
      }
      setItems([{ itemName: "", hsnCode: "", quantity: 1, rate: 0, taxPercent: 12, totalAmount: 0 }])
      setDiscountAmount(0)
      setPaymentChoice("UNPAID")
      setFormAmountPaid("")
      setFormReferenceNo("")
      setFormNotes("")
      setFormInvoiceNumber("")
      setCreateModalOpen(true)
    } catch (e) {
      toast.error("Failed to load options for creating invoice")
    }
  }

  async function openDetails(invoiceId: string) {
    setSelectedInvoiceId(invoiceId)
    setDetailsLoading(true)
    try {
      const details = await getHospitalPurchaseInvoiceDetails(invoiceId)
      setInvoiceDetails(JSON.parse(JSON.stringify(details)))
    } catch (e) {
      console.error(e)
      toast.error("Failed to load invoice details")
    } finally {
      setDetailsLoading(false)
    }
  }

  // Row update helpers
  function updateItem(index: number, updates: Partial<ItemRow>) {
    setItems((prev) => {
      const next = [...prev]
      const current = { ...next[index], ...updates }
      const base = current.quantity * current.rate
      const tax = base * (current.taxPercent / 100)
      current.totalAmount = Math.round((base + tax) * 100) / 100
      next[index] = current
      return next
    })
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { itemName: "", hsnCode: "", quantity: 1, rate: 0, taxPercent: 12, totalAmount: 0 },
    ])
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      toast.error("An invoice must have at least one item")
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculated totals
  const subTotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const taxTotal = items.reduce(
    (sum, item) => sum + (item.quantity * item.rate * item.taxPercent) / 100,
    0
  )
  const computedGrandTotal = Math.max(0, Math.round((subTotal + taxTotal - (discountAmount || 0)) * 100) / 100)

  // Sync paid amount if FULL
  useEffect(() => {
    if (paymentChoice === "FULL") {
      setFormAmountPaid(String(computedGrandTotal))
    } else if (paymentChoice === "UNPAID") {
      setFormAmountPaid("0")
    }
  }, [paymentChoice, computedGrandTotal])

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault()
    if (!formSupplierId) {
      toast.error("Please select a supplier")
      return
    }
    if (!formInvoiceNumber.trim()) {
      toast.error("Invoice number is required")
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
      if (item.rate < 0) {
        toast.error(`Rate cannot be negative for line #${idx + 1}`)
        return
      }
    }

    const payVal = paymentChoice === "UNPAID" ? 0 : Number(formAmountPaid) || 0
    if (payVal > 0 && !formAccountId) {
      toast.error("Please select an account for the payment")
      return
    }
    if (payVal > computedGrandTotal) {
      toast.error("Payment amount cannot exceed grand total")
      return
    }

    setSubmitting(true)
    try {
      const res = await createHospitalPurchaseInvoice({
        supplierId: formSupplierId,
        invoiceNumber: formInvoiceNumber.trim(),
        date: formDate,
        items,
        subTotal,
        taxTotal,
        discountAmount,
        grandTotal: computedGrandTotal,
        amountPaid: payVal,
        accountId: payVal > 0 ? formAccountId : undefined,
        paymentMethod: payVal > 0 ? formPaymentMethod : undefined,
        referenceNo: payVal > 0 ? formReferenceNo : undefined,
        notes: formNotes,
      })

      if (res.success) {
        toast.success(res.message)
        setCreateModalOpen(false)
        fetchData(1)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create invoice")
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
            <FilePen className="w-6 h-6 text-blue-600" />
            Purchase Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1">Hospital purchases, supplier bills, taxes, and payments</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          New Purchase Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            MONTH PURCHASES
          </div>
          <div className="text-2xl font-bold text-slate-800">
            ₹{summary.monthAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">{summary.monthCount} invoices recorded this month</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            TOTAL OUTSTANDING
          </div>
          <div className="text-2xl font-bold text-amber-600">
            ₹{summary.totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">{summary.unpaidCount} unpaid/partial invoices</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            UNPAID BALANCE
          </div>
          <div className="text-2xl font-bold text-red-600">
            ₹{summary.unpaidAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Pending supplier clearance</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
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
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[130px]"
            >
              <option value="">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Invoice # or supplier name..."
              onKeyDown={(e) => e.key === "Enter" && fetchData(1)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => fetchData(1)}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
          >
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">{total} invoices found</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchData(page - 1)}
              className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchData(page + 1)}
              className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-3 font-medium">Invoice #</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Supplier</th>
                <th className="text-right p-3 font-medium">SubTotal</th>
                <th className="text-right p-3 font-medium">Tax</th>
                <th className="text-right p-3 font-medium">Grand Total</th>
                <th className="text-right p-3 font-medium">Paid</th>
                <th className="text-right p-3 font-medium">Balance</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Items</th>
                <th className="text-center p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400">
                    No purchase invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const balance = inv.grandTotal - inv.amountPaid
                  return (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-xs font-mono text-slate-800 font-semibold">{inv.invoiceNumber}</td>
                      <td className="p-3 text-xs text-slate-600">
                        {new Date(inv.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-slate-800 font-medium">{inv.supplier.name}</div>
                        {inv.supplier.gstNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">{inv.supplier.gstNumber}</div>
                        )}
                      </td>
                      <td className="p-3 text-right text-xs text-slate-600">₹{inv.subTotal.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right text-xs text-slate-500">₹{inv.taxTotal.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right text-xs font-bold text-slate-800">
                        ₹{inv.grandTotal.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right text-xs text-emerald-600 font-medium">
                        ₹{inv.amountPaid.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right text-xs font-bold text-amber-600">
                        {balance > 0.01 ? `₹${balance.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-center text-xs text-slate-500">{inv._count.items}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openDetails(inv.id)}
                          className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Invoice Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FilePen className="w-5 h-5 text-blue-600" />
                  New Purchase Invoice
                </h2>
                <p className="text-xs text-slate-500">Record a purchase bill for hospital supplies and consumables</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Supplier & Invoice metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-0891"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Line Items & Charges</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="text-left p-2.5 font-semibold">Item Description *</th>
                        <th className="text-left p-2.5 font-semibold w-24">HSN Code</th>
                        <th className="text-right p-2.5 font-semibold w-20">Qty *</th>
                        <th className="text-right p-2.5 font-semibold w-24">Rate (₹) *</th>
                        <th className="text-right p-2.5 font-semibold w-24">Tax %</th>
                        <th className="text-right p-2.5 font-semibold w-28">Amount (₹)</th>
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
                              placeholder="e.g. Nitrile Examination Gloves (Box of 100)"
                              value={item.itemName}
                              onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="9018"
                              value={item.hsnCode}
                              onChange={(e) => updateItem(idx, { hsnCode: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 font-mono"
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
                              min="0"
                              step="0.01"
                              required
                              value={item.rate || ""}
                              onChange={(e) => updateItem(idx, { rate: Math.max(0, Number(e.target.value)) })}
                              placeholder="0.00"
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right outline-none focus:border-blue-500 font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.taxPercent}
                              onChange={(e) => updateItem(idx, { taxPercent: Number(e.target.value) })}
                              className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right outline-none focus:border-blue-500"
                            >
                              {TAX_OPTIONS.map((t) => (
                                <option key={t} value={t}>
                                  {t}%
                                </option>
                              ))}
                            </select>
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
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-600">Discount (₹):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="0.00"
                    className="w-28 border border-slate-300 rounded px-2 py-1 text-xs font-mono outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-6 text-xs text-slate-600 justify-end">
                  <div>
                    SubTotal: <span className="font-semibold text-slate-800">₹{subTotal.toFixed(2)}</span>
                  </div>
                  <div>
                    Tax: <span className="font-semibold text-slate-800">₹{taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    Grand Total: <span className="text-blue-600">₹{computedGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    Payment Options
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentChoice"
                        checked={paymentChoice === "UNPAID"}
                        onChange={() => setPaymentChoice("UNPAID")}
                      />
                      Credit (Unpaid)
                    </label>
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentChoice"
                        checked={paymentChoice === "FULL"}
                        onChange={() => setPaymentChoice("FULL")}
                      />
                      Full Payment
                    </label>
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentChoice"
                        checked={paymentChoice === "PARTIAL"}
                        onChange={() => setPaymentChoice("PARTIAL")}
                      />
                      Partial Payment
                    </label>
                  </div>
                </div>

                {paymentChoice !== "UNPAID" && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Amount to Pay (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        max={computedGrandTotal}
                        step="0.01"
                        required
                        value={formAmountPaid}
                        onChange={(e) => setFormAmountPaid(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Paid From Account <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formAccountId}
                        onChange={(e) => setFormAccountId(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {accountsList.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} (Bal: ₹{acc.currentBalance.toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Method</label>
                      <select
                        value={formPaymentMethod}
                        onChange={(e) => setFormPaymentMethod(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                        <option value="UPI">UPI</option>
                        <option value="CASH">Cash</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reference / UTR / Cheque #</label>
                      <input
                        type="text"
                        value={formReferenceNo}
                        onChange={(e) => setFormReferenceNo(e.target.value)}
                        placeholder="e.g. UTR12345678"
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 shadow-sm"
                >
                  {submitting ? "Saving Invoice..." : "Create Purchase Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Drawer */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setSelectedInvoiceId(null)}>
          <div
            className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {invoiceDetails ? `Invoice #${invoiceDetails.invoiceNumber}` : "Invoice Details"}
                </h2>
                <p className="text-xs text-slate-400">Detailed breakdown & payment history</p>
              </div>
              <button onClick={() => setSelectedInvoiceId(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {detailsLoading || !invoiceDetails ? (
              <div className="p-12 text-center text-slate-400">Loading invoice details...</div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Meta Card */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Supplier</span>
                    <span className="font-semibold text-slate-800">{invoiceDetails.supplier?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Date</span>
                    <span className="font-medium text-slate-800">
                      {new Date(invoiceDetails.date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Status</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        STATUS_COLORS[invoiceDetails.status] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {invoiceDetails.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">GSTIN</span>
                    <span className="font-mono text-slate-600">{invoiceDetails.supplier?.gstNumber || "—"}</span>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Line Items</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <th className="text-left p-2.5 font-medium">#</th>
                          <th className="text-left p-2.5 font-medium">Item Description</th>
                          <th className="text-right p-2.5 font-medium">Qty</th>
                          <th className="text-right p-2.5 font-medium">Rate (₹)</th>
                          <th className="text-right p-2.5 font-medium">Tax %</th>
                          <th className="text-right p-2.5 font-medium">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoiceDetails.items?.map((item: any, idx: number) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-medium text-slate-800">{item.itemName}</td>
                            <td className="p-2.5 text-right text-slate-600">{item.quantity}</td>
                            <td className="p-2.5 text-right text-slate-600">₹{item.rate.toLocaleString("en-IN")}</td>
                            <td className="p-2.5 text-right text-slate-500">{item.taxPercent}%</td>
                            <td className="p-2.5 text-right font-semibold text-slate-800">
                              ₹{item.totalAmount.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals */}
                  <div className="mt-3 flex flex-col items-end gap-1 text-xs text-slate-600">
                    <div>
                      SubTotal: <span className="font-medium text-slate-800">₹{invoiceDetails.subTotal.toFixed(2)}</span>
                    </div>
                    <div>
                      Tax: <span className="font-medium text-slate-800">₹{invoiceDetails.taxTotal.toFixed(2)}</span>
                    </div>
                    {invoiceDetails.discountAmount > 0 && (
                      <div>
                        Discount:{" "}
                        <span className="font-medium text-red-600">-₹{invoiceDetails.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                      Grand Total: <span className="text-blue-600">₹{invoiceDetails.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="text-xs font-semibold text-emerald-600">
                      Paid: ₹{invoiceDetails.amountPaid.toFixed(2)}
                    </div>
                    {invoiceDetails.grandTotal - invoiceDetails.amountPaid > 0 && (
                      <div className="text-xs font-semibold text-amber-600">
                        Balance Due: ₹{(invoiceDetails.grandTotal - invoiceDetails.amountPaid).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payments History */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    Payments Against This Invoice ({invoiceDetails.supplierPayments?.length || 0})
                  </h3>
                  <div className="space-y-1.5">
                    {invoiceDetails.supplierPayments?.map((pm: any) => (
                      <div
                        key={pm.id}
                        className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-lg text-xs border border-emerald-100"
                      >
                        <div>
                          <span className="font-semibold text-emerald-800">{pm.paymentMethod.replace(/_/g, " ")}</span>
                          <span className="text-slate-400 ml-2">
                            {new Date(pm.date).toLocaleDateString("en-IN")}
                          </span>
                          {pm.referenceNo && (
                            <span className="text-slate-500 ml-2 font-mono">Ref: {pm.referenceNo}</span>
                          )}
                          {pm.account && <span className="text-slate-500 ml-2">({pm.account.name})</span>}
                        </div>
                        <span className="text-emerald-700 font-bold">₹{pm.amount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    {(!invoiceDetails.supplierPayments || invoiceDetails.supplierPayments.length === 0) && (
                      <p className="text-xs text-slate-400 py-1">No payments recorded for this invoice yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
