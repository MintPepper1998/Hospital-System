"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface BskyVerificationFormProps {
  formData: Record<string, string>
  onChange: (field: string, value: string) => void
}

export function BskyVerificationForm({ formData, onChange }: BskyVerificationFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>BSKY Card Number *</Label>
        <Input
          placeholder="BSKY card number"
          value={formData.bskyCardNumber || ""}
          onChange={(e) => onChange("bskyCardNumber", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Aadhaar Number *</Label>
        <Input
          placeholder="12-digit Aadhaar"
          maxLength={12}
          value={formData.aadharNumber || ""}
          onChange={(e) => onChange("aadharNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
        />
      </div>

      <div className="space-y-2">
        <Label>Mobile Number</Label>
        <Input
          placeholder="Registered mobile"
          maxLength={10}
          value={formData.phone || ""}
          onChange={(e) => onChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </div>

      <div className="col-span-full p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <p className="text-sm font-medium text-orange-800">BSKY Coverage</p>
        <p className="text-xs text-orange-700 mt-1">
          Biju Swasthya Kalyan Yojana provides Rs.5,00,000 per family per year 
          and Rs.10,00,000 for women members. Applicable in Odisha state empanelled hospitals.
        </p>
      </div>
    </div>
  )
}
