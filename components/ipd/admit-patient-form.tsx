"use client"

import { useState, useTransition, useRef, useCallback, useEffect } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  User,
  CreditCard,
  Shield,
  Plus,
  Check,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Search,
  UserPlus,
} from "lucide-react"
import { admitPatient } from "@/lib/ipd-actions"
import { getPresignedUrl } from "@/app/actions/upload"
import { toast } from "sonner"
import Link from "next/link"


interface Patient {
  id: string
  patientId: string
  user: {
    name: string | null
  }
  phone: string | null
  gender: string | null
  aadharNumber?: string | null
  bskyNumber?: string | null
  isBsky?: boolean
}

interface Bed {
  id: string
  bedNumber: string
  pricePerDay: number
  ward: {
    name: string
  }
}

interface Doctor {
  id: string
  user: {
    name: string | null
  }
  department: string | null
  specialization: string | null
}

interface AdmitPatientFormProps {
  patients: Patient[]
  beds: Bed[]
  doctors: Doctor[]
  preSelectedBedId?: string
  admittedPatientMap?: Record<string, string> // patientId -> bed info string
}

// File upload state
interface FileUploadState {
  file: File | null
  uploading: boolean
  uploaded: boolean
  url: string | null
  error: string | null
  preview: string | null
}

// Document upload for past reports
interface DocumentUpload {
  id: string
  file: File
  title: string
  uploading: boolean
  uploaded: boolean
  url: string | null
  fileType: string
  error: string | null
}

const initialFileState: FileUploadState = {
  file: null,
  uploading: false,
  uploaded: false,
  url: null,
  error: null,
  preview: null,
}

