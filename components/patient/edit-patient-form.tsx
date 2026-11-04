"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { updatePatient } from "@/lib/actions"
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { UserCheck, Loader2, User, Phone, MapPin, Heart, FileText } from "lucide-react"
import Link from "next/link"
import { PincodeAutoFill } from "@/components/patient/pincode-auto-fill"

const patientSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    fatherOrHusbandName: z.string().optional().or(z.literal("")),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    phone: z.string().optional().or(z.literal("")),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    bloodGroup: z.string().optional().or(z.literal("")),
    maritalStatus: z.string().optional().or(z.literal("")),
    occupation: z.string().optional().or(z.literal("")),
    nationality: z.string().optional().or(z.literal("")),
    religion: z.string().optional().or(z.literal("")),
    aadharNumber: z.string().optional().or(z.literal("")),
    referredBy: z.string().optional().or(z.literal("")),
    pincode: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    address: z.string().min(5, "Address must be at least 5 characters"),
    emergencyContactName: z.string().optional().or(z.literal("")),
    emergencyContact: z.string().optional().or(z.literal("")),
    emergencyContactRelation: z.string().optional().or(z.literal("")),
    allergies: z.string().optional().or(z.literal("")),
    currentMedications: z.string().optional().or(z.literal("")),
    medicalHistory: z.string().optional().or(z.literal("")),
})

type PatientFormData = z.infer<typeof patientSchema>

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
                    Updating Patient...
                </>
            ) : (
                <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Update Information
                </>
            )}
        </Button>
    )
}

export function EditPatientForm({ patientData, returnUrl = '/dashboard/clinical/opd' }: { patientData: any, returnUrl?: string }) {
    const [state, formAction] = useActionState(updatePatient, null)

    const defaultDob = patientData.dateOfBirth
        ? new Date(patientData.dateOfBirth).toISOString().split("T")[0]
        : ""

    const defaultEmail = patientData.user?.email && !patientData.user.email.includes("hospital-erp.internal")
        ? patientData.user.email
        : ""

    const {
        register,
        formState: { errors },
        setValue,
        watch,
    } = useForm<PatientFormData>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            fullName: patientData.user?.name || "",
            fatherOrHusbandName: patientData.fatherOrHusbandName || "",
            dateOfBirth: defaultDob,
            gender: patientData.gender || "OTHER",
            phone: patientData.phone || "",
            email: defaultEmail,
            bloodGroup: patientData.bloodGroup || "",
            maritalStatus: patientData.maritalStatus || "SINGLE",
            occupation: patientData.occupation || "",
            nationality: patientData.nationality || "Indian",
            religion: patientData.religion || "",
            aadharNumber: patientData.aadharNumber || "",
            referredBy: patientData.referredBy || "",
            pincode: patientData.pincode || "",
            city: patientData.city || "",
            state: patientData.state || "",
            address: patientData.address || "",
            emergencyContactName: patientData.emergencyContactName || "",
            emergencyContact: patientData.emergencyContact || "",
            emergencyContactRelation: patientData.emergencyContactRelation || "",
            allergies: patientData.allergies || "",
            currentMedications: patientData.currentMedications || "",
            medicalHistory: patientData.medicalHistory || "",
        }
    })

    const formValues = watch()

    const handlePincodeChange = (field: string, value: string) => {
        setValue(field as keyof PatientFormData, value)
    }

    if (state?.success) {
        return (
            <Card className="border-t-4 border-t-green-500 bg-green-50/50">
                <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-green-800 mb-2">Update Successful</h3>
                    <p className="text-green-700 mb-6">{state.message}</p>
                    <div className="flex gap-4 justify-center">
                        <Link href={returnUrl}>
                            <Button variant="outline">Return to OPD Queue</Button>
                        </Link>
                        <Button onClick={() => window.location.reload()}>Edit More</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="patientId" value={patientData.id} />
            <input type="hidden" name="userId" value={patientData.userId} />

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
                            <Input id="fullName" {...register("fullName")} />
                            {errors.fullName && <p className="text-sm text-red-500">{errors.fullName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fatherOrHusbandName">Guardian Name</Label>
                            <Input id="fatherOrHusbandName" {...register("fatherOrHusbandName")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
                            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
                            {errors.dateOfBirth && <p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                            <Select value={formValues.gender} onValueChange={(val) => setValue("gender", val as any)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MALE">Male</SelectItem>
                                    <SelectItem value="FEMALE">Female</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <input type="hidden" name="gender" value={formValues.gender} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bloodGroup">Blood Group</Label>
                            <Select value={formValues.bloodGroup || ""} onValueChange={(val) => setValue("bloodGroup", val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input type="hidden" name="bloodGroup" value={formValues.bloodGroup || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maritalStatus">Marital Status</Label>
                            <Select value={formValues.maritalStatus || ""} onValueChange={(val) => setValue("maritalStatus", val)}>
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
                            <input type="hidden" name="maritalStatus" value={formValues.maritalStatus || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="occupation">Occupation</Label>
                            <Input id="occupation" {...register("occupation")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nationality">Nationality</Label>
                            <Input id="nationality" {...register("nationality")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="religion">Religion</Label>
                            <Select value={formValues.religion || ""} onValueChange={(val) => setValue("religion", val)}>
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
                            <input type="hidden" name="religion" value={formValues.religion || ""} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="aadharNumber">Aadhaar Number</Label>
                            <Input id="aadharNumber" {...register("aadharNumber")} maxLength={12} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="referredBy">Referred By</Label>
                            <Input id="referredBy" {...register("referredBy")} />
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
                            <Input id="phone" {...register("phone")} maxLength={10} placeholder="10-digit mobile (optional)" />
                            {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-1 lg:col-span-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register("email")} />
                            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                        </div>
                        
                        <PincodeAutoFill 
                            values={{
                                pincode: formValues.pincode,
                                city: formValues.city,
                                state: formValues.state,
                                address: formValues.address,
                            }}
                            onChange={handlePincodeChange}
                        />
                        {/* Hidden inputs to ensure react-hook-form managed state is submitted via FormData */}
                        <input type="hidden" name="pincode" value={formValues.pincode || ""} />
                        <input type="hidden" name="city" value={formValues.city || ""} />
                        <input type="hidden" name="state" value={formValues.state || ""} />
                    </div>
                </CardContent>
            </Card>

            {/* Section 3: Emergency Contact */}
            <Card className="border-l-4 border-l-red-500">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Heart className="h-4 w-4 text-red-500" />
                        Emergency Contact
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="emergencyContactName">Contact Name</Label>
                            <Input id="emergencyContactName" {...register("emergencyContactName")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="emergencyContact">Contact Phone</Label>
                            <Input id="emergencyContact" {...register("emergencyContact")} maxLength={10} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="emergencyContactRelation">Relationship</Label>
                            <Select value={formValues.emergencyContactRelation || ""} onValueChange={(val) => setValue("emergencyContactRelation", val)}>
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
                            <input type="hidden" name="emergencyContactRelation" value={formValues.emergencyContactRelation || ""} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 4: Medical Information */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-[#0066CC]" />
                        Medical Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="allergies">Known Allergies</Label>
                            <Textarea id="allergies" {...register("allergies")} rows={2} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currentMedications">Current Medications</Label>
                            <Textarea id="currentMedications" {...register("currentMedications")} rows={2} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="medicalHistory">Past Medical History</Label>
                        <Textarea id="medicalHistory" {...register("medicalHistory")} rows={3} />
                    </div>
                </CardContent>
            </Card>

            <SubmitButton />
        </form>
    )
}
