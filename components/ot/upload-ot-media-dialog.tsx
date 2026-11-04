"use client"

import { useState, useCallback, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { getPresignedUrl, deleteS3File } from "@/app/actions/upload"
import { getSurgeryMedia, uploadOTMedia } from "@/app/actions/ot"

interface UploadOTMediaDialogProps {
  surgeryId: string
  procedureName: string
}

export function UploadOTMediaDialog({
  surgeryId,
  procedureName,
}: UploadOTMediaDialogProps) {
  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<string | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  
  // Load initial data
  useEffect(() => {
    const loadMedia = async () => {
      try {
        const media = await getSurgeryMedia(surgeryId)
        if (media) {
          setImages(media.operationImages || [])
          setVideo(media.operationVideo || null)
        }
      } catch (err: any) {
        toast.error("Failed to load media")
      } finally {
        setIsLoading(false)
      }
    }
    loadMedia()
  }, [surgeryId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validations
    if (type === 'image') {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file")
        return
      }
      if (images.length >= 5) {
        toast.error("Maximum 5 images allowed")
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB")
        return
      }
    } else {
      if (!file.type.startsWith("video/")) {
        toast.error("Please select a valid video file")
        return
      }
      if (video) {
        toast.error("You can only upload 1 video. Please delete the existing one first.")
        return
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Video size must be less than 100MB")
        return
      }
    }

    setIsUploading(true)
    try {
      // 1. Get Presigned URL
      const { url, publicUrl } = await getPresignedUrl(
        file.name,
        file.type,
        `ot-media/${surgeryId}`
      )

      // 2. Upload to S3 directly
      const putResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!putResponse.ok) {
        throw new Error(`Upload failed with status: ${putResponse.status}`)
      }

      // 3. Save reference in Database
      let newImages = [...images]
      let newVideo = video

      if (type === 'image') {
        newImages.push(publicUrl)
        setImages(newImages)
      } else {
        newVideo = publicUrl
        setVideo(publicUrl)
      }

      const result = await uploadOTMedia(surgeryId, {
        images: newImages,
        video: newVideo
      })

      if (result.success) {
        toast.success(`${type === 'image' ? 'Image' : 'Video'} uploaded successfully`)
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast.error(error.message || "Upload failed")
    } finally {
      setIsUploading(false)
      // reset file input
      e.target.value = ''
    }
  }

  const handleDelete = async (url: string, type: 'image' | 'video') => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return
    
    setIsUploading(true)
    try {
      // 1. Update database
      let newImages = [...images]
      let newVideo = video

      if (type === 'image') {
        newImages = images.filter(img => img !== url)
      } else {
        newVideo = null
      }

      const dbUpdate = await uploadOTMedia(surgeryId, {
        images: newImages,
        video: newVideo
      })

      if (!dbUpdate.success) {
        throw new Error("Failed to remove from database")
      }

      // 2. Remove from S3 loosely
      if (deleteS3File) {
        const fileKey = url.split('.com/')[1] || url.split('/').slice(-1)[0]
        if (fileKey) {
            await deleteS3File(fileKey).catch(e => console.error(e))
        }
      }

      // 3. Update local state
      if (type === 'image') {
        setImages(newImages)
      } else {
        setVideo(null)
      }
      
      toast.success(`${type === 'image' ? 'Image' : 'Video'} removed successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete media")
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4">
      {/* IMAGES SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Operation Images ({images.length}/5)</Label>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              onChange={(e) => handleFileUpload(e, 'image')}
              disabled={isUploading || images.length >= 5}
            />
            <Button size="sm" variant="outline" type="button" disabled={isUploading || images.length >= 5}>
              <ImageIcon className="w-4 h-4 mr-2" /> Select Image
            </Button>
          </div>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group rounded-md border overflow-hidden bg-muted/30 aspect-square">
                <img 
                  src={`/api/documents/view?fileUrl=${encodeURIComponent(img)}`} 
                  alt={`Operation ${idx + 1}`} 
                  className="object-cover w-full h-full" 
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a 
                    href={`/api/documents/view?fileUrl=${encodeURIComponent(img)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button type="button" onClick={() => handleDelete(img, 'image')} className="p-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground bg-muted/40 p-4 rounded-md border border-dashed text-center">
            No images uploaded yet.
          </div>
        )}
      </div>

      {/* VIDEO SECTION */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Operation Video ({video ? 1 : 0}/1)</Label>
          <div className="relative">
             <input
              type="file"
              accept="video/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              onChange={(e) => handleFileUpload(e, 'video')}
              disabled={isUploading || !!video}
            />
            <Button size="sm" variant="outline" type="button" disabled={isUploading || !!video}>
              <VideoIcon className="w-4 h-4 mr-2" /> Select Video
            </Button>
          </div>
        </div>

        {video ? (
          <div className="relative rounded-md border overflow-hidden bg-muted/30 aspect-video">
            <video 
              src={`/api/documents/view?fileUrl=${encodeURIComponent(video)}`} 
              controls 
              className="object-cover w-full h-full" 
            />
            <div className="absolute top-2 right-2">
              <button type="button" onClick={() => handleDelete(video, 'video')} className="p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground bg-muted/40 p-4 rounded-md border border-dashed text-center">
             No video uploaded yet. (Max size 100MB)
          </div>
        )}
      </div>
      
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading media... Please wait.
        </div>
      )}
    </div>
  )
}
