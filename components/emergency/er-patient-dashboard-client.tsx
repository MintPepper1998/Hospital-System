"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { format, formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  User,
  Activity,
  FileText,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  BedDouble,
  Calendar,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  Clock,
  Plus,
  Loader2,
  Eye,
  Download,
  AlertTriangle,
  Stethoscope,
  BarChart3,
  Pill,
  FlaskConical,
  Syringe,
  FileOutput,
  Utensils
} from "lucide-react"
import { addClinicalNote } from "@/app/actions/clinical"
import { MedicationChart, type SerializedIPDPrescription } from "@/components/ipd/medication-chart"
import { LabOrders, type SerializedIPDLabRequest } from "@/components/ipd/lab-orders"
import { IPDEquipmentTracker } from "@/components/ipd/equipment-tracker"
import { DischargeEditor } from "@/components/ipd/discharge-editor"
import { PatientDietTab } from "@/components/ipd/patient-diet-tab"
import { EditPatientDialog } from "@/components/emergency/edit-patient-dialog"
import { toast } from "sonner"
import Link from "next/link"

// ============================================
// TYPE DEFINITIONS
// ============================================

interface SerializedDocument {
  id: string
  patientId: string
  title: string
  fileUrl: string
  fileType: string
  uploadedAt: string
}

interface SerializedPatient {
  id: string
  patientId: string
  dateOfBirth: string | null
  gender: string | null
  bloodGroup: string | null
  phone: string | null
  emergencyContact: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  medicalHistory: string | null
  allergies: string | null
  profilePhotoUrl: string | null
  aadharNumber: string | null
  aadharCardUrl: string | null
  bskyNumber: string | null
  bskyCardUrl: string | null
  pastMedicalHistory: string | null
  user: { name: string | null; email: string; image: string | null }
  documents: SerializedDocument[]
}

interface SerializedClinicalNote {
  id: string
  emergencyVisitId?: string
  visitId?: string
  authorId: string
  authorName: string | null
  date: string
  note: string
  bp: string | null
  pulse: string | null
  temperature: string | null
  spO2: string | null
  respiratoryRate: string | null
  createdAt: string
  updatedAt: string
}

interface SerializedEmergencyVisit {
  id: string
  patientId: string
  status: string
  arrivalTime: string
  triageLevel: string
  chiefComplaint: string | null
  vitalsRecorded: string | null
  dischargeTime: string | null
  
  // Relations
  patient: SerializedPatient
  assignedDoctor: {
    id: string
    department: string | null
    specialization: string | null
    user: { name: string | null }
  } | null
  bed: {
    id: string
    bedNumber: string
    pricePerDay: number
    status: string
    ward: { id: string; name: string; type: string; floor: string | null }
  } | null
  clinicalNotes: SerializedClinicalNote[]
  ipdPrescriptions: SerializedIPDPrescription[]
  ipdLabRequests: SerializedIPDLabRequest[]
}

