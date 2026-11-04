"use client"

import { useState, useTransition, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  Phone,
  Mail,
  Globe,
  FileText,
  ImageIcon,
  Upload,
  Loader2,
  CheckCircle2,
  Trash2,
  PanelTop,
  PanelBottom,
  MessageCircle,
  Send,
  Eye,
  EyeOff,
} from "lucide-react"
import { updateHospitalSettings, type HospitalSettingsData } from "@/app/actions/settings"
import { getPresignedUrl } from "@/app/actions/upload"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Image from "next/image"

// ============================================
// PROPS
// ============================================

interface HospitalSettingsFormProps {
  initialData: HospitalSettingsData
}

// ============================================
// MAIN COMPONENT
// ============================================

export function HospitalSettingsForm({ initialData }: HospitalSettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Basic info
  const [name, setName] = useState(initialData.name)
  const [address, setAddress] = useState(initialData.address)
  const [phone, setPhone] = useState(initialData.phone)
  const [email, setEmail] = useState(initialData.email)
  const [website, setWebsite] = useState(initialData.website)
  const [gstNo, setGstNo] = useState(initialData.gstNo || "")

  // Image URLs
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl || "")
  const [headerUrl, setHeaderUrl] = useState(initialData.letterheadHeaderUrl || "")
  const [footerUrl, setFooterUrl] = useState(initialData.letterheadFooterUrl || "")

  // Upload loading states
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingHeader, setUploadingHeader] = useState(false)
  const [uploadingFooter, setUploadingFooter] = useState(false)

  // WhatsApp Integration
  const [waEnabled, setWaEnabled] = useState(initialData.whatsappEnabled)
  const [waAuthKey, setWaAuthKey] = useState(initialData.whatsappAuthKey || "")
  const [waBusinessNumber, setWaBusinessNumber] = useState(initialData.whatsappBusinessNumber || "")
  const [waDefaultLang, setWaDefaultLang] = useState(initialData.whatsappDefaultLang || "en")
  const [waKeyVisible, setWaKeyVisible] = useState(false)
  const [waTesting, setWaTesting] = useState(false)
  const [waTestPhone, setWaTestPhone] = useState("")

  // ── Upload handler ──────────────────────────
  const handleFileUpload = async (
    file: File,
    folder: string,
    setUrl: (url: string) => void,
    setLoading: (v: boolean) => void
  ) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WebP)")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB")
      return
    }

    setLoading(true)
    try {
      const { url, publicUrl } = await getPresignedUrl(file.name, file.type, folder)

      // Direct upload to S3
      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        console.error("S3 Upload rejected:", uploadRes.status, errorText)
        throw new Error(`Upload failed (${uploadRes.status}): ${errorText.substring(0, 100)}`)
      }

      setUrl(publicUrl)
      toast.success("Image uploaded")
    } catch (err: any) {
      console.error("Upload error:", err)
      toast.error(err.message || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  // ── Save all ────────────────────────────────
  const handleSave = () => {
    if (!name.trim() || !address.trim() || !phone.trim() || !email.trim()) {
      toast.error("Name, address, phone, and email are required")
      return
    }

    startTransition(async () => {
      const result = await updateHospitalSettings({
        name,
        address,
        phone,
        email,
        website,
        gstNo: gstNo || undefined,
        logoUrl: logoUrl || null,
        letterheadHeaderUrl: headerUrl || null,
        letterheadFooterUrl: footerUrl || null,
        // WhatsApp
        whatsappEnabled: waEnabled,
        whatsappAuthKey: waAuthKey || null,
        whatsappBusinessNumber: waBusinessNumber || null,
        whatsappDefaultLang: waDefaultLang,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── CARD 1: Basic Info ──────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-blue-600" />
            Hospital Information
          </CardTitle>
          <CardDescription>
            Basic details that appear on invoices, reports, and printouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="hosp-name" className="text-xs font-medium">
              Hospital Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="hosp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shree Kamal Hospital"
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="hosp-address" className="text-xs font-medium">
              Address <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="hosp-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address including city, state, PIN"
              rows={3}
              required
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hosp-phone" className="text-xs font-medium flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hosp-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 671 230 1234"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hosp-email" className="text-xs font-medium flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hosp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@hospital.com"
                required
              />
            </div>
          </div>

          {/* Website + GST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hosp-website" className="text-xs font-medium flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Website
              </Label>
              <Input
                id="hosp-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.hospital.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hosp-gst" className="text-xs font-medium flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> GST Number
              </Label>
              <Input
                id="hosp-gst"
                value={gstNo}
                onChange={(e) => setGstNo(e.target.value)}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CARD 2: Branding / Images ──────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-purple-600" />
            Branding & Letterhead
          </CardTitle>
          <CardDescription>
            Upload images for your logo and print letterheads. These appear on all printed reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <ImageUploadField
            label="Hospital Logo"
            description="Square image (e.g., 200x200px). Used in headers and reports."
            icon={<ImageIcon className="h-4 w-4 text-blue-500" />}
            currentUrl={logoUrl}
            isUploading={uploadingLogo}
            previewClass="h-24 w-24 rounded-lg"
            onUpload={(file) => handleFileUpload(file, "hospital/logo", setLogoUrl, setUploadingLogo)}
            onClear={() => setLogoUrl("")}
          />

          <Separator />

          {/* Print Header */}
          <ImageUploadField
            label="Print Header (Letterhead Top)"
            description="Full-width banner image for the top of printed pages (e.g., 2100x300px)."
            icon={<PanelTop className="h-4 w-4 text-teal-500" />}
            currentUrl={headerUrl}
            isUploading={uploadingHeader}
            previewClass="h-20 w-full rounded-lg"
            onUpload={(file) => handleFileUpload(file, "hospital/letterhead", setHeaderUrl, setUploadingHeader)}
            onClear={() => setHeaderUrl("")}
          />

          <Separator />

          {/* Print Footer */}
          <ImageUploadField
            label="Print Footer (Letterhead Bottom)"
            description="Full-width banner image for the bottom of printed pages."
            icon={<PanelBottom className="h-4 w-4 text-amber-500" />}
            currentUrl={footerUrl}
            isUploading={uploadingFooter}
            previewClass="h-16 w-full rounded-lg"
            onUpload={(file) => handleFileUpload(file, "hospital/letterhead", setFooterUrl, setUploadingFooter)}
            onClear={() => setFooterUrl("")}
          />
        </CardContent>
      </Card>

      {/* ── CARD 3: WhatsApp Integration ────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-green-600" />
            WhatsApp Notifications
          </CardTitle>
          <CardDescription>
            Send booking confirmations, bills, and lab results to patients via Meta WhatsApp Cloud API (Free).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Enable WhatsApp Notifications</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">When enabled, patients will receive automated WhatsApp messages for bookings, bills, and lab results.</p>
            </div>
            <button
              type="button"
              onClick={() => setWaEnabled(!waEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                waEnabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  waEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {waEnabled && (
            <>
              {/* Auth Key */}
              <div className="space-y-1.5">
                <Label htmlFor="wa-authkey" className="text-xs font-medium flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Meta Access Token <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="wa-authkey"
                    type={waKeyVisible ? "text" : "password"}
                    value={waAuthKey}
                    onChange={(e) => setWaAuthKey(e.target.value)}
                    placeholder="Your Meta permanent access token"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setWaKeyVisible(!waKeyVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {waKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Get from: Meta Business Settings → System Users → Generate Token</p>
              </div>

              {/* Business Number */}
              <div className="space-y-1.5">
                <Label htmlFor="wa-number" className="text-xs font-medium flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Phone Number ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="wa-number"
                  value={waBusinessNumber}
                  onChange={(e) => setWaBusinessNumber(e.target.value)}
                  placeholder="e.g., 123456789012345"
                />
                <p className="text-[10px] text-muted-foreground">Get from: Meta Developer App → WhatsApp → API Setup → Phone Number ID</p>
              </div>

              {/* Default Language */}
              <div className="space-y-1.5">
                <Label htmlFor="wa-lang" className="text-xs font-medium flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> Default Message Language
                </Label>
                <select
                  id="wa-lang"
                  value={waDefaultLang}
                  onChange={(e) => setWaDefaultLang(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="or">ଓଡ଼ିଆ (Odia)</option>
                </select>
              </div>

              <Separator />

              {/* Test Message */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Send className="h-3 w-3" /> Send Test Message
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={waTestPhone}
                    onChange={(e) => setWaTestPhone(e.target.value)}
                    placeholder="10-digit phone number"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={waTesting || !waTestPhone || waTestPhone.length < 10}
                    onClick={async () => {
                      setWaTesting(true)
                      try {
                        const res = await fetch("/api/whatsapp/test", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phone: waTestPhone }),
                        })
                        const data = await res.json()
                        if (data.success) {
                          toast.success("Test message sent! Check WhatsApp.")
                        } else {
                          toast.error(data.message || "Failed to send test message")
                        }
                      } catch {
                        toast.error("Failed to send test message")
                      } finally {
                        setWaTesting(false)
                      }
                    }}
                  >
                    {waTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Save settings first, then send a test message to verify your configuration.</p>
              </div>

              {/* Status Indicator */}
              <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                waAuthKey && waBusinessNumber
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {waAuthKey && waBusinessNumber ? (
                  <><CheckCircle2 className="h-4 w-4" /> Credentials configured — ready to send messages</>
                ) : (
                  <><MessageCircle className="h-4 w-4" /> Enter Meta Access Token and Phone Number ID to start sending</>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── SAVE BUTTON ────────────────────────── */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 px-8"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Save Settings</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================
// IMAGE UPLOAD FIELD (Reusable)
// ============================================

function ImageUploadField({
  label,
  description,
  icon,
  currentUrl,
  isUploading,
  previewClass,
  onUpload,
  onClear,
}: {
  label: string
  description: string
  icon: React.ReactNode
  currentUrl: string
  isUploading: boolean
  previewClass: string
  onUpload: (file: File) => void
  onClear: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5">
          {icon} {label}
        </Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>

      {currentUrl ? (
        <div className="space-y-2">
          {/* Preview */}
          <div className={`relative overflow-hidden border border-gray-200 bg-gray-50 ${previewClass}`}>
            <img
              src={currentUrl}
              alt={label}
              className="object-contain h-full w-full"
            />
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={onClear}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-xl py-8 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
          ) : (
            <Upload className="h-8 w-8 mb-2" />
          )}
          <span className="text-sm font-medium">
            {isUploading ? "Uploading..." : "Click to upload"}
          </span>
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
          if (file) onUpload(file)
          e.target.value = "" // reset for re-upload
        }}
      />
    </div>
  )
}
