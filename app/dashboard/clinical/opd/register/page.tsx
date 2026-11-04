"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { useFormStatus } from "react-dom"
import { registerPatient } from "@/lib/actions"
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
import { UserPlus, Loader2, ArrowLeft, Heart, Phone, User, Baby } from "lucide-react"
import Link from "next/link"
import { PincodeAutoFill } from "@/components/patient/pincode-auto-fill"

function SubmitButton() {
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
          Registering Patient...
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          Register Patient
        </>
      )}
    </Button>
  )
}

export default function PatientRegistrationPage() {
  const [state, formAction] = useActionState(registerPatient, null)
  const [isBaby, setIsBaby] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || ""
  const isFromIPD = redirectTo === "/dashboard/ipd/admission"
  const backHref = isFromIPD ? "/dashboard/ipd/admission" : "/dashboard/clinical/opd"

  // Shorthand for getting preserved form values on error
  const v = state?.formValues as Record<string, string> | undefined

  // Restore isBaby checkbox from preserved form values
  useEffect(() => {
    if (v?.isBaby === "true") setIsBaby(true)
  }, [v])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
            Patient Registration
          </h2>
          <p className="text-muted-foreground mt-2">
            {isFromIPD ? "Register a new patient for IPD admission" : "Register a new patient for OPD consultation"}
          </p>
        </div>
        <Link href={backHref}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isFromIPD ? "Back to IPD Admission" : "Back to OPD"}
          </Button>
        </Link>
      </div>

      <form action={formAction} className="space-y-6">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                <Input id="fullName" name="fullName" placeholder="Patient full name" required defaultValue={v?.fullName || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatherOrHusbandName">Guardian Name <span className="text-xs text-muted-foreground font-normal">(S/o, D/o, W/o)</span></Label>
                <Input id="fatherOrHusbandName" name="fatherOrHusbandName" placeholder="Guardian Name" defaultValue={v?.fatherOrHusbandName || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatherSpouseName">Father / Spouse Name</Label>
                <Input id="fatherSpouseName" name="fatherSpouseName" placeholder="Father or Spouse name" defaultValue={v?.fatherSpouseName || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherName">Mother Name</Label>
                <Input id="motherName" name="motherName" placeholder="Mother name" defaultValue={v?.motherName || ""} />
              </div>

              {/* ════════ AGE (replaces DOB) ════════ */}
              <div className="space-y-2">
                <Label>Age <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ageYears"
                    name="ageYears"
                    type="number"
                    min="0"
                    max="150"
                    placeholder="Years"
                    required={!isBaby}
                    className="flex-1"
                    defaultValue={v?.ageYears || ""}
                  />
                  <span className="text-xs text-muted-foreground font-medium">Yrs</span>
                </div>
              </div>

              {/* ════════ Baby checkbox ════════ */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Baby className="h-4 w-4 text-pink-500" />
                  Baby / Infant
                </Label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isBaby"
                      value="true"
                      checked={isBaby}
                      onChange={(e) => setIsBaby(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#0066CC] accent-[#0066CC]"
                    />
                    <span className="text-sm font-medium">Baby / Infant</span>
                  </label>
                </div>
              </div>

              {/* Baby: months + days */}
              {isBaby && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ageMonths">Months</Label>
                    <Input id="ageMonths" name="ageMonths" type="number" min="0" max="11" placeholder="Months" defaultValue={v?.ageMonths || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ageDays">Days</Label>
                    <Input id="ageDays" name="ageDays" type="number" min="0" max="30" placeholder="Days" defaultValue={v?.ageDays || ""} />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                <Select name="gender" defaultValue={v?.gender || undefined}>
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
                <Select name="bloodGroup" defaultValue={v?.bloodGroup || undefined}>
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
                <Select name="maritalStatus" defaultValue={v?.maritalStatus || undefined}>
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
                <Input id="occupation" name="occupation" placeholder="e.g., Teacher, Farmer, Business" defaultValue={v?.occupation || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input id="nationality" name="nationality" placeholder="Indian" defaultValue={v?.nationality || "Indian"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="religion">Religion</Label>
                <Select name="religion" defaultValue={v?.religion || undefined}>
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
                <Input id="aadharNumber" name="aadharNumber" placeholder="Aadhaar / Voter ID / Driving License / Passport" defaultValue={v?.aadharNumber || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referredBy">Referred By</Label>
                <Input id="referredBy" name="referredBy" placeholder="Doctor / Hospital name" defaultValue={v?.referredBy || ""} />
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
                <Input id="phone" name="phone" type="tel" placeholder="10-digit mobile (optional)" maxLength={10} defaultValue={v?.phone || ""} />
              </div>
              <div className="space-y-2 md:col-span-1 lg:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="Optional" defaultValue={v?.email || ""} />
              </div>
              
              <PincodeAutoFill values={v ? { pincode: v.pincode, city: v.city, state: v.state, address: v.address } : undefined} />
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
                <Input id="emergencyContactName" name="emergencyContactName" placeholder="Name of relative" defaultValue={v?.emergencyContactName || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Contact Phone</Label>
                <Input id="emergencyContact" name="emergencyContact" type="tel" placeholder="10-digit mobile" maxLength={10} defaultValue={v?.emergencyContact || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelation">Relationship</Label>
                <Select name="emergencyContactRelation" defaultValue={v?.emergencyContactRelation || undefined}>
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

        <SubmitButton />
      </form>
    </div>
  )
}