interface ERPatientDashboardClientProps {
  visit: SerializedEmergencyVisit
  age: number | null
  daysAdmitted: number
  dietPlans: any[]
  canteenDiets: any[]
  dischargeDraft?: any | null
  activeUserRole?: string
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ERPatientDashboardClient({
  visit,
  age,
  daysAdmitted,
  dietPlans,
  canteenDiets,
  dischargeDraft,
  activeUserRole,
}: ERPatientDashboardClientProps) {
  const patient = visit.patient

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full max-w-5xl h-auto">
        <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
          <span className="sm:hidden">Info</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <FileText className="h-4 w-4" />
          Notes
        </TabsTrigger>
        <TabsTrigger value="medications" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Pill className="h-4 w-4" />
          <span className="hidden sm:inline">Medications</span>
          <span className="sm:hidden">Meds</span>
        </TabsTrigger>
        <TabsTrigger value="investigations" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <FlaskConical className="h-4 w-4" />
          <span className="hidden sm:inline">Investigations</span>
          <span className="sm:hidden">Labs</span>
        </TabsTrigger>
        
        <TabsTrigger value="charts" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <BarChart3 className="h-4 w-4" />
          Vitals
        </TabsTrigger>
        
        <TabsTrigger value="equipment" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Syringe className="h-4 w-4" />
          <span className="hidden sm:inline">Equipment</span>
          <span className="sm:hidden">Equip</span>
        </TabsTrigger>

        <TabsTrigger value="diet" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Utensils className="h-4 w-4" />
          Diet
        </TabsTrigger>

        <TabsTrigger value="summary" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <FileOutput className="h-4 w-4" />
          Summary
        </TabsTrigger>
      </TabsList>

      {/* ============================================ */}
      {/* TAB 1: Overview & Vitals */}
      {/* ============================================ */}
      <TabsContent value="overview" className="space-y-6">
        <OverviewTab visit={visit} patient={patient} age={age} daysAdmitted={daysAdmitted} />
      </TabsContent>

      {/* ============================================ */}
      {/* TAB 2: Clinical Notes */}
      {/* ============================================ */}
      <TabsContent value="notes" className="space-y-6">
        <ClinicalNotesTab visit={visit} />
      </TabsContent>

      {/* ============================================ */}
      {/* TAB 3: Medications */}
      {/* ============================================ */}
      <TabsContent value="medications" className="space-y-6">
        <MedicationChart
          emergencyVisitId={visit.id}
          admissionStatus={visit.status}
          doctorName={visit.assignedDoctor?.user?.name || "Doctor"}
          prescriptions={visit.ipdPrescriptions}
          activeUserRole={activeUserRole}
        />
      </TabsContent>

      {/* ============================================ */}
      {/* TAB 4: Investigations (Lab & Radiology) */}
      {/* ============================================ */}
      <TabsContent value="investigations" className="space-y-6">
        <LabOrders
          emergencyVisitId={visit.id}
          admissionStatus={visit.status}
          doctorName={visit.assignedDoctor?.user?.name || "Doctor"}
          labRequests={visit.ipdLabRequests}
          activeUserRole={activeUserRole}
        />
      </TabsContent>

      {/* ============================================ */}
      {/* TAB 5: Equipment & Supplies */}
      {/* ============================================ */}
      <TabsContent value="equipment" className="space-y-6">
        <IPDEquipmentTracker
          emergencyVisitId={visit.id}
          admissionStatus={visit.status}
        />
      </TabsContent>

      {/* ============================================ */}
      {/* TAB 6: Vital Charts */}
      {/* ============================================ */}
      <TabsContent value="charts" className="space-y-6">
        <VitalChartsTab visit={visit} />
      </TabsContent>

      {/* ============================================ */}
      {/* TAB 7: Diet & Meals */}
      {/* ============================================ */}
      <TabsContent value="diet" className="space-y-6">
        <PatientDietTab
          emergencyVisitId={visit.id}
          admissionStatus={visit.status}
          doctorName={visit.assignedDoctor?.user?.name || "Doctor"}
          dietPlans={dietPlans}
          canteenDiets={canteenDiets}
        />
      </TabsContent>

      {/* ============================================ */}
      {/* TAB 8: Discharge Summary Editor */}
      {/* ============================================ */}
      <TabsContent value="summary" className="space-y-6">
        <DischargeEditor
          emergencyVisitId={visit.id}
          admissionStatus={visit.triageLevel}
          doctorName={visit.assignedDoctor?.user?.name || "Doctor"}
          initialData={dischargeDraft}
          activeMedications={visit.ipdPrescriptions}
        />
      </TabsContent>
    </Tabs>
  )
}

// ============================================
// TAB 1: OVERVIEW & VITALS
// ============================================

