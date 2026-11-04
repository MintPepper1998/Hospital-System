"use client"

import React, { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, UploadCloud, X, CheckCircle2, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import { updatePatientPhoto } from "@/app/actions/patients"

export function ProfilePhotoCropper({
  open,
  onOpenChange,
  patientId,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  onSuccess: (url: string) => void
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (error) => reject(error))
      image.setAttribute("crossOrigin", "anonymous") // needed to avoid cross-origin issues
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("No 2d context")
    }

    // Set canvas size to match the desired crop size
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Draw the cropped image onto the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    // As a blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((file) => {
        if (file) {
          resolve(file)
        } else {
          reject(new Error("Canvas is empty"))
        }
      }, "image/jpeg", 0.9)
    })
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setLoading(true)
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      
      // Upload blob to API
      const formData = new FormData()
      formData.append("file", croppedImageBlob, `profile-${patientId}.jpg`)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Failed to upload image")
      }

      // Update patient record
      const updateRes = await updatePatientPhoto(patientId, uploadData.url)
      
      if (updateRes.success) {
        toast.success("Profile photo updated successfully")
        onSuccess(uploadData.url)
        handleClose()
      } else {
        throw new Error(updateRes.message)
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-[#FAFAFA] border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)] rounded-[2.5rem]">
        <div className="p-8">
          <DialogHeader className="mb-6 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900">
                Update Profile Photo
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-gray-500 mt-1">
                Upload and crop a clear image of the patient's face.
              </DialogDescription>
            </div>
            <button 
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogHeader>

          {!imageSrc ? (
            <div className="mt-4 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-[1.5rem] bg-white hover:bg-gray-50 transition-colors cursor-pointer group relative overflow-hidden">
              <input 
                type="file" 
                accept="image/*" 
                onChange={onFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-900">Click or drag image to upload</p>
              <p className="text-xs font-medium text-gray-500 mt-1">Supports JPG, PNG (Max 5MB)</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative w-full h-[300px] bg-black rounded-[1.5rem] overflow-hidden shadow-inner">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="space-y-3 bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                  <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                  Zoom
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setImageSrc(null)}
                  className="rounded-full px-6 py-2.5 h-auto text-sm font-bold border-gray-200 text-gray-600 hover:bg-gray-50"
                  disabled={loading}
                >
                  Choose Another
                </Button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="group relative flex items-center justify-center gap-2 bg-black text-white px-8 py-2.5 h-auto rounded-full text-sm font-bold tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg disabled:opacity-70 disabled:active:scale-100"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Save Photo</span>
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