export function AdmitPatientForm({ patients, beds, doctors, preSelectedBedId, admittedPatientMap = {} }: AdmitPatientFormProps) {

  const [isPending, startTransition] = useTransition()

  // Core admission fields
  const [selectedPatient, setSelectedPatient] = useState("")
  const [patientSearch, setPatientSearch] = useState("")
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false)
  const patientSearchRef = useRef<HTMLDivElement>(null)
  const [selectedBed, setSelectedBed] = useState(preSelectedBedId || "")
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [reason, setReason] = useState("")
  const [initialDeposit, setInitialDeposit] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")

  // Split payment state
  const [splitCash, setSplitCash] = useState("")
  const [splitUpi, setSplitUpi] = useState("")
  const [splitCard, setSplitCard] = useState("")

  // Identity fields
  const [aadharNumber, setAadharNumber] = useState("")
  const [bskyNumber, setBskyNumber] = useState("")
  const [isBskyAdmission, setIsBskyAdmission] = useState(false)
  const [pastMedicalHistory, setPastMedicalHistory] = useState("")

  // File upload states
  const [profilePhoto, setProfilePhoto] = useState<FileUploadState>({ ...initialFileState })
  const [aadharCard, setAadharCard] = useState<FileUploadState>({ ...initialFileState })
  const [bskyCard, setBskyCard] = useState<FileUploadState>({ ...initialFileState })
  const [documents, setDocuments] = useState<DocumentUpload[]>([])

  // Refs for file inputs
  const profilePhotoRef = useRef<HTMLInputElement>(null)
  const aadharCardRef = useRef<HTMLInputElement>(null)
  const bskyCardRef = useRef<HTMLInputElement>(null)
  const documentRef = useRef<HTMLInputElement>(null)

  // Active step for visual flow
  const [activeStep, setActiveStep] = useState(0)

  const selectedBedDetails = beds.find((b) => b.id === selectedBed)

  // Check if selected patient is already admitted
  const isPatientAlreadyAdmitted = selectedPatient ? !!admittedPatientMap[selectedPatient] : false
  const admittedBedInfo = selectedPatient ? admittedPatientMap[selectedPatient] : null

  // Patient search filtering — filters by name, patientId, and phone from the 1st character
  const filteredPatients = patientSearch.trim().length > 0
    ? patients.filter((p) => {
        const q = patientSearch.trim().toLowerCase()
        const name = (p.user.name || "").toLowerCase()
        const pid = p.patientId.toLowerCase()
        const phone = (p.phone || "").toLowerCase()
        return name.includes(q) || pid.includes(q) || phone.includes(q)
      })
    : []

  // Get the display name of the selected patient
  const selectedPatientObj = patients.find((p) => p.id === selectedPatient)
  const selectedPatientLabel = selectedPatientObj
    ? `${selectedPatientObj.user.name} — ${selectedPatientObj.patientId}${selectedPatientObj.phone ? ` | ${selectedPatientObj.phone}` : ""}`
    : ""

  // Close patient search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setIsPatientDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const raw = window.localStorage.getItem("recentInsuranceRegistration")
      if (!raw) return

      const recent = JSON.parse(raw) as {
        patientId?: string
        aadharNumber?: string
        schemeType?: string
        diagnosis?: string
        estimatedCost?: string
        createdAt?: number
      }

      if (!recent?.patientId) return

      const existsInDropdown = patients.some((p) => p.id === recent.patientId)
      if (!existsInDropdown) return

      setSelectedPatient((prev) => prev || recent.patientId || "")
      setReason((prev) => prev || recent.diagnosis || "")

      if (recent.schemeType === "BSKY") {
        setIsBskyAdmission(false)
        setPaymentMethod("CASH")
      } else if (recent.schemeType === "PRIVATE") {
        setPaymentMethod("INSURANCE")
      }

      if (!preSelectedBedId) {
        setActiveStep(0)
      }
    } catch {
      // ignore localStorage parse errors
    }
  }, [patients, preSelectedBedId])

  useEffect(() => {
    const patient = patients.find((p) => p.id === selectedPatient)
    if (!patient) return

    // Auto-fill Aadhaar from Patient Record (formatted for display)
    if (patient.aadharNumber) {
      const formattedAadhar = patient.aadharNumber
        .replace(/\D/g, "")
        .replace(/(\d{4})(?=\d)/g, "$1 ")
        .trim()
      setAadharNumber(formattedAadhar)
    } else {
      setAadharNumber("")
    }

    // Auto-fill BSKY from Patient Record
    setBskyNumber(patient.bskyNumber || "")
    setIsBskyAdmission(patient.isBsky || false)

    // Auto-detect insurance patient from localStorage context if available
    try {
      const raw = window.localStorage.getItem("recentInsuranceRegistration")
      if (raw) {
        const recent = JSON.parse(raw)
        if (recent?.patientId === selectedPatient && recent?.schemeType === "PRIVATE") {
          setPaymentMethod("INSURANCE")
          return
        }
      }
    } catch { /* ignore */ }

    // Default: reset to CASH for non-insurance patients
    if (paymentMethod === "BSKY") {
      setPaymentMethod("CASH")
    }
  }, [selectedPatient, patients])

  // Upload a single file to S3
  const uploadFileToS3 = useCallback(async (
    file: File,
    folder: string,
    setState: React.Dispatch<React.SetStateAction<FileUploadState>>
  ) => {
    setState((prev) => ({ ...prev, uploading: true, error: null }))

    try {
      // Get presigned URL from server
      const { url, publicUrl } = await getPresignedUrl(file.name, file.type, folder)

      let response: Response
      let finalUrl = publicUrl

      if (url.includes("/api/s3-upload")) {
        // Mobile wrappers (Capacitor) can fail on raw PUT arrayBuffers due to chunked encoding.
        // For our local API bypass, we use POST with FormData to ensure stability.
        const formData = new FormData()
        formData.append("file", file)
        response = await fetch(url, {
          method: "POST",
          body: formData,
        })
        if (response.ok) {
           const resData = await response.json()
           if (resData.localUrl) {
              finalUrl = resData.localUrl
           }
        }
      } else {
        // Real S3 presigned URL requires raw PUT
        response = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        })
      }

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`)
      }

      setState((prev) => ({
        ...prev,
        uploading: false,
        uploaded: true,
        url: finalUrl,
      }))

      toast.success(`${file.name} uploaded successfully`)
      return finalUrl
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: errorMessage,
      }))
      toast.error(`Failed to upload ${file.name}`)
      return null
    }
  }, [])

  // Handle file selection for single uploads (profile photo, aadhar, bsky)
  const handleFileSelect = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      folder: string,
      setState: React.Dispatch<React.SetStateAction<FileUploadState>>
    ) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate size
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10 MB")
        return
      }

      // Create preview for images
      let preview: string | null = null
      if (file.type.startsWith("image/")) {
        preview = URL.createObjectURL(file)
      }

      setState({ file, uploading: false, uploaded: false, url: null, error: null, preview })

      // Auto-upload
      await uploadFileToS3(file, folder, setState)
    },
    [uploadFileToS3]
  )

  // Handle document (past reports) file selection
  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10 MB limit`)
        continue
      }

      const docId = crypto.randomUUID()
      const newDoc: DocumentUpload = {
        id: docId,
        file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        uploading: true,
        uploaded: false,
        url: null,
        fileType: file.type,
        error: null,
      }

      setDocuments((prev) => [...prev, newDoc])

      // Upload to S3
      try {
        const { url, publicUrl } = await getPresignedUrl(file.name, file.type, "patient-documents")

        let response: Response
        let finalUrl = publicUrl

        if (url.includes("/api/s3-upload")) {
          // Local upload: POST with FormData
          const fd = new FormData()
          fd.append("file", file)
          response = await fetch(url, { method: "POST", body: fd })
          if (response.ok) {
            const resData = await response.json()
            if (resData.localUrl) finalUrl = resData.localUrl
          }
        } else {
          // Real S3 presigned URL: raw PUT
          response = await fetch(url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          })
        }

        if (!response.ok) throw new Error(`Upload failed: ${response.status}`)

        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId ? { ...d, uploading: false, uploaded: true, url: finalUrl } : d
          )
        )
        toast.success(`${file.name} uploaded`)
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed"
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? { ...d, uploading: false, error: errorMessage }
              : d
          )
        )
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    // Reset the input
    if (documentRef.current) documentRef.current.value = ""
  }

  // Remove a document
  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  // Clear a file upload
  const clearFile = (
    setState: React.Dispatch<React.SetStateAction<FileUploadState>>,
    ref: React.RefObject<HTMLInputElement | null>
  ) => {
    setState({ ...initialFileState })
    if (ref.current) ref.current.value = ""
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPatient || !selectedBed || !selectedDoctor || !reason) {
      toast.error("Please fill in all required fields")
      return
    }

    // Double-check duplicate admission on submit
    if (admittedPatientMap[selectedPatient]) {
      toast.error(`This patient is already admitted in ${admittedPatientMap[selectedPatient]}. Discharge them first.`)
      return
    }

    const depositAmount = parseFloat(initialDeposit) || 0

    // Split payment validation
    if (paymentMethod === "SPLIT" && depositAmount > 0) {
      const splitTotal = (parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0)
      const nonZeroCount = [parseFloat(splitCash) || 0, parseFloat(splitUpi) || 0, parseFloat(splitCard) || 0].filter(v => v > 0).length
      if (nonZeroCount < 2) {
        toast.error("Split payment requires at least two methods with amounts greater than 0.")
        return
      }
      if (Math.abs(splitTotal - depositAmount) > 1) {
        toast.error(`Split total (₹${splitTotal.toFixed(2)}) does not match deposit amount (₹${depositAmount.toFixed(2)}).`)
        return
      }
    }
    if (paymentMethod === "SPLIT" && depositAmount <= 0) {
      toast.error("Enter a deposit amount before choosing split payment.")
      return
    }

    // Check if any files are still uploading
    if (
      profilePhoto.uploading ||
      aadharCard.uploading ||
      bskyCard.uploading ||
      documents.some((d) => d.uploading)
    ) {
      toast.error("Please wait for all file uploads to complete")
      return
    }

    // Validate Aadhar number format (12 digits)
    if (aadharNumber && !/^\d{12}$/.test(aadharNumber.replace(/\s/g, ""))) {
      toast.error("Aadhaar number must be 12 digits")
      return
    }

    if (isBskyAdmission && !bskyNumber.trim()) {
      toast.error("BSKY Card Number is required for BSKY cashless admission")
      return
    }

    startTransition(async () => {
      const result = await admitPatient({
        patientId: selectedPatient,
        bedId: selectedBed,
        primaryDoctorId: selectedDoctor,
        reason,
        initialDeposit: depositAmount,
        paymentMethod,
        isBskyAdmission,
        profilePhotoUrl: profilePhoto.url || undefined,
        aadharNumber: aadharNumber.replace(/\s/g, "") || undefined,
        aadharCardUrl: aadharCard.url || undefined,
        bskyNumber: bskyNumber || undefined,
        bskyCardUrl: bskyCard.url || undefined,
        pastMedicalHistory: pastMedicalHistory || undefined,
        splitPayments: paymentMethod === "SPLIT" ? {
          cash: parseFloat(splitCash) || 0,
          upi: parseFloat(splitUpi) || 0,
          card: parseFloat(splitCard) || 0,
        } : undefined,
        documents: documents
          .filter((d) => d.uploaded && d.url)
          .map((d) => ({
            title: d.title,
            fileUrl: d.url!,
            fileType: d.fileType,
          })),
      })

      if (result.success) {
        const admissionId = result.admissionId

        toast.success("Patient Admitted Successfully", {
          description: `Redirecting to Admission Slip...`,
        })

        // Use window.location.href for a guaranteed hard redirect.
        // router.push() inside startTransition is unreliable in Next.js 15
        // and can silently fail when navigating to a server-rendered print page.
        if (admissionId) {
          window.location.href = `/dashboard/ipd/print/admission-slip/${admissionId}`
        } else {
          // Fallback: go to IPD dashboard if no admissionId somehow
          window.location.href = "/dashboard/ipd"
        }
      } else {
        toast.error(result.message)
      }
    })
  }

  // Steps for visual flow
  const steps = [
    { label: "Patient & Bed", icon: User },
    { label: "Identity & Docs", icon: CreditCard },
    { label: "Medical History", icon: FileText },
    { label: "Payment", icon: Shield },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                activeStep === i ? "bg-blue-600 text-white" :
                activeStep > i ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {activeStep > i ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground font-medium hidden md:block">
          Step {activeStep + 1}: {steps[activeStep].label}
        </div>
      </div>

      {/* Step 0: Patient & Bed Selection */}
      {activeStep === 0 && (
        <Card className="border-t-4 border-blue-600 shadow-sm animate-in fade-in duration-300">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-blue-600" />
              Patient & Bed Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
          {/* Patient Selection — Search Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="patient-search">
                Select Patient <span className="text-red-500">*</span>
              </Label>
              <Link
                href="/dashboard/clinical/opd/register?redirectTo=/dashboard/ipd/admission"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Register New Patient
              </Link>
            </div>

            {/* Selected patient chip */}
            {selectedPatient && selectedPatientObj ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {(selectedPatientObj.user.name || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900 truncate">
                    {selectedPatientObj.user.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    {selectedPatientObj.patientId}
                    {selectedPatientObj.phone && ` • ${selectedPatientObj.phone}`}
                    {selectedPatientObj.gender && ` • ${selectedPatientObj.gender}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient("")
                    setPatientSearch("")
                  }}
                  className="p-1 rounded-full hover:bg-blue-200 transition-colors"
                  title="Clear selection"
                >
                  <X className="h-4 w-4 text-blue-600" />
                </button>
              </div>
            ) : (
              /* Search input with dropdown */
              <div ref={patientSearchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="patient-search"
                    type="text"
                    placeholder="Search by name, patient ID, or phone..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setIsPatientDropdownOpen(true)
                    }}
                    onFocus={() => {
                      if (patientSearch.trim().length > 0) {
                        setIsPatientDropdownOpen(true)
                      }
                    }}
                    className="pl-10 h-11"
                    autoComplete="off"
                  />
                </div>

                {/* Search results dropdown */}
                {isPatientDropdownOpen && patientSearch.trim().length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredPatients.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          No patients found for &quot;{patientSearch}&quot;
                        </p>
                        <Link
                          href="/dashboard/clinical/opd/register?redirectTo=/dashboard/ipd/admission"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <UserPlus className="h-4 w-4" />
                          Register New Patient
                        </Link>
                      </div>
                    ) : (
                      filteredPatients.map((patient) => {
                        const isAdmitted = !!admittedPatientMap[patient.id]
                        return (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(patient.id)
                              setPatientSearch("")
                              setIsPatientDropdownOpen(false)
                            }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                              isAdmitted ? "opacity-60" : ""
                            }`}
                          >
                            <div className="h-9 w-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {(patient.user.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {patient.user.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {patient.patientId}
                                {patient.phone && ` • ${patient.phone}`}
                                {patient.gender && ` • ${patient.gender}`}
                              </p>
                            </div>
                            {isAdmitted && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">
                                Already Admitted
                              </Badge>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Already Admitted Warning */}
          {isPatientAlreadyAdmitted && (
            <Alert className="border-red-400 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>⚠️ Duplicate Admission Blocked:</strong> This patient is already admitted in{" "}
                <strong>{admittedBedInfo}</strong>. A patient cannot occupy multiple beds at the same time.
                Please discharge the patient from their current bed first.
              </AlertDescription>
            </Alert>
          )}

          {/* Bed Selection */}
          <div className="space-y-2">
            <Label htmlFor="bed">
              Select Bed <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedBed} onValueChange={setSelectedBed}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an available bed" />
              </SelectTrigger>
              <SelectContent>
                {beds.map((bed) => (
                  <SelectItem key={bed.id} value={bed.id}>
                    {bed.ward.name} - {bed.bedNumber} (₹{bed.pricePerDay.toFixed(2)}/day)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBedDetails && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Daily Bed Charges:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ₹{selectedBedDetails.pricePerDay.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Primary Doctor */}
          <div className="space-y-2">
            <Label htmlFor="doctor">
              Primary Doctor <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Select treating doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No doctors available</div>
                ) : (
                  doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.user.name} - {doctor.department}
                      {doctor.specialization && ` (${doctor.specialization})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Reason for Admission */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Admission <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Brief description of the patient's condition..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end pt-6 border-t mt-4">
            <Button
              type="button"
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
              onClick={() => setActiveStep(1)}
              disabled={!selectedPatient || !selectedBed || !selectedDoctor || !reason || isPatientAlreadyAdmitted}
            >
              Continue to Identity & Documents
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Identity & Document Uploads */}
      {activeStep === 1 && (
        <Card className="border-t-4 border-indigo-600 shadow-sm animate-in fade-in duration-300">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Identity & Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
          {/* Profile Photo Upload */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                Profile Photo
                <Badge variant="secondary" className="text-xs">
                  Optional
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {/* Preview */}
                {profilePhoto.preview ? (
                  <div className="relative">
                    <img
                      src={profilePhoto.preview}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-blue-200"
                    />
                    {profilePhoto.uploaded && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => clearFile(setProfilePhoto, profilePhotoRef)}
                      className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => profilePhotoRef.current?.click()}
                  >
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={profilePhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "profile-photos", setProfilePhoto)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => profilePhotoRef.current?.click()}
                    disabled={profilePhoto.uploading}
                  >
                    {profilePhoto.uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {profilePhoto.uploaded ? "Change Photo" : "Upload Photo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP. Max 10 MB.</p>
                  {profilePhoto.error && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {profilePhoto.error}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aadhaar Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-orange-600" />
                Aadhaar Card Details
                <Badge variant="secondary" className="text-xs">
                  Optional
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aadharNumber">Aadhaar Number</Label>
                <Input
                  id="aadharNumber"
                  placeholder="XXXX XXXX XXXX"
                  value={aadharNumber}
                  onChange={(e) => {
                    // Format as XXXX XXXX XXXX
                    const val = e.target.value.replace(/\D/g, "").slice(0, 12)
                    const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ")
                    setAadharNumber(formatted)
                  }}
                  maxLength={14}
                />
              </div>

              {/* Aadhaar Card Upload */}
              <div className="space-y-2">
                <Label>Upload Aadhaar Card Scan</Label>
                <div className="flex items-center gap-3">
                  <input
                    ref={aadharCardRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "aadhar-cards", setAadharCard)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => aadharCardRef.current?.click()}
                    disabled={aadharCard.uploading}
                    className="flex-shrink-0"
                  >
                    {aadharCard.uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : aadharCard.uploaded ? (
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {aadharCard.uploaded ? "Uploaded ✓" : "Upload Scan"}
                  </Button>
                  {aadharCard.file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{aadharCard.file.name}</span>
                      <button
                        type="button"
                        onClick={() => clearFile(setAadharCard, aadharCardRef)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {aadharCard.error && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {aadharCard.error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BSKY Details */}
          <Card className={isBskyAdmission ? "border-green-300 bg-green-50/30" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                BSKY (Government Insurance)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* BSKY Admission Checkbox */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="isBskyAdmission"
                  checked={isBskyAdmission}
                  onCheckedChange={(checked) => setIsBskyAdmission(checked === true)}
                />
                <label htmlFor="isBskyAdmission" className="text-sm font-medium leading-none cursor-pointer">
                  BSKY Admission (Cashless)
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    Only prior Lab Tests (Pathology/Radiology) will be refunded. OPD and Pharmacy bills are not eligible.
                  </p>
                </label>
              </div>

              {isBskyAdmission && (
                <Alert className="border-green-300 bg-green-50">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Cashless Admission:</strong> Only prior Lab Tests (Pathology/Radiology) will be refunded. OPD and Pharmacy bills are not eligible for refund. All future IPD charges will be billed to the Government. Advance deposit is not required.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="bskyNumber">
                  BSKY Card Number {isBskyAdmission && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="bskyNumber"
                  placeholder="BSKY card number"
                  value={bskyNumber}
                  onChange={(e) => setBskyNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Biju Swasthya Kalyan Yojana health card number
                </p>
              </div>

              {/* BSKY Card Upload */}
              <div className="space-y-2">
                <Label>Upload BSKY Card Scan</Label>
                <div className="flex items-center gap-3">
                  <input
                    ref={bskyCardRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "bsky-cards", setBskyCard)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bskyCardRef.current?.click()}
                    disabled={bskyCard.uploading}
                    className="flex-shrink-0"
                  >
                    {bskyCard.uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : bskyCard.uploaded ? (
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {bskyCard.uploaded ? "Uploaded ✓" : "Upload Scan"}
                  </Button>
                  {bskyCard.file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{bskyCard.file.name}</span>
                      <button
                        type="button"
                        onClick={() => clearFile(setBskyCard, bskyCardRef)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {bskyCard.error && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {bskyCard.error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-6 border-t mt-4 justify-between">
            <Button type="button" variant="outline" onClick={() => setActiveStep(0)}>
              Back
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setActiveStep(2)}
            >
              Continue to Medical History
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Medical History & Past Reports */}
      {activeStep === 2 && (
        <Card className="border-t-4 border-purple-600 shadow-sm animate-in fade-in duration-300">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-purple-600" />
              Medical History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
          {/* Past Medical History */}
          <div className="space-y-2">
            <Label htmlFor="pastMedicalHistory">
              Past Medical History
              <Badge variant="secondary" className="text-xs ml-2">
                Optional
              </Badge>
            </Label>
            <Textarea
              id="pastMedicalHistory"
              placeholder="Previous surgeries, chronic conditions, ongoing medications, allergies, family history..."
              value={pastMedicalHistory}
              onChange={(e) => setPastMedicalHistory(e.target.value)}
              rows={6}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Include any relevant past diagnoses, surgeries, drug allergies, or chronic conditions.
            </p>
          </div>

          {/* Past Reports Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Upload Past Reports & Documents
                <Badge variant="secondary" className="text-xs">
                  Optional
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 cursor-pointer transition-colors"
                onClick={() => documentRef.current?.click()}
              >
                <input
                  ref={documentRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  multiple
                  onChange={handleDocumentSelect}
                />
                <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">
                  Click to upload past reports
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Blood reports, X-rays, prescriptions, discharge summaries, etc.
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG, WebP, PDF. Max 10 MB per file.
                </p>
              </div>

              {/* Uploaded documents list */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Uploaded Files ({documents.length})
                  </Label>
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                    >
                      {doc.fileType.startsWith("image/") ? (
                        <ImageIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <Input
                          value={doc.title}
                          onChange={(e) =>
                            setDocuments((prev) =>
                              prev.map((d) =>
                                d.id === doc.id ? { ...d, title: e.target.value } : d
                              )
                            )
                          }
                          className="h-7 text-sm"
                          placeholder="Document title..."
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.uploading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                        {doc.uploaded && <Check className="h-4 w-4 text-green-600" />}
                        {doc.error && (
                          <span title={doc.error}><AlertCircle className="h-4 w-4 text-red-500" /></span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-6 border-t mt-4 justify-between">
            <Button type="button" variant="outline" onClick={() => setActiveStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setActiveStep(3)}
            >
              Continue to Payment
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Payment */}
      {activeStep === 3 && (
        <Card className="border-t-4 border-green-500 shadow-sm animate-in fade-in duration-300">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-green-600" />
              Payment & Finalize
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
          {/* Summary Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-900">Admission Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Patient:</div>
                <div className="font-medium">
                  {patients.find((p) => p.id === selectedPatient)?.user.name || "—"}
                </div>
                <div className="text-muted-foreground">Bed:</div>
                <div className="font-medium">
                  {selectedBedDetails
                    ? `${selectedBedDetails.ward.name} - ${selectedBedDetails.bedNumber}`
                    : "—"}
                </div>
                <div className="text-muted-foreground">Doctor:</div>
                <div className="font-medium">
                  {doctors.find((d) => d.id === selectedDoctor)?.user.name || "—"}
                </div>
                {aadharNumber && (
                  <>
                    <div className="text-muted-foreground">Aadhaar:</div>
                    <div className="font-medium">{aadharNumber}</div>
                  </>
                )}
                {bskyNumber && (
                  <>
                    <div className="text-muted-foreground">BSKY:</div>
                    <div className="font-medium">{bskyNumber}</div>
                  </>
                )}
                {isBskyAdmission && (
                  <>
                    <div className="text-muted-foreground">Scheme:</div>
                    <div className="font-medium text-green-700">BSKY Cashless Admission</div>
                  </>
                )}
                <div className="text-muted-foreground">Uploads:</div>
                <div className="font-medium">
                  {[
                    profilePhoto.uploaded && "Photo",
                    aadharCard.uploaded && "Aadhaar",
                    bskyCard.uploaded && "BSKY",
                  ]
                    .filter(Boolean)
                    .join(", ") || "None"}
                  {documents.filter((d) => d.uploaded).length > 0 &&
                    ` + ${documents.filter((d) => d.uploaded).length} document(s)`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Initial Deposit */}
          {isBskyAdmission ? (
            <Alert className="border-amber-200 bg-amber-50">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>BSKY Cashless:</strong> No advance deposit required. The government will cover all charges.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="initialDeposit">
                Advance Deposit (₹) <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="initialDeposit"
                name="initialDeposit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                className="text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                Enter advance deposit if applicable. Insurance patients may skip this. Amount will be adjusted against the final bill.
              </p>
            </div>
          )}

          {/* Payment Method */}
          {!isBskyAdmission && (
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <Select value={paymentMethod} onValueChange={(val) => {
                setPaymentMethod(val)
                if (val !== "SPLIT") {
                  setSplitCash("")
                  setSplitUpi("")
                  setSplitCard("")
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI / QR Code</SelectItem>
                  <SelectItem value="CARD">Card (Debit/Credit)</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                  <SelectItem value="SPLIT">Split Payment (Cash + UPI + Card)</SelectItem>
                  <SelectItem value="INSURANCE">Private Insurance / TPA</SelectItem>
                  <SelectItem value="CREDIT">Credit (Pay Later)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Split Payment Details */}
          {paymentMethod === "SPLIT" && !isBskyAdmission && (
            <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-700">
                Split the deposit across multiple payment methods. Total must equal ₹{(parseFloat(initialDeposit) || 0).toFixed(2)}.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Cash ₹</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">UPI ₹</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Card ₹</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
              {(() => {
                const splitTotal = (parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0)
                const depositAmt = parseFloat(initialDeposit) || 0
                const matched = depositAmt > 0 && Math.abs(splitTotal - depositAmt) <= 1
                return (
                  <p className={`text-xs font-semibold ${matched ? "text-green-600" : "text-red-600"}`}>
                    Split Total: ₹{splitTotal.toFixed(2)} {matched ? "✓ Matched" : depositAmt > 0 ? `≠ ₹${depositAmt.toFixed(2)}` : "— Enter deposit amount above"}
                  </p>
                )
              })()}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t mt-4 justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveStep(2)}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              type="submit"
              className={`${isBskyAdmission ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
              disabled={
                isPending ||
                !selectedPatient ||
                !selectedBed ||
                !selectedDoctor ||
                !reason ||
                profilePhoto.uploading ||
                aadharCard.uploading ||
                bskyCard.uploading ||
                documents.some((d) => d.uploading)
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Admitting...
                </>
              ) : isBskyAdmission ? (
                "Admit Under BSKY (Cashless)"
              ) : initialDeposit && parseFloat(initialDeposit) > 0 ? (
                `Collect ₹${parseFloat(initialDeposit).toFixed(2)} & Admit`
              ) : (
                "Admit Patient"
              )}
            </Button>
          </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
