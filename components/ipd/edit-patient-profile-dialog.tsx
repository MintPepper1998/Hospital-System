"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader } from "@/components/ui/dialog"
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
  CardHeader as ShadcnCardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Edit2, Loader2, Save, User, Phone, Heart } from "lucide-react"
import { updatePatient } from "@/lib/actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { PincodeAutoFill } from "@/components/patient/pincode-auto-fill"

export function EditPatientProfileDialog({ patient, user }: { patient: any, user: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      formData.append("patientId", patient.id)
      formData.append("userId", user.id)
      
      // Ensure required fields
      if (!formData.get("gender")) formData.append("gender", patient.gender)
      if (!formData.get("address")) formData.append("address", patient.address || "-")

      const res = await updatePatient(null, formData)
      if (!res.success) throw new Error(res.message)
        
      toast.success(res.message)
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors text-xs font-bold tracking-wide">
          <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
          Edit
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-white border-slate-100 p-0 rounded-2xl overflow-hidden shadow-2xl">
        <DialogHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
            Edit Patient Profile
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Update {user.name}&apos;s demographic and contact details.
          </p>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-6 max-h-[65vh] overflow-y-auto px-2 pb-4 scrollbar-hide">
            
            {/* Section 1: Personal Information */}
            <Card className="border-t-4 border-t-[#0066CC] shadow-sm">
              <ShadcnCardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-[#0066CC]" />
                  Personal Information
                </CardTitle>
                <CardDescription>Basic identity and demographic details</CardDescription>
              </ShadcnCardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="fullName" name="fullName" defaultValue={user.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherOrHusbandName">Guardian Name</Label>
                    <Input id="fatherOrHusbandName" name="fatherOrHusbandName" defaultValue={patient.fatherOrHusbandName || ""} placeholder="S/o, D/o, W/o" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
                    <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'yyyy-MM-dd') : ''} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                    <Select name="gender" defaultValue={patient.gender}>
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
                    <Select name="bloodGroup" defaultValue={patient.bloodGroup || ""}>
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
                    <Select name="maritalStatus" defaultValue={patient.maritalStatus || ""}>
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
                    <Input id="occupation" name="occupation" defaultValue={patient.occupation || ""} placeholder="e.g., Teacher, Farmer, Business" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input id="nationality" name="nationality" defaultValue={patient.nationality || "Indian"} placeholder="Indian" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="religion">Religion</Label>
                    <Select name="religion" defaultValue={patient.religion || ""}>
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
                    <Label htmlFor="aadharNumber">ID Number</Label>
                    <Input id="aadharNumber" name="aadharNumber" defaultValue={patient.aadharNumber || ""} placeholder="Aadhaar / Voter ID / Driving License" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referredBy">Referred By</Label>
                    <Input id="referredBy" name="referredBy" defaultValue={patient.referredBy || ""} placeholder="Doctor / Hospital name" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Contact & Address */}
            <Card className="shadow-sm">
              <ShadcnCardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-[#0066CC]" />
                  Contact & Address
                </CardTitle>
              </ShadcnCardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" defaultValue={patient.phone || ""} placeholder="10-digit mobile" maxLength={10} />
                  </div>
                  <div className="space-y-2 md:col-span-1 lg:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={user.email || ""} placeholder="Optional" />
                  </div>
                  
                  {/* Address AutoFill Fields Component */}
                  {/* Since PincodeAutoFill assumes a clean slate, we pass default values or recreate it for edit */}
                  <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="space-y-2 md:col-span-2 lg:col-span-3">
                        <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                        <Input id="address" name="address" defaultValue={patient.address || ""} placeholder="Full street address" required />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input id="pincode" name="pincode" defaultValue={patient.pincode || ""} maxLength={6} placeholder="6-digit pincode" />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="city">City / District</Label>
                        <Input id="city" name="city" defaultValue={patient.city || ""} />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" name="state" defaultValue={patient.state || ""} />
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Emergency Contact */}
            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <ShadcnCardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4 text-red-500" />
                  Emergency Contact
                </CardTitle>
              </ShadcnCardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Contact Name</Label>
                    <Input id="emergencyContactName" name="emergencyContactName" defaultValue={patient.emergencyContactName || ""} placeholder="Name of relative" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Contact Phone</Label>
                    <Input id="emergencyContact" name="emergencyContact" type="tel" defaultValue={patient.emergencyContact || ""} placeholder="10-digit mobile" maxLength={10} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactRelation">Relationship</Label>
                    <Select name="emergencyContactRelation" defaultValue={patient.emergencyContactRelation || ""}>
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

          </div>

          <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