function OverviewTab({
  visit,
  patient,
  age,
  daysAdmitted,
}: {
  visit: SerializedEmergencyVisit
  patient: SerializedPatient
  age: number | null
  daysAdmitted: number
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  // Get latest vitals from most recent clinical note
  const latestNote = visit.clinicalNotes[0]

  return (
    <div className="space-y-6">
      {/* Patient Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-blue-100 shadow-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold">
                <span>
                  {(patient.user?.name || "?")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
                {patient.user?.image && (
                  <Image
                    src={patient.user.image}
                    alt={patient.user.name || "Patient"}
                    fill
                    className="object-cover z-10"
                    sizes="112px"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>

            {/* Patient Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-2xl font-bold">{patient.user.name}</h3>
                <p className="text-muted-foreground text-sm">{patient.patientId}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {age !== null && (
                  <Badge variant="outline" className="text-sm">
                    {age} years
                  </Badge>
                )}
                {patient.gender && (
                  <Badge variant="outline" className="text-sm">
                    {patient.gender}
                  </Badge>
                )}
                {patient.bloodGroup && (
                  <Badge variant="secondary" className="text-sm font-bold text-red-600">
                    {patient.bloodGroup}
                  </Badge>
                )}
                {patient.allergies && (
                  <Badge variant="destructive" className="text-sm flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Allergies: {patient.allergies}
                  </Badge>
                )}
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <BedDouble className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Bed:</span>
                  <span className="font-medium">
                    {visit?.bed?.ward?.name} — {visit?.bed?.bedNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Stethoscope className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Doctor:</span>
                  <span className="font-medium">{visit.assignedDoctor?.user?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-muted-foreground">Admitted:</span>
                  <span className="font-medium">
                    {format(new Date(visit.arrivalTime), "dd MMM yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="text-muted-foreground">Day:</span>
                  <span className="font-medium">{daysAdmitted}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Vitals Card */}
      {latestNote && (latestNote.bp || latestNote.pulse || latestNote.temperature || latestNote.spO2) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-500" />
              Latest Vitals
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                {formatDistanceToNow(new Date(latestNote.date), { addSuffix: true })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {latestNote.bp && (
                <VitalCard icon={Heart} label="Blood Pressure" value={latestNote.bp} color="text-red-500" bgColor="bg-red-50" />
              )}
              {latestNote.pulse && (
                <VitalCard icon={Activity} label="Pulse Rate" value={latestNote.pulse} color="text-orange-500" bgColor="bg-orange-50" />
              )}
              {latestNote.temperature && (
                <VitalCard icon={Thermometer} label="Temperature" value={latestNote.temperature} color="text-yellow-600" bgColor="bg-yellow-50" />
              )}
              {latestNote.spO2 && (
                <VitalCard icon={Droplets} label="SpO2" value={latestNote.spO2} color="text-blue-500" bgColor="bg-blue-50" />
              )}
              {latestNote.respiratoryRate && (
                <VitalCard icon={Wind} label="Resp. Rate" value={latestNote.respiratoryRate} color="text-green-500" bgColor="bg-green-50" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout: Patient Details + Visit Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Contact & Identity */}
        <Card>
          <CardHeader className="pb-3 flex flex-row justify-between items-center space-y-0">
            <CardTitle className="text-sm font-medium">Patient Details</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>Edit Details</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <EditPatientDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              patientId={patient.id}
              initialData={patient}
            />
            {patient.phone && (
              <DetailRow icon={Phone} label="Phone" value={patient.phone} />
            )}
            {patient.emergencyContact && (
              <DetailRow icon={Phone} label="Emergency" value={patient.emergencyContact} />
            )}
            {(patient.address || patient.city) && (
              <DetailRow
                icon={MapPin}
                label="Address"
                value={[patient.address, patient.city, patient.state, patient.pincode]
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
            {patient.aadharNumber && (
              <DetailRow icon={CreditCard} label="Aadhaar" value={patient.aadharNumber} />
            )}
            {patient.bskyNumber && (
              <DetailRow icon={Shield} label="BSKY No." value={patient.bskyNumber} />
            )}
          </CardContent>
        </Card>

        {/* Visit Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Visit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visit.chiefComplaint && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Chief Complaint</p>
                <p className="text-sm">{visit.chiefComplaint}</p>
              </div>
            )}

            {patient.pastMedicalHistory && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Past Medical History</p>
                <p className="text-sm whitespace-pre-line">{patient.pastMedicalHistory}</p>
              </div>
            )}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Billing Summary</p>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Bill</p>
                    <p className="font-semibold">₹{0?.toLocaleString("en-IN") || 0}</p>
                  </div>
                  {/* Insurance details hidden for ER */}
                </div>
                
                <div className="bg-muted p-2 rounded-md flex justify-between items-center text-sm">
                  <div>
                    <span className="text-muted-foreground mr-2">Deposit Paid:</span>
                    <span className="font-medium">₹0</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2">Final Balance:</span>
                    <span className={`font-bold ${0 > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{0?.toLocaleString("en-IN") || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {visit.triageLevel !== "DISCHARGED" && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mr-2">Quick Actions</span>
              <Link href={`/dashboard/clinical/emergency/print/visit-forms/${visit.id}`} target="_blank">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Print Bedside Charts
                </Button>
              </Link>
              <Link href={`/dashboard/clinical/emergency/print/summary/${visit.id}`} target="_blank">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Print Discharge Summary
                </Button>
              </Link>
              <Link href={`/dashboard/ipd/discharge/${visit.id}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50">
                  Initiate Discharge
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Gallery */}
      <DocumentsGallery patient={patient} />
    </div>
  )
}

// ============================================
// VITAL CARD COMPONENT
// ============================================

function VitalCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
  bgColor: string
}) {
  return (
    <div className={`${bgColor} rounded-lg p-3 border`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}

// ============================================
// DETAIL ROW COMPONENT
// ============================================

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}

// ============================================
// DOCUMENTS GALLERY
// ============================================

function DocumentsGallery({ patient }: { patient: SerializedPatient }) {
  const allDocuments: { title: string; url: string; type: string; source: string }[] = []

  // Add identity documents
  if (patient.aadharCardUrl) {
    allDocuments.push({
      title: "Aadhaar Card",
      url: patient.aadharCardUrl,
      type: patient.aadharCardUrl.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      source: "identity",
    })
  }
  if (patient.bskyCardUrl) {
    allDocuments.push({
      title: "BSKY Card",
      url: patient.bskyCardUrl,
      type: patient.bskyCardUrl.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      source: "identity",
    })
  }

  // Add uploaded documents
  patient.documents.forEach((doc) => {
    allDocuments.push({
      title: doc.title,
      url: doc.fileUrl,
      type: doc.fileType,
      source: "upload",
    })
  })

  if (allDocuments.length === 0 && !patient.profilePhotoUrl) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-500" />
          Documents & Photos
          <Badge variant="secondary" className="text-xs ml-auto">
            {allDocuments.length} file(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {allDocuments.map((doc, index) => (
            <DocumentCard key={index} title={doc.title} url={doc.url} type={doc.type} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// DOCUMENT CARD
// ============================================

function DocumentCard({
  title,
  url,
  type,
}: {
  title: string
  url: string
  type: string
}) {
  const isPdf = type === "application/pdf" || url.toLowerCase().endsWith(".pdf")

  return (
    <div className="group border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Preview Area */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {isPdf ? (
          <div className="flex flex-col items-center justify-center h-full bg-red-50">
            <FileText className="h-10 w-10 text-red-500 mb-2" />
            <span className="text-xs text-red-600 font-medium">PDF Document</span>
          </div>
        ) : (
          <Image
            src={url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="secondary" className="h-8">
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </a>
          <a href={url} download>
            <Button size="sm" variant="secondary" className="h-8">
              <Download className="h-3 w-3 mr-1" />
            </Button>
          </a>
        </div>
      </div>

      {/* Title */}
      <div className="p-2">
        <p className="text-xs font-medium truncate">{title}</p>
      </div>
    </div>
  )
}

// ============================================
// TAB 2: CLINICAL NOTES
// ============================================

function ClinicalNotesTab({ visit }: { visit: SerializedEmergencyVisit }) {
  const [notes, setNotes] = useState(visit.clinicalNotes)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [noteText, setNoteText] = useState("")
  const [bp, setBp] = useState("")
  const [pulse, setPulse] = useState("")
  const [temperature, setTemperature] = useState("")
  const [spO2, setSpO2] = useState("")
  const [respiratoryRate, setRespiratoryRate] = useState("")

  const handleAddNote = () => {
    if (!noteText.trim()) {
      toast.error("Please enter a note")
      return
    }

    startTransition(async () => {
      try {
        const result = await addClinicalNote({
          emergencyVisitId: visit.id,
          authorId: "current-user", // TODO: Replace with actual auth user ID
          authorName: visit.assignedDoctor?.user?.name || "Doctor",
          note: noteText,
          bp: bp || undefined,
          pulse: pulse || undefined,
          temperature: temperature || undefined,
          spO2: spO2 || undefined,
          respiratoryRate: respiratoryRate || undefined,
        })

        if (result.success) {
          toast.success("Clinical note added")

          // Add to local state for instant feedback
          const newNote: SerializedClinicalNote = {
            id: result.noteId,
            emergencyVisitId: visit.id,
            authorId: "current-user",
            authorName: visit.assignedDoctor?.user?.name || "Doctor",
            date: new Date().toISOString(),
            note: noteText,
            bp: bp || null,
            pulse: pulse || null,
            temperature: temperature || null,
            spO2: spO2 || null,
            respiratoryRate: respiratoryRate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          setNotes((prev) => [newNote, ...prev])

          // Clear form
          setNoteText("")
          setBp("")
          setPulse("")
          setTemperature("")
          setSpO2("")
          setRespiratoryRate("")
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to add note")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Add Note Form */}
      {visit.triageLevel !== "DISCHARGED" && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" />
              Add Clinical Note
            </CardTitle>
            <CardDescription>Daily progress note with vitals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="noteText">Clinical Note *</Label>
              <Textarea
                id="noteText"
                placeholder="Patient condition, observations, orders, plan..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
                className="bg-white"
              />
            </div>

            {/* Vitals Grid */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Vitals (Optional)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="bp" className="text-xs flex items-center gap-1">
                    <Heart className="h-3 w-3 text-red-500" /> BP
                  </Label>
                  <Input
                    id="bp"
                    placeholder="120/80"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="bg-white h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pulse" className="text-xs flex items-center gap-1">
                    <Activity className="h-3 w-3 text-orange-500" /> Pulse
                  </Label>
                  <Input
                    id="pulse"
                    placeholder="72 bpm"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="bg-white h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="temp" className="text-xs flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-yellow-600" /> Temp
                  </Label>
                  <Input
                    id="temp"
                    placeholder="98.6°F"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="bg-white h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="spo2" className="text-xs flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-blue-500" /> SpO2
                  </Label>
                  <Input
                    id="spo2"
                    placeholder="98%"
                    value={spO2}
                    onChange={(e) => setSpO2(e.target.value)}
                    className="bg-white h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rr" className="text-xs flex items-center gap-1">
                    <Wind className="h-3 w-3 text-green-500" /> Resp Rate
                  </Label>
                  <Input
                    id="rr"
                    placeholder="18/min"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    className="bg-white h-9"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleAddNote}
              disabled={isPending || !noteText.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-500" />
            Clinical Notes Timeline
            <Badge variant="secondary" className="text-xs ml-auto">
              {notes.length} note(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No clinical notes yet</p>
              <p className="text-sm">Add the first clinical note above.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

              <div className="space-y-6">
                {notes.map((note, index) => (
                  <div key={note.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white shadow ${
                        index === 0 ? "bg-blue-500" : "bg-gray-400"
                      }`}
                    />

                    <div className="bg-gray-50 rounded-lg border p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-sm">
                            Vital Report
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.date), "dd MMM yyyy, hh:mm a")}
                        </span>
                      </div>

                      {/* Note content */}
                      <p className="text-sm whitespace-pre-line">{note.note}</p>

                      {/* Vitals (if present) */}
                      {(note.bp || note.pulse || note.temperature || note.spO2 || note.respiratoryRate) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          {note.bp && (
                            <Badge variant="outline" className="text-xs">
                              <Heart className="h-3 w-3 text-red-500 mr-1" />
                              BP: {note.bp}
                            </Badge>
                          )}
                          {note.pulse && (
                            <Badge variant="outline" className="text-xs">
                              <Activity className="h-3 w-3 text-orange-500 mr-1" />
                              Pulse: {note.pulse}
                            </Badge>
                          )}
                          {note.temperature && (
                            <Badge variant="outline" className="text-xs">
                              <Thermometer className="h-3 w-3 text-yellow-600 mr-1" />
                              Temp: {note.temperature}
                            </Badge>
                          )}
                          {note.spO2 && (
                            <Badge variant="outline" className="text-xs">
                              <Droplets className="h-3 w-3 text-blue-500 mr-1" />
                              SpO2: {note.spO2}
                            </Badge>
                          )}
                          {note.respiratoryRate && (
                            <Badge variant="outline" className="text-xs">
                              <Wind className="h-3 w-3 text-green-500 mr-1" />
                              RR: {note.respiratoryRate}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// TAB 3: VITAL CHARTS (Placeholder)
// ============================================

function VitalChartsTab({ visit }: { visit: SerializedEmergencyVisit }) {
  const hasVitals = visit.clinicalNotes.some(
    (n) => n.bp || n.pulse || n.temperature || n.spO2 || n.respiratoryRate
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Vital Signs Trend
        </CardTitle>
        <CardDescription>
          Visual trends of patient vitals over the visit period
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasVitals ? (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-lg">No Vital Data Available</p>
            <p className="text-sm mt-2">
              Vital charts will appear here once clinical notes with vitals are recorded.
            </p>
            <p className="text-xs mt-4 max-w-md mx-auto">
              Add vitals (BP, Pulse, Temperature, SpO2, Respiratory Rate) while adding clinical
              notes in the &quot;Clinical Notes&quot; tab.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary of recorded vitals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Vitals Data Summary</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Total Recordings:</span>{" "}
                    <span className="font-medium">
                      {visit.clinicalNotes.filter(
                        (n) => n.bp || n.pulse || n.temperature || n.spO2
                      ).length}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Date Range:</span>{" "}
                    <span className="font-medium">
                      {visit.clinicalNotes.length > 0
                        ? `${format(
                            new Date(visit.clinicalNotes[visit.clinicalNotes.length - 1].date),
                            "dd MMM"
                          )} — ${format(new Date(visit.clinicalNotes[0].date), "dd MMM yyyy")}`
                        : "—"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-2">Coming Soon</p>
                <p className="text-sm text-amber-800">
                  Interactive line charts for BP, Pulse, Temperature, and SpO2 trends will be
                  available in the next update. Data is being collected.
                </p>
              </div>
            </div>

            {/* Vitals Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">BP</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Pulse</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Temp</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">SpO2</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">RR</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.clinicalNotes
                    .filter((n) => n.bp || n.pulse || n.temperature || n.spO2 || n.respiratoryRate)
                    .map((note) => (
                      <tr key={note.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 text-xs">
                          {format(new Date(note.date), "dd MMM, HH:mm")}
                        </td>
                        <td className="py-2 px-3">{note.bp || "—"}</td>
                        <td className="py-2 px-3">{note.pulse || "—"}</td>
                        <td className="py-2 px-3">{note.temperature || "—"}</td>
                        <td className="py-2 px-3">{note.spO2 || "—"}</td>
                        <td className="py-2 px-3">{note.respiratoryRate || "—"}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {note.authorName || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
