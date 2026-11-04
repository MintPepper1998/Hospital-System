"use client"

import { useActionState, useState, useRef } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { UserPlus, Loader2, Heart, Phone, User, Camera, Trash2, Save } from "lucide-react"
import { PincodeAutoFill } from "@/components/patient/pincode-auto-fill"
import { getPresignedUrl } from "@/app/actions/upload"
import { toast } from "sonner"
import Image from "next/image"

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full bg-[#0066CC] hover:bg-[#0052A3]"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isEdit ? "Saving Changes..." : "Registering Patient..."}
        </>
      ) : (
        <>
          {isEdit ? <Save className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
          {isEdit ? "Save Profile" : "Register Patient"}
        </>
      )}
    </Button>
  )
}

export function PatientForm({ 
  initialData, 
  action 
}: { 
  initialData?: any, 
  action: any 
}) {
  const [state, formAction] = useActionState(action, null as any)
  
  // Image Upload State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData?.profilePhotoUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB")
      return
    }

    setIsUploading(true)
    try {
      const { url, key, publicUrl } = await getPresignedUrl(file.name, file.type, "profile-photos")

      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) throw new Error("Upload failed")

      setAvatarUrl(publicUrl)
      toast.success("Profile photo uploaded")
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photo")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveImage = () => {
    setAvatarUrl(null)
  }

  return (
    <form action={formAction} className="space-y-6">
      {initialData?.id && (
        <input type="hidden" name="patientId" value={initialData.id} />
      )}
      <input type="hidden" name="profilePhotoUrl" value={avatarUrl || ""} />

      {state?.success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
          {state.message}
        </div>
      )}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          {state.message}
        </div>
      )}

      {/* Section 1: Personal Information */}
      <Card className="border-t-4 border-t-[#0066CC]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-[#0066CC]" />
            Personal Information
          </CardTitle>
          <CardDescription>Basic identity and demographic details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b pb-6">
            <div className="relative h-24 w-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden group shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
              ) : (
                <User className="h-10 w-10 text-gray-400" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Profile Photo</Label>
              <p className="text-xs text-muted-foreground">Upload a clear photo. Max size 5MB.</p>
              <div className="flex items-center gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Camera className="h-4 w-4 mr-2" />
                  {avatarUrl ? "Change Photo" : "Upload Photo"}
                </Button>
                {avatarUrl && (
                  <Button type="button" variant="destructive" size="sm" onClick={handleRemoveImage} disabled={isUploading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
              <Input id="fullName" name="fullName" placeholder="Patient full name" defaultValue={initialData?.user?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatherOrHusbandName">Guardian Name</Label>
              <Input id="fatherOrHusbandName" name="fatherOrHusbandName" defaultValue={initialData?.fatherOrHusbandName || ""} placeholder="S/o, D/o, W/o" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={initialData?.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
              <Select name="gender" defaultValue={initialData?.gender || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select name="bloodGroup" defaultValue={initialData?.bloodGroup || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select name="maritalStatus" defaultValue={initialData?.maritalStatus || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">Single</SelectItem>
                  <SelectItem value="MARRIED">Married</SelectItem>
                  <SelectItem value="WIDOWED">Widowed</SelectItem>
                  <SelectItem value="DIVORCED">Divorced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" name="occupation" defaultValue={initialData?.occupation || ""} placeholder="e.g., Teacher, Farmer, Business" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" name="nationality" defaultValue={initialData?.nationality || "Indian"} placeholder="Indian" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Select name="religion" defaultValue={initialData?.religion || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hindu">Hindu</SelectItem>
                  <SelectItem value="Muslim">Muslim</SelectItem>
                  <SelectItem value="Christian">Christian</SelectItem>
                  <SelectItem value="Sikh">Sikh</SelectItem>
                  <SelectItem value="Buddhist">Buddhist</SelectItem>
                  <SelectItem value="Jain">Jain</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aadharNumber">ID Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="aadharNumber" name="aadharNumber" defaultValue={initialData?.aadharNumber || ""} placeholder="Aadhaar / Voter ID / Driving License / Passport" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referredBy">Referred By</Label>
              <Input id="referredBy" name="referredBy" defaultValue={initialData?.referredBy || ""} placeholder="Doctor / Hospital name" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Contact & Address */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-[#0066CC]" />
            Contact & Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="phone" name="phone" type="tel" defaultValue={initialData?.user?.phone || initialData?.phone || ""} placeholder="10-digit mobile (optional)" maxLength={10} />
            </div>
            <div className="space-y-2 md:col-span-1 lg:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={initialData?.user?.email || ""} placeholder="Optional" />
            </div>
            
            <PincodeAutoFill 
              values={{
                address: initialData?.address || "",
                city: initialData?.city || "",
                state: initialData?.state || "",
                pincode: initialData?.pincode || ""
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Emergency Contact */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-red-500" />
            Emergency Contact <span className="text-xs text-muted-foreground font-normal">(recommended)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input id="emergencyContactName" name="emergencyContactName" defaultValue={initialData?.emergencyContactName || ""} placeholder="Name of relative" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Contact Phone</Label>
              <Input id="emergencyContact" name="emergencyContact" type="tel" defaultValue={initialData?.emergencyContact || ""} placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelation">Relationship</Label>
              <Select name="emergencyContactRelation" defaultValue={initialData?.emergencyContactRelation || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                  <SelectItem value="Sibling">Sibling</SelectItem>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubmitButton isEdit={!!initialData?.id} />
    </form>
  )
}
