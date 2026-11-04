"use client"

import { useState, useMemo } from "react"
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Shield, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createAccountGroup, updateAccountGroup, deleteAccountGroup } from "@/app/actions/account-groups"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type AccountGroup = {
    id: string
    code: string
    name: string
    type: string
    nature: string
    parentId: string | null
    scope: string
    isSystemAccount: boolean
    description: string | null
    isActive: boolean
    displayOrder: number
    parent: { id: string; code: string; name: string } | null
    _count: { children: number }
}

interface Props {
    groups: AccountGroup[]
}

// ─── Tree node component ─────────────────────────────────────

function TreeNode({
    group,
    children,
    level,
    onEdit,
    onDelete,
}: {
    group: AccountGroup
    children: AccountGroup[]
    level: number
    onEdit: (g: AccountGroup) => void
    onDelete: (g: AccountGroup) => void
}) {
    const [expanded, setExpanded] = useState(level < 1)
    const hasChildren = children.length > 0

    const typeColors: Record<string, string> = {
        REVENUE: "bg-blue-100 text-blue-700",
        EXPENSE: "bg-orange-100 text-orange-700",
        ASSET: "bg-emerald-100 text-emerald-700",
        LIABILITY: "bg-red-100 text-red-700",
        EQUITY: "bg-purple-100 text-purple-700",
        CONTRA: "bg-gray-100 text-gray-700",
    }

    return (
        <div>
            <div
                className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group ${!group.isActive ? "opacity-50" : ""}`}
                style={{ paddingLeft: `${level * 24 + 12}px` }}
            >
                {/* Expand/collapse */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`w-5 h-5 flex items-center justify-center text-gray-400 ${hasChildren ? "hover:text-gray-600" : "invisible"}`}
                >
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {/* Code */}
                <span className="font-mono text-xs text-gray-400 w-12 flex-shrink-0">{group.code}</span>

                {/* Name */}
                <span className="text-sm text-gray-800 font-medium flex-1">{group.name}</span>

                {/* Type badge */}
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${typeColors[group.type] || "bg-gray-100 text-gray-600"}`}>
                    {group.type}
                </Badge>

                {/* Scope */}
                {group.scope !== "BOTH" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {group.scope}
                    </Badge>
                )}

                {/* System lock icon */}
                {group.isSystemAccount && (
                    <Shield className="w-3.5 h-3.5 text-gray-300" />
                )}

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button onClick={() => onEdit(group)} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!group.isSystemAccount && (
                        <button onClick={() => onDelete(group)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Children */}
            {expanded && hasChildren && (
                <div>
                    {children.map(child => (
                        <TreeNode
                            key={child.id}
                            group={child}
                            children={[]}  // We only go 2 levels deep
                            level={level + 1}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Main client component ────────────────────────────────────

export function AccountGroupsClient({ groups }: Props) {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [showCreate, setShowCreate] = useState(false)
    const [editGroup, setEditGroup] = useState<AccountGroup | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<AccountGroup | null>(null)
    const [loading, setLoading] = useState(false)

    // Form state
    const [formCode, setFormCode] = useState("")
    const [formName, setFormName] = useState("")
    const [formType, setFormType] = useState("REVENUE")
    const [formNature, setFormNature] = useState("CREDIT")
    const [formParentId, setFormParentId] = useState<string | null>(null)
    const [formScope, setFormScope] = useState("BOTH")
    const [formDescription, setFormDescription] = useState("")

    // Filter groups by search
    const filtered = useMemo(() => {
        if (!search.trim()) return groups
        const q = search.toLowerCase()
        return groups.filter(g =>
            g.code.toLowerCase().includes(q) ||
            g.name.toLowerCase().includes(q) ||
            g.type.toLowerCase().includes(q)
        )
    }, [groups, search])

    // Build tree: top-level = groups without parent
    const topLevel = filtered.filter(g => !g.parentId)
    const childrenOf = (parentId: string) => filtered.filter(g => g.parentId === parentId)

    // Parent options for create form
    const parentOptions = groups.filter(g => g.parentId === null || g._count.children > 0)

    const resetForm = () => {
        setFormCode(""); setFormName(""); setFormType("REVENUE"); setFormNature("CREDIT")
        setFormParentId(null); setFormScope("BOTH"); setFormDescription("")
    }

    const handleCreate = async () => {
        setLoading(true)
        const result = await createAccountGroup({
            code: formCode, name: formName, type: formType, nature: formNature,
            parentId: formParentId, scope: formScope, description: formDescription,
        })
        setLoading(false)
        if (result.success) {
            toast.success(result.message)
            setShowCreate(false)
            resetForm()
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    const handleEdit = async () => {
        if (!editGroup) return
        setLoading(true)
        const result = await updateAccountGroup(editGroup.id, {
            name: formName,
            scope: formScope,
            description: formDescription,
            isActive: editGroup.isActive,
        })
        setLoading(false)
        if (result.success) {
            toast.success(result.message)
            setEditGroup(null)
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setLoading(true)
        const result = await deleteAccountGroup(deleteTarget.id)
        setLoading(false)
        if (result.success) {
            toast.success(result.message)
            setDeleteTarget(null)
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    const openEdit = (g: AccountGroup) => {
        setFormName(g.name)
        setFormScope(g.scope)
        setFormDescription(g.description || "")
        setEditGroup(g)
    }

    return (
        <>
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by code, name, or type..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 bg-white"
                    />
                </div>
                <Button onClick={() => { resetForm(); setShowCreate(true) }} className="bg-slate-800 hover:bg-slate-900">
                    <Plus className="w-4 h-4 mr-2" /> Add Group
                </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm text-gray-500">
                <span>{groups.length} total groups</span>
                <span>{groups.filter(g => g.type === "REVENUE").length} revenue</span>
                <span>{groups.filter(g => g.type === "EXPENSE").length} expense</span>
                <span>{groups.filter(g => g.isSystemAccount).length} system</span>
            </div>

            {/* Tree */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {topLevel.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">No account groups found</p>
                ) : (
                    topLevel.map(g => (
                        <TreeNode
                            key={g.id}
                            group={g}
                            children={childrenOf(g.id)}
                            level={0}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                        />
                    ))
                )}
            </div>

            {/* ─── CREATE DIALOG ─── */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Account Group</DialogTitle>
                        <DialogDescription>Create a new entry in the Chart of Accounts</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Code</Label>
                                <Input placeholder="e.g. 4190" value={formCode} onChange={e => setFormCode(e.target.value)} />
                            </div>
                            <div>
                                <Label>Name</Label>
                                <Input placeholder="e.g. Other Revenue" value={formName} onChange={e => setFormName(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Type</Label>
                                <Select value={formType} onValueChange={setFormType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="REVENUE">Revenue</SelectItem>
                                        <SelectItem value="EXPENSE">Expense</SelectItem>
                                        <SelectItem value="ASSET">Asset</SelectItem>
                                        <SelectItem value="LIABILITY">Liability</SelectItem>
                                        <SelectItem value="EQUITY">Equity</SelectItem>
                                        <SelectItem value="CONTRA">Contra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Nature</Label>
                                <Select value={formNature} onValueChange={setFormNature}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DEBIT">Debit</SelectItem>
                                        <SelectItem value="CREDIT">Credit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Scope</Label>
                                <Select value={formScope} onValueChange={setFormScope}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BOTH">Both</SelectItem>
                                        <SelectItem value="HOSPITAL">Hospital</SelectItem>
                                        <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Parent Group (optional)</Label>
                            <Select value={formParentId || "__none__"} onValueChange={v => setFormParentId(v === "__none__" ? null : v)}>
                                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">None (top-level)</SelectItem>
                                    {parentOptions.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Description (optional)</Label>
                            <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={loading || !formCode || !formName}>
                            {loading ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── EDIT DIALOG ─── */}
            <Dialog open={!!editGroup} onOpenChange={() => setEditGroup(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Account Group</DialogTitle>
                        <DialogDescription>
                            {editGroup?.code} — {editGroup?.isSystemAccount ? "System account (code/type locked)" : "Custom account"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div>
                            <Label>Name</Label>
                            <Input value={formName} onChange={e => setFormName(e.target.value)} />
                        </div>
                        <div>
                            <Label>Scope</Label>
                            <Select value={formScope} onValueChange={setFormScope}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BOTH">Both</SelectItem>
                                    <SelectItem value="HOSPITAL">Hospital</SelectItem>
                                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditGroup(null)}>Cancel</Button>
                        <Button onClick={handleEdit} disabled={loading || !formName}>
                            {loading ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── DELETE DIALOG ─── */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Account Group</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deleteTarget?.code} — {deleteTarget?.name}</strong>?
                            This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            {loading ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
