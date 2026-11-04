"use client"

import { useState, useTransition, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog"
import {
  Plus, Edit, Trash2, ToggleLeft, ToggleRight, Search, Monitor,
  Clock, CalendarDays, Package, ChevronDown, Check,
} from "lucide-react"
import { toast } from "sonner"
import {
  createEquipmentItem, updateEquipmentItem, toggleEquipmentItem, deleteEquipmentItem,
} from "@/app/actions/ipd-equipment"

interface EquipmentItem {
  id: string
  name: string
  code: string | null
  category: string | null
  description: string | null
  chargeType: string
  ratePerUnit: number
  depositAmount: number
  isActive: boolean
  _count: { usages: number }
}

interface Props {
  items: EquipmentItem[]
  stats: { total: number; active: number; inactive: number; categories: number }
}

const CATEGORIES = [
  "Monitoring", "Respiratory", "Mobility", "Infusion",
  "Surgical", "Diagnostic", "Therapeutic", "Other",
]

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

export function IPDEquipmentClient({ items: initialItems, stats }: Props) {
  const [items, setItems] = useState(initialItems)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<EquipmentItem | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [form, setForm] = useState({
    name: "", code: "", category: "", description: "",
    chargeType: "PER_DAY" as string,
    ratePerUnit: "", depositAmount: "",
  })

  // Custom charge type state
  const [showNewChargeType, setShowNewChargeType] = useState(false)
  const [newChargeType, setNewChargeType] = useState("")
  const [customChargeTypes, setCustomChargeTypes] = useState<string[]>(() => {
    const existing = new Set(initialItems.map(i => i.chargeType).filter(Boolean))
    existing.delete("HOURLY")
    existing.delete("PER_DAY")
    return Array.from(existing).sort()
  })

  const resetForm = () => {
    setForm({
      name: "", code: "", category: "", description: "",
      chargeType: "PER_DAY", ratePerUnit: "", depositAmount: "",
    })
    setShowNewChargeType(false)
    setNewChargeType("")
  }

  const openCreate = () => { resetForm(); setEditItem(null); setModalOpen(true) }
  const openEdit = (item: EquipmentItem) => {
    setEditItem(item)
    setForm({
      name: item.name,
      code: item.code || "",
      category: item.category || "",
      description: item.description || "",
      chargeType: item.chargeType,
      ratePerUnit: String(item.ratePerUnit),
      depositAmount: String(item.depositAmount || ""),
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (!form.ratePerUnit || isNaN(Number(form.ratePerUnit))) { toast.error("Valid rate is required"); return }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      category: form.category || undefined,
      description: form.description.trim() || undefined,
      chargeType: form.chargeType,
      ratePerUnit: Number(form.ratePerUnit),
      depositAmount: form.depositAmount ? Number(form.depositAmount) : 0,
    }

    startTransition(async () => {
      const result = editItem
        ? await updateEquipmentItem(editItem.id, payload)
        : await createEquipmentItem(payload)

      if (result.success) {
        toast.success(editItem ? "Equipment updated" : "Equipment added")
        setModalOpen(false)
        // Refresh page
        window.location.reload()
      } else {
        toast.error(result.message || "Failed")
      }
    })
  }

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const r = await toggleEquipmentItem(id)
      if (r.success) {
        setItems(prev => prev.map(i => i.id === id ? { ...i, isActive: !i.isActive } : i))
        toast.success("Status updated")
      } else toast.error(r.message)
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const r = await deleteEquipmentItem(id)
      if (r.success) {
        setItems(prev => prev.filter(i => i.id !== id))
        toast.success("Deleted")
      } else toast.error(r.message)
    })
  }

  const filtered = useMemo(() => {
    return items.filter(i => {
      const q = search.toLowerCase()
      const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.code || "").toLowerCase().includes(q)
      const matchCat = catFilter === "all" || i.category === catFilter
      return matchSearch && matchCat
    })
  }, [items, search, catFilter])

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean))
    return Array.from(cats).sort()
  }, [items])

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: stats.total, color: "border-blue-200" },
          { label: "Active", value: stats.active, color: "border-green-200" },
          { label: "Inactive", value: stats.inactive, color: "border-gray-200" },
          { label: "Categories", value: stats.categories, color: "border-purple-200" },
        ].map(s => (
          <Card key={s.label} className={`border-2 ${s.color}`}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search equipment..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="ml-auto">
          <Plus className="h-4 w-4 mr-1.5" /> Add Equipment
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-3 px-4 font-medium">Equipment</th>
                <th className="text-left py-3 px-4 font-medium">Category</th>
                <th className="text-center py-3 px-4 font-medium">Charge Type</th>
                <th className="text-right py-3 px-4 font-medium">Rate</th>
                <th className="text-right py-3 px-4 font-medium">Deposit</th>
                <th className="text-center py-3 px-4 font-medium">Usages</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  No equipment found
                </td></tr>
              )}
              {filtered.map(item => (
                <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold">{item.name}</p>
                    {item.code && <p className="text-xs text-muted-foreground">{item.code}</p>}
                    {item.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</p>}
                  </td>
                  <td className="py-3 px-4">
                    {item.category ? <Badge variant="outline" className="text-xs">{item.category}</Badge> : "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="secondary" className="text-xs">
                      {item.chargeType === "HOURLY" ? (
                        <><Clock className="h-3 w-3 mr-1 inline" />Per Hour</>
                      ) : item.chargeType === "PER_DAY" ? (
                        <><CalendarDays className="h-3 w-3 mr-1 inline" />Per Day</>
                      ) : (
                        <><Package className="h-3 w-3 mr-1 inline" />{item.chargeType}</>
                      )}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold font-mono text-emerald-700">
                    {fmt(item.ratePerUnit)}<span className="text-xs text-muted-foreground font-normal">/{item.chargeType === "HOURLY" ? "hr" : item.chargeType === "PER_DAY" ? "day" : item.chargeType}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {item.depositAmount > 0 ? fmt(item.depositAmount) : "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="secondary" className="text-xs">{item._count.usages}</Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(item)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={item.isActive ? "Deactivate" : "Activate"} onClick={() => handleToggle(item.id)}>
                        {item.isActive ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" title="Delete" onClick={() => handleDelete(item.id, item.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Equipment" : "Add New Equipment"}</DialogTitle>
            <DialogDescription>
              {editItem ? "Update equipment details and pricing" : "Add a new rentable equipment item with pricing"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cardiac Monitor" />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="EQ-001" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Charge Type *</Label>
                <Select
                  value={showNewChargeType ? "__NEW__" : form.chargeType}
                  onValueChange={(v) => {
                    if (v === "__NEW__") {
                      setShowNewChargeType(true)
                      setNewChargeType("")
                    } else {
                      setShowNewChargeType(false)
                      setForm(f => ({ ...f, chargeType: v }))
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOURLY">Per Hour</SelectItem>
                    <SelectItem value="PER_DAY">Per Day</SelectItem>
                    {customChargeTypes.map(ct => (
                      <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                    ))}
                    <SelectItem value="__NEW__">
                      <span className="flex items-center gap-1 text-blue-600 font-medium">
                        <Plus className="h-3 w-3" /> Add New Type
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {/* Slide-down new type input */}
                {showNewChargeType && (
                  <div className="mt-1.5 flex gap-2 items-center animate-in slide-in-from-top-2 duration-200">
                    <Input
                      value={newChargeType}
                      onChange={e => setNewChargeType(e.target.value)}
                      placeholder="e.g. Per Session"
                      className="h-8 text-xs flex-1"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === "Enter" && newChargeType.trim()) {
                          const typeName = newChargeType.trim()
                          if (!customChargeTypes.includes(typeName)) {
                            setCustomChargeTypes(prev => [...prev, typeName].sort())
                          }
                          setForm(f => ({ ...f, chargeType: typeName }))
                          setShowNewChargeType(false)
                          setNewChargeType("")
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-2"
                      disabled={!newChargeType.trim()}
                      onClick={() => {
                        const typeName = newChargeType.trim()
                        if (!typeName) return
                        if (!customChargeTypes.includes(typeName)) {
                          setCustomChargeTypes(prev => [...prev, typeName].sort())
                        }
                        setForm(f => ({ ...f, chargeType: typeName }))
                        setShowNewChargeType(false)
                        setNewChargeType("")
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Rate (₹) *</Label>
                <Input type="number" value={form.ratePerUnit} onChange={e => setForm(f => ({ ...f, ratePerUnit: e.target.value }))} placeholder="500" />
              </div>
              <div className="space-y-1.5">
                <Label>Deposit (₹)</Label>
                <Input type="number" value={form.depositAmount} onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))} placeholder="0" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving..." : editItem ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
