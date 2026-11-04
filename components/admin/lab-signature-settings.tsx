"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PenTool, Loader2, Image as ImageIcon, X } from "lucide-react"
import { getPresignedUrl } from "@/app/actions/upload"
import { updateHospitalSettings, HospitalSettingsData } from "@/app/actions/settings"
import { toast } from "sonner"
import Image from "next/image"

import { useRouter } from "next/navigation"

interface LabSignatureSettingsProps {
  settings: HospitalSettingsData
}

export function LabSignatureSettings({ settings }: LabSignatureSettingsProps) {
  const router = useRouter()
  const [isUploadingTech, setIsUploadingTech] = useState(false)
  const [isUploadingPath, setIsUploadingPath] = useState(false)

  const handleUpload = async (file: File, type: 'tech' | 'path') => {
    const isTech = type === 'tech'
    const setUploading = isTech ? setIsUploadingTech : setIsUploadingPath

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (PNG/JPG)")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB")
      return
    }

    try {
      setUploading(true)

      // 1. Get presigned URL
      const { url, publicUrl } = await getPresignedUrl(file.name, file.type, "signatures")

      // 2. Upload to S3 directly
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image to S3")
      }

      // 3. Update settings in DB
      // We must pass ALL existing settings so we don't accidentally wipe out logos or WhatsApp config
      const updateData = {
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        gstNo: settings.gstNo || undefined,
        logoUrl: settings.logoUrl,
        letterheadHeaderUrl: settings.letterheadHeaderUrl,
        letterheadFooterUrl: settings.letterheadFooterUrl,
        whatsappEnabled: settings.whatsappEnabled,
        whatsappAuthKey: settings.whatsappAuthKey,
        whatsappBusinessNumber: settings.whatsappBusinessNumber,
        whatsappDefaultLang: settings.whatsappDefaultLang,
        labTechnicianSignature: isTech ? publicUrl : settings.labTechnicianSignature,
        pathologistSignature: !isTech ? publicUrl : settings.pathologistSignature
      }

      const result = await updateHospitalSettings(updateData)

      if (result.success) {
        toast.success(`${isTech ? 'Lab Technician' : 'Pathologist'} signature updated successfully!`)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload signature")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (type: 'tech' | 'path') => {
    const isTech = type === 'tech'
    
    if (!confirm(`Are you sure you want to remove the ${isTech ? 'Lab Technician' : 'Pathologist'} signature?`)) return
    
    const setUploading = isTech ? setIsUploadingTech : setIsUploadingPath
    
    try {
      setUploading(true)
      
      const updateData = {
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        gstNo: settings.gstNo || undefined,
        logoUrl: settings.logoUrl,
        letterheadHeaderUrl: settings.letterheadHeaderUrl,
        letterheadFooterUrl: settings.letterheadFooterUrl,
        whatsappEnabled: settings.whatsappEnabled,
        whatsappAuthKey: settings.whatsappAuthKey,
        whatsappBusinessNumber: settings.whatsappBusinessNumber,
        whatsappDefaultLang: settings.whatsappDefaultLang,
        labTechnicianSignature: isTech ? null : settings.labTechnicianSignature,
        pathologistSignature: !isTech ? null : settings.pathologistSignature
      }

      const result = await updateHospitalSettings(updateData)

      if (result.success) {
        toast.success(`${isTech ? 'Lab Technician' : 'Pathologist'} signature removed successfully!`)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to remove signature")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="border-t-4 border-t-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-purple-600" />
          Report Signatures
        </CardTitle>
        <CardDescription>
          Upload digital signatures for the Lab Technician and Pathologist to appear at the bottom of printed test reports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Lab Technician Signature */}
          <div className="space-y-3">
            <Label>Lab Technician Signature</Label>
            <div className="border rounded-md p-4 flex flex-col items-center justify-center gap-3 bg-gray-50/50 relative overflow-hidden h-[120px]">
              {settings.labTechnicianSignature ? (
                <>
                  <img
                    src={settings.labTechnicianSignature}
                    alt="Lab Technician Signature"
                    className="object-contain w-full h-full p-2"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
                    onClick={() => handleRemove('tech')}
                    disabled={isUploadingTech}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <ImageIcon className="h-8 w-8 mb-1 opacity-20" />
                  <span className="text-xs">No signature uploaded</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, 'tech')
                }}
                disabled={isUploadingTech}
              />
              {isUploadingTech && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Pathologist Signature */}
          <div className="space-y-3">
            <Label>Pathologist Signature</Label>
            <div className="border rounded-md p-4 flex flex-col items-center justify-center gap-3 bg-gray-50/50 relative overflow-hidden h-[120px]">
              {settings.pathologistSignature ? (
                <>
                  <img
                    src={settings.pathologistSignature}
                    alt="Pathologist Signature"
                    className="object-contain w-full h-full p-2"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
                    onClick={() => handleRemove('path')}
                    disabled={isUploadingPath}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <ImageIcon className="h-8 w-8 mb-1 opacity-20" />
                  <span className="text-xs">No signature uploaded</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, 'path')
                }}
                disabled={isUploadingPath}
              />
              {isUploadingPath && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
