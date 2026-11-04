"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPreAuth } from "@/lib/actions/pre-authorization"
import { ClipboardCheck, Loader2, CheckCircle, AlertCircle, ChevronsUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { ICD10Search } from "./icd10-search"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useEffect } from "react"

export function PreAuthCreateForm({ policies }: { policies: any[] }) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Doctor search state
  const [doctorSearch, setDoctorSearch] = useState("")
  const [doctorOpen, setDoctorOpen] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [searchingDoctors, setSearchingDoctors] = useState(false)

  // Fetch doctors on search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (doctorSearch.length >= 2) {
        setSearchingDoctors(true)
        fetch(`/api/staff/doctors?query=${encodeURIComponent(doctorSearch)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) setDoctors(data.doctors)
          })
          .finally(() => setSearchingDoctors(false))
      } else if (doctorSearch === "") {
        // Initial load of some doctors
        fetch(`/api/staff/doctors`)
          .then(res => res.json())
          .then(data => {
            if (data.success) setDoctors(data.doctors)
          })
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [doctorSearch])

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      
      // Auto-calculate total if any cost field changes
      const costFields = [
        "estimatedRoomRent",
        "estimatedIcuCharges",
        "estimatedInvestigation",
        "estimatedOtCharges",
        "estimatedProfessionalFees",
        "estimatedMedicines",
        "estimatedImplants",
        "estimatedOtherCharges"
      ]

      if (costFields.includes(field)) {
        const total = costFields.reduce((sum, key) => {
          const val = parseFloat(newData[key] || "0")
          return sum + (isNaN(val) ? 0 : val)
        }, 0)
        newData.totalEstimatedCost = total.toString()
      }

      return newData
    })
  }

  const selectedPolicy = policies.find((p) => p.id === formData.policyId)

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null)
      const fd = new FormData()
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v))
      if (selectedPolicy) {
        fd.append("patientId", selectedPolicy.patientId)
      }

      const result = await createPreAuth(fd)
      if (result?.success) {
        setMessage({ type: "success", text: result.message })
        setTimeout(() => router.push("/dashboard/insurance/pre-auth"), 1500)
      } else {
        setMessage({ type: "error", text: result?.message || "Failed" })
      }
    })
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === "success" ? "bg-green-50 border border-green-200 text-green-800" :
          "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Patient & Policy Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Insurance Policy *</Label>
              <Select value={formData.policyId || ""} onValueChange={(v) => handleFieldChange("policyId", v)}>
                <SelectTrigger><SelectValue placeholder="Select active policy" /></SelectTrigger>
                <SelectContent>
                  {policies.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.patient?.user?.name} - {p.policyNumber} ({p.schemeType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPolicy && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p><strong>Patient:</strong> {selectedPolicy.patient?.user?.name}</p>
                <p><strong>Insurer:</strong> {selectedPolicy.providerName}</p>
                <p><strong>Balance:</strong> Rs.{(selectedPolicy.balanceAvailable || selectedPolicy.coverageAmount).toLocaleString("en-IN")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Diagnosis & Treatment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provisional Diagnosis *</Label>
              <Input
                placeholder="e.g., Acute Appendicitis"
                value={formData.provisionalDiagnosis || ""}
                onChange={(e) => handleFieldChange("provisionalDiagnosis", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <ICD10Search
                defaultCode={formData.icdPrimaryCode}
                defaultDescription={formData.icdPrimaryDescription}
                onSelect={(code, desc) => {
                  handleFieldChange("icdPrimaryCode", code)
                  handleFieldChange("icdPrimaryDescription", desc)
                  // Optional: auto-fill provisional diagnosis if empty
                  if (!formData.provisionalDiagnosis) {
                    handleFieldChange("provisionalDiagnosis", desc)
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Treatment Type</Label>
              <Select value={formData.treatmentType || ""} onValueChange={(v) => handleFieldChange("treatmentType", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical Management</SelectItem>
                  <SelectItem value="surgical">Surgical</SelectItem>
                  <SelectItem value="daycare">Day Care</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Proposed Treatment / Procedure *</Label>
            <Textarea
              placeholder="Describe the proposed treatment plan"
              value={formData.proposedTreatment || ""}
              onChange={(e) => handleFieldChange("proposedTreatment", e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Surgery Name (if applicable)</Label>
              <Input
                placeholder="e.g., Laparoscopic Appendectomy"
                value={formData.surgeryName || ""}
                onChange={(e) => handleFieldChange("surgeryName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Admission Type</Label>
              <Select value={formData.admissionType || ""} onValueChange={(v) => handleFieldChange("admissionType", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stay & Cost Estimation</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Expected Stay (days)</Label>
              <Input type="number" value={formData.expectedStayDays || ""} onChange={(e) => handleFieldChange("expectedStayDays", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expected ICU (days)</Label>
              <Input type="number" value={formData.expectedIcuDays || ""} onChange={(e) => handleFieldChange("expectedIcuDays", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select value={formData.roomType || ""} onValueChange={(v) => handleFieldChange("roomType", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Ward</SelectItem>
                  <SelectItem value="semi_private">Semi Private</SelectItem>
                  <SelectItem value="private">Private Room</SelectItem>
                  <SelectItem value="deluxe">Deluxe Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Room Rent (Est.)</Label>
              <Input type="number" value={formData.estimatedRoomRent || ""} onChange={(e) => handleFieldChange("estimatedRoomRent", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ICU Charges (Est.)</Label>
              <Input type="number" value={formData.estimatedIcuCharges || ""} onChange={(e) => handleFieldChange("estimatedIcuCharges", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Investigation (Est.)</Label>
              <Input type="number" value={formData.estimatedInvestigation || ""} onChange={(e) => handleFieldChange("estimatedInvestigation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>OT Charges (Est.)</Label>
              <Input type="number" value={formData.estimatedOtCharges || ""} onChange={(e) => handleFieldChange("estimatedOtCharges", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Professional Fees</Label>
              <Input type="number" value={formData.estimatedProfessionalFees || ""} onChange={(e) => handleFieldChange("estimatedProfessionalFees", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Medicines (Est.)</Label>
              <Input type="number" value={formData.estimatedMedicines || ""} onChange={(e) => handleFieldChange("estimatedMedicines", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Implants (Est.)</Label>
              <Input type="number" value={formData.estimatedImplants || ""} onChange={(e) => handleFieldChange("estimatedImplants", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Other Charges</Label>
              <Input type="number" value={formData.estimatedOtherCharges || ""} onChange={(e) => handleFieldChange("estimatedOtherCharges", e.target.value)} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Total Estimated Cost *</Label>
            <Input
              type="number"
              value={formData.totalEstimatedCost || ""}
              onChange={(e) => handleFieldChange("totalEstimatedCost", e.target.value)}
              className="text-lg font-bold"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Treating Doctor</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-blue-600 hover:text-blue-800"
            onClick={() => {
              handleFieldChange("provisionalDiagnosis", "Acute Cholecystitis with Gallstones")
              handleFieldChange("treatmentType", "surgical")
              handleFieldChange("proposedTreatment", "Laparoscopic Cholecystectomy under General Anesthesia. Sample collection for biopsy.")
              handleFieldChange("surgeryName", "Laparoscopic Cholecystectomy")
              handleFieldChange("admissionType", "planned")
              handleFieldChange("expectedStayDays", "3")
              handleFieldChange("roomType", "private")
              handleFieldChange("estimatedRoomRent", "15000")
              handleFieldChange("estimatedOtCharges", "25000")
              handleFieldChange("estimatedProfessionalFees", "35000")
              handleFieldChange("estimatedMedicines", "8000")
              handleFieldChange("estimatedInvestigation", "12000")
              handleFieldChange("estimatedOtherCharges", "2000")
              setMessage({ type: "success", text: "Form pre-filled with sample clinical data!" })
            }}
          >
            Fill Sample Data
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Doctor Name <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {formData.treatingDoctorName || "Search and select doctor..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search by name, ID or specialty..." 
                        value={doctorSearch}
                        onValueChange={setDoctorSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {searchingDoctors ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching...
                            </div>
                          ) : "No doctors found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {doctors.map((doc: any) => (
                            <CommandItem
                              key={doc.id}
                              value={doc.user?.name}
                              onSelect={() => {
                                handleFieldChange("treatingDoctorName", doc.user?.name || "")
                                handleFieldChange("treatingDoctorRegNo", doc.licenseNumber || doc.employeeId || "")
                                setDoctorOpen(false)
                                setDoctorSearch("")
                              }}
                              className="cursor-pointer py-2"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{doc.user?.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {doc.specialization} • {doc.employeeId}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input 
                placeholder="Doctor's Reg. No"
                value={formData.treatingDoctorRegNo || ""} 
                onChange={(e) => handleFieldChange("treatingDoctorRegNo", e.target.value)} 
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard/insurance/pre-auth")}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
          Create Pre-Authorization
        </Button>
      </div>
    </div>
  )
}
