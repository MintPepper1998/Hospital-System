"use client"

import { useState, useTransition } from "react"
import { Building2, Shield, Landmark, Search, Plus, ToggleLeft, ToggleRight, Pencil, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { createInsuranceProvider, updateInsuranceProvider, toggleInsuranceProviderStatus, type InsuranceProviderFormData } from "@/app/actions/insurance-providers"

type Provider = {
  id: string; name: string; shortName: string | null; providerType: string
  supportsCashless: boolean; supportsReimbursement: boolean; defaultSettlementType: string
  isEmpaneled: boolean; empanelmentDate: string | null; empanelmentExpiry: string | null
  empanelmentNumber: string | null; contactPerson: string | null; contactPhone: string | null
  contactEmail: string | null; claimSubmissionEmail: string | null; website: string | null
  defaultCopayPercent: number | null; defaultRoomRentCap: number | null
  defaultIcuRentCap: number | null; defaultDeductible: number | null
  linkedTpaId: string | null; isActive: boolean; notes: string | null
  linkedTpa: { id: string; name: string } | null
  _count: { tariffs: number; linkedInsurers: number }
}

type Stats = { total: number; activeInsurers: number; activeTpas: number; empaneled: number; govtSchemes: number; expiringEmpanelment: number }

const EMPTY: InsuranceProviderFormData = {
  name: "", shortName: "", providerType: "INSURER", supportsCashless: true,
  supportsReimbursement: true, defaultSettlementType: "CASHLESS", isEmpaneled: false,
  empanelmentDate: null, empanelmentExpiry: null, empanelmentNumber: "",
  contactPerson: "", contactPhone: "", contactEmail: "", claimSubmissionEmail: "",
  website: "", defaultCopayPercent: 0, defaultRoomRentCap: null, defaultIcuRentCap: null,
  defaultDeductible: null, linkedTpaId: null, isActive: true, notes: "",
}

export function InsuranceProvidersClient({ initialProviders, initialStats }: { initialProviders: Provider[]; initialStats: Stats }) {
  const [providers, setProviders] = useState(initialProviders)
  const [stats] = useState(initialStats)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<InsuranceProviderFormData>(EMPTY)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const filtered = providers.filter(p => {
    if (typeFilter !== "ALL" && p.providerType !== typeFilter) return false
    if (statusFilter === "ACTIVE" && !p.isActive) return false
    if (statusFilter === "INACTIVE" && p.isActive) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.shortName || "").toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const tpas = providers.filter(p => p.providerType === "TPA" && p.isActive)

  function openAdd() { setForm(EMPTY); setEditingId(null); setShowModal(true) }
  function openEdit(p: Provider) {
    setForm({
      name: p.name, shortName: p.shortName || "", providerType: p.providerType as any,
      supportsCashless: p.supportsCashless, supportsReimbursement: p.supportsReimbursement,
      defaultSettlementType: p.defaultSettlementType, isEmpaneled: p.isEmpaneled,
      empanelmentDate: p.empanelmentDate?.split("T")[0] || null,
      empanelmentExpiry: p.empanelmentExpiry?.split("T")[0] || null,
      empanelmentNumber: p.empanelmentNumber || "", contactPerson: p.contactPerson || "",
      contactPhone: p.contactPhone || "", contactEmail: p.contactEmail || "",
      claimSubmissionEmail: p.claimSubmissionEmail || "", website: p.website || "",
      defaultCopayPercent: p.defaultCopayPercent, defaultRoomRentCap: p.defaultRoomRentCap,
      defaultIcuRentCap: p.defaultIcuRentCap, defaultDeductible: p.defaultDeductible,
      linkedTpaId: p.linkedTpaId, isActive: p.isActive, notes: p.notes || "",
    })
    setEditingId(p.id); setShowModal(true)
  }

  async function handleSave() {
    startTransition(async () => {
      const res = editingId ? await updateInsuranceProvider(editingId, form) : await createInsuranceProvider(form)
      setMessage({ type: res.success ? "success" : "error", text: res.message })
      if (res.success) { setShowModal(false); window.location.reload() }
      setTimeout(() => setMessage(null), 4000)
    })
  }

  async function handleToggle(id: string) {
    startTransition(async () => {
      const res = await toggleInsuranceProviderStatus(id)
      setMessage({ type: res.success ? "success" : "error", text: res.message })
      if (res.success) window.location.reload()
      setTimeout(() => setMessage(null), 4000)
    })
  }

  const typeIcon = (t: string) => t === "TPA" ? <Shield className="w-4 h-4" /> : t === "GOVT_SCHEME" ? <Landmark className="w-4 h-4" /> : <Building2 className="w-4 h-4" />
  const typeColor = (t: string) => t === "TPA" ? "bg-purple-50 text-purple-700 border-purple-200" : t === "GOVT_SCHEME" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
  const typeLabel = (t: string) => t === "TPA" ? "TPA" : t === "GOVT_SCHEME" ? "Govt Scheme" : "Insurer"

  return (
    <div className="space-y-6">
      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, color: "bg-gray-50 border-gray-200" },
          { label: "Insurers", value: stats.activeInsurers, color: "bg-blue-50 border-blue-200" },
          { label: "TPAs", value: stats.activeTpas, color: "bg-purple-50 border-purple-200" },
          { label: "Govt Schemes", value: stats.govtSchemes, color: "bg-amber-50 border-amber-200" },
          { label: "Empaneled", value: stats.empaneled, color: "bg-emerald-50 border-emerald-200" },
          { label: "Expiring Soon", value: stats.expiringEmpanelment, color: stats.expiringEmpanelment > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none" placeholder="Search providers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="INSURER">Insurers</option>
          <option value="TPA">TPAs</option>
          <option value="GOVT_SCHEME">Govt Schemes</option>
        </select>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Provider</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Settlement</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Empaneled</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Linked TPA</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(p => (
              <>
                <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${!p.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.shortName && <div className="text-xs text-gray-400">{p.shortName}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${typeColor(p.providerType)}`}>
                      {typeIcon(p.providerType)} {typeLabel(p.providerType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-1.5">
                      {p.supportsCashless && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Cashless</span>}
                      {p.supportsReimbursement && <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">Reimburse</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {p.isEmpaneled ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{p.linkedTpa?.name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Details">
                        {expandedId === p.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleToggle(p.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title={p.isActive ? "Deactivate" : "Activate"}>
                        {p.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr key={p.id + "-detail"}>
                    <td colSpan={7} className="px-4 py-4 bg-gray-50/70">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div><span className="text-gray-400 block">Contact</span><span className="text-gray-700">{p.contactPerson || "—"}</span></div>
                        <div><span className="text-gray-400 block">Phone</span><span className="text-gray-700">{p.contactPhone || "—"}</span></div>
                        <div><span className="text-gray-400 block">Email</span><span className="text-gray-700">{p.contactEmail || "—"}</span></div>
                        <div><span className="text-gray-400 block">Claims Email</span><span className="text-gray-700">{p.claimSubmissionEmail || "—"}</span></div>
                        <div><span className="text-gray-400 block">Default Co-pay</span><span className="text-gray-700">{p.defaultCopayPercent ?? 0}%</span></div>
                        <div><span className="text-gray-400 block">Room Rent Cap</span><span className="text-gray-700">{p.defaultRoomRentCap ? `₹${p.defaultRoomRentCap.toLocaleString()}` : "—"}</span></div>
                        <div><span className="text-gray-400 block">ICU Cap</span><span className="text-gray-700">{p.defaultIcuRentCap ? `₹${p.defaultIcuRentCap.toLocaleString()}` : "—"}</span></div>
                        <div><span className="text-gray-400 block">Deductible</span><span className="text-gray-700">{p.defaultDeductible ? `₹${p.defaultDeductible.toLocaleString()}` : "—"}</span></div>
                        {p.empanelmentNumber && <div><span className="text-gray-400 block">Empanelment #</span><span className="text-gray-700">{p.empanelmentNumber}</span></div>}
                        {p.empanelmentExpiry && <div><span className="text-gray-400 block">Empanelment Expiry</span><span className="text-gray-700">{new Date(p.empanelmentExpiry).toLocaleDateString("en-IN")}</span></div>}
                        {p.notes && <div className="col-span-2"><span className="text-gray-400 block">Notes</span><span className="text-gray-700">{p.notes}</span></div>}
                        <div><span className="text-gray-400 block">Tariff Rates</span><span className="text-gray-700">{p._count.tariffs} procedures</span></div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No providers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl m-4" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? "Edit Provider" : "Add Provider"}</h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label><input className="w-full px-3 py-2 text-sm border rounded-lg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Short Name</label><input className="w-full px-3 py-2 text-sm border rounded-lg" value={form.shortName || ""} onChange={e => setForm({...form, shortName: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type *</label>
                  <select className="w-full px-3 py-2 text-sm border rounded-lg" value={form.providerType} onChange={e => setForm({...form, providerType: e.target.value as any})}>
                    <option value="INSURER">Insurance Company</option>
                    <option value="TPA">TPA</option>
                    <option value="GOVT_SCHEME">Government Scheme</option>
                  </select>
                </div>
                {form.providerType === "INSURER" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Linked TPA</label>
                    <select className="w-full px-3 py-2 text-sm border rounded-lg" value={form.linkedTpaId || ""} onChange={e => setForm({...form, linkedTpaId: e.target.value || null})}>
                      <option value="">None</option>
                      {tpas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Settlement */}
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Settlement Configuration</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.supportsCashless} onChange={e => setForm({...form, supportsCashless: e.target.checked})} className="rounded" /> Cashless</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.supportsReimbursement} onChange={e => setForm({...form, supportsReimbursement: e.target.checked})} className="rounded" /> Reimbursement</label>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Default Settlement</label>
                  <select className="w-full md:w-1/2 px-3 py-2 text-sm border rounded-lg" value={form.defaultSettlementType} onChange={e => setForm({...form, defaultSettlementType: e.target.value})}>
                    <option value="CASHLESS">Cashless</option>
                    <option value="REIMBURSEMENT">Reimbursement</option>
                  </select>
                </div>
              </div>

              {/* Empanelment */}
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Empanelment</p>
                <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={form.isEmpaneled} onChange={e => setForm({...form, isEmpaneled: e.target.checked})} className="rounded" /> Hospital is empaneled</label>
                {form.isEmpaneled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-xs text-gray-600 mb-1">Empanelment #</label><input className="w-full px-3 py-2 text-sm border rounded-lg" value={form.empanelmentNumber || ""} onChange={e => setForm({...form, empanelmentNumber: e.target.value})} /></div>
                    <div><label className="block text-xs text-gray-600 mb-1">From</label><input type="date" className="w-full px-3 py-2 text-sm border rounded-lg" value={form.empanelmentDate || ""} onChange={e => setForm({...form, empanelmentDate: e.target.value})} /></div>
                    <div><label className="block text-xs text-gray-600 mb-1">Expiry</label><input type="date" className="w-full px-3 py-2 text-sm border rounded-lg" value={form.empanelmentExpiry || ""} onChange={e => setForm({...form, empanelmentExpiry: e.target.value})} /></div>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Contact Info</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-600 mb-1">Contact Person</label><input className="w-full px-3 py-2 text-sm border rounded-lg" value={form.contactPerson || ""} onChange={e => setForm({...form, contactPerson: e.target.value})} /></div>
                  <div><label className="block text-xs text-gray-600 mb-1">Phone</label><input className="w-full px-3 py-2 text-sm border rounded-lg" value={form.contactPhone || ""} onChange={e => setForm({...form, contactPhone: e.target.value})} /></div>
                  <div><label className="block text-xs text-gray-600 mb-1">Email</label><input className="w-full px-3 py-2 text-sm border rounded-lg" value={form.contactEmail || ""} onChange={e => setForm({...form, contactEmail: e.target.value})} /></div>
                  <div><label className="block text-xs text-gray-600 mb-1">Claims Email</label><input className="w-full px-3 py-2 text-sm border rounded-lg" value={form.claimSubmissionEmail || ""} onChange={e => setForm({...form, claimSubmissionEmail: e.target.value})} /></div>
                </div>
              </div>

              {/* Default Terms */}
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Default Policy Terms</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="block text-xs text-gray-600 mb-1">Co-pay %</label><input type="number" className="w-full px-3 py-2 text-sm border rounded-lg" value={form.defaultCopayPercent ?? ""} onChange={e => setForm({...form, defaultCopayPercent: e.target.value ? Number(e.target.value) : null})} /></div>
                  <div><label className="block text-xs text-gray-600 mb-1">Room Cap ₹</label><input type="number" className="w-full px-3 py-2 text-sm border rounded-lg" value={form.defaultRoomRentCap ?? ""} onChange={e => setForm({...form, defaultRoomRentCap: e.target.value ? Number(e.target.value) : null})} /></div>
                  <div><label className="block text-xs text-gray-600 mb-1">ICU Cap ₹</label><input type="number" className="w-full px-3 py-2 text-sm border rounded-lg" value={form.defaultIcuRentCap ?? ""} onChange={e => setForm({...form, defaultIcuRentCap: e.target.value ? Number(e.target.value) : null})} /></div>
                  <div><label className="block text-xs text-gray-600 mb-1">Deductible ₹</label><input type="number" className="w-full px-3 py-2 text-sm border rounded-lg" value={form.defaultDeductible ?? ""} onChange={e => setForm({...form, defaultDeductible: e.target.value ? Number(e.target.value) : null})} /></div>
                </div>
              </div>

              {/* Notes */}
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label><textarea className="w-full px-3 py-2 text-sm border rounded-lg" rows={2} value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={isPending || !form.name.trim()} className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
                {isPending ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
