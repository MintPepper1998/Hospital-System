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
import { Loader2, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, X, Layers, FileText, Upload, Sparkles, MoveUp, MoveDown, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { createLabTest, updateLabTest } from "@/lib/actions"
import { useRouter } from "next/navigation"
import type { RadiologyOrganFinding, RadiologyTemplateData } from "@/app/actions/radiology"

type TestType = "PATHOLOGY" | "RADIOLOGY"

export const RADIOLOGY_PRESETS = [
  {
    name: "USG Whole Abdomen (Uploaded Standard)",
    studyTitle: "ULTRASOUND WHOLE ABDOMEN",
    modality: "ULTRASOUND",
    category: "ULTRASOUND",
    organs: [
      {
        organ: "LIVER",
        description: "Normal in shape, size and parenchymal echotexture. IHBCS are not dilated. Portal vein is normal in caliber. No focal lesion is seen.",
      },
      {
        organ: "G. BLADDER",
        description: "Normal in size, shape and echopattern. No calculus or mass lesion detected in the gall bladder. G.B. wall thickness is normal.",
      },
      {
        organ: "CBD",
        description: "is normal in caliber. No calculus or mass lesion is seen.",
      },
      {
        organ: "PANCREAS",
        description: "Normal in shape, size and echotexture.",
      },
      {
        organ: "SPLEEN",
        description: "Normal in shape, size and echotexture. No focal lesion is seen.",
      },
      {
        organ: "KIDNEY",
        description: "B/L kidneys show normal shape, size and echotexture. Cortico-medullary differentiation is maintained. No calculus hydronephrosis is seen.",
      },
      {
        organ: "U. BLADDER",
        description: "Lumen is echofree. Wall thickness is normal.",
      },
      {
        organ: "PROSTATE",
        description: "Normal in shape, size and echotexture. No focal lesion is seen.",
      },
    ],
    additionalObservations: "No evidence of retroperitoneal lymphadenopathy is seen.\nGaseous abdomen seen",
    defaultImpression: "NO SIGNIFICANT SONOLOGICAL ABNORMALITY DETECTED.",
    footerNote: "जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।",
  },
  {
    name: "USG KUB (Kidneys, Ureters, Bladder)",
    studyTitle: "ULTRASOUND KUB",
    modality: "ULTRASOUND",
    category: "ULTRASOUND",
    organs: [
      {
        organ: "RIGHT KIDNEY",
        description: "Normal in size, shape and cortical echogenicity. Corticomedullary differentiation is maintained. No calculus or hydronephrosis.",
      },
      {
        organ: "LEFT KIDNEY",
        description: "Normal in size, shape and cortical echogenicity. Corticomedullary differentiation is maintained. No calculus or hydronephrosis.",
      },
      {
        organ: "URETERS",
        description: "Bilateral ureters are not dilated. No radio-opaque or acoustic calculus seen.",
      },
      {
        organ: "URINARY BLADDER",
        description: "Well distended, lumen is echofree. Wall thickness is normal. No calculus or mass lesion.",
      },
      {
        organ: "PROSTATE / PELVIC ORGANS",
        description: "Normal in size, shape and parenchymal echotexture.",
      },
    ],
    additionalObservations: "Pre-void volume and post-void residual urine are within normal limits. No retroperitoneal lymphadenopathy.",
    defaultImpression: "NORMAL USG KUB STUDY.",
    footerNote: "जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।",
  },
  {
    name: "Digital X-Ray Chest PA View",
    studyTitle: "X-RAY CHEST PA VIEW",
    modality: "X-RAY",
    category: "X-RAY",
    organs: [
      {
        organ: "LUNG FIELDS",
        description: "Bilateral lung fields are clear. No active parenchymal infiltration, consolidation or cavitation seen.",
      },
      {
        organ: "PLEURAL SPACES",
        description: "Both costophrenic and cardiophrenic angles are sharp and clear. No evidence of pleural effusion or pneumothorax.",
      },
      {
        organ: "CARDIAC SHADOW",
        description: "Cardiac size and configuration are within normal limits. Cardiothoracic ratio is normal (< 0.50).",
      },
      {
        organ: "HILA & MEDIASTINUM",
        description: "Bilateral hila and mediastinal contours appear normal.",
      },
      {
        organ: "BONY THORAX & SOFT TISSUES",
        description: "Visualized thoracic cage, ribs, clavicles and chest wall soft tissues appear unremarkable.",
      },
    ],
    additionalObservations: "Trachea is centrally placed. Both domes of diaphragm show normal outline and position.",
    defaultImpression: "NORMAL CHEST RADIOGRAPH.",
    footerNote: "जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।",
  },
  {
    name: "USG Pelvis / Lower Abdomen",
    studyTitle: "ULTRASOUND PELVIS",
    modality: "ULTRASOUND",
    category: "ULTRASOUND",
    organs: [
      {
        organ: "UTERUS",
        description: "Normal in size, anteverted with uniform homogeneous myometrial echotexture. No focal mass or fibroid seen.",
      },
      {
        organ: "ENDOMETRIUM",
        description: "Endometrial cavity is central with normal regular thickness and echogenicity.",
      },
      {
        organ: "RIGHT OVARY",
        description: "Normal in size, shape and stroma. Normal follicle development.",
      },
      {
        organ: "LEFT OVARY",
        description: "Normal in size, shape and stroma. Normal follicle development.",
      },
      {
        organ: "POD / ADNEXA",
        description: "No free fluid in Pouch of Douglas. Bilateral adnexal regions are clear.",
      },
      {
        organ: "URINARY BLADDER",
        description: "Well distended, wall thickness normal. Lumen clear.",
      },
    ],
    additionalObservations: "No adnexal mass lesion or abnormal pelvic collection seen.",
    defaultImpression: "NORMAL PELVIC ULTRASOUND STUDY.",
    footerNote: "जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।",
  },
]

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
  radiologyTemplate?: RadiologyTemplateData
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
  const radTpl = (obj.radiologyTemplate as RadiologyTemplateData) || undefined

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
      radiologyTemplate: radTpl,
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
      radiologyTemplate: radTpl,
    }
  }
  return {
    sections: [],
    notes: (obj.notes as string) || "",
    sampleType: (obj.sampleType as string) || "",
    defaultInterpretation: (obj.defaultInterpretation as string) || "",
    defaultDiagramUrl: (obj.defaultDiagramUrl as string) || "",
    defaultImageUrl: (obj.defaultImageUrl as string) || "",
    defaultImagePosition: "end",
    modality: (obj.modality as string) || "",
    studyArea: (obj.studyArea as string) || "",
    radiologyTemplate: radTpl,
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

  // ── Radiology Organ-Wise Template State (matches uploaded template) ──
  const [studyTitle, setStudyTitle] = useState("")
  const [radiologyOrgans, setRadiologyOrgans] = useState<RadiologyOrganFinding[]>([])
  const [additionalObservations, setAdditionalObservations] = useState("")
  const [defaultImpression, setDefaultImpression] = useState("")
  const [footerNote, setFooterNote] = useState("जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।")
  const [radiologyViewMode, setRadiologyViewMode] = useState<"organ_template" | "numerical_parameters">("organ_template")

  const isRadiology = (test?.type || testType) === "RADIOLOGY"

  useEffect(() => {
    if (test) {
      setName(test.name); setCode(test.code); setPrice(test.price.toString())
      setCategory(test.category || ""); setDescription(test.description || ""); setIsActive(test.isActive)
      const migrated = migrateParameters(test.parameters)
      setSections(migrated.sections); setNotes(migrated.notes); setSampleType(migrated.sampleType)
      setDefaultInterpretation(migrated.defaultInterpretation || migrated.notes || "")
      setDefaultImageUrl(migrated.defaultImageUrl || migrated.defaultDiagramUrl || "")
      setDefaultImagePosition(migrated.defaultImagePosition || "end")
      setModality(migrated.modality || (test.type === "RADIOLOGY" ? "ULTRASOUND" : ""))
      setStudyArea(migrated.studyArea || "")

      if (migrated.radiologyTemplate) {
        setStudyTitle(migrated.radiologyTemplate.studyTitle || test.name)
        setRadiologyOrgans(migrated.radiologyTemplate.organs || [])
        setAdditionalObservations(migrated.radiologyTemplate.additionalObservations || "")
        setDefaultImpression(migrated.radiologyTemplate.defaultImpression || "")
        setFooterNote(migrated.radiologyTemplate.footerNote || "जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।")
        setRadiologyViewMode("organ_template")
      } else if (test.type === "RADIOLOGY") {
        setStudyTitle(test.name || "")
        setRadiologyOrgans([])
        setAdditionalObservations("")
        setDefaultImpression("")
        setFooterNote("जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।")
        setRadiologyViewMode(migrated.sections.length > 0 ? "numerical_parameters" : "organ_template")
      }
    } else {
      setName(""); setCode(""); setPrice(""); setCategory(""); setDescription(""); setIsActive(true)
      setSections([]); setNotes(""); setSampleType("")
      setDefaultInterpretation("")
      setDefaultImageUrl("")
      setDefaultImagePosition("end")
      setModality(testType === "RADIOLOGY" ? "ULTRASOUND" : "")
      setStudyArea("")

      if (testType === "RADIOLOGY") {
        const def = RADIOLOGY_PRESETS[0]
        setStudyTitle(def.studyTitle)
        setRadiologyOrgans(def.organs.map(o => ({ ...o })))
        setAdditionalObservations(def.additionalObservations)
        setDefaultImpression(def.defaultImpression)
        setFooterNote(def.footerNote)
        setRadiologyViewMode("organ_template")
      } else {
        setStudyTitle("")
        setRadiologyOrgans([])
        setAdditionalObservations("")
        setDefaultImpression("")
        setFooterNote("जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।")
        setRadiologyViewMode("organ_template")
      }
    }
    setCollapsedSections({}); setOptionInput({})
  }, [test, open, testType])

  const applyPreset = (preset: typeof RADIOLOGY_PRESETS[0]) => {
    if (!name.trim()) setName(preset.name)
    if (!code.trim()) setCode(preset.category === "X-RAY" ? "RAD-XRAY" : "RAD-USG")
    setCategory(preset.category)
    setModality(preset.modality)
    setStudyTitle(preset.studyTitle)
    setRadiologyOrgans(preset.organs.map(o => ({ ...o })))
    setAdditionalObservations(preset.additionalObservations)
    setDefaultImpression(preset.defaultImpression)
    setFooterNote(preset.footerNote)
    setRadiologyViewMode("organ_template")
    toast.success(`Loaded preset: ${preset.name}`)
  }

  const addOrgan = () => {
    setRadiologyOrgans(prev => [...prev, { organ: "", description: "" }])
  }

  const removeOrgan = (idx: number) => {
    setRadiologyOrgans(prev => prev.filter((_, i) => i !== idx))
  }

  const updateOrgan = (idx: number, field: "organ" | "description", val: string) => {
    setRadiologyOrgans(prev => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o))
  }

  const moveOrgan = (idx: number, direction: "up" | "down") => {
    setRadiologyOrgans(prev => {
      const copy = [...prev]
      const targetIdx = direction === "up" ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= copy.length) return prev
      const [item] = copy.splice(idx, 1)
      copy.splice(targetIdx, 0, item)
      return copy
    })
  }

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

  let parametersData: EnhancedParametersData | null = null

  if (isRadiology && radiologyViewMode === "organ_template") {
    const cleanOrgans = radiologyOrgans.filter(
      (o) => o.organ.trim() || o.description.trim()
    )

    const formattedInterpretation =
      cleanOrgans
        .filter((o) => o.organ.trim())
        .map((o) => `${o.organ.trim().toUpperCase()}:\n${o.description.trim()}`)
        .join("\n\n") +
      (additionalObservations.trim() ? `\n\n${additionalObservations.trim()}` : "")

    parametersData = {
      sections: cleanSections,
      notes: formattedInterpretation || defaultInterpretation,
      sampleType,
      defaultInterpretation: formattedInterpretation || defaultInterpretation.trim(),
      defaultDiagramUrl: defaultImageUrl.trim() || undefined,
      defaultImageUrl: defaultImageUrl.trim() || undefined,
      defaultImagePosition: defaultImagePosition,
      modality: modality.trim() || "ULTRASOUND",
      studyArea: studyArea.trim() || name.trim(),
      radiologyTemplate: {
        studyTitle: studyTitle.trim() || name.trim(),
        modality: modality.trim() || "ULTRASOUND",
        organs: cleanOrgans,
        additionalObservations: additionalObservations.trim(),
        defaultImpression: defaultImpression.trim(),
        footerNote: footerNote.trim(),
      },
    }
  } else {
    parametersData =
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
  }

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

        {/* ── Radiology Template Findings Switcher (when isRadiology) ── */}
        {isRadiology && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-purple-50/80 rounded-lg border border-purple-200">
            <div>
              <Label className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-700" />
                Radiology Findings Template Designer
              </Label>
              <p className="text-[11px] text-purple-900/80">
                Matches your standard radiology report layout (Organ Name &rarr; Baseline Description).
              </p>
            </div>
            <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-purple-200 shrink-0">
              <Button
                type="button"
                size="sm"
                variant={radiologyViewMode === "organ_template" ? "default" : "ghost"}
                onClick={() => setRadiologyViewMode("organ_template")}
                className={`h-7 text-xs ${radiologyViewMode === "organ_template" ? "bg-purple-700 hover:bg-purple-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                Organ Findings (Uploaded Standard)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={radiologyViewMode === "numerical_parameters" ? "default" : "ghost"}
                onClick={() => setRadiologyViewMode("numerical_parameters")}
                className={`h-7 text-xs ${radiologyViewMode === "numerical_parameters" ? "bg-purple-700 hover:bg-purple-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                Numerical Parameters
              </Button>
            </div>
          </div>
        )}

        {isRadiology && radiologyViewMode === "organ_template" ? (
          <div className="space-y-4 border rounded-lg p-4 bg-purple-50/20 border-purple-200">
            {/* Presets Quick Load */}
            <div className="space-y-2 pb-3 border-b border-purple-200/60">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                Quick Load Presets:
              </Label>
              <div className="flex flex-wrap gap-2">
                {RADIOLOGY_PRESETS.map((preset, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="h-7 text-xs border-purple-300 text-purple-900 bg-white hover:bg-purple-50"
                  >
                    ⚡ {preset.name}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRadiologyOrgans([])
                    setAdditionalObservations("")
                    setDefaultImpression("")
                    toast.info("Cleared template organs")
                  }}
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 bg-white"
                >
                  Clear Organs
                </Button>
              </div>
            </div>

            {/* Study Title on Print Header */}
            <div className="space-y-1.5">
              <Label htmlFor="studyTitle" className="text-xs font-semibold text-slate-900">
                Underlined Study Title (Shown Centered on Report)
              </Label>
              <Input
                id="studyTitle"
                value={studyTitle}
                onChange={(e) => setStudyTitle(e.target.value)}
                placeholder="e.g. ULTRASOUND WHOLE ABDOMEN"
                className="h-8 text-xs font-bold uppercase tracking-wide bg-white"
              />
            </div>

            {/* Organ Findings List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wide text-slate-800">
                    Organ / Region Findings ({radiologyOrgans.length})
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Organ name on the left, normal baseline description on the right. During result entry, only abnormal findings are edited.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOrgan}
                  className="h-7 text-xs border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Organ Finding
                </Button>
              </div>

              {radiologyOrgans.length === 0 && (
                <div className="p-4 border border-dashed rounded-lg text-center bg-white text-muted-foreground text-xs">
                  No organs added. Click a preset above (e.g. &quot;USG Whole Abdomen&quot;) or click &quot;Add Organ Finding&quot; to begin.
                </div>
              )}

              <div className="space-y-2">
                {radiologyOrgans.map((org, oIdx) => (
                  <div
                    key={oIdx}
                    className="border rounded-lg p-2.5 bg-white shadow-xs space-y-2 border-slate-200 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-[11px] font-bold text-purple-700 shrink-0 w-6 text-center">
                          #{oIdx + 1}
                        </span>
                        <Input
                          value={org.organ}
                          onChange={(e) => updateOrgan(oIdx, "organ", e.target.value)}
                          placeholder="Organ Name (e.g. LIVER, G. BLADDER, CBD)"
                          className="h-7 text-xs font-bold uppercase bg-slate-50 border-slate-300 max-w-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={oIdx === 0}
                          onClick={() => moveOrgan(oIdx, "up")}
                          className="h-6 w-6 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                          title="Move Up"
                        >
                          <MoveUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={oIdx === radiologyOrgans.length - 1}
                          onClick={() => moveOrgan(oIdx, "down")}
                          className="h-6 w-6 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                          title="Move Down"
                        >
                          <MoveDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOrgan(oIdx)}
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Remove Organ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Textarea
                        value={org.description}
                        onChange={(e) => updateOrgan(oIdx, "description", e.target.value)}
                        placeholder="Default normal finding description (e.g. Normal in shape, size and echotexture...)"
                        rows={2}
                        className="text-xs bg-white resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Observations / Remarks */}
            <div className="space-y-1.5 pt-2 border-t border-purple-200/60">
              <Label htmlFor="additionalObservations" className="text-xs font-semibold text-slate-900">
                Additional Observations Paragraphs (Printed below organ findings)
              </Label>
              <Textarea
                id="additionalObservations"
                value={additionalObservations}
                onChange={(e) => setAdditionalObservations(e.target.value)}
                placeholder={"e.g. No evidence of retroperitoneal lymphadenopathy is seen.\nGaseous abdomen seen"}
                rows={2}
                className="text-xs bg-white font-sans"
              />
            </div>

            {/* Default Impression */}
            <div className="space-y-1.5">
              <Label htmlFor="defaultImpression" className="text-xs font-semibold text-slate-900">
                Default Clinical Impression (Shown in bold uppercase on report)
              </Label>
              <Textarea
                id="defaultImpression"
                value={defaultImpression}
                onChange={(e) => setDefaultImpression(e.target.value)}
                placeholder="e.g. NO SIGNIFICANT SONOLOGICAL ABNORMALITY DETECTED."
                rows={2}
                className="text-xs bg-white font-bold uppercase tracking-tight"
              />
            </div>

            {/* Footer Note */}
            <div className="space-y-1.5">
              <Label htmlFor="footerNote" className="text-xs font-semibold text-slate-900">
                Report Footer Disclaimer
              </Label>
              <Input
                id="footerNote"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                placeholder="e.g. जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।"
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>
        ) : (
          /* ── Test Parameter Sections ─────────────── */
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
        )}

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
