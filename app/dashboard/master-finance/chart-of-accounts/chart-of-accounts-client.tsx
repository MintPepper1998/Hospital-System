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
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Search,
  X,
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

interface MasterTreeNodeItem extends AccountGroup {
  children: MasterTreeNodeItem[]
}

const NATURE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-50 text-blue-700 border border-blue-200",
  LIABILITY: "bg-purple-50 text-purple-700 border border-purple-200",
  INCOME: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  EXPENSE: "bg-red-50 text-red-700 border border-red-200",
  EQUITY: "bg-amber-50 text-amber-700 border border-amber-200",
  CONTRA: "bg-slate-100 text-slate-700 border border-slate-200",
}

function buildTree(groups: AccountGroup[]): MasterTreeNodeItem[] {
  const map = new Map<string, MasterTreeNodeItem>()
  const roots: MasterTreeNodeItem[] = []

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

function TreeNode({
  node,
  level = 0,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: MasterTreeNodeItem
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
        className="flex items-center gap-2 py-2.5 px-3 hover:bg-slate-50/80 transition-colors border-b border-slate-100 group select-none"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand / Collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Folder or File icon */}
        {hasChildren || node.type === "GROUP" ? (
          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
        ) : (
          <File className="w-4 h-4 text-slate-400 shrink-0" />
        )}

        {/* Account Code */}
        <span className="text-xs font-mono font-semibold text-slate-500 shrink-0 w-16">
          {node.code}
        </span>

        {/* Account Name */}
        <span className="text-sm text-slate-800 font-medium flex-1 truncate">
          {node.name}
          {node.description && (
            <span className="text-xs text-slate-400 font-normal ml-2 hidden sm:inline">
              — {node.description}
            </span>
          )}
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
        <span className="text-[11px] font-medium text-slate-500 w-20 text-center shrink-0">
          {node.scope}
        </span>

        {/* Actions */}
        <div className="w-24 flex items-center justify-end gap-1 shrink-0 pr-1">
          {/* Add Child Account button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(node)
            }}
            title={`Add child section under ${node.name}`}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Edit Account button */}
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

          {/* Delete Account button */}
          {isSystemRoot ? (
            <span
              title="Core system root category (cannot be deleted)"
              className="p-1.5 text-slate-300 cursor-not-allowed"
            >
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
            <TreeNode
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

export function ChartOfAccountsClient({ groups }: { groups: AccountGroup[] }) {
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
    scope: "HOSPITAL",
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
    scope: "HOSPITAL",
    description: "",
  })
  const [updating, setUpdating] = useState(false)

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    group: (AccountGroup & { children?: MasterTreeNodeItem[] }) | null
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
        scope: parentNode.scope || "HOSPITAL",
        description: "",
      })
    } else {
      setFormData({
        code: "",
        name: "",
        type: "GROUP",
        nature: "EXPENSE",
        parentId: "",
        scope: "HOSPITAL",
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
        scope: formData.scope,
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
          scope: "HOSPITAL",
          description: "",
        })
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create account group")
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
        setEditModal({ isOpen: false, group: null, name: "", scope: "HOSPITAL", description: "" })
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update account group")
    } finally {
      setUpdating(false)
    }
  }

  // Handle delete open
  function handleOpenDelete(group: AccountGroup & { children?: MasterTreeNodeItem[] }) {
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
      toast.error(err instanceof Error ? err.message : "Failed to delete account group")
    } finally {
      setDeleting(false)
    }
  }

  // Summary stats
  const totalAssets = groups.filter((g) => g.nature === "ASSET").length
  const totalLiabilities = groups.filter((g) => g.nature === "LIABILITY").length
  const totalIncome = groups.filter((g) => g.nature === "INCOME").length
  const totalExpense = groups.filter((g) => g.nature === "EXPENSE").length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Chart of Accounts
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Hospital Scope (Dedicated)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {groups.length} hospital account groups configured. Fully isolated from Pharmacy Finance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts..."
              className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-48 sm:w-64"
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
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Assets", count: totalAssets, color: "text-blue-600 bg-blue-50/70 border border-blue-100" },
          { label: "Liabilities", count: totalLiabilities, color: "text-purple-600 bg-purple-50/70 border border-purple-100" },
          { label: "Income", count: totalIncome, color: "text-emerald-600 bg-emerald-50/70 border border-emerald-100" },
          { label: "Expenses", count: totalExpense, color: "text-red-600 bg-red-50/70 border border-red-100" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3.5 text-center shadow-xs`}>
            <div className="text-xl font-bold">{s.count}</div>
            <div className="text-xs font-medium uppercase tracking-wider mt-0.5 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tree Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Column Headers */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center text-xs text-slate-500 font-semibold uppercase tracking-wider select-none">
          <span className="w-5 shrink-0" />
          <span className="w-4 shrink-0" />
          <span className="w-16 font-mono">Code</span>
          <span className="flex-1 pl-2">Account Name</span>
          <span className="w-24 text-center">Nature</span>
          <span className="w-20 text-center">Scope</span>
          <span className="w-24 text-right pr-2">Actions</span>
        </div>

        {/* Tree Rows */}
        {tree.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {searchTerm ? `No accounts match "${searchTerm}".` : "No account groups found. Click '+ Add Account' to begin."}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                onAddChild={handleOpenAddChild}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {formData.parentId ? "Add Child Account Section" : "Add New Account Group"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formData.parentId
                    ? `Adding sub-account under: ${groups.find((g) => g.id === formData.parentId)?.name || "Parent"}`
                    : "Create a root or sub-account in the Chart of Accounts"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="e.g. 1100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Current Assets"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Group</label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => {
                      const selectedParent = groups.find((g) => g.id === e.target.value)
                      setFormData({
                        ...formData,
                        parentId: e.target.value,
                        nature: selectedParent ? selectedParent.nature : formData.nature,
                      })
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">— Root Category (No Parent) —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} — {g.name} ({g.nature})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nature</label>
                  <select
                    value={formData.nature}
                    onChange={(e) => setFormData({ ...formData, nature: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="ASSET">Asset (Debit)</option>
                    <option value="LIABILITY">Liability (Credit)</option>
                    <option value="INCOME">Income (Credit)</option>
                    <option value="EXPENSE">Expense (Debit)</option>
                    <option value="EQUITY">Equity (Credit)</option>
                    <option value="CONTRA">Contra (Debit/Credit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="HOSPITAL">Hospital</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="GROUP">Group (Can have sub-accounts)</option>
                    <option value="LEDGER">Ledger (Posting Account)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Optional notes or details about this account"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editModal.isOpen && editModal.group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Edit Account Group</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {editModal.group.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, group: null, name: "", scope: "HOSPITAL", description: "" })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scope</label>
                <select
                  value={editModal.scope}
                  onChange={(e) => setEditModal({ ...editModal, scope: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="HOSPITAL">Hospital</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={editModal.description}
                  onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Optional details"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, group: null, name: "", scope: "HOSPITAL", description: "" })}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {updating ? "Saving..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Remove Account Section</h3>
                <p className="text-xs text-slate-500">Confirm removal of this account</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-3">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-slate-800 font-mono">
                [{deleteModal.group.code}] {deleteModal.group.name}
              </span>
              ?
            </p>

            {deleteModal.group.children && deleteModal.group.children.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This section has <strong>{deleteModal.group.children.length}</strong> sub-account(s). Removing it will also remove all its sub-accounts.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteModal({ isOpen: false, group: null })}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? "Removing..." : "Remove Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
