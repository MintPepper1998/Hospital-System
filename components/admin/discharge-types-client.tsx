"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ClipboardList, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Loader2, FileText, ShieldAlert, Users, Receipt, BedDouble, X } from "lucide-react"
import { createDischargeType, updateDischargeType, toggleDischargeTypeActive, deleteDischargeType } from "@/app/actions/discharge-types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TemplateSection {
  sectionKey: string
  sectionLabel: string
  placeholder: string
  required: boolean
}

interface DischargeTypeConfig {
  id: string; code: string; label: string; description: string | null
  isActive: boolean; displayOrder: number
  templateSections: TemplateSection[] | null
  headerNote: string | null; footerNote: string | null
  requiresWitness: boolean; requiresPolice: boolean
  showBilling: boolean; autoReleaseBed: boolean
  createdAt: string; updatedAt: string
}

interface Props { dischargeTypes: DischargeTypeConfig[] }

const CORE_CODES = ["NORMAL", "LAMA", "DEATH"]

export function DischargeTypesClient({ dischargeTypes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingItem, setEditingItem] = useState<DischargeTypeConfig | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // ---- Form state for create/edit ----
  const [formCode, setFormCode] = useState("")
  const [formLabel, setFormLabel] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formHeader, setFormHeader] = useState("")
  const [formFooter, setFormFooter] = useState("")
  const [formWitness, setFormWitness] = useState(false)
  const [formPolice, setFormPolice] = useState(false)
  const [formBilling, setFormBilling] = useState(true)
  const [formBed, setFormBed] = useState(true)
  const [formSections, setFormSections] = useState<TemplateSection[]>([])

  function resetForm() {
    setFormCode(""); setFormLabel(""); setFormDesc(""); setFormHeader(""); setFormFooter("")
    setFormWitness(false); setFormPolice(false); setFormBilling(true); setFormBed(true)
    setFormSections([])
  }

  function openCreate() {
    resetForm()
    setShowCreateDialog(true)
  }

  function openEdit(item: DischargeTypeConfig) {
    setEditingItem(item)
    setFormCode(item.code)
    setFormLabel(item.label)
    setFormDesc(item.description || "")
    setFormHeader(item.headerNote || "")
    setFormFooter(item.footerNote || "")
    setFormWitness(item.requiresWitness)
    setFormPolice(item.requiresPolice)
    setFormBilling(item.showBilling)
    setFormBed(item.autoReleaseBed)
    setFormSections(item.templateSections || [])
    setShowEditDialog(true)
  }

  function addSection() {
    setFormSections(prev => [...prev, { sectionKey: "", sectionLabel: "", placeholder: "", required: false }])
  }

  function removeSection(index: number) {
    setFormSections(prev => prev.filter((_, i) => i !== index))
  }

  function updateSection(index: number, field: keyof TemplateSection, value: string | boolean) {
    setFormSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createDischargeType({
        code: formCode, label: formLabel, description: formDesc,
        headerNote: formHeader, footerNote: formFooter,
        requiresWitness: formWitness, requiresPolice: formPolice,
        showBilling: formBilling, autoReleaseBed: formBed,
        templateSections: formSections.filter(s => s.sectionKey && s.sectionLabel),
      })
      if (result.success) { toast.success(result.message); setShowCreateDialog(false); router.refresh() }
      else toast.error(result.message)
    })
  }

  function handleUpdate() {
    if (!editingItem) return
    startTransition(async () => {
      const result = await updateDischargeType(editingItem.id, {
        label: formLabel, description: formDesc,
        headerNote: formHeader, footerNote: formFooter,
        requiresWitness: formWitness, requiresPolice: formPolice,
        showBilling: formBilling, autoReleaseBed: formBed,
        templateSections: formSections.filter(s => s.sectionKey && s.sectionLabel),
      })
      if (result.success) { toast.success(result.message); setShowEditDialog(false); setEditingItem(null); router.refresh() }
      else toast.error(result.message)
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      const result = await toggleDischargeTypeActive(id)
      if (result.success) { toast.success(result.message); router.refresh() }
      else toast.error(result.message)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteDischargeType(id)
      if (result.success) { toast.success(result.message); router.refresh() }
      else toast.error(result.message)
    })
  }

  // ---- Shared form fields JSX ----
  function renderFormFields(isCreate: boolean) {
    return (
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Code {isCreate && <span className="text-red-500">*</span>}</Label>
            <Input value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="e.g. IMPROVED" disabled={!isCreate} className={!isCreate ? "bg-muted" : ""} />
            {isCreate && <p className="text-[11px] text-muted-foreground">Uppercase, no spaces. Auto-formatted.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Display Label <span className="text-red-500">*</span></Label>
            <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="e.g. Improved & Discharged" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Short description shown in the discharge form..." rows={2} />
        </div>

        <Separator />

        {/* Flags */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">Discharge Behavior</p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: "Requires Witness", icon: Users, value: formWitness, setter: setFormWitness, desc: "LAMA, DAMA, Death" },
              { label: "Requires Police", icon: ShieldAlert, value: formPolice, setter: setFormPolice, desc: "Absconded, MLC cases" },
              { label: "Show Billing", icon: Receipt, value: formBilling, setter: setFormBilling, desc: "Show bill settlement section" },
              { label: "Auto-Release Bed", icon: BedDouble, value: formBed, setter: setFormBed, desc: "Free bed on discharge" },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <f.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
                <Switch checked={f.value} onCheckedChange={f.setter} />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Template Notes */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Print Template Notes</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Header Note (printed at top of discharge summary)</Label>
            <Textarea value={formHeader} onChange={e => setFormHeader(e.target.value)} placeholder="e.g. DISCHARGE AGAINST MEDICAL ADVICE" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Footer Note (legal text, consent text)</Label>
            <Textarea value={formFooter} onChange={e => setFormFooter(e.target.value)} placeholder="e.g. I, the undersigned, hereby declare..." rows={3} />
          </div>
        </div>

        <Separator />

        {/* Template Sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Template Sections</p>
              <p className="text-[11px] text-muted-foreground">Define which fields appear in the discharge form for this type</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSection}><Plus className="h-3 w-3 mr-1" /> Add Section</Button>
          </div>

          {formSections.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              No sections yet. Click &quot;Add Section&quot; to define form fields.
            </div>
          )}

          {formSections.map((section, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-2 bg-slate-50/50 relative">
              <button type="button" onClick={() => removeSection(idx)} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"><X className="h-4 w-4" /></button>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Section Key</Label>
                  <Input value={section.sectionKey} onChange={e => updateSection(idx, "sectionKey", e.target.value)} placeholder="e.g. finalDiagnosis" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">Label</Label>
                  <Input value={section.sectionLabel} onChange={e => updateSection(idx, "sectionLabel", e.target.value)} placeholder="e.g. Final Diagnosis" className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-[11px]">Placeholder Text</Label>
                <Input value={section.placeholder} onChange={e => updateSection(idx, "placeholder", e.target.value)} placeholder="Hint text shown in the field..." className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={section.required} onCheckedChange={v => updateSection(idx, "required", v)} />
                <Label className="text-xs">Required field</Label>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const activeCount = dischargeTypes.filter(d => d.isActive).length
  const totalCount = dischargeTypes.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            Discharge Type Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure discharge types, templates, and form sections used during patient discharge.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" /> Add Discharge Type
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Types</p>
            <p className="text-2xl font-bold text-indigo-700">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold text-slate-500">{totalCount - activeCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div className="space-y-3">
        {dischargeTypes.map(dt => {
          const sections = (dt.templateSections || []) as TemplateSection[]
          const isCore = CORE_CODES.includes(dt.code)
          return (
            <Card key={dt.id} className={`transition-all ${!dt.isActive ? "opacity-60 bg-muted/30" : "hover:shadow-md"}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{dt.label}</h3>
                        <Badge variant="outline" className="font-mono text-[10px]">{dt.code}</Badge>
                        {dt.isActive
                          ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Active</Badge>
                          : <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 text-[10px]">Inactive</Badge>}
                        {isCore && <Badge variant="secondary" className="text-[10px]">Core</Badge>}
                      </div>
                      {dt.description && <p className="text-sm text-muted-foreground mb-2">{dt.description}</p>}
                      {/* Flags row */}
                      <div className="flex flex-wrap gap-2">
                        {dt.requiresWitness && <Badge variant="outline" className="text-[10px] gap-1"><Users className="h-3 w-3" />Witness Required</Badge>}
                        {dt.requiresPolice && <Badge variant="outline" className="text-[10px] gap-1 text-red-600 border-red-200"><ShieldAlert className="h-3 w-3" />Police Notification</Badge>}
                        {!dt.showBilling && <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-200"><Receipt className="h-3 w-3" />No Billing</Badge>}
                        {dt.headerNote && <Badge variant="outline" className="text-[10px] gap-1"><FileText className="h-3 w-3" />Custom Header</Badge>}
                        {dt.footerNote && <Badge variant="outline" className="text-[10px] gap-1"><FileText className="h-3 w-3" />Custom Footer</Badge>}
                        <Badge variant="outline" className="text-[10px]">{sections.length} template section{sections.length !== 1 ? "s" : ""}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(dt.id)} disabled={isPending} title={dt.isActive ? "Deactivate" : "Activate"}>
                      {dt.isActive ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(dt)} disabled={isPending}>
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    {!isCore && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &quot;{dt.label}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. Existing discharge records won&apos;t be affected.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(dt.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Discharge Type</DialogTitle>
            <DialogDescription>Define a new discharge type with its template and behavior settings.</DialogDescription>
          </DialogHeader>
          {renderFormFields(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending || !formCode || !formLabel} className="bg-indigo-600 hover:bg-indigo-700">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Discharge Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={showEditDialog} onOpenChange={v => { setShowEditDialog(v); if (!v) setEditingItem(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit: {editingItem?.label}</DialogTitle>
            <DialogDescription>Update the template, behavior flags, and form sections.</DialogDescription>
          </DialogHeader>
          {renderFormFields(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingItem(null) }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isPending || !formLabel} className="bg-indigo-600 hover:bg-indigo-700">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
