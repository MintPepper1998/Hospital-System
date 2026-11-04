"use client"

import { useState, useCallback, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  CheckCircle2,
  FileText,
  Stethoscope,
  ClipboardList,
  Loader2,
  ExternalLink,
  Paperclip,
} from "lucide-react"
import { toast } from "sonner"
import { getPresignedUrl } from "@/app/actions/upload"
import { uploadOTDocument } from "@/app/actions/ot"

interface DocStatus {
  consent: boolean
  anaesthesia: boolean
  op_note: boolean
  consentFormUrl?: string | null
  anaesthesiaRecordUrl?: string | null
  operationNoteUrl?: string | null
}

interface UploadOTDocumentDialogProps {
  surgeryId: string
  procedureName: string
  docStatus: DocStatus | null
}

const DOC_OPTIONS = [
  { value: "consent", label: "Consent Form", icon: FileText, color: "text-blue-600" },
  { value: "anaesthesia", label: "Anaesthesia Record", icon: Stethoscope, color: "text-green-600" },
  { value: "op_note", label: "Operation Note", icon: ClipboardList, color: "text-purple-600" },
] as const

export function UploadOTDocumentDialog({
  surgeryId,
  procedureName,
  docStatus,
}: UploadOTDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [docType, setDocType] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10 MB")
      return
    }

    setFile(selected)

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result as string)
      reader.readAsDataURL(selected)
    } else {
      setPreview(null)
    }
  }, [])

  const handleUpload = () => {
    if (!docType) { toast.error("Select a document type"); return }
    if (!file) { toast.error("Select a file to upload"); return }

    startTransition(async () => {
      setUploading(true)
      try {
        const { url, publicUrl } = await getPresignedUrl(
          file.name,
          file.type,
          `ot-documents/${surgeryId}`
        )

        const putResponse = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        })

        if (!putResponse.ok) {
          throw new Error(`Upload failed with status: ${putResponse.status}`)
        }

        const result = await uploadOTDocument(surgeryId, docType, publicUrl)

        if (result.success) {
          toast.success("Document uploaded and saved successfully")
          setFile(null)
          setPreview(null)
          setDocType("")
          setOpen(false)
        } else {
          toast.error(result.message || "Failed to save document")
        }
      } catch (error: any) {
        toast.error(error.message || "Upload failed")
      } finally {
        setUploading(false)
      }
    })
  }

  const isAlreadyUploaded = (type: string) => {
    if (!docStatus) return false
    return docStatus[type as keyof Pick<DocStatus, "consent" | "anaesthesia" | "op_note">] || false
  }

  const getExistingUrl = (type: string): string | null | undefined => {
    if (!docStatus) return null
    const urlMap: Record<string, string | null | undefined> = {
      consent: docStatus.consentFormUrl,
      anaesthesia: docStatus.anaesthesiaRecordUrl,
      op_note: docStatus.operationNoteUrl,
    }
    return urlMap[type]
  }

  const uploadedCount = docStatus
    ? [docStatus.consent, docStatus.anaesthesia, docStatus.op_note].filter(Boolean).length
    : 0

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) { setFile(null); setPreview(null); setDocType("") }
    }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors w-full text-left"
        >
          <Paperclip className="h-5 w-5 text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium">Upload Signed Forms</p>
            <p className="text-xs text-muted-foreground">
              {uploadedCount}/3 forms uploaded
            </p>
          </div>
          {uploadedCount === 3 ? (
            <Badge variant="outline" className="border-green-500 text-green-700 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
            </Badge>
          ) : uploadedCount > 0 ? (
            <Badge variant="outline" className="border-orange-500 text-orange-700 text-xs">
              {uploadedCount}/3
            </Badge>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Signed OT Document</DialogTitle>
          <DialogDescription>{procedureName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document status overview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Document Status</Label>
            <div className="space-y-1.5">
              {DOC_OPTIONS.map((opt) => {
                const uploaded = isAlreadyUploaded(opt.value)
                const url = getExistingUrl(opt.value)
                return (
                  <div key={opt.value} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div className="flex items-center gap-2">
                      <opt.icon className={`h-4 w-4 ${opt.color}`} />
                      <span>{opt.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {uploaded ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {url && (
                            <a
                              href={`/api/documents/view?fileUrl=${encodeURIComponent(url)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not uploaded</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upload form */}
          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.label}
                        {isAlreadyUploaded(opt.value) && (
                          <span className="text-xs text-green-600">(replace)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File (Image or PDF, max 10 MB) *</Label>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </p>
              )}
              {preview && (
                <div className="mt-2 border rounded overflow-hidden">
                  <img src={preview} alt="Preview" className="max-h-40 w-full object-contain bg-gray-50" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!docType || !file || uploading || isPending}
            >
              {uploading || isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload &amp; Save</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
