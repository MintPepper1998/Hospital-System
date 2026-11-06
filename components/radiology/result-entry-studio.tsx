"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import {
  Radiation,
  Save,
  ArrowLeft,
  Upload,
  Trash2,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  saveRadiologyReport,
  RadiologyParameterResult,
  RadiologyAttachment,
  RadiologyReportData,
  RadiologyOrganFinding,
  RadiologyTemplateData,
} from "@/app/actions/radiology"

const DEFAULT_WHOLE_ABDOMEN_ORGANS: RadiologyOrganFinding[] = [
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
]

interface ResultEntryStudioProps {
  initialContext: {
    requestId: string
    isIPD: boolean
    testName: string
    status: string
    priority: string
    createdAt: Date | string
    patient: {
      id: string
      patientId: string
      name: string
      gender: string
      age: number | null
      phone: string
      bloodGroup: string | null
    }
    referringDoctor: string
    hospital: {
      name: string
      address: string
      phone: string
      email: string
    }
    defaultRadiologist: {
      name: string
      qualification: string
      designation: string
      regNo: string
    }
    catalog: {
      id: string
      name: string
      code: string
      modality: string
      studyArea: string
      defaultSections: Array<{
        heading: string
        parameters: RadiologyParameterResult[]
      }>
      defaultParameters: RadiologyParameterResult[]
      defaultInterpretation: string
      defaultDiagramUrl: string
      defaultImageUrl?: string
      defaultImagePosition?: "start" | "end"
      radiologyTemplate?: RadiologyTemplateData | null
    }
    existingData: RadiologyReportData | null
  }
}

