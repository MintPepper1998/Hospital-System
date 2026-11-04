"use client"

import { useState, useTransition, useRef } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Scissors,
  User,
  Stethoscope,
  Calendar,
  Clock,
  Droplets,
  ArrowLeft,
  Printer,
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  ClipboardList,
} from "lucide-react"
import { toast } from "sonner"
import { updateOpNote } from "@/app/actions/ot"
import { getPresignedUrl } from "@/app/actions/upload"
import { useRouter } from "next/navigation"

// ============================================
// TYPES
// ============================================

interface OperationData {
  id: string
  procedureName: string
  surgeonName: string
  anesthetist: string | null
  date: string
  status: string
  opNote: string | null
  photos: string[]
  createdAt: string
  updatedAt: string
  patient: {
    id: string
    patientId: string
    name: string | null
    gender: string | null
    dateOfBirth: string | null
    phone: string | null
    bloodGroup: string | null
  }
  doctor: {
    id: string
    name: string | null
    email: string | null
  }
}

interface SurgeryCaseClientProps {
  operation: OperationData
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    SCHEDULED: { label: "Scheduled", className: "bg-blue-100 text-blue-700 border-blue-200" },
    COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" },
  }
  const c = cfg[status] || cfg.SCHEDULED
  return <Badge variant="outline" className={`text-xs ${c.className}`}>{c.label}</Badge>
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SurgeryCaseClient({ operation }: SurgeryCaseClientProps) {
  const router = useRouter()
  const dt = new Date(operation.date)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/ot"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Scissors className="h-5 w-5 text-teal-600" />
              {operation.procedureName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">
                {format(dt, "dd MMM yyyy")} at {format(dt, "hh:mm a")}
              </span>
              <StatusBadge status={operation.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Patient & Surgery Info Strip */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <InfoItem icon={<User className="h-4 w-4 text-blue-500" />} label="Patient" value={operation.patient.name || "—"} />
            <InfoItem icon={<ClipboardList className="h-4 w-4 text-gray-500" />} label="Patient ID" value={operation.patient.patientId} />
            <InfoItem icon={<Stethoscope className="h-4 w-4 text-teal-500" />} label="Surgeon" value={operation.surgeonName} />
            <InfoItem icon={<User className="h-4 w-4 text-purple-500" />} label="Anesthetist" value={operation.anesthetist || "Not assigned"} />
            <InfoItem icon={<Droplets className="h-4 w-4 text-red-500" />} label="Blood Group" value={operation.patient.bloodGroup || "—"} />
            <InfoItem icon={<Calendar className="h-4 w-4 text-amber-500" />} label="Gender" value={operation.patient.gender || "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="preop" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preop" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Pre-Op
          </TabsTrigger>
          <TabsTrigger value="intraop" className="gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Intra-Op Photos
          </TabsTrigger>
          <TabsTrigger value="postop" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Post-Op Report
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Pre-Op ────────────────── */}
        <TabsContent value="preop" className="mt-4">
          <PreOpTab operation={operation} />
        </TabsContent>

        {/* ── TAB 2: Intra-Op Photos ───────── */}
        <TabsContent value="intraop" className="mt-4">
          <IntraOpTab operation={operation} />
        </TabsContent>

        {/* ── TAB 3: Post-Op Report ────────── */}
        <TabsContent value="postop" className="mt-4">
          <PostOpTab operation={operation} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// INFO ITEM
// ============================================

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="font-medium text-sm">{value}</p>
    </div>
  )
}

// ============================================
// TAB 1: PRE-OP
// ============================================

function PreOpTab({ operation }: { operation: OperationData }) {
  return (
    <div className="space-y-4">
      {/* Patient Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            Patient Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Name</span>
              <p className="font-medium">{operation.patient.name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Patient ID</span>
              <p className="font-medium">{operation.patient.patientId}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Gender</span>
              <p className="font-medium">{operation.patient.gender || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Date of Birth</span>
              <p className="font-medium">
                {operation.patient.dateOfBirth ? format(new Date(operation.patient.dateOfBirth), "dd MMM yyyy") : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Phone</span>
              <p className="font-medium">{operation.patient.phone || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Blood Group</span>
              <p className="font-medium">{operation.patient.bloodGroup || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Forms Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-purple-500" />
            Print Pre-Op Forms
          </CardTitle>
          <CardDescription>
            Print required consent and pre-operative forms for this surgery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PrintFormButton
              label="Consent Form"
              description="Patient surgical consent"
              href={`/dashboard/print/consent/${operation.id}`}
            />
            <PrintFormButton
              label="Anaesthesia Record"
              description="Pre-anaesthesia checklist"
              href={`/dashboard/print/anaesthesia/${operation.id}`}
            />
            <PrintFormButton
              label="Operation Note Template"
              description="Blank op note for manual fill"
              href={`/dashboard/print/op-note-blank/${operation.id}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PrintFormButton({ label, description, href }: { label: string; description: string; href: string }) {
  return (
    <Link href={href} target="_blank">
      <div className="border rounded-lg p-4 hover:bg-gray-50 hover:border-teal-300 transition-colors cursor-pointer group">
        <div className="flex items-center gap-2 mb-1">
          <Printer className="h-4 w-4 text-teal-600 group-hover:text-teal-700" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

// ============================================
// TAB 2: INTRA-OP PHOTOS
// ============================================

function IntraOpTab({ operation }: { operation: OperationData }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<string[]>(operation.photos || [])
  const [uploading, setUploading] = useState(false)
  const [saving, startSaving] = useTransition()

  const handleUpload = async (file: File) => {
    if (photos.length >= 10) {
      toast.error("Maximum 10 photos allowed")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB")
      return
    }

    setUploading(true)
    try {
      const { url, publicUrl } = await getPresignedUrl(file.name, file.type, `ot-photos/${operation.id}`)
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
      if (!res.ok) throw new Error("Upload failed")

      setPhotos((prev) => [...prev, publicUrl])
      toast.success("Photo uploaded")
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const savePhotos = () => {
    startSaving(async () => {
      const result = await updateOpNote(operation.id, operation.opNote || "", photos)
      if (result.success) {
        toast.success("Photos saved")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-500" />
              Intra-Operative Photos
            </CardTitle>
            <CardDescription>Upload up to 10 images from the procedure ({photos.length}/10)</CardDescription>
          </div>
          {photos.length > 0 && photos.length !== (operation.photos || []).length && (
            <Button size="sm" onClick={savePhotos} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Save Photos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {photos.map((url, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-50">
                <img src={url} alt={`Op photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                  Photo {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Zone */}
        {photos.length < 10 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 hover:border-teal-300 rounded-xl py-8 flex flex-col items-center justify-center text-gray-400 hover:text-teal-500 transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
            ) : (
              <Upload className="h-8 w-8 mb-2" />
            )}
            <span className="text-sm font-medium">{uploading ? "Uploading..." : "Click to upload photo"}</span>
            <span className="text-[10px] mt-1">JPG, PNG, or WebP (max 5 MB)</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ""
          }}
        />
      </CardContent>
    </Card>
  )
}

// ============================================
// TAB 3: POST-OP REPORT
// ============================================

function PostOpTab({ operation }: { operation: OperationData }) {
  const router = useRouter()
  const [note, setNote] = useState(operation.opNote || "")
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    if (!note.trim()) {
      toast.error("Please enter an operation note before completing")
      return
    }

    startTransition(async () => {
      const result = await updateOpNote(operation.id, note, operation.photos || [])
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-green-600" />
          Surgeon&apos;s Operation Note
        </CardTitle>
        <CardDescription>
          Document the surgical findings, procedure performed, and any complications.
          Saving will mark this surgery as &quot;Completed&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Operation Note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Procedure: ${operation.procedureName}\n\nFindings:\n\n\nProcedure Done:\n\n\nComplications:\nNil\n\nPost-Op Instructions:\n`}
            rows={16}
            className="font-mono text-sm"
          />
        </div>

        {operation.status === "COMPLETED" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">This surgery has been marked as completed.</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" asChild>
            <Link href="/dashboard/ot">Back to Schedule</Link>
          </Button>
          <Button onClick={handleSave} disabled={isPending || operation.status === "CANCELLED"}
            className="bg-teal-600 hover:bg-teal-700">
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Complete Surgery & Save Report</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
