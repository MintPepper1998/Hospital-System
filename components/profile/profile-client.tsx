"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Building2,
  Briefcase,
  Calendar,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  Camera,
  Upload,
} from "lucide-react"
import { updateProfile, changePassword } from "@/app/actions/user-profile"
import { getPresignedUrl } from "@/app/actions/upload"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

// ============================================
// TYPES
// ============================================

interface ProfileData {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  hasPassword: boolean
  createdAt: string
  staff: {
    id: string
    employeeId: string
    phone: string | null
    department: string | null
    designation: string | null
    specialization: string | null
    joiningDate: string
  } | null
}

interface ProfileClientProps {
  profile: ProfileData
}

// ============================================
// ROLE DISPLAY CONFIG
// ============================================

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "bg-red-100 text-red-700 border-red-200" },
  DOCTOR: { label: "Doctor", color: "bg-blue-100 text-blue-700 border-blue-200" },
  NURSE: { label: "Nurse", color: "bg-pink-100 text-pink-700 border-pink-200" },
  PHARMACIST: { label: "Pharmacist", color: "bg-green-100 text-green-700 border-green-200" },
  LAB_TECHNICIAN: { label: "Lab Technician", color: "bg-purple-100 text-purple-700 border-purple-200" },
  RECEPTIONIST: { label: "Receptionist", color: "bg-amber-100 text-amber-700 border-amber-200" },
  ACCOUNTANT: { label: "Accountant", color: "bg-teal-100 text-teal-700 border-teal-200" },
  PATIENT: { label: "Patient", color: "bg-gray-100 text-gray-700 border-gray-200" },
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProfileClient({ profile }: ProfileClientProps) {
  return (
    <div className="space-y-6">
      <MyDetailsCard profile={profile} />
      <SecurityCard profile={profile} />
    </div>
  )
}

// ============================================
// CARD 1: MY DETAILS
// ============================================

function MyDetailsCard({ profile }: { profile: ProfileData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(profile.name || "")
  const [phone, setPhone] = useState(profile.staff?.phone || "")
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const roleConf = ROLE_LABELS[profile.role] ?? ROLE_LABELS.PATIENT

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file")
      return
    }

    try {
      setIsUploadingImage(true)
      const { url, publicUrl } = await getPresignedUrl(
        file.name,
        file.type,
        "profiles"
      )

      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image")
      }

      const result = await updateProfile({ image: publicUrl })
      if (result.success) {
        toast.success("Profile image updated")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image")
    } finally {
      setIsUploadingImage(false)
      e.target.value = ""
    }
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim(),
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const initials = (profile.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-blue-600" />
          My Details
        </CardTitle>
        <CardDescription>
          Your personal information and account details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar + Meta Row */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="relative group">
            <div className="h-16 w-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile.image ? (
                <img src={profile.image} alt={profile.name || "Profile"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-blue-700">{initials}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-1 bg-white border border-gray-200 rounded-full shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
              {isUploadingImage ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> : <Camera className="h-3 w-3 text-gray-600" />}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} />
            </label>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg">{profile.name || "Unknown"}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={`text-xs border ${roleConf.color}`}>
                {roleConf.label}
              </Badge>
              {profile.staff?.employeeId && (
                <Badge variant="secondary" className="text-xs">
                  <IdCard className="h-3 w-3 mr-1" />
                  {profile.staff.employeeId}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Read-only fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> Email Address
            </Label>
            <Input
              value={profile.email}
              disabled
              className="bg-gray-50 text-gray-600"
            />
            <p className="text-[10px] text-muted-foreground">Email cannot be changed</p>
          </div>

          {/* Role (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Role
            </Label>
            <Input
              value={roleConf.label}
              disabled
              className="bg-gray-50 text-gray-600"
            />
            <p className="text-[10px] text-muted-foreground">Contact admin to change your role</p>
          </div>
        </div>

        {/* Staff info (read-only) */}
        {profile.staff && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {profile.staff.department && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> Department
                </Label>
                <Input value={profile.staff.department} disabled className="bg-gray-50 text-gray-600" />
              </div>
            )}
            {profile.staff.designation && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Designation
                </Label>
                <Input value={profile.staff.designation} disabled className="bg-gray-50 text-gray-600" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Joined
              </Label>
              <Input
                value={format(new Date(profile.staff.joiningDate), "dd MMM yyyy")}
                disabled
                className="bg-gray-50 text-gray-600"
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Editable fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name" className="text-xs font-medium">
              Full Name
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone" className="text-xs font-medium flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Phone Number
            </Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// CARD 2: SECURITY (PASSWORD)
// ============================================

function SecurityCard({ profile }: { profile: ProfileData }) {
  const [isPending, startTransition] = useTransition()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const tooShort = newPassword.length > 0 && newPassword.length < 6

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all password fields")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    startTransition(async () => {
      const result = await changePassword({
        currentPassword,
        newPassword,
      })

      if (result.success) {
        toast.success(result.message)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Card className="border-l-4 border-l-amber-400">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-amber-600" />
          Security
        </CardTitle>
        <CardDescription>
          Change your login password. You will need your current password to set a new one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Password */}
        <div className="space-y-1.5">
          <Label htmlFor="current-pw" className="text-xs font-medium">
            Current Password
          </Label>
          <div className="relative">
            <Input
              id="current-pw"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New Password + Confirm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-pw" className="text-xs font-medium">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className={`pr-10 ${tooShort ? "border-red-300 focus-visible:ring-red-300" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {tooShort && (
              <p className="text-[10px] text-red-500">Must be at least 6 characters</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw" className="text-xs font-medium">
              Confirm New Password
            </Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className={mismatch ? "border-red-300 focus-visible:ring-red-300" : ""}
            />
            {mismatch && (
              <p className="text-[10px] text-red-500">Passwords do not match</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleChangePassword}
            disabled={isPending || mismatch || tooShort || !currentPassword || !newPassword || !confirmPassword}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</>
            ) : (
              <><Key className="h-4 w-4 mr-2" /> Update Password</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
