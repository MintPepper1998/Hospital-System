"use client"

import { useState, useEffect } from "react"
import {
  getSuppliers,
  getSupplierLedger,
  createHospitalSupplier,
  updateHospitalSupplier,
  toggleSupplierStatus,
} from "@/app/actions/master-finance-payables"
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Mail,
  IndianRupee,
  X,
  FileText,
  ArrowLeftRight,
  CreditCard,
  Plus,
  Edit2,
  CheckCircle2,
  Power,
  Layers,
} from "lucide-react"
import { toast } from "sonner"

interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  gstNumber: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  isActive: boolean
  scope: string
  creditDays: number | null
  openingBalance: number
  _count: { purchases: number; purchaseOrders: number; supplierPayments: number; purchaseReturns: number }
}

interface LedgerData {
  supplier: any
  invoices: Array<{ id: string; invoiceNumber: string; date: string; grandTotal: number; amountPaid: number; status: string }>
  payments: Array<{ id: string; amount: number; paymentMethod: string; referenceNo: string | null; date: string; notes: string | null }>
  returns: Array<{ id: string; returnNumber: string; date: string; totalAmount: number; reason: string }>
  totalPurchases: number
  totalPaid: number
  totalReturns: number
  balance: number
}

interface SupplierFormState {
  id?: string
  name: string
  contactPerson: string
  phone: string
  email: string
  gstNumber: string
  address: string
  city: string
  state: string
  pincode: string
  creditDays: string
  openingBalance: string
  scope: "HOSPITAL" | "BOTH"
}

const initialForm: SupplierFormState = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  gstNumber: "",
  address: "",
  city: "",
  state: "Odisha",
  pincode: "",
  creditDays: "30",
  openingBalance: "0",
  scope: "HOSPITAL",
}

