"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Plus, Search, Scissors, Trash2, Edit, Clock, MapPin, ToggleLeft, ToggleRight, Copy
} from "lucide-react"
import {
  createSurgeryProcedure, updateSurgeryProcedure, toggleSurgeryProcedureStatus,
  deleteSurgeryProcedure,
  type SurgeryProcedureFormData
} from "@/app/actions/surgery-procedures"

type Procedure = {
  id: string; name: string; code: string | null; category: string | null
  description: string | null; estimatedDuration: number | null; theaterType: string | null
  totalCharge: number; isActive: boolean; createdAt: string
}

type Props = {
  initialProcedures: Procedure[]
  stats: { total: number; active: number; inactive: number; categoryCount: number }
  categories: string[]
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────
export function SurgeryProceduresClient({ initialProcedures, stats, categories }: Props) {
  const router = useRouter()
  const [procedures] = useState(initialProcedures)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [formName, setFormName] = useState("")
  const [formCode, setFormCode] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formDuration, setFormDuration] = useState("")
  const [formTheaterType, setFormTheaterType] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)

  const filtered = useMemo(() => {
    return procedures.filter(p => {
      if (search) {
        const q = search.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.code?.toLowerCase().includes(q) && !p.category?.toLowerCase().includes(q))
          return false
      }
      if (catFilter !== "ALL" && p.category !== catFilter) return false
      if (statusFilter === "ACTIVE" && !p.isActive) return false
      if (statusFilter === "INACTIVE" && p.isActive) return false
      return true
    })
  }, [procedures, search, catFilter, statusFilter])

  const resetForm = () => {
    setFormName(""); setFormCode(""); setFormCategory(""); setFormDescription("")
    setFormDuration(""); setFormTheaterType(""); setFormIsActive(true)
    setEditingId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEditModal = (p: Procedure) => {
    setEditingId(p.id)
    setFormName(p.name); setFormCode(p.code || ""); setFormCategory(p.category || "")
    setFormDescription(p.description || ""); setFormDuration(p.estimatedDuration?.toString() || "")
    setFormTheaterType(p.theaterType || ""); setFormIsActive(p.isActive)
    setModalOpen(true)
  }

  const openCloneModal = (p: Procedure) => {
    setEditingId(null)
    setFormName(p.name + " (Copy)"); setFormCode(""); setFormCategory(p.category || "")
    setFormDescription(p.description || ""); setFormDuration(p.estimatedDuration?.toString() || "")
    setFormTheaterType(p.theaterType || ""); setFormIsActive(true)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!formName.trim()) { toast.error("Procedure name is required"); return }

    const data: SurgeryProcedureFormData = {
      name: formName, code: formCode, category: formCategory, description: formDescription,
      estimatedDuration: formDuration ? parseInt(formDuration) : undefined,
      theaterType: formTheaterType, isActive: formIsActive, chargeComponents: [],
      medicines: [],
    }

    startTransition(async () => {
      const result = editingId
        ? await updateSurgeryProcedure(editingId, data)
        : await createSurgeryProcedure(data)

      if (result.success) {
        toast.success(result.message)
        setModalOpen(false)
        resetForm()
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const r = await toggleSurgeryProcedureStatus(id)
      if (r.success) {
        toast.success(r.message)
        router.refresh()
      } else {
        toast.error(r.message)
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const r = await deleteSurgeryProcedure(id)
      if (r.success) {
        toast.success(r.message)
        router.refresh()
      } else {
        toast.error(r.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Procedures", value: stats.total, color: "bg-blue-50 border-blue-200" },
          { label: "Active", value: stats.active, color: "bg-emerald-50 border-emerald-200" },
          { label: "Inactive", value: stats.inactive, color: "bg-gray-50 border-gray-200" },
          { label: "Categories", value: stats.categoryCount, color: "bg-purple-50 border-purple-200" },
        ].map(s => (
          <Card key={s.label} className={`${s.color} border`}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search procedures..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreateModal} className="bg-[#0066CC] hover:bg-[#0052A3]">
          <Plus className="h-4 w-4 mr-2" />Add Procedure
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="py-3 px-4 font-semibold">Procedure Name</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold text-center">Theater Type</th>
              <th className="py-3 px-4 font-semibold text-center">Duration</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                <Scissors className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No procedures found</p>
                <p className="text-sm">Create your first surgery procedure to get started.</p>
              </td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4">
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  {p.code && <p className="text-xs text-muted-foreground">{p.code}</p>}
                </td>
                <td className="py-3 px-4">
                  {p.category ? <Badge variant="outline" className="text-xs">{p.category}</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {p.theaterType ? (
                    <Badge variant="secondary" className="text-xs">
                      {p.theaterType === "MAJOR" ? "Major OT" : p.theaterType === "MINOR" ? "Minor OT" : p.theaterType}
                    </Badge>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {p.estimatedDuration ? <span className="text-xs font-medium">{p.estimatedDuration} min</span> : "—"}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Clone"
                      onClick={() => openCloneModal(p)}>
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit"
                      onClick={() => router.push(`/dashboard/admin/surgery-procedures/${p.id}/edit`)}>
                      <Edit className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title={p.isActive ? "Deactivate" : "Activate"}
                      onClick={() => handleToggle(p.id)}>
                      {p.isActive ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                      title="Delete" onClick={() => handleDelete(p.id, p.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) resetForm(); setModalOpen(v) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Procedure" : "Create New Procedure"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Procedure Name *</Label>
                <Input placeholder="e.g., Appendectomy, CABG, Cholecystectomy" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Procedure Code</Label>
                <Input placeholder="e.g., APX-001" value={formCode} onChange={e => setFormCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input placeholder="e.g., General Surgery, Cardiac" value={formCategory}
                  onChange={e => setFormCategory(e.target.value)} list="cat-list" />
                <datalist id="cat-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Est. Duration (min)</Label>
                <Input type="number" min={15} step={15} placeholder="60" value={formDuration}
                  onChange={e => setFormDuration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Theater Type</Label>
                <Select value={formTheaterType} onValueChange={setFormTheaterType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAJOR">Major OT</SelectItem>
                    <SelectItem value="MINOR">Minor OT</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="DAY_CARE">Day Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Brief procedure description..." rows={2} value={formDescription}
                  onChange={e => setFormDescription(e.target.value)} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t items-center">
              <div className="flex items-center gap-2">
                <Checkbox checked={formIsActive} onCheckedChange={(v) => setFormIsActive(v === true)} id="proc-active" />
                <Label htmlFor="proc-active" className="font-normal cursor-pointer">Active Status</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setModalOpen(false); resetForm() }}>Cancel</Button>
                <Button onClick={handleSave} disabled={isPending} className="bg-[#0066CC] hover:bg-[#0052A3]">
                  {isPending ? "Saving..." : editingId ? "Update Procedure" : "Create Procedure"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
