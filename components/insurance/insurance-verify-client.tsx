"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { InsuranceSchemeSelector } from "@/components/insurance/scheme-selector"
import { PrivateInsuranceForm } from "@/components/insurance/private-insurance-form"
import { PmjayVerificationForm } from "@/components/insurance/pmjay-verification-form"
import { BskyVerificationForm } from "@/components/insurance/bsky-verification-form"
import { CoverageSummaryCard } from "@/components/insurance/coverage-summary-card"
import {
  verifyInsurancePolicy,
  verifyPmjayBeneficiary,
  verifyBskyBeneficiary,
  createInsurancePolicyRecord,
  registerPatientWithInsurance,
} from "@/lib/actions/insurance-verification"
import {
  ShieldCheck, UserPlus, ArrowRight, ArrowLeft, CheckCircle, Loader2, AlertCircle, ChevronsUpDown, Check,
  Users, Phone, Activity
} from "lucide-react"
import { PincodeAutoFill } from "@/components/patient/pincode-auto-fill"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type Step = "patient" | "scheme" | "details" | "coverage"
type SearchPatient = {
  id: string
  patientId: string
  user?: { name?: string | null, email?: string | null }
  dateOfBirth?: Date | string | null
  gender?: string | null
  bloodGroup?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  aadharNumber?: string | null
  fatherOrHusbandName?: string | null
  maritalStatus?: string | null
  occupation?: string | null
  emergencyContact?: string | null
  emergencyContactName?: string | null
  emergencyContactRelation?: string | null
  allergies?: string | null
  currentMedications?: string | null
  isBsky?: boolean
  bskyNumber?: string | null
}

type VerificationResult = {
  success?: boolean
  message?: string
  data?: {
    policyId?: string
    isExistingPolicy?: boolean
    [key: string]: unknown
  }
}