export function SupplierDirectoryClient() {
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Ledger drawer
  const [ledger, setLedger] = useState<LedgerData | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<SupplierFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getSuppliers({ search: search || undefined, active: showInactive ? undefined : true })
      setSuppliers(JSON.parse(JSON.stringify(data)))
    } catch (e) {
      console.error(e)
      toast.error("Failed to fetch suppliers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [showInactive])

  async function openLedger(supplierId: string) {
    setLedgerLoading(true)
    try {
      const data = await getSupplierLedger(supplierId)
      setLedger(JSON.parse(JSON.stringify(data)))
    } catch (e) {
      console.error(e)
      toast.error("Failed to load supplier ledger")
    } finally {
      setLedgerLoading(false)
    }
  }

  function handleOpenCreate() {
    setIsEditing(false)
    setFormData(initialForm)
    setModalOpen(true)
  }

  function handleOpenEdit(sup: Supplier) {
    setIsEditing(true)
    setFormData({
      id: sup.id,
      name: sup.name,
      contactPerson: sup.contactPerson || "",
      phone: sup.phone || "",
      email: sup.email || "",
      gstNumber: sup.gstNumber || "",
      address: sup.address || "",
      city: sup.city || "",
      state: sup.state || "Odisha",
      pincode: sup.pincode || "",
      creditDays: sup.creditDays ? String(sup.creditDays) : "30",
      openingBalance: String(sup.openingBalance || 0),
      scope: (sup.scope === "BOTH" ? "BOTH" : "HOSPITAL") as "HOSPITAL" | "BOTH",
    })
    setModalOpen(true)
  }

  async function handleToggleStatus(sup: Supplier) {
    try {
      const res = await toggleSupplierStatus(sup.id)
      if (res.success) {
        toast.success(res.message)
        fetchData()
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error("Error updating supplier status")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Supplier name is required")
      return
    }

    setSubmitting(true)
    try {
      if (isEditing && formData.id) {
        const res = await updateHospitalSupplier(formData.id, {
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          gstNumber: formData.gstNumber.trim() || undefined,
          address: formData.address.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          pincode: formData.pincode.trim() || undefined,
          creditDays: formData.creditDays ? Number(formData.creditDays) : undefined,
          openingBalance: Number(formData.openingBalance) || 0,
          scope: formData.scope,
        })
        if (res.success) {
          toast.success("Supplier updated successfully")
          setModalOpen(false)
          fetchData()
        } else {
          toast.error(res.message)
        }
      } else {
        const res = await createHospitalSupplier({
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          gstNumber: formData.gstNumber.trim() || undefined,
          address: formData.address.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          pincode: formData.pincode.trim() || undefined,
          creditDays: formData.creditDays ? Number(formData.creditDays) : undefined,
          openingBalance: Number(formData.openingBalance) || 0,
          scope: formData.scope,
        })
        if (res.success) {
          toast.success("Supplier created successfully")
          setModalOpen(false)
          fetchData()
        } else {
          toast.error(res.message)
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save supplier")
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
            <Building2 className="w-6 h-6 text-blue-600" />
            Supplier Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">Hospital supplier directory with GST, scopes, and full ledger</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          New Supplier
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by supplier name, GSTIN, or contact person..."
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer px-3 py-2 select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="text-xs text-slate-500">{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} found</div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No suppliers found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              Get started by registering a hospital supplier to create purchase invoices and track payables.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add First Supplier
            </button>
          </div>
        ) : (
          suppliers.map((sup) => (
            <div
              key={sup.id}
              className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow relative flex flex-col justify-between ${
                sup.isActive ? "border-slate-200" : "border-red-100 bg-red-50/20"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-800 leading-snug">{sup.name}</div>
                    {sup.contactPerson && (
                      <div className="text-xs text-slate-500 mt-0.5">Attn: {sup.contactPerson}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        sup.scope === "BOTH"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {sup.scope === "BOTH" ? "Hospital & Pharmacy" : "Hospital Only"}
                    </span>
                    {!sup.isActive && (
                      <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {sup.gstNumber && (
                  <div className="text-[11px] font-mono text-slate-500 mb-2 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100">
                    GSTIN: {sup.gstNumber}
                  </div>
                )}

                <div className="space-y-1.5 mb-3 text-xs text-slate-600">
                  {sup.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  {(sup.city || sup.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {[sup.city, sup.state].filter(Boolean).join(", ")} {sup.pincode || ""}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-2 text-[10px] text-slate-500 border-t border-slate-100 pt-2.5 mb-3">
                  <span className="font-medium text-slate-700">{sup._count.purchases} Invoices</span>
                  <span>•</span>
                  <span>{sup._count.supplierPayments} Payments</span>
                  <span>•</span>
                  <span>{sup._count.purchaseReturns} Returns</span>
                  {sup.creditDays ? (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 font-medium">{sup.creditDays}d Credit</span>
                    </>
                  ) : null}
                  {sup.openingBalance > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600 font-medium">Opening: ₹{sup.openingBalance.toLocaleString("en-IN")}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openLedger(sup.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  <IndianRupee className="w-3.5 h-3.5" /> View Ledger
                </button>
                <button
                  onClick={() => handleOpenEdit(sup)}
                  title="Edit Supplier"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggleStatus(sup)}
                  title={sup.isActive ? "Deactivate Supplier" : "Activate Supplier"}
                  className={`p-2 rounded-lg border transition-colors ${
                    sup.isActive
                      ? "text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200"
                      : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {isEditing ? "Edit Supplier" : "Add New Supplier"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Surgicals & Medical Devices"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value as "HOSPITAL" | "BOTH" })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="HOSPITAL">Hospital Only</option>
                    <option value="BOTH">Shared (Hospital & Pharmacy)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="21XXXXX0000X1Z5"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Rajesh Mohanty"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@supplier.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot No. 124, Saheed Nagar"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Bhubaneswar"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Odisha"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="751007"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Days</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.creditDays}
                    onChange={(e) => setFormData({ ...formData, creditDays: e.target.value })}
                    placeholder="30"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
                  {submitting ? "Saving..." : isEditing ? "Update Supplier" : "Create Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Ledger Drawer */}
      {ledger && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setLedger(null)}>
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{ledger.supplier?.name}</h2>
                <p className="text-xs text-slate-400">Supplier Ledger & Statement of Account</p>
              </div>
              <button onClick={() => setLedger(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {ledgerLoading ? (
              <div className="p-8 text-center text-slate-400">Loading ledger...</div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Ledger Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Total Purchases</div>
                    <div className="text-lg font-bold text-slate-800">₹{ledger.totalPurchases.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="text-xs text-emerald-600 mb-1">Total Paid</div>
                    <div className="text-lg font-bold text-emerald-700">₹{ledger.totalPaid.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="text-xs text-red-600 mb-1">Returns / Debits</div>
                    <div className="text-lg font-bold text-red-700">₹{ledger.totalReturns.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="text-xs text-amber-600 mb-1">Outstanding Balance</div>
                    <div className="text-lg font-bold text-amber-700">₹{ledger.balance.toLocaleString("en-IN")}</div>
                  </div>
                </div>

                {/* Invoices */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600" /> Invoices ({ledger.invoices.length})
                  </h3>
                  <div className="space-y-1.5">
                    {ledger.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2.5 px-3.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                        <div>
                          <span className="font-mono text-slate-700 font-semibold">{inv.invoiceNumber}</span>
                          <span className="text-slate-400 ml-2">
                            {new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-800 font-semibold">₹{inv.grandTotal.toLocaleString("en-IN")}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-700"
                                : inv.status === "PARTIAL"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {ledger.invoices.length === 0 && <p className="text-xs text-slate-400 py-2">No invoices recorded</p>}
                  </div>
                </div>

                {/* Payments */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Payments ({ledger.payments.length})
                  </h3>
                  <div className="space-y-1.5">
                    {ledger.payments.map((pm) => (
                      <div key={pm.id} className="flex items-center justify-between py-2.5 px-3.5 bg-emerald-50/60 rounded-lg text-xs border border-emerald-100">
                        <div>
                          <span className="text-emerald-800 font-semibold">{pm.paymentMethod.replace(/_/g, " ")}</span>
                          <span className="text-slate-400 ml-2">
                            {new Date(pm.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                          </span>
                          {pm.referenceNo && <span className="text-slate-500 ml-2 font-mono">Ref: {pm.referenceNo}</span>}
                        </div>
                        <span className="text-emerald-700 font-bold">₹{pm.amount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    {ledger.payments.length === 0 && <p className="text-xs text-slate-400 py-2">No payments recorded</p>}
                  </div>
                </div>

                {/* Returns */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-red-600" /> Returns & Debit Notes ({ledger.returns.length})
                  </h3>
                  <div className="space-y-1.5">
                    {ledger.returns.map((ret) => (
                      <div key={ret.id} className="flex items-center justify-between py-2.5 px-3.5 bg-red-50/60 rounded-lg text-xs border border-red-100">
                        <div>
                          <span className="font-mono text-red-800 font-semibold">{ret.returnNumber}</span>
                          <span className="text-slate-400 ml-2">
                            {new Date(ret.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                          </span>
                          <span className="text-slate-500 ml-2 truncate max-w-[150px] inline-block">{ret.reason}</span>
                        </div>
                        <span className="text-red-700 font-bold">₹{ret.totalAmount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    {ledger.returns.length === 0 && <p className="text-xs text-slate-400 py-2">No returns recorded</p>}
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
