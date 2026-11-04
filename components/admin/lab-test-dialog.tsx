"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, X, Layers, FileText, Upload } from "lucide-react"
import { toast } from "sonner"
import { createLabTest, updateLabTest } from "@/lib/actions"
import { useRouter } from "next/navigation"

type TestType = "PATHOLOGY" | "RADIOLOGY"

// ── NEW structured parameter types ──────────────────
export interface EnhancedParameter {
  name: string
  unit: string
  normalRange: string
  method: string
  inputType: "text" | "select"
  options: string[]
  abnormalValues: string[]
  defaultResult?: string
}

export interface ParameterSection {
  heading: string
  parameters: EnhancedParameter[]
}

export interface EnhancedParametersData {
  sections: ParameterSection[]
  notes: string
  sampleType: string
  defaultInterpretation?: string
  defaultDiagramUrl?: string
  defaultImageUrl?: string
  defaultImagePosition?: "start" | "end"
  modality?: string
  studyArea?: string
}

interface LabTest {
  id: string
  name: string
  code: string
  price: number
  category: string | null
  normalRange: string | null
  unit: string | null
  description: string | null
  isActive: boolean
  type?: TestType
  parameters?: unknown | null
}

interface LabTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  test: LabTest | null
  testType?: TestType
}

function emptyParameter(): EnhancedParameter {
  return {
    name: "",
    unit: "",
    normalRange: "",
    method: "",
    inputType: "text",
    options: [],
    abnormalValues: [],
    defaultResult: "",
  }
}

function emptySection(): ParameterSection {
  return { heading: "", parameters: [emptyParameter()] }
}

/** Migrate legacy flat array to new sectioned format */
function migrateParameters(raw: unknown): EnhancedParametersData {
  if (!raw) {
    return {
      sections: [],
      notes: "",
      sampleType: "",
      defaultInterpretation: "",
      defaultDiagramUrl: "",
      defaultImageUrl: "",
      defaultImagePosition: "end",
      modality: "",
      studyArea: "",
    }
  }
  const obj = raw as Record<string, unknown>
  if (obj.sections && Array.isArray(obj.sections)) {
    return {
      sections: obj.sections as ParameterSection[],
      notes: (obj.notes as string) || "",
      sampleType: (obj.sampleType as string) || "",
      defaultInterpretation: (obj.defaultInterpretation as string) || (obj.notes as string) || "",
      defaultDiagramUrl: (obj.defaultDiagramUrl as string) || (obj.defaultImageUrl as string) || "",
      defaultImageUrl: (obj.defaultImageUrl as string) || (obj.defaultDiagramUrl as string) || "",
      defaultImagePosition: ((obj.defaultImagePosition as string) === "start" ? "start" : "end") as "start" | "end",
      modality: (obj.modality as string) || "",
      studyArea: (obj.studyArea as string) || "",
    }
  }
  if (Array.isArray(raw)) {
    const params: EnhancedParameter[] = raw.map((item: unknown) => {
      const p = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
      return {
        name: (p.name as string) || "",
        unit: (p.unit as string) || "",
        normalRange: (p.normalRange as string) || "",
        method: (p.method as string) || "",
        inputType: ((p.inputType as string) === "select" ? "select" : "text") as "text" | "select",
        options: Array.isArray(p.options) ? (p.options as string[]) : [],
        abnormalValues: Array.isArray(p.abnormalValues) ? (p.abnormalValues as string[]) : [],
        defaultResult: (p.defaultResult as string) || "",
      }
    })
    return {
      sections: params.length > 0 ? [{ heading: "", parameters: params }] : [],
      notes: "",
      sampleType: "",
      defaultInterpretation: "",
      defaultDiagramUrl: "",
      defaultImageUrl: "",
      defaultImagePosition: "end",
      modality: "",
      studyArea: "",
    }
  }
  return {
    sections: [],
    notes: "",
    sampleType: "",
    defaultInterpretation: "",
    defaultDiagramUrl: "",
    defaultImageUrl: "",
    defaultImagePosition: "end",
    modality: "",
    studyArea: "",
  }
}

