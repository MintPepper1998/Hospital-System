"use client"

import { useState, useMemo } from "react"
import {
  createAccountGroup,
  updateAccountGroup,
  deleteAccountGroup,
} from "@/app/actions/account-groups"
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Folder,
  File,
  Trash2,
  Pencil,
  Shield,
  Search,
  X,
  ShieldCheck,
  Package,
  Landmark,
  BadgeIndianRupee,
  Layers,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface AccountGroup {
  id: string
  code: string
  name: string
  type: string
  nature: string
  scope: string
  parentId: string | null
  isActive: boolean
  isSystemAccount: boolean
  description: string | null
  displayOrder: number
  parent: { id: string; code: string; name: string } | null
  _count: { children: number }
}

interface TreeNodeItem extends AccountGroup {
  children: TreeNodeItem[]
}

const NATURE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-50 text-blue-700 border border-blue-200",
  LIABILITY: "bg-purple-50 text-purple-700 border border-purple-200",
  INCOME: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  EXPENSE: "bg-rose-50 text-rose-700 border border-rose-200",
  EQUITY: "bg-amber-50 text-amber-700 border border-amber-200",
  CONTRA: "bg-slate-100 text-slate-700 border border-slate-200",
}

function buildTree(groups: AccountGroup[]): TreeNodeItem[] {
  const map = new Map<string, TreeNodeItem>()
  const roots: TreeNodeItem[] = []

  groups.forEach((g) => map.set(g.id, { ...g, children: [] }))
  groups.forEach((g) => {
    const node = map.get(g.id)!
    if (g.parentId && map.has(g.parentId)) {
      map.get(g.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function PharmacyTreeNode({
  node,
  level = 0,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: TreeNodeItem
  level?: number
  onAddChild: (parent: AccountGroup) => void
  onEdit: (group: AccountGroup) => void
  onDelete: (group: AccountGroup) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isSystemRoot = node.isSystemAccount && !node.parentId

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2.5 px-3 hover:bg-slate-50/80 transition-colors border-b border-slate-100 group select-none text-xs"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand / Collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded transition-colors"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Folder or File icon */}
        {hasChildren || node.type === "GROUP" ? (
          <Folder className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <File className="w-4 h-4 text-slate-400 shrink-0" />
        )}

        {/* Account Code */}
        <span className="font-mono font-semibold text-slate-700 shrink-0 w-16">{node.code}</span>

        {/* Account Name & Description */}
        <div className="flex-1 min-w-0 pr-2">
          <span className="font-medium text-slate-900">{node.name}</span>
          {node.description && (
            <span className="text-[11px] text-slate-400 font-normal ml-2 hidden sm:inline">
              — {node.description}
            </span>
          )}
        </div>

        {/* Type Badge */}
        <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
          {node.type}
        </span>

        {/* Nature Badge */}
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 ${
            NATURE_COLORS[node.nature] || "bg-slate-100 text-slate-600"
          }`}
        >
          {node.nature}
        </span>

        {/* Scope */}
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
            node.scope === "PHARMACY"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-50 text-slate-600 border-slate-200"
          }`}
        >
          {node.scope}
        </span>

        {/* Actions */}
        <div className="w-24 flex items-center justify-end gap-1 shrink-0 pr-1">
          {/* Add Child */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(node)
            }}
            title={`Add child under ${node.name}`}
            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(node)
            }}
            title={`Edit ${node.name}`}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          {isSystemRoot ? (
            <span title="Core root category cannot be deleted" className="p-1.5 text-slate-300 cursor-not-allowed">
              <Shield className="w-3.5 h-3.5" />
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(node)
              }}
              title={`Remove ${node.name}`}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Render children if expanded */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <PharmacyTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function PharmacyChartOfAccountsClient({ groups }: { groups: AccountGroup[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "LEDGER",
    nature: "EXPENSE",
    parentId: "",
    scope: "PHARMACY",
    description: "",
  })

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    group: AccountGroup | null
    name: string
    scope: string
    description: string
  }>({
    isOpen: false,
    group: null,
    name: "",
    scope: "PHARMACY",
    description: "",
  })
  const [updating, setUpdating] = useState(false)

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    group: (AccountGroup & { children?: TreeNodeItem[] }) | null
  }>({
    isOpen: false,
    group: null,
  })
  const [deleting, setDeleting] = useState(false)

  // Filter groups if search term is provided
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups
    const term = searchTerm.toLowerCase().trim()
    return groups.filter(
      (g) =>
        g.code.toLowerCase().includes(term) ||
        g.name.toLowerCase().includes(term) ||
        g.nature.toLowerCase().includes(term) ||
        g.scope.toLowerCase().includes(term)
    )
  }, [groups, searchTerm])

  const tree = useMemo(() => buildTree(filteredGroups), [filteredGroups])

  // Open add modal pre-filling parent info
  function handleOpenAddChild(parentNode?: AccountGroup) {
    if (parentNode) {
      setFormData({
        code: "",
        name: "",
        type: "LEDGER",
        nature: parentNode.nature || "EXPENSE",
        parentId: parentNode.id,
        scope: "PHARMACY",
        description: "",
      })
    } else {
      setFormData({
        code: "",
        name: "",
        type: "GROUP",
        nature: "EXPENSE",
        parentId: "",
        scope: "PHARMACY",
        description: "",
      })
    }
    setShowAddModal(true)
  }

  // Handle create
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("Please enter both Account Code and Name.")
      return
    }

    setSaving(true)
    try {
      const result = await createAccountGroup({
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type,
        nature: formData.nature,
        parentId: formData.parentId || null,
        scope: "PHARMACY",
        description: formData.description?.trim() || undefined,
      })

      if (!result.success) {
        toast.error(result.message)
      } else {
        toast.success(result.message)
        setShowAddModal(false)
        setFormData({
          code: "",
          name: "",
          type: "LEDGER",
          nature: "EXPENSE",
          parentId: "",
          scope: "PHARMACY",
          description: "",
        })
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create pharmacy account")
    } finally {
      setSaving(false)
    }
  }

  // Handle edit open
  function handleOpenEdit(group: AccountGroup) {
    setEditModal({
      isOpen: true,
      group,
      name: group.name,
      scope: group.scope,
      description: group.description || "",
    })
  }

  // Handle update
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editModal.group) return
    if (!editModal.name.trim()) {
      toast.error("Account name cannot be empty.")
      return
    }

    setUpdating(true)
    try {
      const result = await updateAccountGroup(editModal.group.id, {
        name: editModal.name.trim(),
        scope: editModal.scope,
        description: editModal.description.trim() || undefined,
      })

      if (!result.success) {
        toast.error(result.message)
      } else {
        toast.success(result.message)
        setEditModal({ isOpen: false, group: null, name: "", scope: "PHARMACY", description: "" })
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update pharmacy account")
    } finally {
      setUpdating(false)
    }
  }

  // Handle delete open
  function handleOpenDelete(group: AccountGroup & { children?: TreeNodeItem[] }) {
    setDeleteModal({ isOpen: true, group })
  }

  // Handle confirm delete
  async function handleConfirmDelete() {
    if (!deleteModal.group) return

    setDeleting(true)
    try {
      const result = await deleteAccountGroup(deleteModal.group.id, {
        cascade: true,
        force: true,
      })

      if (!result.success) {
        toast.error(result.message)
      } else {
        toast.success(result.message)
        setDeleteModal({ isOpen: false, group: null })
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete pharmacy account")
    } finally {
      setDeleting(false)
    }
  }

  // Summary stats for Pharmacy COA
  const pharmacySpecific = groups.filter((g) => g.scope === "PHARMACY")
  const totalAssets = groups.filter((g) => g.nature === "DEBIT" || g.nature === "ASSET").length
  const totalLiabilities = groups.filter((g) => g.nature === "CREDIT" || g.nature === "LIABILITY").length
  const totalIncome = groups.filter((g) => g.nature === "INCOME").length
  const totalExpense = groups.filter((g) => g.nature === "EXPENSE").length

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Pharmacy Chart of Accounts</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pharmacy Scope (Dedicated)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured chart of accounts for pharmacy medicine sales, supplier payables, inventory assets, and operational expenditures.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pharmacy accounts..."
              className="pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none w-48 sm:w-64 bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => handleOpenAddChild()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Pharmacy Assets",
            count: totalAssets,
            icon: Package,
            color: "text-blue-700 bg-blue-50/70 border border-blue-200/80",
          },
          {
            label: "Distributor Liabilities",
            count: totalLiabilities,
            icon: Landmark,
            color: "text-purple-700 bg-purple-50/70 border border-purple-200/80",
          },
          {
            label: "Medicine Sales & Revenue",
            count: totalIncome,
            icon: BadgeIndianRupee,
            color: "text-emerald-700 bg-emerald-50/70 border border-emerald-200/80",
          },
          {
            label: "Purchases & Expenses",
            count: totalExpense,
            icon: Layers,
            color: "text-rose-700 bg-rose-50/70 border border-rose-200/80",
          },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`${s.color} rounded-2xl p-4 shadow-xs`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider">{s.label}</span>
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="text-2xl font-bold font-mono mt-1">{s.count}</div>
              <p className="text-[10px] opacity-75 mt-0.5">Isolated Pharmacy Classification</p>
            </div>
          )
        })}
      </div>

      {/* Main Tree Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Chart Hierarchy ({pharmacySpecific.length} Pharmacy Accounts, {groups.length} Total with Roots)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly isolated from Hospital Master Finance. Changes affect pharmacy ledgers and voucher entry.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
            COA: 1500–6500 Series
          </span>
        </div>

        {/* Tree Column Header */}
        <div className="flex items-center gap-2 py-2.5 px-3 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
          <span className="w-5 shrink-0" />
          <span className="w-4 shrink-0" />
          <span className="w-16 shrink-0 font-mono">Code</span>
          <span className="flex-1">Account Title / Description</span>
          <span className="w-16 shrink-0 text-center">Type</span>
          <span className="w-16 shrink-0 text-center">Nature</span>
          <span className="w-20 shrink-0 text-center">Scope</span>
          <span className="w-24 shrink-0 text-right pr-2">Actions</span>
        </div>

        {/* Tree Body */}
        {tree.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-600">No pharmacy account groups found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;Add Account&rdquo; to create a new group.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tree.map((node) => (
              <PharmacyTreeNode
                key={node.id}
                node={node}
                level={0}
                onAddChild={handleOpenAddChild}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Pharmacy Account Group</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Account Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5650"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Unique standard numbering</p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Parent Group</label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">— Root Category —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} — {g.name} ({g.scope})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Parent category hierarchy</p>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Needle & Syringe Consumables"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="LEDGER">LEDGER</option>
                    <option value="GROUP">GROUP</option>
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="REVENUE">REVENUE</option>
                    <option value="EXPENSE">EXPENSE</option>
                    <option value="CONTRA">CONTRA</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nature *</label>
                  <select
                    value={formData.nature}
                    onChange={(e) => setFormData({ ...formData, nature: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                    <option value="INCOME">INCOME</option>
                    <option value="EXPENSE">EXPENSE</option>
                    <option value="CONTRA">CONTRA</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Scope</label>
                  <input
                    type="text"
                    disabled
                    value="PHARMACY"
                    className="w-full border border-slate-200 bg-slate-50 text-emerald-700 font-bold rounded-lg px-3 py-2 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional notes or regulatory classification"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Edit {editModal.group?.code} — {editModal.group?.name}
              </h3>
              <button
                onClick={() => setEditModal({ isOpen: false, group: null, name: "", scope: "PHARMACY", description: "" })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Scope</label>
                <select
                  value={editModal.scope}
                  onChange={(e) => setEditModal({ ...editModal, scope: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="PHARMACY">PHARMACY (Isolated)</option>
                  <option value="BOTH">BOTH (Shared Root)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editModal.description}
                  onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setEditModal({ isOpen: false, group: null, name: "", scope: "PHARMACY", description: "" })
                  }
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Update Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Account Group</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong>{deleteModal.group?.code} — {deleteModal.group?.name}</strong>?
              Any sub-accounts and transactions linked to this group will be cleaned.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, group: null })}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
