"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PmjayVerificationFormProps {
  formData: Record<string, string>
  onChange: (field: string, value: string) => void
}

export function PmjayVerificationForm({ formData, onChange }: PmjayVerificationFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Ayushman Bharat ID *</Label>
        <Input
          placeholder="e.g., AB-12-34-567890"
          value={formData.ayushmanId || ""}
          onChange={(e) => onChange("ayushmanId", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">14-digit Ayushman Bharat beneficiary ID</p>
      </div>

      <div className="space-y-2">
        <Label>ABHA Number</Label>
        <Input
          placeholder="e.g., 91-1234-5678-9012"
          value={formData.abhaNumber || ""}
          onChange={(e) => onChange("abhaNumber", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Ayushman Bharat Health Account number</p>
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
        <Label>Family ID</Label>
        <Input
          placeholder="PMJAY family ID"
          value={formData.pmjayFamilyId || ""}
          onChange={(e) => onChange("pmjayFamilyId", e.target.value)}
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

      <div className="col-span-full p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm font-medium text-green-800">PMJAY Coverage</p>
        <p className="text-xs text-green-700 mt-1">
          Rs.5,00,000 per family per year for secondary and tertiary hospitalization.
          Covers pre and post hospitalization expenses. Package-based pricing applies.
        </p>
      </div>
    </div>
  )
}
