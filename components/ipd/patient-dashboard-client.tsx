"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { 
  User, FileText, Pill, FlaskConical, Monitor, Activity, 
  FileSpreadsheet, UtensilsCrossed, ArrowRight, Phone, Mail, 
  MapPin, Shield, BedDouble, FileBadge2, Calendar, DollarSign, History, ChevronDown, X, Printer, Camera
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { MedicationChart } from "./medication-chart"
import { LabOrders } from "./lab-orders"
import { IPDEquipmentTracker } from "./equipment-tracker"
import { PatientDietTab } from "./patient-diet-tab"
import { DischargeEditor } from "./discharge-editor"
import { EditPatientProfileDialog } from "./edit-patient-profile-dialog"
import { AssignDoctorDialog } from "./assign-doctor-dialog"
import { ProfilePhotoCropper } from "./profile-photo-cropper"
import { TransferBedDialog } from "./transfer-bed-dialog"
import { CardShell } from "./card-shell"
import { ClinicalNotesTab } from "./clinical-notes-tab"
import { VitalsTab } from "./vitals-tab"
import { OperationsTab } from "./operations-tab"
import { Scissors } from "lucide-react"
import { getPresignedUrl } from "@/app/actions/upload"
import { addPatientDocument, deletePatientDocument } from "@/app/actions/patients"
import { Loader2, Plus, Trash2 } from "lucide-react"

const InfoGrid = ({ items }: { items: { label: string, value: React.ReactNode }[] }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
    {items.map((item, i) => (
      <div key={i} className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">{item.label}</span>
        <span className="text-sm font-medium text-slate-800">{item.value || '-'}</span>
      </div>
    ))}
  </div>
)

