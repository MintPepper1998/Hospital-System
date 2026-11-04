"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2 } from "lucide-react"

interface InsurerOption {
  id: string
  name: string
  shortName: string | null
  supportsCashless: boolean
  supportsReimbursement: boolean
  defaultSettlementType: string
  isEmpaneled: boolean
  defaultCopayPercent: number | null
  defaultRoomRentCap: number | null
  defaultIcuRentCap: number | null
  defaultDeductible: number | null
  linkedTpaId: string | null
}

interface TpaOption {
  id: string
  name: string
  shortName: string | null
}

interface PrivateInsuranceFormProps {
  formData: Record<string, string>
  onChange: (field: string, value: string) => void
  insurers?: InsurerOption[]
  tpas?: TpaOption[]
}

// Hardcoded fallbacks in case DB data isn't available yet
const FALLBACK_INSURERS = [
  "Star Health", "ICICI Lombard", "HDFC ERGO", "Bajaj Allianz", "Max Bupa (Niva Bupa)",
  "Care Health", "New India Assurance", "United India Insurance", "National Insurance",
  "Oriental Insurance", "SBI General", "Tata AIG", "Reliance General",
  "Aditya Birla Health", "Manipal Cigna", "Cholamandalam MS", "Other",
]

const FALLBACK_TPAS = [
  "Medi Assist", "FHPL (Family Health Plan)", "Paramount Health", "Vidal Health (TTK)",
  "Raksha TPA", "MD India", "Good Health TPA", "Star Health TPA",
  "Medsave Health TPA", "Heritage Health TPA", "United Health TPA", "Other",
]

export function PrivateInsuranceForm({ formData, onChange, insurers, tpas }: PrivateInsuranceFormProps) {
  const insurerList = insurers && insurers.length > 0 ? insurers : null
  const tpaList = tpas && tpas.length > 0 ? tpas : null

  // Auto-fill defaults when an insurer is selected (only when using DB data)
  function handleInsurerChange(value: string) {
    onChange("providerName", value)
    if (insurerList) {
      const selected = insurerList.find(i => i.name === value)
      if (selected) {
        // Auto-fill co-pay
        if (selected.defaultCopayPercent != null && selected.defaultCopayPercent > 0) {
          onChange("copayPercentage", String(selected.defaultCopayPercent))
        }
        // Auto-fill room rent cap
        if (selected.defaultRoomRentCap) {
          onChange("roomRentCap", String(selected.defaultRoomRentCap))
        }
        // Auto-fill ICU cap
        if (selected.defaultIcuRentCap) {
          onChange("icuRentCap", String(selected.defaultIcuRentCap))
        }
        // Auto-fill deductible
        if (selected.defaultDeductible) {
          onChange("deductibleAmount", String(selected.defaultDeductible))
        }
        // Auto-fill network hospital status
        onChange("isNetworkHospital", selected.isEmpaneled ? "true" : "false")
        // Auto-select linked TPA
        if (selected.linkedTpaId && tpaList) {
          const linkedTpa = tpaList.find(t => t.id === selected.linkedTpaId)
          if (linkedTpa) {
            onChange("tpaName", linkedTpa.name)
          }
        }
      }
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Policy Number *</Label>
        <Input
          placeholder="e.g., POL-12345678"
          value={formData.policyNumber || ""}
          onChange={(e) => onChange("policyNumber", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Insurance Company *</Label>
        <Select value={formData.providerName || ""} onValueChange={handleInsurerChange}>
          <SelectTrigger><SelectValue placeholder="Select insurer" /></SelectTrigger>
          <SelectContent>
            {insurerList ? (
              insurerList.map((i) => (
                <SelectItem key={i.id} value={i.name}>
                  <div className="flex items-center gap-2">
                    <span>{i.name}</span>
                    {i.isEmpaneled && <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                    {i.supportsCashless && (
                      <span className="text-[10px] px-1.5 py-0 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Cashless</span>
                    )}
                  </div>
                </SelectItem>
              ))
            ) : (
              FALLBACK_INSURERS.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>TPA Name</Label>
        <Select value={formData.tpaName || ""} onValueChange={(v) => onChange("tpaName", v)}>
          <SelectTrigger><SelectValue placeholder="Select TPA" /></SelectTrigger>
          <SelectContent>
            {tpaList ? (
              tpaList.map((t) => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))
            ) : (
              FALLBACK_TPAS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Health Card Number</Label>
        <Input
          placeholder="Card/Member ID"
          value={formData.healthCardNumber || ""}
          onChange={(e) => onChange("healthCardNumber", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Policy Type</Label>
        <Select value={formData.policyType || ""} onValueChange={(v) => onChange("policyType", v)}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="family_floater">Family Floater</SelectItem>
            <SelectItem value="group">Group / Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.policyType === "group" && (
        <>
          <div className="space-y-2">
            <Label>Corporate Name</Label>
            <Input
              placeholder="Employer name"
              value={formData.corporateName || ""}
              onChange={(e) => onChange("corporateName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Employee ID</Label>
            <Input
              placeholder="Employee ID"
              value={formData.employeeIdField || ""}
              onChange={(e) => onChange("employeeIdField", e.target.value)}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>Sum Insured (Rs.) *</Label>
        <Input
          type="number"
          placeholder="e.g., 500000"
          value={formData.coverageAmount || ""}
          onChange={(e) => onChange("coverageAmount", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Balance Available (Rs.)</Label>
        <Input
          type="number"
          placeholder="Remaining balance"
          value={formData.balanceAvailable || ""}
          onChange={(e) => onChange("balanceAvailable", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Policy Start Date *</Label>
        <Input
          type="date"
          value={formData.startDate || ""}
          onChange={(e) => onChange("startDate", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Policy End Date *</Label>
        <Input
          type="date"
          value={formData.endDate || ""}
          onChange={(e) => onChange("endDate", e.target.value)}
        />
      </div>

      <div className="col-span-full border-t pt-4 mt-2">
        <p className="text-sm font-semibold text-muted-foreground mb-3">Sub-Limits & Restrictions</p>
      </div>

      <div className="space-y-2">
        <Label>Room Rent Cap (Rs./day)</Label>
        <Input
          type="number"
          placeholder="e.g., 5000"
          value={formData.roomRentCap || ""}
          onChange={(e) => onChange("roomRentCap", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>ICU Rent Cap (Rs./day)</Label>
        <Input
          type="number"
          placeholder="e.g., 10000"
          value={formData.icuRentCap || ""}
          onChange={(e) => onChange("icuRentCap", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Co-pay (%)</Label>
        <Input
          type="number"
          placeholder="e.g., 10"
          value={formData.copayPercentage || ""}
          onChange={(e) => onChange("copayPercentage", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Deductible (Rs.)</Label>
        <Input
          type="number"
          placeholder="e.g., 5000"
          value={formData.deductibleAmount || ""}
          onChange={(e) => onChange("deductibleAmount", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Network Hospital?</Label>
        <Select value={formData.isNetworkHospital || "true"} onValueChange={(v) => onChange("isNetworkHospital", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes - Network Hospital</SelectItem>
            <SelectItem value="false">No - Non-Network</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
