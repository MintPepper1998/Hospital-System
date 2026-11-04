"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { registerAndAdmitToCasualty } from "@/app/actions/casualty"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, Loader2, ArrowLeft, Heart, Phone, User, Stethoscope, Bandage, CheckCircle, Baby } from "lucide-react"
import Link from "next/link"
import { PincodeAutoFill } from "@/components/patient/pincode-auto-fill"

interface Props {
  doctors: Array<{
    id: string
    user: { name: string | null }
    department: string | null
    specialization: string | null
  }>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full neo-button bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-4 text-base font-bold"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Registering & Admitting…
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-5 w-5" />
          Register & Admit to Casualty
        </>
      )}
    </Button>
  )
}

export function CasualtyRegisterClient({ doctors }: Props) {
  const [state, formAction] = useActionState(registerAndAdmitToCasualty, null)
  const [isBaby, setIsBaby] = useState(false)

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/casualty"
            className="neo-button bg-[#e0e5ec] rounded-xl p-2.5 text-zinc-600 hover:text-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Bandage className="h-6 w-6 text-orange-500" />
              Register New Patient
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Register and auto-admit to Casualty department · UHID will be generated automatically
            </p>
          </div>
        </div>
        <Link href="/dashboard/casualty">
          <Button className="neo-button bg-[#e0e5ec] text-zinc-700 hover:bg-[#d5dae2] rounded-xl px-5 py-2.5 text-sm font-semibold">
            <Bandage className="h-4 w-4 mr-2 text-orange-500" />
            Back to Casualty
          </Button>
        </Link>
      </div>

      {/* Success message */}
      {state?.success && (
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-5 border-l-4 border-emerald-500">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-emerald-700 text-sm">{state.message}</p>
              {state.patientId && (
                <p className="text-xs text-zinc-500 mt-1">UHID: <span className="font-bold text-zinc-700">{String(state.patientId)}</span></p>
              )}
              <Link href="/dashboard/casualty" className="text-xs text-orange-600 font-semibold hover:underline mt-2 inline-block">
                ← Back to Casualty Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {state?.error && (
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-5 border-l-4 border-red-500">
          <p className="text-sm font-semibold text-red-700">{String(state.message)}</p>
        </div>
      )}

      {/* Registration Form */}
      <form action={formAction} className="space-y-6">

        {/* ════════ Section 1: Personal Information ════════ */}
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-2 mb-5">
            <User className="h-4 w-4 text-orange-500" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-bold text-zinc-600">Full Name <span className="text-red-500">*</span></Label>
              <Input id="fullName" name="fullName" placeholder="Patient full name" required className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fatherOrHusbandName" className="text-xs font-bold text-zinc-600">
                Guardian Name <span className="text-[10px] text-zinc-400 font-normal">(S/o, D/o, W/o)</span>
              </Label>
              <Input id="fatherOrHusbandName" name="fatherOrHusbandName" placeholder="Guardian Name" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fatherSpouseName" className="text-xs font-bold text-zinc-600">Father / Spouse Name</Label>
              <Input id="fatherSpouseName" name="fatherSpouseName" placeholder="Father or Spouse name" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motherName" className="text-xs font-bold text-zinc-600">Mother Name</Label>
              <Input id="motherName" name="motherName" placeholder="Mother name" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>

            {/* ════════ AGE (replaces DOB) ════════ */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-600">Age <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ageYears"
                  name="ageYears"
                  type="number"
                  min="0"
                  max="150"
                  placeholder="Years"
                  required={!isBaby}
                  className="flex-1 bg-white/70 border-0 neo-pressed rounded-xl text-sm"
                />
                <span className="text-[10px] text-zinc-400 font-semibold">Yrs</span>
              </div>
            </div>

            {/* ════════ Baby checkbox ════════ */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-600 flex items-center gap-1.5">
                <Baby className="h-3.5 w-3.5 text-pink-500" />
                Baby / Infant
              </Label>
              <div className="flex items-center gap-3 h-9">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isBaby"
                    value="true"
                    checked={isBaby}
                    onChange={(e) => setIsBaby(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-orange-500 accent-orange-500"
                  />
                  <span className="text-xs font-medium text-zinc-600">Baby / Infant</span>
                </label>
              </div>
            </div>

            {/* Baby: months + days */}
            {isBaby && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ageMonths" className="text-xs font-bold text-zinc-600">Months</Label>
                  <Input id="ageMonths" name="ageMonths" type="number" min="0" max="11" placeholder="Months" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ageDays" className="text-xs font-bold text-zinc-600">Days</Label>
                  <Input id="ageDays" name="ageDays" type="number" min="0" max="30" placeholder="Days" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="gender" className="text-xs font-bold text-zinc-600">Gender <span className="text-red-500">*</span></Label>
              <Select name="gender">
                <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>


            <div className="space-y-1.5">
              <Label htmlFor="bloodGroup" className="text-xs font-bold text-zinc-600">Blood Group</Label>
              <Select name="bloodGroup">
                <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maritalStatus" className="text-xs font-bold text-zinc-600">Marital Status</Label>
              <Select name="maritalStatus">
                <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
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
            <div className="space-y-1.5">
              <Label htmlFor="occupation" className="text-xs font-bold text-zinc-600">Occupation</Label>
              <Input id="occupation" name="occupation" placeholder="e.g., Teacher, Farmer" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationality" className="text-xs font-bold text-zinc-600">Nationality</Label>
              <Input id="nationality" name="nationality" placeholder="Indian" defaultValue="Indian" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="religion" className="text-xs font-bold text-zinc-600">Religion</Label>
              <Select name="religion">
                <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="aadharNumber" className="text-xs font-bold text-zinc-600">
                ID Number <span className="text-[10px] text-zinc-400 font-normal">(Aadhaar / Voter ID / Passport)</span>
              </Label>
              <Input id="aadharNumber" name="aadharNumber" placeholder="ID number (optional)" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referredBy" className="text-xs font-bold text-zinc-600">Referred By</Label>
              <Input id="referredBy" name="referredBy" placeholder="Doctor / Hospital name" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
          </div>
        </div>

        {/* ════════ Section 2: Contact & Address ════════ */}
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-2 mb-5">
            <Phone className="h-4 w-4 text-orange-500" />
            Contact & Address
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-bold text-zinc-600">
                Phone <span className="text-[10px] text-zinc-400 font-normal">(optional)</span>
              </Label>
              <Input id="phone" name="phone" type="tel" placeholder="10-digit mobile" maxLength={10} className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5 md:col-span-1 lg:col-span-2">
              <Label htmlFor="email" className="text-xs font-bold text-zinc-600">Email</Label>
              <Input id="email" name="email" type="email" placeholder="Optional" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>

            <PincodeAutoFill />
          </div>
        </div>

        {/* ════════ Section 3: Emergency Contact ════════ */}
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-6 border-l-4 border-l-red-400">
          <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-2 mb-5">
            <Heart className="h-4 w-4 text-red-500" />
            Emergency Contact <span className="text-[10px] text-zinc-400 font-normal">(recommended)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactName" className="text-xs font-bold text-zinc-600">Contact Name</Label>
              <Input id="emergencyContactName" name="emergencyContactName" placeholder="Name of relative" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContact" className="text-xs font-bold text-zinc-600">Contact Phone</Label>
              <Input id="emergencyContact" name="emergencyContact" type="tel" placeholder="10-digit mobile" maxLength={10} className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactRelation" className="text-xs font-bold text-zinc-600">Relationship</Label>
              <Select name="emergencyContactRelation">
                <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
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
        </div>

        {/* ════════ Section 4: Casualty-Specific Fields ════════ */}
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-6 border-l-4 border-l-orange-400">
          <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-2 mb-5">
            <Stethoscope className="h-4 w-4 text-orange-500" />
            Casualty Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="chiefComplaint" className="text-xs font-bold text-zinc-600">Chief Complaint</Label>
              <Textarea id="chiefComplaint" name="chiefComplaint" placeholder="e.g. Fracture left forearm, needs plaster…" rows={3} className="bg-white/70 border-0 neo-pressed rounded-xl text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignedDoctorId" className="text-xs font-bold text-zinc-600">Assign Doctor (Optional)</Label>
              <Select name="assignedDoctorId">
                <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.user.name} {d.specialization ? `(${d.specialization})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ════════ UHID Notice ════════ */}
        <div className="neo-pressed bg-[#e0e5ec] rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-600 font-bold text-xs">ID</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-700">UHID & Registration No. will be auto-generated</p>
            <p className="text-[11px] text-zinc-500">Format: PAT-{new Date().getFullYear()}-XXXX — Same as OPD registration</p>
          </div>
        </div>

        {/* Submit */}
        <SubmitButton />
      </form>
    </>
  )
}