export function ResultEntryStudio({ initialContext }: ResultEntryStudioProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const interpImgInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingInterpImg, setIsUploadingInterpImg] = useState(false)

  // Context alias
  const {
    requestId,
    isIPD,
    testName,
    patient,
    referringDoctor,
    catalog,
    existingData,
    defaultRadiologist,
  } = initialContext

  // State initialization
  const [modality, setModality] = useState<string>(
    existingData?.modality || catalog.modality || "ULTRASOUND"
  )
  const [studyArea, setStudyArea] = useState<string>(
    existingData?.studyArea || catalog.studyArea || testName
  )

  // ── Organ-Wise Findings State (matches uploaded template) ──
  const initialOrgans: RadiologyOrganFinding[] =
    existingData?.organs && existingData.organs.length > 0
      ? existingData.organs
      : catalog.radiologyTemplate?.organs && catalog.radiologyTemplate.organs.length > 0
      ? catalog.radiologyTemplate.organs
      : DEFAULT_WHOLE_ABDOMEN_ORGANS

  const [studyTitle, setStudyTitle] = useState<string>(
    existingData?.studyTitle || catalog.radiologyTemplate?.studyTitle || testName
  )

  const [organs, setOrgans] = useState<RadiologyOrganFinding[]>(initialOrgans)

  const [additionalObservations, setAdditionalObservations] = useState<string>(
    existingData?.additionalObservations !== undefined
      ? existingData.additionalObservations
      : catalog.radiologyTemplate?.additionalObservations !== undefined
      ? catalog.radiologyTemplate.additionalObservations
      : "No evidence of retroperitoneal lymphadenopathy is seen.\nGaseous abdomen seen"
  )

  const [footerNote, setFooterNote] = useState<string>(
    existingData?.footerNote ||
      catalog.radiologyTemplate?.footerNote ||
      "जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।"
  )

  // 5-Column Parameters
  const initialParams: RadiologyParameterResult[] =
    existingData?.parameters && existingData.parameters.length > 0
      ? existingData.parameters
      : catalog.defaultParameters.length > 0
      ? catalog.defaultParameters
      : [
          {
            name: "LIVER",
            result: "Normal in size and acoustic texture. No focal lesion.",
            unit: "cm",
            normalRange: "< 15.0 cm",
            method: "Real-time B Mode",
            isAbnormal: false,
          },
          {
            name: "GALL BLADDER",
            result: "Well distended, wall thickness normal. Lumen clear.",
            unit: "mm",
            normalRange: "< 3 mm",
            method: "Real-time B Mode",
            isAbnormal: false,
          },
          {
            name: "RIGHT KIDNEY",
            result: "Normal size, shape, and cortical echogenicity.",
            unit: "cm",
            normalRange: "9.0 - 12.0 cm",
            method: "Real-time B Mode",
            isAbnormal: false,
          },
          {
            name: "LEFT KIDNEY",
            result: "Normal size, shape, and cortical echogenicity.",
            unit: "cm",
            normalRange: "9.0 - 12.0 cm",
            method: "Real-time B Mode",
            isAbnormal: false,
          },
          {
            name: "SPLEEN",
            result: "Normal in size and parenchymal echotexture.",
            unit: "cm",
            normalRange: "< 12.0 cm",
            method: "Real-time B Mode",
            isAbnormal: false,
          },
          {
            name: "URINARY BLADDER",
            result: "Well distended, normal wall. Pre/post-void volume normal.",
            unit: "mL",
            normalRange: "< 20 mL PVR",
            method: "Real-time B Mode",
            isAbnormal: false,
          },
        ]

  const [parameters, setParameters] = useState<RadiologyParameterResult[]>(initialParams)

  // Editable Interpretation (Findings)
  const [interpretation, setInterpretation] = useState<string>(
    existingData?.interpretation || catalog.defaultInterpretation
  )

  // Impression
  const [impression, setImpression] = useState<string>(
    existingData?.impression ||
      catalog.radiologyTemplate?.defaultImpression ||
      "NO SIGNIFICANT SONOLOGICAL ABNORMALITY DETECTED."
  )

  // Organ manipulation helpers
  const updateOrganFinding = (index: number, description: string) => {
    setOrgans((prev) =>
      prev.map((item, i) => (i === index ? { ...item, description } : item))
    )
  }

  const updateOrganName = (index: number, organ: string) => {
    setOrgans((prev) =>
      prev.map((item, i) => (i === index ? { ...item, organ } : item))
    )
  }

  const addOrganFinding = () => {
    setOrgans((prev) => [...prev, { organ: "", description: "Normal in appearance and echotexture." }])
  }

  const removeOrganFinding = (index: number) => {
    setOrgans((prev) => prev.filter((_, i) => i !== index))
  }

  const resetOrganFinding = (index: number) => {
    const currentName = organs[index].organ.trim().toUpperCase()
    const catalogOrg = catalog.radiologyTemplate?.organs?.find(
      (o) => o.organ.trim().toUpperCase() === currentName
    )
    const fallbackOrg = DEFAULT_WHOLE_ABDOMEN_ORGANS.find(
      (o) => o.organ.trim().toUpperCase() === currentName
    )
    const normalText = catalogOrg?.description || fallbackOrg?.description || "Normal in size, shape and echotexture."
    updateOrganFinding(index, normalText)
    toast.info(`Reset ${organs[index].organ || "organ"} to normal description`)
  }

  // Diagram / Interpretation Image & Position
  const [imageUrl, setImageUrl] = useState<string>(
    existingData?.imageUrl || existingData?.diagramUrl || catalog.defaultImageUrl || catalog.defaultDiagramUrl || ""
  )
  const [imagePosition, setImagePosition] = useState<"start" | "end">(
    existingData?.imagePosition || catalog.defaultImagePosition || "end"
  )
  const [diagramUrl, setDiagramUrl] = useState<string>(
    existingData?.diagramUrl || catalog.defaultDiagramUrl || ""
  )

  // Attachments (film images, diagrams)
  const [attachments, setAttachments] = useState<RadiologyAttachment[]>(
    existingData?.attachments || []
  )

  // Signing Radiologist
  const [radiologist, setRadiologist] = useState(
    existingData?.radiologist || defaultRadiologist
  )

  // Parameter manipulations
  const updateParameter = (
    index: number,
    field: keyof RadiologyParameterResult,
    value: string | boolean
  ) => {
    setParameters((prev) =>
      prev.map((param, i) => (i === index ? { ...param, [field]: value } : param))
    )
  }

  const addParameter = () => {
    setParameters((prev) => [
      ...prev,
      {
        name: "",
        result: "",
        unit: "",
        normalRange: "",
        method: modality === "X-RAY" ? "Digital Radiography" : "Real-time B Mode",
        isAbnormal: false,
      },
    ])
  }

  const removeParameter = (index: number) => {
    setParameters((prev) => prev.filter((_, i) => i !== index))
  }

  // File upload for scan films
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const file = files[0]
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()
      if (result.success && result.url) {
        setAttachments((prev) => [
          ...prev,
          {
            url: result.url,
            title: file.name.replace(/\.[^/.]+$/, ""),
            caption: `Scan Film / Figure ${prev.length + 1}`,
          },
        ])
        toast.success("Scan film image attached")
      } else {
        toast.error(result.error || "Failed to upload image")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const updateAttachmentCaption = (index: number, caption: string) => {
    setAttachments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, caption } : item))
    )
  }

  // Upload image/diagram for Interpretation section
  const handleInterpImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingInterpImg(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success && data.url) {
        setImageUrl(data.url)
        toast.success("Image uploaded to interpretation")
      } else {
        toast.error(data.error || "Failed to upload image")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file")
    } finally {
      setIsUploadingInterpImg(false)
      if (interpImgInputRef.current) interpImgInputRef.current.value = ""
    }
  }

  // Quick reset to catalog default interpretation
  const handleResetInterpretation = () => {
    if (confirm("Reset the Interpretation and Findings text to the catalog default template?")) {
      setInterpretation(catalog.defaultInterpretation)
      if (catalog.defaultImageUrl || catalog.defaultDiagramUrl) {
        setImageUrl(catalog.defaultImageUrl || catalog.defaultDiagramUrl)
        setImagePosition(catalog.defaultImagePosition || "end")
      }
      toast.info("Interpretation reset to default template")
    }
  }

  // Save report
  const handleSubmit = () => {
    if (!radiologist.name.trim()) {
      return toast.error("Please specify the signing radiologist")
    }

    const compiledInterpretation = organs
      .filter((o) => o.organ.trim())
      .map((o) => `${o.organ.trim().toUpperCase()}:\n${o.description.trim()}`)
      .join("\n\n") + (additionalObservations.trim() ? `\n\n${additionalObservations.trim()}` : "")

    const finalInterpretation = compiledInterpretation.trim() || interpretation.trim()
    if (!finalInterpretation) {
      return toast.error("Please enter the clinical interpretation or findings")
    }

    const reportData: RadiologyReportData = {
      modality,
      studyArea,
      studyTitle: studyTitle.trim() || testName,
      organs: organs.filter((o) => o.organ.trim()),
      additionalObservations: additionalObservations.trim(),
      footerNote: footerNote.trim(),
      parameters: parameters.filter((p) => p.name.trim() || p.result.trim()),
      interpretation: finalInterpretation,
      impression: impression.trim(),
      diagramUrl: imageUrl.trim() || diagramUrl.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      imagePosition,
      attachments,
      radiologist,
    }

    startTransition(async () => {
      const res = await saveRadiologyReport({
        requestId,
        isIPD,
        reportData,
      })

      if (res.success) {
        toast.success(res.message || "Radiology report finalized successfully")
        router.push(res.redirectUrl || `/dashboard/radiology/print/${requestId}`)
      } else {
        toast.error(res.message || "Failed to finalize radiology report")
      }
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-600">
              <Link href="/dashboard/radiology/queue">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Radiology Queue
              </Link>
            </Button>
            <span className="text-slate-300">/</span>
            <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200">
              <Radiation className="h-3 w-3 mr-1 text-purple-600" />
              Result Entry Studio
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {testName}
          </h1>
          <p className="text-xs text-slate-500">
            Generate and electronically sign diagnostic imaging report matching standard laboratory specifications.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-slate-300"
          >
            <Link href={`/dashboard/radiology/print/${requestId}`} target="_blank">
              <Eye className="h-4 w-4 mr-1.5" />
              Preview Report
            </Link>
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finalizing &amp; Signing...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save &amp; Finalize Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Patient & Clinical Banner ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div>
          <span className="text-slate-500 block font-medium uppercase text-[10px] tracking-wider">Patient Name</span>
          <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
          <span className="block text-slate-400 font-mono text-[11px]">{patient.patientId}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium uppercase text-[10px] tracking-wider">Demographics</span>
          <span className="font-semibold text-slate-800">
            {patient.age ? `${patient.age} Y` : "N/A"} / {patient.gender}
          </span>
          <span className="block text-slate-500">{patient.bloodGroup ? `Blood: ${patient.bloodGroup}` : `Tel: ${patient.phone || "N/A"}`}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium uppercase text-[10px] tracking-wider">Referred By</span>
          <span className="font-semibold text-slate-800">{referringDoctor}</span>
          <span className="block text-slate-400">Prescribing Physician</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium uppercase text-[10px] tracking-wider">Investigation Scope</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className={isIPD ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}>
              {isIPD ? "IPD Ward" : "OPD Walk-in"}
            </Badge>
            <Badge variant="outline" className="bg-slate-50 text-slate-700">
              {modality}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Modality & Study Area Configuration ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3.5 px-4 bg-slate-50/70 border-b border-slate-200">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Radiation className="h-4 w-4 text-purple-600" />
            Imaging Modality &amp; Study Area
          </CardTitle>
          <CardDescription className="text-xs">
            Appears on the top header and demographic section of the printed test report.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="modality" className="text-xs font-semibold text-slate-700">Imaging Modality</Label>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger id="modality" className="h-9 text-xs">
                <SelectValue placeholder="Select Modality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ULTRASOUND">Ultrasound (USG)</SelectItem>
                <SelectItem value="X-RAY">Digital X-Ray (CR / DR)</SelectItem>
                <SelectItem value="CT SCAN">CT Scan (Computed Tomography)</SelectItem>
                <SelectItem value="MRI">MRI (Magnetic Resonance Imaging)</SelectItem>
                <SelectItem value="MAMMOGRAPHY">Mammography</SelectItem>
                <SelectItem value="COLOR DOPPLER">Color Doppler Study</SelectItem>
                <SelectItem value="2D ECHOCARDIOGRAPHY">2D Echocardiography</SelectItem>
                <SelectItem value="SPECIAL INVESTIGATION">Special Radiographic Investigation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="studyArea" className="text-xs font-semibold text-slate-700">Study / Anatomical Area</Label>
            <Input
              id="studyArea"
              value={studyArea}
              onChange={(e) => setStudyArea(e.target.value)}
              placeholder="e.g. WHOLE ABDOMEN & PELVIS, CHEST PA, BRAIN, KNEE"
              className="h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Organ-Wise Findings Studio (Uploaded Template Standard) ── */}
      <Card className="border-purple-300 shadow-sm bg-gradient-to-b from-purple-50/20 to-white">
        <CardHeader className="py-3.5 px-4 bg-purple-50/70 border-b border-purple-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-purple-950 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Organ Findings &amp; Clinical Descriptions
            </CardTitle>
            <CardDescription className="text-xs text-purple-900/80">
              Normal findings are pre-filled. Edit the description for any abnormal organ.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOrganFinding}
            className="h-8 text-xs border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Organ Finding
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Centered Study Title on Print Header */}
          <div className="space-y-1">
            <Label htmlFor="studyTitle" className="text-xs font-semibold text-slate-800">
              Report Study Title (Underlined &amp; Centered on Report)
            </Label>
            <Input
              id="studyTitle"
              value={studyTitle}
              onChange={(e) => setStudyTitle(e.target.value)}
              placeholder="e.g. ULTRASOUND WHOLE ABDOMEN"
              className="h-8 text-xs font-bold uppercase tracking-wide bg-white"
            />
          </div>

          {/* Organs List */}
          <div className="space-y-3">
            {organs.map((item, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3 bg-white shadow-xs space-y-2 border-slate-200 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-purple-700 w-5">
                      #{idx + 1}
                    </span>
                    <Input
                      value={item.organ}
                      onChange={(e) => updateOrganName(idx, e.target.value)}
                      placeholder="ORGAN NAME (e.g. LIVER)"
                      className="h-7 text-xs font-bold uppercase tracking-tight bg-slate-50 border-slate-300 w-44"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => resetOrganFinding(idx)}
                      className="h-7 text-[11px] text-slate-600 hover:text-purple-700 hover:bg-purple-50"
                      title="Reset description to normal baseline"
                    >
                      Reset Normal
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOrganFinding(idx)}
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete organ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateOrganFinding(idx, e.target.value)}
                    placeholder="Describe findings for this organ/region..."
                    rows={2}
                    className="text-xs bg-white font-sans resize-y leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Additional Observations Paragraphs */}
          <div className="space-y-1.5 pt-2 border-t border-purple-200/60">
            <Label htmlFor="additionalObservations" className="text-xs font-semibold text-slate-900">
              Additional Observations Paragraphs (Appears after organ list)
            </Label>
            <Textarea
              id="additionalObservations"
              value={additionalObservations}
              onChange={(e) => setAdditionalObservations(e.target.value)}
              placeholder={"e.g. No evidence of retroperitoneal lymphadenopathy is seen.\nGaseous abdomen seen"}
              rows={2}
              className="text-xs bg-white font-sans resize-y"
            />
          </div>

          {/* Bold Impression */}
          <div className="space-y-1.5">
            <Label htmlFor="impression" className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Diagnostic Impression (Bold uppercase on report)
            </Label>
            <Textarea
              id="impression"
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              placeholder="e.g. ALTERED HEPATIC PARECHYMAL ECHOTEXTURE WITH GB WALL EDEMA....S/O? HEPATITIS."
              rows={2}
              className="text-xs bg-white font-bold uppercase tracking-tight text-slate-950 border-purple-300 focus-visible:ring-purple-500"
            />
          </div>

          {/* Footer Note */}
          <div className="space-y-1.5">
            <Label htmlFor="footerNote" className="text-xs font-semibold text-slate-800">
              Report Bottom Disclaimer
            </Label>
            <Input
              id="footerNote"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="e.g. जाँच केवल श्री कमल अस्पताल परिसर की ही मान्य होगी।"
              className="h-8 text-xs bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── 5-Column Parameters & Biological Reference Table (Optional / Collapsible) ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3.5 px-4 bg-slate-50/70 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Investigation Parameters &amp; Biological Reference Ranges
            </CardTitle>
            <CardDescription className="text-xs">
              Matches standard 5-column lab test layout: Test / Parameter, Results, Units, Bio. Ref. Interval, Method.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addParameter} className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Parameter Row
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/80 text-slate-700 border-b uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2 px-3 text-left w-[20%]">Test / Parameter</th>
                  <th className="py-2 px-3 text-left w-[35%]">Results / Observations</th>
                  <th className="py-2 px-3 text-left w-[10%]">Units</th>
                  <th className="py-2 px-3 text-left w-[15%]">Bio. Ref. Interval</th>
                  <th className="py-2 px-3 text-left w-[15%]">Method</th>
                  <th className="py-2 px-2 text-center w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parameters.map((param, index) => (
                  <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-2">
                      <Input
                        value={param.name}
                        onChange={(e) => updateParameter(index, "name", e.target.value)}
                        placeholder="e.g. LIVER / RIGHT KIDNEY"
                        className="h-8 text-xs font-semibold"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={param.result}
                        onChange={(e) => updateParameter(index, "result", e.target.value)}
                        placeholder="Normal size, clear outline, no calculus"
                        className="h-8 text-xs font-mono font-medium"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={param.unit || ""}
                        onChange={(e) => updateParameter(index, "unit", e.target.value)}
                        placeholder="cm / mm"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={param.normalRange || ""}
                        onChange={(e) => updateParameter(index, "normalRange", e.target.value)}
                        placeholder="< 15.0 cm / Normal"
                        className="h-8 text-xs text-slate-600"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={param.method || ""}
                        onChange={(e) => updateParameter(index, "method", e.target.value)}
                        placeholder="Real-time B Mode"
                        className="h-8 text-xs text-slate-500"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParameter(index)}
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Editable Interpretation & Clinical Findings ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3.5 px-4 bg-purple-50/50 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-purple-950 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Clinical Interpretation &amp; Diagnostic Findings
            </CardTitle>
            <CardDescription className="text-xs text-purple-700/80">
              Pre-filled with test catalog template. You can customize findings, upload diagrams, and set position at start or end.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={interpImgInputRef}
              onChange={handleInterpImageUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => interpImgInputRef.current?.click()}
              disabled={isUploadingInterpImg}
              className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 bg-white"
            >
              {isUploadingInterpImg ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  {imageUrl ? "Replace Image" : "Upload Image"}
                </>
              )}
            </Button>

            {imageUrl && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-xs">
                <span className="text-[11px] font-medium text-slate-500">Position:</span>
                <Select value={imagePosition} onValueChange={(val: "start" | "end") => setImagePosition(val)}>
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

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetInterpretation}
              className="h-7 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-100"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Reset Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* If image position is START: show preview ABOVE textarea */}
          {imageUrl && imagePosition === "start" && (
            <div className="flex items-center justify-between p-2.5 bg-purple-50/70 border border-purple-200 rounded-md shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-20 rounded bg-white overflow-hidden border shrink-0">
                  <Image
                    src={imageUrl}
                    alt="Uploaded Diagram"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Image Position: At Start (Prints Before Clinical Findings)
                  </span>
                  <span className="text-xs text-slate-600 block truncate max-w-md">
                    {imageUrl}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImageUrl("")}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="interpretation" className="text-xs font-semibold text-slate-700">
              Interpretation :- (Appears under the parameters table with full formatting)
            </Label>
            <Textarea
              id="interpretation"
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
              placeholder="Enter detailed organ findings, sonological impressions, measurements, and clinical correlation notes..."
              rows={12}
              className="font-mono text-xs leading-relaxed bg-white border-slate-300 focus-visible:ring-purple-500"
            />
          </div>

          {/* If image position is END: show preview BELOW textarea */}
          {imageUrl && imagePosition === "end" && (
            <div className="flex items-center justify-between p-2.5 bg-purple-50/70 border border-purple-200 rounded-md shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-20 rounded bg-white overflow-hidden border shrink-0">
                  <Image
                    src={imageUrl}
                    alt="Uploaded Diagram"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Image Position: At End (Prints After Clinical Findings &amp; Impression)
                  </span>
                  <span className="text-xs text-slate-600 block truncate max-w-md">
                    {imageUrl}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImageUrl("")}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            </div>
          )}

          {/* Impression Box */}
          <div className="space-y-1.5 bg-amber-50/60 p-3 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <Label htmlFor="impression" className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Final Impression / Conclusion :-
              </Label>
              <span className="text-[10px] text-amber-700 font-medium">Highlighted at end of report</span>
            </div>
            <Textarea
              id="impression"
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              placeholder="e.g. No significant sonological abnormality detected in the abdomen."
              rows={3}
              className="text-xs font-semibold text-slate-900 bg-white border-amber-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Scan Film Images / Diagram Attachments ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3.5 px-4 bg-slate-50/70 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-600" />
              Scan Films &amp; Anatomical Diagrams
            </CardTitle>
            <CardDescription className="text-xs">
              Attach ultrasound captures, X-ray films, or anatomical diagrams to print directly within the report.
            </CardDescription>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 mr-1" /> Attach Scan Film
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Reference Diagram URL input */}
          <div className="space-y-1">
            <Label htmlFor="diagramUrl" className="text-xs font-medium text-slate-600">
              Reference Diagram / Standard Infographic URL (Optional)
            </Label>
            <Input
              id="diagramUrl"
              value={diagramUrl}
              onChange={(e) => setDiagramUrl(e.target.value)}
              placeholder="https://... or /images/... (Standard reference diagram)"
              className="h-8 text-xs"
            />
          </div>

          {/* Attached Images Grid */}
          {attachments.length === 0 && !diagramUrl ? (
            <div className="border border-dashed rounded-lg p-6 text-center text-slate-400 bg-slate-50/50">
              <ImageIcon className="h-8 w-8 mx-auto mb-1.5 opacity-40" />
              <p className="text-xs font-medium">No scan films attached</p>
              <p className="text-[11px] text-slate-400">Click &quot;Attach Scan Film&quot; to upload ultrasound or X-ray captures.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {diagramUrl && (
                <div className="border rounded-lg p-2.5 bg-slate-50 relative group space-y-2">
                  <div className="relative aspect-video rounded bg-black/5 overflow-hidden flex items-center justify-center">
                    <Image
                      src={diagramUrl}
                      alt="Reference Diagram"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 truncate">
                    Reference Diagram (Catalog)
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => setDiagramUrl("")}
                    className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {attachments.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-2.5 bg-slate-50 relative group space-y-2">
                  <div className="relative aspect-video rounded bg-black/5 overflow-hidden flex items-center justify-center">
                    <Image
                      src={item.url}
                      alt={item.caption || "Scan Film"}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <Input
                    value={item.caption || ""}
                    onChange={(e) => updateAttachmentCaption(idx, e.target.value)}
                    placeholder="e.g. Fig 1: USG Long view of right kidney"
                    className="h-7 text-xs bg-white"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeAttachment(idx)}
                    className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Electronic Signing & Consultant Radiologist ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3.5 px-4 bg-slate-50/70 border-b border-slate-200">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Electronic Verification &amp; Signing Radiologist
          </CardTitle>
          <CardDescription className="text-xs">
            Appears at the bottom-right signature block of the printed report. Configured default is Dr. Monika Panda.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Doctor / Radiologist Name</Label>
            <Input
              value={radiologist.name}
              onChange={(e) => setRadiologist((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Dr. Monika Panda"
              className="h-8 text-xs font-semibold"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Qualification</Label>
            <Input
              value={radiologist.qualification}
              onChange={(e) => setRadiologist((prev) => ({ ...prev, qualification: e.target.value }))}
              placeholder="MD Radiodiagnosis"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Designation / Role</Label>
            <Input
              value={radiologist.designation}
              onChange={(e) => setRadiologist((prev) => ({ ...prev, designation: e.target.value }))}
              placeholder="Head of Dept & Consultant Radiologist"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Registration / Council No.</Label>
            <Input
              value={radiologist.regNo || ""}
              onChange={(e) => setRadiologist((prev) => ({ ...prev, regNo: e.target.value }))}
              placeholder="48921/OMC"
              className="h-8 text-xs font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Bottom Floating Action Bar ── */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-300 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Report verified according to Medclin Path Labs standard laboratory specifications.</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/radiology/queue">
              Cancel
            </Link>
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save &amp; Finalize Report
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