export function PatientDashboardClient({
  admission,
  age,
  daysAdmitted,
  dietPlans,
  availableDoctors,
  dischargeTypes = [],
  assignedDoctors = [],
  ipdSignatories = [],
}: {
  admission: any
  age: number | null
  daysAdmitted: number
  dietPlans: any[]
  availableDoctors: any[]
  dischargeTypes: any[]
  assignedDoctors?: any[]
  ipdSignatories?: any[]
}) {
  const [activeTab, setActiveTab] = useState("Overview")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get("tab")
      if (tabParam) {
        const found = tabs.find(t => t.id.toLowerCase() === tabParam.toLowerCase())
        if (found) setActiveTab(found.id)
      }
    }
  }, [])

  const tabs = [
    { id: "Overview", icon: User },
    { id: "Notes", icon: FileText },
    { id: "Operations", icon: Scissors },
    { id: "Medications", icon: Pill },
    { id: "Investigations", icon: FlaskConical },
    { id: "Equipment", icon: Monitor },
    { id: "Vitals", icon: Activity },
    { id: "Summary", icon: FileSpreadsheet },
    { id: "Diet & Meals", icon: UtensilsCrossed },
  ]

  const patient = admission.patient
  const user = patient.user

  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [assignDoctorOpen, setAssignDoctorOpen] = useState(false)
  const [photoCropperOpen, setPhotoCropperOpen] = useState(false)
  const [transferBedOpen, setTransferBedOpen] = useState(false)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(patient.profilePhotoUrl)
  
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const docFileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDeleteDoc = async (docId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return
    setDeletingDocId(docId)
    try {
      const res = await deletePatientDocument(docId)
      if (!res.success) throw new Error(res.message)
    } catch (error) {
      console.error("Document delete error:", error)
      alert("Failed to delete document")
    } finally {
      setDeletingDocId(null)
    }
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingDoc(true)
    try {
      const { url, publicUrl } = await getPresignedUrl(file.name, file.type, "patient-documents")

      let response: Response
      if (url.includes("/api/s3-upload")) {
        const formData = new FormData()
        formData.append("file", file)
        response = await fetch(url, { method: "POST", body: formData })
      } else {
        response = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        })
      }

      if (response.ok) {
        let finalUrl = publicUrl
        if (url.includes("/api/s3-upload")) {
          const resData = await response.json()
          if (resData.localUrl) finalUrl = resData.localUrl
        }
        
        // Add to database
        const res = await addPatientDocument(patient.id, file.name, finalUrl, file.type)
        if (!res.success) throw new Error(res.message)
      } else {
        throw new Error("Failed to upload to storage")
      }
    } catch (error) {
      console.error("Document upload error:", error)
      alert("Failed to upload document")
    } finally {
      setIsUploadingDoc(false)
      if (docFileInputRef.current) docFileInputRef.current.value = ""
    }
  }
  
  const allDoctors = [...(admission.doctors || [])];
  if (admission.primaryDoctor) {
    const isPrimaryAlreadyAdded = allDoctors.some((d: any) => d.doctor?.id === admission.primaryDoctor.id);
    if (!isPrimaryAlreadyAdded) {
      allDoctors.unshift({
        id: 'primary',
        doctor: admission.primaryDoctor,
        doctorId: admission.primaryDoctor.id,
        role: 'TREATING',
        isFallback: true
      });
    }
  }
  
  const estimatedAdvance = Math.max(0, (admission.totalBillAmount || 0) - (admission.balanceDue || 0));

  return (
    <div className="min-h-[100dvh] pb-24 w-full animate-in fade-in slide-in-from-bottom-8 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      
      {/* HERO SECTION */}
      <div className="p-1 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] mb-6 relative z-10">
        <div className="bg-[#12316e] text-white rounded-[calc(2.5rem-0.25rem)] p-4 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent mix-blend-overlay"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 w-full">
              
              {/* Patient Avatar with Hover Camera */}
              <div 
                onClick={() => setPhotoCropperOpen(true)}
                className="w-16 h-16 rounded-full bg-white/5 border border-white/10 p-1 flex-shrink-0 relative group cursor-pointer"
              >
                 {currentPhotoUrl ? (
                   <img src={currentPhotoUrl} alt="Patient" className="w-full h-full rounded-full object-cover group-hover:opacity-60 transition-opacity" />
                 ) : (
                   <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center group-hover:opacity-60 transition-opacity">
                     <User className="w-8 h-8 text-white/50 stroke-[1.5]" />
                   </div>
                 )}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Camera className="w-6 h-6 text-white" />
                 </div>
              </div>
              
              <div className="space-y-1 text-center sm:text-left flex-1 w-full pt-1">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-white">{user.name}</h1>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.1em] uppercase ${
                    admission.status === 'ADMITTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                    admission.status === 'DISCHARGED' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' : 
                    'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  }`}>
                    {admission.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 uppercase tracking-wider font-semibold">UHID:</span>
                    <span className="font-semibold text-white">{patient.patientId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 uppercase tracking-wider font-semibold">Age:</span>
                    <span className="font-semibold text-white">{age || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 uppercase tracking-wider font-semibold">Gender:</span>
                    <span className="font-semibold text-white uppercase">{patient.gender}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 uppercase tracking-wider font-semibold">Blood:</span>
                    <span className="font-semibold text-white">{patient.bloodGroup || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 uppercase tracking-wider font-semibold">Day:</span>
                    <span className="font-semibold text-white">{daysAdmitted}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-row items-center justify-end w-full lg:w-auto gap-4">
              <Link href={`/dashboard/ipd/print/admission-slip/${admission.id}`} className="group relative flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white pl-6 pr-2 py-2 rounded-full text-xs font-semibold tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
                <span>Admission Form</span>
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <Printer className="w-3.5 h-3.5 text-white" />
                </div>
              </Link>
              <Link href={`/dashboard/ipd/print/discharge-slip/${admission.id}`} className="group relative flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white pl-6 pr-2 py-2 rounded-full text-xs font-semibold tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
                <span>Discharge Form</span>
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <Printer className="w-3.5 h-3.5 text-white" />
                </div>
              </Link>
              <Link href={`/dashboard/ipd/print/admission-forms/${admission.id}`} className="group relative flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white pl-6 pr-2 py-2 rounded-full text-xs font-semibold tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
                <span>Forms</span>
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex-shrink-0 ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
            {tab.id}
          </button>
        ))}
      </div>

      {/* CONTENT - OVERVIEW */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-700">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">
            
            <CardShell title="Patient Profile" icon={User} action={<EditPatientProfileDialog patient={patient} user={user} />}>
              <InfoGrid items={[
                { label: "UHID", value: patient.patientId },
                { label: "Date of Birth", value: patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd MMM yyyy") : '-' },
                { label: "Age / Gender", value: `${age || '-'} Yrs / ${patient.gender}` },
                { label: "Blood Group", value: <span className="text-red-500 font-bold">{patient.bloodGroup || '-'}</span> },
                { label: "Marital Status", value: patient.maritalStatus || 'SINGLE' },
                { label: "Guardian", value: patient.fatherOrHusbandName || '-' },
                { label: "Occupation", value: patient.occupation || '-' },
                { label: "Nationality", value: patient.nationality || 'Indian' },
                { label: "Religion", value: patient.religion || '-' },
                { label: "Pay Type", value: "Self Pay" }, 
                { label: "Referred By", value: patient.referredBy || "Self" },
                { label: "Registered On", value: format(new Date(patient.createdAt), "dd MMM yyyy") },
              ]} />
            </CardShell>

            <CardShell title="Admission Details" icon={Calendar}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">Admission Date</span>
                    <span className="text-sm font-semibold text-slate-800">{format(new Date(admission.admissionDate), "dd MMM yyyy, hh:mm a")}</span>
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">Current Status</span>
                    <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">{admission.status}</span>
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">Days of Stay</span>
                    <span className="text-sm font-semibold text-orange-500">{daysAdmitted} Days</span>
                 </div>
              </div>
            </CardShell>

            <CardShell title="Contact Details" icon={Phone}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div className="flex flex-col gap-1.5">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                     <Phone className="w-3 h-3 stroke-[2.5]" /> Phone
                   </div>
                   <span className="text-sm font-semibold text-slate-800">{patient.phone || '-'}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                     <Mail className="w-3 h-3 stroke-[2.5]" /> Email
                   </div>
                   <span className="text-sm font-semibold text-slate-800">{user.email || '-'}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                   <div className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">Emergency Contact</div>
                   <span className="text-sm font-semibold text-slate-800">{patient.emergencyContactName || '-'}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                     <Phone className="w-3 h-3 stroke-[2.5]" /> Emergency Phone
                   </div>
                   <span className="text-sm font-semibold text-slate-800">{patient.emergencyContact || '-'}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 border-t border-slate-100/60 pt-6">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                    <MapPin className="w-3 h-3 stroke-[2.5]" /> Full Address
                 </div>
                 <span className="text-sm font-semibold text-slate-800 leading-relaxed max-w-xl">
                   {[patient.address, patient.city, patient.state, patient.pincode].filter(Boolean).join(", ") || '-'}
                 </span>
              </div>
            </CardShell>

            <CardShell title="Accommodation Details" icon={BedDouble}>
              <InfoGrid items={[
                { label: "Ward", value: admission.bed?.ward?.name || '-' },
                { label: "Floor", value: admission.bed?.ward?.floor || '-' },
                { label: "Bed Number", value: <span className="text-blue-600 font-bold">{admission.bed?.bedNumber || '-'}</span> },
                { label: "Ward Type", value: admission.bed?.ward?.type || '-' },
                { label: "Bed Rate", value: admission.bed?.pricePerDay ? `₹${admission.bed.pricePerDay.toLocaleString()}/day` : '-' },
                { label: "Total Bed Charges", value: admission.billBreakdown ? <span className="text-orange-500 font-bold">₹{admission.billBreakdown.roomRent.toLocaleString('en-IN')}</span> : '-' },
              ]} />
            </CardShell>

            <CardShell title="Diagnosis & Treatment" icon={Activity}>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                   <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">Reason for Admission</span>
                   <span className="text-sm font-semibold text-slate-800">{admission.reason || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                   <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">Past Medical History</span>
                   <span className="text-sm font-semibold text-slate-800">{patient.pastMedicalHistory || patient.medicalHistory || 'None'}</span>
                </div>
              </div>
            </CardShell>

            <CardShell title="Documents & Photos" icon={FileBadge2} action={
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-bold tracking-wide">
                  {((patient.documents?.length || 0) + (patient.profilePhotoUrl ? 1 : 0) + (patient.aadharCardUrl ? 1 : 0) + (patient.bskyCardUrl ? 1 : 0))} File(s)
                </span>
                <input 
                  type="file" 
                  ref={docFileInputRef} 
                  className="hidden" 
                  onChange={handleDocUpload}
                />
                <button 
                  onClick={() => docFileInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[11px] font-bold tracking-wide hover:bg-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isUploadingDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add Document
                </button>
              </div>
            }>
               {patient.documents?.length > 0 || patient.profilePhotoUrl || patient.aadharCardUrl || patient.bskyCardUrl ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                   {patient.profilePhotoUrl && (
                     <a href={patient.profilePhotoUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                       <User className="w-6 h-6 text-slate-400 mb-2" />
                       <span className="text-[10px] font-bold text-slate-600 text-center uppercase">Profile Photo</span>
                     </a>
                   )}
                   {patient.aadharCardUrl && (
                     <a href={patient.aadharCardUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                       <FileBadge2 className="w-6 h-6 text-slate-400 mb-2" />
                       <span className="text-[10px] font-bold text-slate-600 text-center uppercase">Aadhar Card</span>
                     </a>
                   )}
                   {patient.bskyCardUrl && (
                     <a href={patient.bskyCardUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                       <Shield className="w-6 h-6 text-slate-400 mb-2" />
                       <span className="text-[10px] font-bold text-slate-600 text-center uppercase">BSKY Card</span>
                     </a>
                   )}
                   {patient.documents?.map((doc: any) => (
                     <div key={doc.id} className="relative group flex flex-col items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                       <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center w-full h-full">
                         <FileText className="w-6 h-6 text-slate-400 mb-2" />
                         <span className="text-[10px] font-bold text-slate-600 text-center uppercase truncate w-full px-1" title={doc.title || doc.name}>{doc.title || doc.name || 'Document'}</span>
                       </a>
                       <button
                         onClick={() => handleDeleteDoc(doc.id, doc.title || doc.name || 'Document')}
                         disabled={deletingDocId === doc.id}
                         className="absolute top-1 right-1 p-1 bg-white border border-slate-200 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 disabled:opacity-50"
                         title="Delete Document"
                       >
                         {deletingDocId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                       </button>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="py-6 flex flex-col items-center justify-center text-slate-400 text-sm">
                   <FileBadge2 className="w-8 h-8 mb-2 opacity-20" />
                   No documents uploaded
                 </div>
               )}
            </CardShell>

          </div>
          
          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-6">
            
            <CardShell title="Doctor Details" icon={User} action={
               <AssignDoctorDialog admissionId={admission.id} availableDoctors={availableDoctors} />
            }>
              <div className="space-y-4">
                {allDoctors.map((docAssignment: any, idx: number) => (
                  <div key={docAssignment.id || idx} className="flex items-start gap-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50 group relative">
                    <div className={`w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-lg ${docAssignment.role === 'TREATING' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-500 shadow-blue-500/20'}`}>
                      {docAssignment.doctor?.user?.name?.charAt(0) || 'D'}
                    </div>
                    <div className="flex flex-col gap-1 pt-0.5 flex-1">
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight">{docAssignment.doctor?.user?.name || 'Unassigned'}</h4>
                      <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">{docAssignment.doctor?.specialization || 'Doctor'}</span>
                      <div className="mt-2 inline-flex">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold tracking-wider uppercase ${docAssignment.role === 'TREATING' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                          {docAssignment.role || 'TREATING'} DOCTOR
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        const { removeIpdDoctor } = await import('@/lib/actions/ipd-doctors')
                        const { toast } = await import('sonner')
                        const res = await removeIpdDoctor(docAssignment.id, admission.id)
                        if (res.success) toast.success("Doctor removed")
                        else toast.error(res.error)
                      }}
                      className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-all"
                      title="Remove Doctor"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {allDoctors.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-sm">No doctors assigned.</div>
                )}
              </div>
            </CardShell>

            <CardShell title="Insurance / Sponsor" icon={Shield}>
              {admission.hasInsuranceCoverage || admission.isBskyAdmission || patient.isBsky ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="w-10 h-10 text-emerald-500 mb-3 stroke-[1.5]" />
                  <span className="text-sm font-semibold text-slate-800">
                    {admission.isBskyAdmission || patient.isBsky ? "BSKY Scheme" : "Insurance Linked"}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    {patient.bskyNumber ? `BSKY No: ${patient.bskyNumber}` : "Coverage applied to billing"}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="w-10 h-10 text-slate-300 stroke-[1.5] mb-3" />
                  <span className="text-sm font-semibold text-slate-600">Self Pay</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[200px]">No insurance or government scheme linked</span>
                </div>
              )}
            </CardShell>

            <CardShell title="Latest Vitals" icon={Activity}>
               {(() => {
                 const latestNoteWithVitals = admission.clinicalNotes?.find((n: any) => n.vitals);
                 const vitals = latestNoteWithVitals?.vitals;
                 if (vitals) {
                   return (
                     <div className="grid grid-cols-2 gap-4 py-2">
                       {vitals.bp && (
                         <div className="flex flex-col p-3 bg-red-50/50 rounded-xl">
                           <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Blood Pressure</span>
                           <span className="text-sm font-bold text-red-700">{vitals.bp}</span>
                         </div>
                       )}
                       {vitals.heartRate && (
                         <div className="flex flex-col p-3 bg-orange-50/50 rounded-xl">
                           <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Heart Rate</span>
                           <span className="text-sm font-bold text-orange-700">{vitals.heartRate} bpm</span>
                         </div>
                       )}
                       {vitals.temperature && (
                         <div className="flex flex-col p-3 bg-amber-50/50 rounded-xl">
                           <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Temperature</span>
                           <span className="text-sm font-bold text-amber-700">{vitals.temperature} °F</span>
                         </div>
                       )}
                       {vitals.spo2 && (
                         <div className="flex flex-col p-3 bg-blue-50/50 rounded-xl">
                           <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">SpO2</span>
                           <span className="text-sm font-bold text-blue-700">{vitals.spo2} %</span>
                         </div>
                       )}
                     </div>
                   );
                 }
                 return (
                   <div className="flex flex-col items-center justify-center py-10 text-center">
                     <Activity className="w-10 h-10 text-slate-200 stroke-[1.5] mb-3" />
                     <span className="text-sm font-semibold text-slate-500">No vitals recorded yet</span>
                   </div>
                 );
               })()}
            </CardShell>

             <CardShell title="Payment Information" icon={DollarSign}>
                <div className="space-y-3 pt-2">
                  {admission.billBreakdown ? (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Room / Bed Charges</span>
                        <span className="font-semibold text-slate-700">₹{admission.billBreakdown.roomRent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {admission.billBreakdown.pharmacyTotal > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Pharmacy</span>
                          <span className="font-semibold text-slate-700">₹{admission.billBreakdown.pharmacyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {admission.billBreakdown.labTotal > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Laboratory</span>
                          <span className="font-semibold text-slate-700">₹{admission.billBreakdown.labTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {admission.billBreakdown.surgeryTotal > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Surgery & OT</span>
                          <span className="font-semibold text-slate-700">₹{admission.billBreakdown.surgeryTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {admission.billBreakdown.nursingTotal > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Nursing</span>
                          <span className="font-semibold text-slate-700">₹{admission.billBreakdown.nursingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {admission.billBreakdown.equipmentTotal > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Equipment</span>
                          <span className="font-semibold text-slate-700">₹{admission.billBreakdown.equipmentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {admission.billBreakdown.doctorFees > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Doctor Fees</span>
                          <span className="font-semibold text-slate-700">₹{admission.billBreakdown.doctorFees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {admission.billBreakdown.canteenTotal > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Diet / Canteen</span>
                          <span className="font-semibold text-slate-700">₹{admission.billBreakdown.canteenTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {admission.billBreakdown.otherCharges > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Other Charges</span>
                          <span className="font-semibold text-slate-700">₹{admission.billBreakdown.otherCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {admission.billBreakdown.discountAmount > 0 && (
                        <div className="flex justify-between items-center text-sm text-emerald-600">
                          <span className="font-medium">Discount Applied</span>
                          <span className="font-semibold">-₹{admission.billBreakdown.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Bed Charges</span>
                      <span className="font-semibold text-slate-700">₹{admission.billBreakdown?.roomRent ? admission.billBreakdown.roomRent.toLocaleString('en-IN') : '0'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm pt-4 border-t border-slate-100/60">
                    <span className="font-bold text-slate-800">Total Liability</span>
                    <span className="font-bold text-slate-800">₹{admission.patientLiability ? admission.patientLiability.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : (admission.totalBillAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-500 font-medium">Paid / Advance</span>
                    <span className="text-emerald-500 font-semibold">-₹{admission.billBreakdown ? admission.billBreakdown.amountPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : estimatedAdvance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-base pt-4 border-t border-slate-100/60">
                    <span className="font-bold text-red-500">Balance Due</span>
                    <span className="font-bold text-red-500">
                      ₹{admission.balanceDue?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'}
                    </span>
                  </div>
                </div>
             </CardShell>

            <CardShell title="Bed Transfer History" icon={History} action={
               <button onClick={() => setTransferBedOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100/50 rounded-full text-[11px] font-bold tracking-wide transition-colors">
                 <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                 Transfer Bed
               </button>
            }>
               {(admission as any).bedTransfers?.length > 0 ? (
                 <div className="space-y-4">
                   {(admission as any).bedTransfers.map((transfer: any) => (
                     <div key={transfer.id} className="flex flex-col p-4 bg-slate-50 rounded-xl border border-slate-100">
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-bold text-slate-500">{format(new Date(transfer.transferDate), "dd MMM yyyy, hh:mm a")}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="flex-1 flex flex-col items-end text-right">
                           <span className="text-xs font-bold text-slate-800">{transfer.fromBed?.ward?.name}</span>
                           <span className="text-[10px] text-slate-500 uppercase font-bold">{transfer.fromBed?.bedNumber}</span>
                         </div>
                         <ArrowRight className="w-4 h-4 text-slate-300 mx-1 flex-shrink-0" />
                         <div className="flex-1 flex flex-col items-start">
                           <span className="text-xs font-bold text-slate-800">{transfer.toBed?.ward?.name}</span>
                           <span className="text-[10px] text-slate-500 uppercase font-bold">{transfer.toBed?.bedNumber}</span>
                         </div>
                       </div>
                       {transfer.reason && <div className="mt-3 text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100"><span className="font-semibold text-slate-800">Reason:</span> {transfer.reason}</div>}
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BedDouble className="w-10 h-10 text-slate-200 stroke-[1.5] mb-3" />
                    <span className="text-sm font-semibold text-slate-500">No bed transfers</span>
                    <span className="text-xs text-slate-400 mt-1 max-w-[200px]">Patient has been in the same bed since admission.</span>
                  </div>
               )}
            </CardShell>

            <CardShell title="Patient Status History" icon={Calendar}>
               <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-8 py-2">
                 {admission.timelineEvents?.length > 0 ? (
                   admission.timelineEvents.map((event: any, idx: number) => (
                     <div key={event.id || idx} className="relative">
                       <div className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full ring-4 ring-white shadow-[0_0_0_4px_rgba(255,255,255,1),0_0_12px_rgba(0,0,0,0.1)] 
                         ${event.type === 'DOCTOR_ASSIGNED' ? 'bg-blue-500' : 
                           event.type === 'DOCTOR_REMOVED' ? 'bg-orange-500' : 
                           event.title === 'Operation Scheduled' ? 'bg-purple-500' :
                           event.title === 'Operation Cancelled' ? 'bg-red-500' :
                           'bg-slate-400'}`}>
                       </div>
                       <div className="flex flex-col gap-1">
                         <span className="text-sm font-bold text-slate-800 tracking-tight">{event.title}</span>
                         <span className="text-xs text-slate-500 font-medium">{format(new Date(event.timestamp), "dd MMM yyyy, hh:mm a")}</span>
                         {event.description && <span className="text-xs text-slate-600 mt-1">{event.description}</span>}
                       </div>
                     </div>
                   ))
                 ) : null}
                 <div className="relative">
                   <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white shadow-[0_0_0_4px_rgba(255,255,255,1),0_0_12px_rgba(16,185,129,0.5)]"></div>
                   <div className="flex flex-col gap-1">
                     <span className="text-sm font-bold text-emerald-600 tracking-tight">Admitted</span>
                     <span className="text-xs text-slate-500 font-medium">{format(new Date(admission.admissionDate), "dd MMM yyyy, hh:mm a")}</span>
                     <span className="text-xs text-slate-500 mt-1">Ward: {admission.bed?.ward?.name} &bull; Bed: {admission.bed?.bedNumber}</span>
                   </div>
                 </div>
               </div>
            </CardShell>

          </div>
        </div>
      )}
      
      {activeTab === "Medications" && (
         <div className="mt-6 animate-in fade-in duration-500">
            <MedicationChart
               admissionId={admission.id}
               admissionStatus={admission.status}
               doctorName={admission.primaryDoctor?.user?.name || 'Unknown'}
               prescriptions={admission.ipdPrescriptions}
               activeUserRole="DOCTOR"
            />
         </div>
      )}

      {activeTab === "Investigations" && (
         <div className="mt-6 animate-in fade-in duration-500">
            <LabOrders
               admissionId={admission.id}
               admissionStatus={admission.status}
               doctorName={admission.primaryDoctor?.user?.name || 'Unknown'}
               labRequests={admission.ipdLabRequests}
               activeUserRole="DOCTOR"
            />
         </div>
      )}

      {activeTab === "Equipment" && (
         <div className="mt-6 animate-in fade-in duration-500">
            <IPDEquipmentTracker
               admissionId={admission.id}
               admissionStatus={admission.status}
            />
         </div>
      )}

      {activeTab === "Diet & Meals" && (
         <div className="mt-6 animate-in fade-in duration-500">
            <PatientDietTab
               admissionId={admission.id}
               admissionStatus={admission.status}
               doctorName={admission.primaryDoctor?.user?.name || 'Unknown'}
               dietPlans={dietPlans}
               canteenDiets={admission.canteenDiets}
            />
         </div>
      )}

      {activeTab === "Summary" && (
         <div className="mt-6 animate-in fade-in duration-500 bg-white border border-slate-200 rounded-2xl overflow-hidden p-4 shadow-sm">
            <DischargeEditor
               admissionId={admission.id}
               admissionStatus={admission.status}
               doctorName={admission.primaryDoctor?.user?.name || 'Unknown'}
               dischargeTypes={dischargeTypes}
               assignedDoctors={assignedDoctors}
               ipdSignatories={ipdSignatories}
               initialData={{
                  dischargeTypeCode: admission.dischargeTypeCode,
                  customDischargeData: admission.customDischargeData,
                  finalDiagnosis: admission.finalDiagnosis,
                  proceduresDone: admission.proceduresDone,
                  courseInHospital: admission.courseInHospital,
                  treatmentGiven: admission.treatmentGiven,
                  conditionAtDischarge: admission.conditionAtDischarge,
                  adviceOnDischarge: admission.adviceOnDischarge,
                  followUpDate: admission.followUpDate,
                  dischargeMedicines: admission.dischargeMedicines,
                  dischargeDoctorId: admission.dischargeDoctorId,
                  dischargeSignatoryId: admission.dischargeSignatoryId,
               }}
               activeMedications={admission.ipdPrescriptions.filter((p: any) => p.status === 'ACTIVE').map((p: any) => ({
                  medicineName: p.medicineName,
                  dosage: p.dosage,
                  frequency: p.frequency,
                  duration: p.duration,
                  instruction: p.instruction,
               }))}
            />
         </div>
      )}

      {activeTab === "Notes" && (
         <ClinicalNotesTab 
            admission={admission} 
            allDoctors={allDoctors} 
         />
      )}

      {activeTab === "Vitals" && (
        <VitalsTab admission={admission} availableDoctors={availableDoctors} />
      )}

      {activeTab === "Operations" && (
        <div className="mt-6 animate-in fade-in duration-500">
          <OperationsTab admission={admission} />
        </div>
      )}

      <ProfilePhotoCropper
        open={photoCropperOpen}
        onOpenChange={setPhotoCropperOpen}
        patientId={patient.id}
        onSuccess={(newUrl) => setCurrentPhotoUrl(newUrl)}
      />

      <TransferBedDialog
        open={transferBedOpen}
        onOpenChange={setTransferBedOpen}
        admissionId={admission.id}
        currentBedId={admission.bedId}
        patientName={user.name}
      />
    </div>
  )
}