export function InsuranceVerifyClient({ insurers, tpas }: { insurers?: any[]; tpas?: any[] } = {}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("patient")
  const [scheme, setScheme] = useState("")
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [coverageData, setCoverageData] = useState<any | null>(null)
  const [policyId, setPolicyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Patient Search State
  const [patientOpen, setPatientOpen] = useState(false)
  const [patientSearch, setPatientSearch] = useState("")
  const [patients, setPatients] = useState<SearchPatient[]>([])
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null)

  useEffect(() => {
    if (!patientOpen) return
    const delayDebounceFn = setTimeout(() => {
      handlePatientSearch(patientSearch)
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [patientSearch, patientOpen])

  const handlePatientSearch = async (query?: string) => {
    const q = typeof query === "string" ? query : patientSearch
    setSearchingPatients(true)
    try {
      const response = await fetch(`/api/patients/search?query=${encodeURIComponent(q)}`)
      const data = await response.json()
      setPatients(data.patients || [])
    } catch {
      // Ignore
    } finally {
      setSearchingPatients(false)
    }
  }

  const handleSelectPatient = (p: SearchPatient) => {
    setExistingPatientId(p.id)
    setFormData((prev) => ({
      ...prev,
      name: p.user?.name || prev.name,
      email: p.user?.email || prev.email,
      phone: p.phone || prev.phone,
      gender: p.gender || prev.gender,
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : prev.dateOfBirth,
      bloodGroup: p.bloodGroup || prev.bloodGroup,
      address: p.address || prev.address,
      city: p.city || prev.city,
      state: p.state || prev.state,
      pincode: p.pincode || prev.pincode,
      aadharNumber: p.aadharNumber || prev.aadharNumber,
      fatherOrHusbandName: p.fatherOrHusbandName || prev.fatherOrHusbandName,
      maritalStatus: p.maritalStatus || prev.maritalStatus,
      occupation: p.occupation || prev.occupation,
      emergencyContact: p.emergencyContact || prev.emergencyContact,
      emergencyContactName: p.emergencyContactName || prev.emergencyContactName,
      emergencyContactRelation: p.emergencyContactRelation || prev.emergencyContactRelation,
      allergies: p.allergies || prev.allergies,
      currentMedications: p.currentMedications || prev.currentMedications,
    }))
    setPatientSearch("")
    setPatientOpen(false)
    setMessage({ type: "success", text: "Successfully synchronized patient data!" });
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validatePatientAndProceed = () => {
    if (!formData.name || !formData.phone) {
      setMessage({ type: "error", text: "Name and Phone are mandatory to proceed." });
      return;
    }
    setMessage(null);
    setStep("scheme");
  }

  const handleSchemeSelect = (s: string) => {
    setScheme(s)
    setCoverageData(null)
    setPolicyId(null)
    setMessage(null)
    if (s === "SELF_PAY") {
      // If self pay, confirm immediately
      handleConfirmRegistration();
    } else {
      setStep("details")
    }
  }

  const handleVerify = () => {
    startTransition(async () => {
      setMessage(null)
      const fd = new FormData()
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v))

      let result: VerificationResult | undefined
      if (scheme === "PRIVATE") {
        result = await verifyInsurancePolicy(fd)
      } else if (scheme === "PMJAY") {
        result = await verifyPmjayBeneficiary(fd)
      } else if (scheme === "BSKY") {
        result = await verifyBskyBeneficiary(fd)
      }

      if (result?.success && result.data) {
        if (result.data.isExistingPolicy) {
          setCoverageData(result.data as any)
          if (result.data.policyId) setPolicyId(result.data.policyId as string)
          setMessage({ type: "success", text: result.message || "Success" })
        } else {
          setMessage({ type: "success", text: result.message || "Verification successful" })
          setCoverageData({
            schemeType: scheme,
            coverageAmount: parseFloat(formData.coverageAmount || "0") || (scheme === "PMJAY" || scheme === "BSKY" ? 500000 : 0),
            balanceAvailable: parseFloat(formData.balanceAvailable || "0") || (scheme === "PMJAY" || scheme === "BSKY" ? 500000 : 0),
            providerName: formData.providerName || (scheme === "PMJAY" ? "National Health Authority" : scheme === "BSKY" ? "Govt. of Odisha" : ""),
            tpaName: formData.tpaName || null,
            policyNumber: formData.policyNumber || null,
            isActive: true, // Since we are validating a new policy for a future date, it will be considered active
            startDate: formData.startDate || new Date().toISOString().split("T")[0],
            endDate: formData.endDate || null,
            copayPercentage: parseFloat(formData.copayPercentage || "0") || null,
            roomRentCap: parseFloat(formData.roomRentCap || "0") || null,
            deductibleAmount: parseFloat(formData.deductibleAmount || "0") || null,
          })
        }
        setStep("coverage")
      } else {
        setMessage({ type: "error", text: result?.message || "Verification failed" })
      }
    })
  }

  const handleConfirmRegistration = () => {
    startTransition(async () => {
      setMessage(null)
      const fd = new FormData()
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v))
      fd.append("schemeType", scheme || "SELF_PAY")
      if (policyId) fd.append("policyId", policyId)
      if (existingPatientId) fd.append("existingPatientId", existingPatientId)

      const result = await registerPatientWithInsurance(fd)
      if (result?.success) {
        setMessage({ type: "success", text: result.message })

        let linkedPolicyId: string | null = policyId
        if (!policyId && scheme !== "SELF_PAY" && result.data?.patientId) {
          const policyFd = new FormData()
          policyFd.append("patientId", result.data.patientId)
          policyFd.append("schemeType", scheme)
          Object.entries(formData).forEach(([k, v]) => policyFd.append(k, v))

          if (scheme === "PMJAY") {
            policyFd.append("providerName", "National Health Authority")
            policyFd.append("policyNumber", formData.ayushmanId || `PMJAY-${Date.now()}`)
            policyFd.append("coverageAmount", "500000")
            policyFd.append("startDate", new Date().toISOString().split("T")[0])
            policyFd.append("endDate", new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          } else if (scheme === "BSKY") {
            policyFd.append("providerName", "Govt. of Odisha")
            policyFd.append("policyNumber", formData.bskyCardNumber || `BSKY-${Date.now()}`)
            policyFd.append("coverageAmount", "500000")
            policyFd.append("startDate", new Date().toISOString().split("T")[0])
            policyFd.append("endDate", new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          }

          const policyCreateResult = await createInsurancePolicyRecord(policyFd)
          if (policyCreateResult?.success && policyCreateResult?.data?.policyId) {
            linkedPolicyId = policyCreateResult.data.policyId
          }
        }

        if (typeof window !== "undefined" && result.data?.patientId) {
          const recentInsuranceRegistration = {
            patientId: result.data.patientId,
            patientIdStr: result.data.patientIdStr || null,
            policyId: linkedPolicyId || null,
            schemeType: scheme || "SELF_PAY",
            name: formData.name || "",
            phone: formData.phone || "",
            gender: formData.gender || "",
            dateOfBirth: formData.dateOfBirth || "",
            aadharNumber: formData.aadharNumber || "",
            diagnosis: formData.provisionalDiagnosis || "",
            estimatedCost: formData.totalEstimatedCost || "",
            createdAt: Date.now(),
          }
          window.localStorage.setItem("recentInsuranceRegistration", JSON.stringify(recentInsuranceRegistration))
        }

        setTimeout(() => {
          router.push("/dashboard/insurance/policies")
        }, 800)
      } else {
        setMessage({ type: "error", text: result?.message || "Registration failed" })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-2">
          {["patient", "scheme", "details", "coverage"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                step === s ? "bg-blue-600 text-white" :
                ["patient", "scheme", "details", "coverage"].indexOf(step) > i
                  ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {["patient", "scheme", "details", "coverage"].indexOf(step) > i ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground font-medium hidden md:block">
          {step === "patient" && "Step 1: Patient Information"}
          {step === "scheme" && "Step 2: Select Insurance Scheme"}
          {step === "details" && "Step 3: Enter Policy Details"}
          {step === "coverage" && "Step 4: Review Coverage"}
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg shadow-sm ${
          message.type === "success" ? "bg-green-50 border border-green-200 text-green-800" :
          "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {step === "patient" && (
        <Card className="border-t-4 border-blue-600 shadow-sm">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Patient Identification & Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Patient Search */}
            <div className="space-y-2 pb-6 border-b">
               <Label className="text-base text-gray-700">Have they visited OPD before? Search Existing Patient</Label>
               <Popover open={patientOpen} onOpenChange={setPatientOpen} modal={true}>
                 <PopoverTrigger asChild>
                   <Button
                     variant="outline"
                     role="combobox"
                     aria-expanded={patientOpen}
                     className="w-full xl:w-2/3 justify-between font-normal bg-background h-auto py-3 text-base shadow-sm hover:border-blue-400 focus:border-blue-500"
                   >
                     <span className="truncate">
                       {existingPatientId
                         ? `✔️ Linked Patient: ${formData.name || ''} - ${formData.phone || ''}`
                         : "Search and select existing patient by name, ID or phone..."}
                     </span>
                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-[500px] p-0" align="start">
                   <Command shouldFilter={false}>
                     <CommandInput
                       placeholder="Start typing to search patient directory..."
                       value={patientSearch}
                       onValueChange={setPatientSearch}
                     />
                     <CommandList className="max-h-[300px]">
                       <CommandEmpty className="p-4 text-center">
                         {searchingPatients ? (
                           <div className="flex items-center justify-center gap-2">
                             <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                             Searching system...
                           </div>
                         ) : "No patients found. Create a new patient below."}
                       </CommandEmpty>
                       <CommandGroup>
                         {patients.map((patient) => (
                           <CommandItem
                             key={patient.id}
                             value={`${patient.id} ${patient.user?.name || ''} ${patient.patientId}`}
                             onSelect={() => handleSelectPatient(patient)}
                             className="py-3 px-4 flex items-start gap-3 cursor-pointer"
                           >
                             <Check
                               className={cn(
                                 "mt-1 bg-blue-100 text-blue-600 rounded-full p-0.5 h-5 w-5",
                                 existingPatientId === patient.id ? "opacity-100" : "opacity-0"
                               )}
                             />
                             <div>
                               <p className="font-semibold text-gray-800">{patient.user?.name || patient.patientId}</p>
                               <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                 <span>{patient.patientId}</span>
                                 <span>•</span>
                                 <span>{patient.phone}</span>
                                 {patient.gender && <><span>•</span><span>{patient.gender}</span></>}
                               </div>
                             </div>
                           </CommandItem>
                         ))}
                       </CommandGroup>
                     </CommandList>
                   </Command>
                 </PopoverContent>
               </Popover>
               {existingPatientId && (
                 <p className="text-sm font-medium text-green-600 mt-2 bg-green-50 px-3 py-2 rounded-md inline-block">
                   ✓ Patient data has been synced. Verify the personal details below.
                 </p>
               )}
            </div>

            {/* Section 1: Personal Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#0066CC] uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4" /> Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="Patient full name" value={formData.name || ""} onChange={(e) => handleFieldChange("name", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Father / Husband Name</Label>
                  <Input placeholder="S/o, D/o, W/o" value={formData.fatherOrHusbandName || ""} onChange={(e) => handleFieldChange("fatherOrHusbandName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.dateOfBirth || ""} onChange={(e) => handleFieldChange("dateOfBirth", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={formData.gender || ""} onValueChange={(v) => handleFieldChange("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select value={formData.bloodGroup || ""} onValueChange={(v) => handleFieldChange("bloodGroup", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select value={formData.maritalStatus || ""} onValueChange={(v) => handleFieldChange("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single</SelectItem>
                      <SelectItem value="MARRIED">Married</SelectItem>
                      <SelectItem value="WIDOWED">Widowed</SelectItem>
                      <SelectItem value="DIVORCED">Divorced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Occupation</Label>
                  <Input placeholder="e.g., Teacher, Farmer" value={formData.occupation || ""} onChange={(e) => handleFieldChange("occupation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Aadhaar Number</Label>
                  <Input placeholder="12-digit Aadhaar" maxLength={12} value={formData.aadharNumber || ""} onChange={(e) => handleFieldChange("aadharNumber", e.target.value.replace(/\D/g, "").slice(0, 12))} />
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Address */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-bold text-[#0066CC] uppercase tracking-wider flex items-center gap-2">
                <Phone className="h-4 w-4" /> Contact & Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Phone <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input placeholder="10-digit mobile (optional)" maxLength={10} value={formData.phone || ""} onChange={(e) => handleFieldChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="Optional" value={formData.email || ""} onChange={(e) => handleFieldChange("email", e.target.value)} />
                </div>
                
                <PincodeAutoFill 
                  values={{
                    pincode: formData.pincode,
                    city: formData.city,
                    state: formData.state,
                    address: formData.address
                  }}
                  onChange={handleFieldChange}
                />
              </div>
            </div>

            {/* Section 3: Emergency Contact */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-red-500" /> Emergency Contact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input placeholder="Name of relative" value={formData.emergencyContactName || ""} onChange={(e) => handleFieldChange("emergencyContactName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input placeholder="10-digit mobile" maxLength={10} value={formData.emergencyContact || ""} onChange={(e) => handleFieldChange("emergencyContact", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select value={formData.emergencyContactRelation || ""} onValueChange={(v) => handleFieldChange("emergencyContactRelation", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 4: Medical Info */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-bold text-[#0066CC] uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4" /> Medical Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Known Allergies</Label>
                  <Input placeholder="Drug/Food allergies" value={formData.allergies || ""} onChange={(e) => handleFieldChange("allergies", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Current Medications</Label>
                  <Input placeholder="Ongoing meds" value={formData.currentMedications || ""} onChange={(e) => handleFieldChange("currentMedications", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t mt-4">
              <Button onClick={validatePatientAndProceed} disabled={isPending} size="lg" className="w-full md:w-auto bg-[#0066CC] hover:bg-[#0052A3]">
                Next: Select Insurance Scheme <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "scheme" && (
        <Card className="border-t-4 border-indigo-600 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Identify Verification Scheme
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <InsuranceSchemeSelector value={scheme} onChange={handleSchemeSelect} />
            <div className="flex justify-start pt-6 mt-4">
              <Button variant="outline" onClick={() => setStep("patient")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Patient Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "details" && (
        <Card className="border-t-4 border-purple-600 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-xl text-purple-800">Enter Document & Policy Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="bg-purple-50 p-4 rounded-lg mb-4">
              <p className="font-semibold text-purple-900 mb-1">Applying for {scheme} Scheme</p>
              <p className="text-sm text-purple-700">Fill out exactly as shown on the physical health card.</p>
            </div>
            {scheme === "PRIVATE" && (
              <PrivateInsuranceForm formData={formData} onChange={handleFieldChange} insurers={insurers} tpas={tpas} />
            )}
            {scheme === "PMJAY" && (
              <PmjayVerificationForm formData={formData} onChange={handleFieldChange} />
            )}
            {scheme === "BSKY" && (
              <BskyVerificationForm formData={formData} onChange={handleFieldChange} />
            )}
            <div className="flex justify-between pt-6 border-t mt-4">
              <Button variant="outline" size="lg" onClick={() => setStep("scheme")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={handleVerify} disabled={isPending} size="lg" className="bg-purple-600 hover:bg-purple-700">
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Run Verification
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "coverage" && coverageData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <CoverageSummaryCard data={coverageData} />
          <Card className="border-t-4 border-green-500 shadow-md">
            <CardHeader className="bg-green-50 pb-4">
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="h-6 w-6 mr-2 text-green-600" /> 
                Verification Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-6 font-medium">
                The policy has been verified and mapped. You can finalize the registration to link this policy to the patient.
              </p>
              <div className="flex justify-between">
                <Button variant="outline" size="lg" onClick={() => setStep("details")}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Modify Policy
                </Button>
                <Button onClick={handleConfirmRegistration} disabled={isPending} size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8">
                  {isPending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <UserPlus className="h-5 w-5 mr-2" />}
                  Finalize & Register
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
