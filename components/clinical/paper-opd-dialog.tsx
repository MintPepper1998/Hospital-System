"use client"

import { useState, useRef, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
  Camera,
  FileCheck,
  Eye,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { getPresignedUrl } from "@/app/actions/upload"
import { completePaperConsultation } from "@/app/actions/clinical"
import { cn } from "@/lib/utils"

interface PaperOPDDialogProps {
  appointmentId: string
  patientId?: string
  patientName: string
  patientPhone?: string | null
  existingScanUrl?: string | null
  isCompleted?: boolean
  triggerVariant?: "default" | "neo" | "outline" | "compact"
  triggerLabel?: string
  className?: string
  onSuccess?: () => void
}

export function PaperOPDDialog({
  appointmentId,
  patientName,
  patientPhone,
  existingScanUrl,
  isCompleted = false,
  triggerVariant = "default",
  triggerLabel = "Done on Paper",
  className,
  onSuccess,
}: PaperOPDDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(existingScanUrl || null)
  const [isPdf, setIsPdf] = useState<boolean>(
    existingScanUrl ? existingScanUrl.toLowerCase().endsWith(".pdf") : false
  )
  const [diagnosis, setDiagnosis] = useState("")
  const [notes, setNotes] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    // Limit to 15MB
    if (selected.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15 MB")
      return
    }

    setFile(selected)

    if (selected.type === "application/pdf") {
      setIsPdf(true)
      setPreview(null)
    } else if (selected.type.startsWith("image/")) {
      setIsPdf(false)
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result as string)
      reader.readAsDataURL(selected)
    } else {
      setIsPdf(false)
      setPreview(null)
    }
  }, [])

  const handleRemoveFile = () => {
    setFile(null)
    setPreview(existingScanUrl || null)
    setIsPdf(existingScanUrl ? existingScanUrl.toLowerCase().endsWith(".pdf") : false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleComplete = () => {
    startTransition(async () => {
      try {
        setIsUploading(true)
        let finalPaperUrl = existingScanUrl || null

        // 1. Upload scan file if user selected one
        if (file) {
          const { url, publicUrl } = await getPresignedUrl(
            file.name,
            file.type,
            "opd-paper-scans"
          )

          const putRes = await fetch(url, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          })

          if (!putRes.ok) {
            throw new Error(`Upload failed (${putRes.status}). Please try again.`)
          }

          finalPaperUrl = publicUrl
        }

        // 2. Mark consultation completed on paper
        const result = await completePaperConsultation({
          appointmentId,
          scannedPaperUrl: finalPaperUrl,
          notes: notes.trim() || undefined,
          diagnosis: diagnosis.trim() || undefined,
        })

        if (result.success) {
          toast.success(result.message || "Consultation completed on OPD paper")
          setOpen(false)
          router.refresh()
          onSuccess?.()
        } else {
          toast.error("Failed to complete paper consultation")
        }
      } catch (err: any) {
        console.error("Paper OPD consultation completion error:", err)
        toast.error(err.message || "An error occurred while completing paper consultation")
      } finally {
        setIsUploading(false)
      }
    })
  }

  const trigger = () => {
    if (triggerVariant === "neo") {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "neo-button h-9 px-4 rounded-full text-xs font-bold text-amber-700 bg-[#e0e5ec] flex items-center transition-all active:scale-95 hover:text-amber-800",
            className
          )}
          title="Patient treated on physical OPD paper"
        >
          <FileText className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
          {triggerLabel}
        </button>
      )
    }

    if (triggerVariant === "compact") {
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className={cn(
            "h-8 px-2.5 text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-400",
            className
          )}
          title="Patient treated on physical OPD paper"
        >
          <FileText className="mr-1 h-3.5 w-3.5 text-amber-600" />
          {triggerLabel}
        </Button>
      )
    }

    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-400 font-semibold",
          className
        )}
        title="Patient treated on physical OPD paper"
      >
        <FileText className="mr-1.5 h-4 w-4 text-amber-600" />
        {triggerLabel}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger()}</DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-800">
                Complete on OPD Paper
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                Patient: <strong className="text-zinc-700">{patientName}</strong>
                {patientPhone ? ` • ${patientPhone}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Handwritten OPD Prescription Mode</p>
              <p className="text-amber-700 text-[11px] mt-0.5">
                Upload or snap a photo of the physical OPD prescription slip to store with the patient's record, then click <strong>OPD Done on Paper</strong>.
              </p>
            </div>
          </div>

          {/* Upload Scanned OPD Paper Box */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-700 flex items-center justify-between">
              <span>Upload Scanned OPD Paper (Optional)</span>
              {file && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1 font-normal"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              )}
            </Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {!file && !preview && !isPdf ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 hover:border-amber-400 rounded-2xl p-6 text-center cursor-pointer bg-zinc-50/50 hover:bg-amber-50/20 transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="p-3 rounded-full bg-zinc-100 group-hover:bg-amber-100 text-zinc-600 group-hover:text-amber-700 transition-colors">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-700 group-hover:text-amber-800">
                    Click to upload or snap photo of OPD paper
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Supports JPG, PNG, WEBP or PDF (up to 15 MB)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mt-1">
                  <Camera className="h-3.5 w-3.5" /> Camera / File Upload
                </div>
              </div>
            ) : isPdf ? (
              <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-100 text-red-700 font-black text-xs">
                    PDF
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-800 truncate max-w-[280px]">
                      {file ? file.name : "Attached Scanned OPD Paper (PDF)"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Ready to view"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {existingScanUrl && !file && (
                    <a
                      href={existingScanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-zinc-200 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs"
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-2xl p-3 bg-zinc-50 space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-zinc-200 bg-black/5 max-h-60 flex items-center justify-center">
                  {preview && (
                    <img
                      src={preview}
                      alt="Scanned OPD Paper Preview"
                      className="object-contain max-h-60 w-auto rounded-lg"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                  <span className="truncate max-w-[250px] font-medium text-zinc-700">
                    {file ? file.name : "Existing Scanned Paper"}
                  </span>
                  <div className="flex items-center gap-2">
                    {preview && (
                      <a
                        href={preview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Full View
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-amber-700 hover:underline font-semibold"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Diagnosis / Clinical Remarks (Optional) */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700">
                Primary Diagnosis / Complaint (Optional)
              </Label>
              <Input
                placeholder="e.g. Acute Gastritis, Hypertension, Fever..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700">
                Doctor Notes / Remarks (Optional)
              </Label>
              <Textarea
                placeholder="Additional physical notes, followup instructions or observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs rounded-xl resize-none h-16"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t border-zinc-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isPending || isUploading}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleComplete}
            disabled={isPending || isUploading}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center"
          >
            {isPending || isUploading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {isUploading ? "Uploading Scan..." : "Saving..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                OPD Done on Paper
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