export function LabTestDialog({ open, onOpenChange, test, testType = "PATHOLOGY" }: LabTestDialogProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [sections, setSections] = useState<ParameterSection[]>([])
  const [notes, setNotes] = useState("")
  const [sampleType, setSampleType] = useState("")
  const [defaultInterpretation, setDefaultInterpretation] = useState("")
  const [defaultImageUrl, setDefaultImageUrl] = useState("")
  const [defaultImagePosition, setDefaultImagePosition] = useState<"start" | "end">("end")
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [modality, setModality] = useState("")
  const [studyArea, setStudyArea] = useState("")
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({})
  const [optionInput, setOptionInput] = useState<Record<string, string>>({})

  useEffect(() => {
    if (test) {
      setName(test.name); setCode(test.code); setPrice(test.price.toString())
      setCategory(test.category || ""); setDescription(test.description || ""); setIsActive(test.isActive)
      const migrated = migrateParameters(test.parameters)
      setSections(migrated.sections); setNotes(migrated.notes); setSampleType(migrated.sampleType)
      setDefaultInterpretation(migrated.defaultInterpretation || migrated.notes || "")
      setDefaultImageUrl(migrated.defaultImageUrl || migrated.defaultDiagramUrl || "")
      setDefaultImagePosition(migrated.defaultImagePosition || "end")
      setModality(migrated.modality || "")
      setStudyArea(migrated.studyArea || "")
    } else {
      setName(""); setCode(""); setPrice(""); setCategory(""); setDescription(""); setIsActive(true)
      setSections([]); setNotes(""); setSampleType("")
      setDefaultInterpretation("")
      setDefaultImageUrl("")
      setDefaultImagePosition("end")
      setModality(testType === "RADIOLOGY" ? "ULTRASOUND" : "")
      setStudyArea("")
    }
    setCollapsedSections({}); setOptionInput({})
  }, [test, open, testType])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingImage(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success && data.url) {
        setDefaultImageUrl(data.url)
        toast.success("Image uploaded successfully")
      } else {
        toast.error(data.error || "Failed to upload image")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ""
    }
  }

  const addSection = () => setSections(prev => [...prev, emptySection()])
  const removeSection = (sIdx: number) => setSections(prev => prev.filter((_, i) => i !== sIdx))
  const updateSectionHeading = (sIdx: number, heading: string) => setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, heading } : s))
  const toggleSection = (sIdx: number) => setCollapsedSections(prev => ({ ...prev, [sIdx]: !prev[sIdx] }))

  const addParameter = (sIdx: number) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, parameters: [...s.parameters, emptyParameter()] } : s))
  }
  const removeParameter = (sIdx: number, pIdx: number) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, parameters: s.parameters.filter((_, j) => j !== pIdx) } : s))
  }
  const updateParameter = (sIdx: number, pIdx: number, field: keyof EnhancedParameter, value: unknown) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, parameters: s.parameters.map((p, j) => j === pIdx ? { ...p, [field]: value } : p) } : s))
  }

  const addOption = (sIdx: number, pIdx: number) => {
    const key = `${sIdx}-${pIdx}`
    const val = (optionInput[key] || "").trim().toUpperCase()
    if (!val) return
    setSections(prev => prev.map((s, i) => i === sIdx ? {
      ...s, parameters: s.parameters.map((p, j) => j === pIdx && !p.options.includes(val) ? { ...p, options: [...p.options, val] } : p)
    } : s))
    setOptionInput(prev => ({ ...prev, [key]: "" }))
  }

  const removeOption = (sIdx: number, pIdx: number, opt: string) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? {
      ...s, parameters: s.parameters.map((p, j) => j === pIdx ? { ...p, options: p.options.filter(o => o !== opt), abnormalValues: p.abnormalValues.filter(a => a !== opt) } : p)
    } : s))
  }

  const toggleAbnormal = (sIdx: number, pIdx: number, opt: string) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? {
      ...s, parameters: s.parameters.map((p, j) => j === pIdx ? {
        ...p, abnormalValues: p.abnormalValues.includes(opt) ? p.abnormalValues.filter(a => a !== opt) : [...p.abnormalValues, opt]
      } : p)
    } : s))
  }

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Please enter a test name")
    if (!code.trim()) return toast.error("Please enter a test code")
    if (!price || parseFloat(price) <= 0) return toast.error("Please enter a valid price")

    const cleanSections = sections
      .map(s => ({ ...s, parameters: s.parameters.filter(p => p.name.trim()) }))
      .filter(s => s.parameters.length > 0 || s.heading.trim())

    const parametersData: EnhancedParametersData | null =
      cleanSections.length > 0 || defaultInterpretation.trim() || defaultImageUrl.trim() || notes.trim()
        ? {
            sections: cleanSections,
            notes: notes || defaultInterpretation,
            sampleType,
            defaultInterpretation: defaultInterpretation.trim() || notes.trim(),
            defaultDiagramUrl: defaultImageUrl.trim() || undefined,
            defaultImageUrl: defaultImageUrl.trim() || undefined,
            defaultImagePosition: defaultImagePosition,
            modality: modality.trim() || undefined,
            studyArea: studyArea.trim() || undefined,
          }
        : null

    const formData = {
      name: name.trim(), code: code.trim().toUpperCase(), price: parseFloat(price),
      category: category.trim() || null, unit: null as string | null, normalRange: null as string | null,
      description: description.trim() || null, isActive, type: test?.type || testType,
      parameters: parametersData as unknown as Record<string, unknown>,
    }

    startTransition(async () => {
      const result = test ? await updateLabTest(test.id, formData) : await createLabTest(formData)
      if (result.success) {
        toast.success(test ? "Test updated successfully" : "Test created successfully")
        onOpenChange(false); router.refresh()
      } else {
        toast.error(result.message || "Failed to save test")
      }
    })
  }

  const isRadiology = (test?.type || testType) === "RADIOLOGY"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[950px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{test ? (isRadiology ? "Edit Radiology Test" : "Edit Lab Test") : (isRadiology ? "Add New Radiology Test" : "Add New Lab Test")}</DialogTitle>
          <DialogDescription>
            {isRadiology
              ? "Configure imaging modality, parameters, default findings, reference ranges, and default clinical interpretation template."
              : "Update test details, pricing, parameters, and reference ranges."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Test Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Test Name <span className="text-red-500">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={isRadiology ? "e.g., USG WHOLE ABDOMEN & PELVIS" : "e.g., URINE EXAMINATION ROUTINE"} autoFocus />
          </div>

          {/* Test Code & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Test Code <span className="text-red-500">*</span></Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={isRadiology ? "e.g., RAD001" : "e.g., UER001"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) <span className="text-red-500">*</span></Label>
              <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Category & Sample Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={isRadiology ? "e.g., ULTRASOUND, X-RAY, CT SCAN" : "e.g., BIOCHEMISTRY"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sampleType">{isRadiology ? "Preparation / Contrast" : "Sample Type"}</Label>
              <Input id="sampleType" value={sampleType} onChange={(e) => setSampleType(e.target.value)} placeholder={isRadiology ? "e.g., Fasting 6 hrs / Full Bladder / Non-contrast" : "e.g., Blood, Urine, Serum"} />
            </div>
          </div>

          {/* Radiology Specific Settings */}
          {isRadiology && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50/50 rounded-lg border border-purple-200">
              <div className="space-y-1.5">
                <Label htmlFor="modality" className="text-xs font-semibold text-purple-900">Imaging Modality</Label>
                <Select value={modality || "ULTRASOUND"} onValueChange={setModality}>
                  <SelectTrigger id="modality" className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select Modality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ULTRASOUND">Ultrasound (USG)</SelectItem>
                    <SelectItem value="X-RAY">Digital X-Ray</SelectItem>
                    <SelectItem value="CT SCAN">CT Scan (Computed Tomography)</SelectItem>
                    <SelectItem value="MRI">MRI (Magnetic Resonance Imaging)</SelectItem>
                    <SelectItem value="MAMMOGRAPHY">Mammography</SelectItem>
                    <SelectItem value="DOPPLER">Color Doppler</SelectItem>
                    <SelectItem value="ECHOCARDIOGRAPHY">2D Echocardiography</SelectItem>
                    <SelectItem value="OTHER">Other Imaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studyArea" className="text-xs font-semibold text-purple-900">Study / Anatomical Area</Label>
                <Input
                  id="studyArea"
                  value={studyArea}
                  onChange={(e) => setStudyArea(e.target.value)}
                  placeholder="e.g. WHOLE ABDOMEN & PELVIS, CHEST PA, BRAIN"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* ── Test Parameter Sections ─────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Test Parameter Sections &amp; Reference Values</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRadiology
                    ? "Define parameters/organs with normal findings, units, biological reference ranges, and methods"
                    : "Group parameters under headings (e.g., 'Gross Examination', 'Chemical Examination')"}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                <Layers className="h-3.5 w-3.5 mr-1" /> Add Section
              </Button>
            </div>

            {sections.length === 0 && (
              <p className="text-xs text-muted-foreground italic border rounded-lg p-3 bg-muted/20 text-center">
                No parameter sections defined. Click &quot;Add Section&quot; to configure structured parameters.
              </p>
            )}

            {sections.map((section, sIdx) => (
              <div key={sIdx} className="border rounded-lg overflow-hidden bg-white">
                {/* Section Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/70 border-b">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <Input
                    value={section.heading}
                    onChange={(e) => updateSectionHeading(sIdx, e.target.value)}
                    placeholder="Section heading (e.g., Abdominal Organs, Pelvic Organs)"
                    className="h-7 text-sm font-semibold bg-transparent border-none shadow-none focus-visible:ring-0 px-1"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleSection(sIdx)}>
                    {collapsedSections[sIdx] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={() => removeSection(sIdx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Section Body */}
                {!collapsedSections[sIdx] && (
                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-[1.2fr_1.3fr_65px_95px_95px_70px_28px] gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                      <span>{isRadiology ? "Organ / Parameter" : "Parameter Name"}</span>
                      <span>{isRadiology ? "Default Finding" : "Default Result"}</span>
                      <span>Unit</span>
                      <span>Bio Ref. Range</span>
                      <span>Method</span>
                      <span>Type</span>
                      <span></span>
                    </div>

                    {section.parameters.map((param, pIdx) => (
                      <div key={pIdx} className="space-y-2">
                        <div className="grid grid-cols-[1.2fr_1.3fr_65px_95px_95px_70px_28px] gap-1.5 items-center">
                          <Input
                            value={param.name}
                            onChange={(e) => updateParameter(sIdx, pIdx, "name", e.target.value)}
                            placeholder={isRadiology ? "e.g. LIVER" : "e.g. Ph"}
                            className="h-8 text-xs"
                          />
                          <Input
                            value={param.defaultResult || ""}
                            onChange={(e) => updateParameter(sIdx, pIdx, "defaultResult", e.target.value)}
                            placeholder={isRadiology ? "e.g. Normal in size" : "Default result"}
                            className="h-8 text-xs"
                          />
                          <Input
                            value={param.unit}
                            onChange={(e) => updateParameter(sIdx, pIdx, "unit", e.target.value)}
                            placeholder="cm / mg/dL"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={param.normalRange}
                            onChange={(e) => updateParameter(sIdx, pIdx, "normalRange", e.target.value)}
                            placeholder="< 15.0 cm"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={param.method}
                            onChange={(e) => updateParameter(sIdx, pIdx, "method", e.target.value)}
                            placeholder={isRadiology ? "B-Mode / USG" : "Method"}
                            className="h-8 text-xs"
                          />
                          <Select value={param.inputType} onValueChange={(val) => updateParameter(sIdx, pIdx, "inputType", val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeParameter(sIdx, pIdx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Select options row */}
                        {param.inputType === "select" && (
                          <div className="ml-4 pl-3 border-l-2 border-blue-200 space-y-1.5">
                            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                              Selection Options
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {param.options.map((opt) => (
                                <Badge
                                  key={opt}
                                  variant="outline"
                                  className={`text-xs cursor-pointer select-none ${param.abnormalValues.includes(opt) ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100" : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"}`}
                                  onClick={() => toggleAbnormal(sIdx, pIdx, opt)}
                                >
                                  {opt}
                                  {param.abnormalValues.includes(opt) && <span className="ml-1 text-[9px]">⚠️</span>}
                                  <X className="h-3 w-3 ml-1 hover:text-red-900" onClick={(e) => { e.stopPropagation(); removeOption(sIdx, pIdx, opt) }} />
                                </Badge>
                              ))}
                              <div className="flex items-center gap-1">
                                <Input
                                  value={optionInput[`${sIdx}-${pIdx}`] || ""}
                                  onChange={(e) => setOptionInput(prev => ({ ...prev, [`${sIdx}-${pIdx}`]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(sIdx, pIdx) } }}
                                  placeholder="Add option..."
                                  className="h-6 w-28 text-xs"
                                />
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => addOption(sIdx, pIdx)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-[9px] text-muted-foreground">
                              Click option to toggle <span className="text-red-600 font-semibold">abnormal</span> (red on report). Green = normal, Red = abnormal.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    <Button type="button" variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700" onClick={() => addParameter(sIdx)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Parameter
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Interpretation / Clinical Notes Template with Image Upload ────────────── */}
          <div className="space-y-3 border rounded-lg p-3.5 bg-slate-50 border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-purple-600" />
                <Label htmlFor="defaultInterpretation" className="text-sm font-semibold text-slate-900">
                  {isRadiology ? "Default Radiology Interpretation & Impression Template" : "Interpretation / Clinical Notes Template"}
                </Label>
              </div>

              {/* Upload image button & position selector */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50 bg-white"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      {defaultImageUrl ? "Replace Image" : "Upload Image"}
                    </>
                  )}
                </Button>

                {defaultImageUrl && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-xs">
                    <span className="text-[11px] font-medium text-slate-500">Position:</span>
                    <Select value={defaultImagePosition} onValueChange={(val: "start" | "end") => setDefaultImagePosition(val)}>
                      <SelectTrigger className="h-6 text-[11px] border-none shadow-none font-semibold text-purple-700 px-1 focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="start">At Start (Top of Findings)</SelectItem>
                        <SelectItem value="end">At End (Bottom of Findings)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* If image position is START: show preview ABOVE textarea */}
            {defaultImageUrl && defaultImagePosition === "start" && (
              <div className="flex items-center justify-between p-2.5 bg-white border border-purple-200 rounded-md shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-20 rounded bg-slate-100 overflow-hidden border shrink-0">
                    <Image
                      src={defaultImageUrl}
                      alt="Uploaded Diagram"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                      Image Position: At Start (Top of Interpretation)
                    </span>
                    <span className="text-xs text-slate-600 block truncate max-w-md">
                      {defaultImageUrl}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDefaultImageUrl("")}
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </div>
            )}

            <Textarea
              id="defaultInterpretation"
              value={defaultInterpretation}
              onChange={(e) => {
                setDefaultInterpretation(e.target.value)
                setNotes(e.target.value)
              }}
              placeholder={
                isRadiology
                  ? "Enter the default structured report template (e.g., organ findings, clinical impression, diagnostic notes) that the radiologist can edit during result entry..."
                  : "Default clinical interpretation notes..."
              }
              rows={6}
              className="font-mono text-xs bg-white"
            />

            {/* If image position is END: show preview BELOW textarea */}
            {defaultImageUrl && defaultImagePosition === "end" && (
              <div className="flex items-center justify-between p-2.5 bg-white border border-purple-200 rounded-md shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-20 rounded bg-slate-100 overflow-hidden border shrink-0">
                    <Image
                      src={defaultImageUrl}
                      alt="Uploaded Diagram"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                      Image Position: At End (Bottom of Interpretation)
                    </span>
                    <span className="text-xs text-slate-600 block truncate max-w-md">
                      {defaultImageUrl}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDefaultImageUrl("")}
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              When entering results for a patient, this template and attached image will be pre-filled into the Result Entry Studio and printed on the report at your chosen position.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Internal Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Internal notes about this test (not shown on report)" rows={2} />
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="isActive" className="cursor-pointer">Active (Available for ordering)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white">
            {isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="mr-2 h-4 w-4" />{test ? "Update Test" : "Create Test"}</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
