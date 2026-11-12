"use client"

import React, { useState, useRef, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { uploadSignature, removeSignature } from "@/app/actions/signature"
import { toast } from "sonner"
import { FileSignature, Upload, Loader2, Trash2, CheckCircle2, Image as ImageIcon, Sparkles } from "lucide-react"

interface SignatureUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetStaffId?: string
  targetUserId?: string
  personName: string
  roleLabel?: string
  currentSignatureUrl?: string | null
  onSuccess: (newSignatureUrl: string | null) => void
}

export function SignatureUploadDialog({
  open,
  onOpenChange,
  targetStaffId,
  targetUserId,
  personName,
  roleLabel = "Staff Member",
  currentSignatureUrl,
  onSuccess,
}: SignatureUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/") && !file.name.match(/\.(png|jpe?g|webp|gif|svg|bmp|tiff|heic)$/i)) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP, etc.)")
      return
    }

    setSelectedFile(file)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image file first.")
      return
    }

    setIsUploading(true)
    const toastId = toast.loading("Processing & reforming signature into professional PNG standard...")

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      if (targetStaffId) formData.append("staffId", targetStaffId)
      if (targetUserId) formData.append("userId", targetUserId)

      const res = await uploadSignature(formData)

      if (res.success && res.signatureUrl) {
        toast.success(res.message || "Signature successfully uploaded and standardized!", { id: toastId })
        onSuccess(res.signatureUrl)
        onOpenChange(false)
        setSelectedFile(null)
        setPreviewUrl(null)
      } else {
        toast.error(res.message || "Failed to upload signature", { id: toastId })
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during upload", { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    startTransition(async () => {
      try {
        const res = await removeSignature({
          staffId: targetStaffId,
          userId: targetUserId,
        })

        if (res.success) {
          toast.success("Signature removed successfully")
          onSuccess(null)
          onOpenChange(false)
          setSelectedFile(null)
          setPreviewUrl(null)
        } else {
          toast.error(res.message || "Failed to remove signature")
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to remove signature")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          setSelectedFile(null)
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px] border-slate-200 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Digital Signature — {personName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {roleLabel} • Shree Kamal Hospital Management System
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current signature on file if present */}
          {currentSignatureUrl && !previewUrl && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">Current Active Signature:</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> On File
                </Badge>
              </div>
              <div className="h-20 bg-white border border-slate-200 rounded flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentSignatureUrl}
                  alt="Current Signature"
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* New file preview */}
          {previewUrl && (
            <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-900">Selected Signature Preview:</span>
                <Badge className="bg-indigo-600 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" /> Ready to Reform & Save
                </Badge>
              </div>
              <div className="h-24 bg-white border border-indigo-200 rounded flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="New Signature Preview"
                  className="max-h-20 max-w-full object-contain"
                />
              </div>
              <p className="text-[11px] text-indigo-700 mt-2">
                File: <span className="font-medium">{selectedFile?.name}</span> ({(selectedFile ? selectedFile.size / 1024 : 0).toFixed(1)} KB)
              </p>
            </div>
          )}

          {/* Upload Input Area */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              {currentSignatureUrl ? "Replace with New Signature Image" : "Select Signature Image"}
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="p-2.5 bg-white rounded-full shadow-xs text-indigo-600">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-slate-700">
                Click to browse or drop signature photo / scan here
              </p>
              <p className="text-[11px] text-slate-400">
                Any image format (JPG, PNG, WEBP, etc.) and any photo size supported
              </p>
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-600" /> Professional Automatic Standardization:
            </p>
            <p>
              Margins and blank space are trimmed automatically, aspect ratio is preserved, and the signature is saved permanently in the database so it will never be deleted.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
          {currentSignatureUrl && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={isPending || isUploading}
              className="text-xs h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isUploading || isPending}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || isPending}
              className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Standardizing...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Save Signature
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
