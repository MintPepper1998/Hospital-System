"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Loader2, Save, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { updatePharmacySettings } from "@/app/actions/supplier-profile"

interface PharmacySettingsData {
  pharmacyName: string
  pharmacyGstNo: string
  pharmacyDrugLicense: string
  pharmacyAddress: string
  pharmacyPhone: string
}

export function PharmacyIdentityForm({ initial }: { initial: PharmacySettingsData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<PharmacySettingsData>(initial)

  const handleSave = () => {
    if (!form.pharmacyName.trim()) {
      toast.error("Pharmacy name is required")
      return
    }
    startTransition(async () => {
      const result = await updatePharmacySettings({
        pharmacyName: form.pharmacyName,
        pharmacyGstNo: form.pharmacyGstNo || undefined,
        pharmacyDrugLicense: form.pharmacyDrugLicense || undefined,
        pharmacyAddress: form.pharmacyAddress || undefined,
        pharmacyPhone: form.pharmacyPhone || undefined,
      })
      if (result.success) {
        toast.success(result.message)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Card className="border-t-4 border-t-green-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-green-600" />
              Pharmacy Identity
            </CardTitle>
            <CardDescription>Pharmacy business details and tax registration (GST, Drug License)</CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className={saved ? "bg-green-600 hover:bg-green-700" : ""}
            size="sm"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Pharmacy Name *</Label>
            <Input
              value={form.pharmacyName}
              onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })}
              placeholder="Shree Kamal Pharmacy"
            />
          </div>
          <div className="space-y-2">
            <Label>GST Number</Label>
            <Input
              value={form.pharmacyGstNo}
              onChange={(e) => setForm({ ...form, pharmacyGstNo: e.target.value })}
              placeholder="22AAAAA0000A1Z5"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Drug License No.</Label>
            <Input
              value={form.pharmacyDrugLicense}
              onChange={(e) => setForm({ ...form, pharmacyDrugLicense: e.target.value })}
              placeholder="DL-XX-XXXX"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.pharmacyPhone}
              onChange={(e) => setForm({ ...form, pharmacyPhone: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={form.pharmacyAddress}
              onChange={(e) => setForm({ ...form, pharmacyAddress: e.target.value })}
              placeholder="Pharmacy address"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
