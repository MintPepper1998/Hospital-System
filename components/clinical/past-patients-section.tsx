"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  History, Search, X, FileText, Pill, ChevronRight,
  Stethoscope, FolderOpen, Calendar, User, Clock, ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

// ── Types ──
interface PrescriptionMed {
  id: string
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions: string | null
}

interface PastPrescription {
  id: string
  prescriptionDate: string
  instructions: string | null
  medications: PrescriptionMed[]
}

interface PastPatientAppt {
  id: string
  appointmentDate: string
  appointmentTime: string
  diagnosis: string | null
  chiefComplaint: string | null
  patientName: string
  patientId: string
  patientDbId: string
  patientGender: string | null
  patientAge: number | null
  isPaperConsultation?: boolean
  scannedPaperUrl?: string | null
  prescriptions: PastPrescription[]
}

interface Props {
  pastPatients: PastPatientAppt[]
}

// ── Helpers ──
const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
]

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export function PastPatientsSection({ pastPatients }: Props) {
  const [search, setSearch] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PastPatientAppt | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Filter
  const filtered = pastPatients.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.patientName?.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.diagnosis?.toLowerCase().includes(q) ||
      p.chiefComplaint?.toLowerCase().includes(q)
    )
  })

  const displayed = showAll ? filtered : filtered.slice(0, 10)

  const openPrescriptions = (patient: PastPatientAppt) => {
    setSelectedPatient(patient)
    setShowModal(true)
  }

  return (
    <>
      <div className="neo-flat rounded-[2.5rem] bg-[#e0e5ec] p-6 sm:p-8 mt-8">
        <div className="pb-6 mb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-zinc-800 tracking-tight">
                <div className="p-2 neo-pressed rounded-full text-amber-600 bg-[#e0e5ec]">
                  <History className="h-6 w-6" strokeWidth={1.5} />
                </div>
                Past Patients
              </h3>
              <p className="text-sm font-medium text-zinc-500 mt-2 pl-12">
                {pastPatients.length} previous consultations • View history and prescriptions
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name, ID, diagnosis..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-11 pr-10 py-3 text-sm rounded-[1.25rem] neo-pressed bg-[#e0e5ec] text-zinc-700 placeholder:text-zinc-400 outline-none w-full sm:w-80 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 neo-button rounded-full p-1.5 text-zinc-500 bg-[#e0e5ec]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="neo-pressed rounded-[2rem] p-4 sm:p-6 bg-[#e0e5ec] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex p-4 neo-flat rounded-full text-zinc-300 mb-4">
                <History className="h-10 w-10" strokeWidth={1.5} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-zinc-700">
                {search ? "No matching patients" : "No past patients"}
              </h3>
              <p className="text-xs font-medium text-zinc-500 mt-1">
                {search
                  ? "Try a different search term"
                  : "Completed consultations will appear here"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-zinc-200/50 hover:bg-transparent">
                      <TableHead className="font-bold text-zinc-500">Patient</TableHead>
                      <TableHead className="font-bold text-zinc-500">Age / Gender</TableHead>
                      <TableHead className="font-bold text-zinc-500">Visit Date</TableHead>
                      <TableHead className="font-bold text-zinc-500">Diagnosis</TableHead>
                      <TableHead className="text-center font-bold text-zinc-500">Prescriptions</TableHead>
                      <TableHead className="text-right font-bold text-zinc-500">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayed.map((appt, idx) => {
                      const hasRx = appt.prescriptions.length > 0
                      return (
                        <TableRow key={appt.id} className="group border-b border-zinc-200/30 hover:bg-zinc-100/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full neo-pressed bg-[#e0e5ec] flex items-center justify-center flex-shrink-0">
                                <span className="text-[11px] font-black text-zinc-700 tracking-tighter">
                                  {initials(appt.patientName)}
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-sm text-zinc-800">{appt.patientName || "Unknown"}</p>
                                <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
                                  {appt.patientId}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-semibold text-zinc-600">
                              {appt.patientAge ?? "N/A"} yrs / {appt.patientGender || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-zinc-400" />
                              <div>
                                <p className="text-xs font-bold text-zinc-700">
                                  {format(new Date(appt.appointmentDate), "MMM d, yyyy")}
                                </p>
                                <p className="text-[10px] font-semibold text-zinc-500 mt-0.5">
                                  {appt.appointmentTime}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold text-zinc-600 truncate">
                                {appt.diagnosis || appt.chiefComplaint || "General Consultation"}
                              </p>
                              {appt.isPaperConsultation && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  📄 Paper
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <button
                                onClick={() => openPrescriptions(appt)}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-bold gap-1.5 inline-flex items-center transition-all ${
                                  hasRx
                                    ? "neo-flat bg-[#e0e5ec] text-violet-600 hover:text-violet-700"
                                    : "neo-pressed bg-[#e0e5ec] text-zinc-400 cursor-not-allowed"
                                }`}
                                disabled={!hasRx}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {hasRx
                                  ? `View Rx (${appt.prescriptions.length})`
                                  : "No Rx"}
                              </button>
                              {appt.scannedPaperUrl && (
                                <a
                                  href={appt.scannedPaperUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-full text-[11px] font-bold neo-flat bg-[#e0e5ec] text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-all"
                                  title="View Scanned OPD Paper"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Scan
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-3 items-center">
                              <Link href={`/dashboard/clinical/patient/${appt.patientDbId}`}>
                                <button className="px-3 py-1.5 rounded-full neo-button bg-[#e0e5ec] text-[11px] font-bold text-zinc-600 gap-1.5 inline-flex items-center">
                                  <FolderOpen className="h-3.5 w-3.5" />
                                  History
                                </button>
                              </Link>
                              <Link href={`/dashboard/clinical/emr/${appt.id}`}>
                                <button className="h-8 w-8 rounded-full neo-button bg-[#e0e5ec] flex items-center justify-center text-zinc-500">
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Show more / less */}
              {filtered.length > 10 && (
                <div className="flex justify-center mt-6 pt-2">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-6 py-2 rounded-full neo-button bg-[#e0e5ec] text-xs font-bold text-zinc-600 transition-all active:scale-95"
                  >
                    {showAll
                      ? `Show Less`
                      : `Show All (${filtered.length} patients)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── PRESCRIPTION MODAL ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-[#e0e5ec] border-none shadow-[20px_20px_60px_#bec3c9,-20px_-20px_60px_#ffffff] rounded-[2rem] p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4 text-xl font-bold text-zinc-800">
              <div className="h-12 w-12 rounded-full neo-flat bg-[#e0e5ec] flex items-center justify-center text-violet-600 flex-shrink-0">
                <FileText className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="truncate">Prescriptions — {selectedPatient?.patientName || "Patient"}</span>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 text-xs font-semibold mt-4 pl-[4rem]">
              <span className="px-2 py-0.5 rounded-full neo-pressed bg-[#e0e5ec] text-[10px] text-zinc-500">
                {selectedPatient?.patientId}
              </span>
              <span className="text-zinc-400">•</span>
              <span className="flex items-center gap-1.5 text-zinc-600">
                <Calendar className="h-3 w-3" />
                {selectedPatient
                  ? format(new Date(selectedPatient.appointmentDate), "MMM d, yyyy")
                  : ""}
              </span>
              {selectedPatient?.diagnosis && (
                <>
                  <span className="text-zinc-400">•</span>
                  <span className="px-2 py-0.5 rounded-full neo-pressed bg-[#e0e5ec] text-[10px] text-orange-600">
                    {selectedPatient.diagnosis}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && selectedPatient.prescriptions.length > 0 ? (
            <div className="space-y-6 mt-6">
              {selectedPatient.prescriptions.map((rx, rxIdx) => (
                <div key={rx.id} className="neo-pressed rounded-[1.5rem] bg-[#e0e5ec] p-4 sm:p-5">
                  {/* Rx header */}
                  <div className="pb-4 mb-4 border-b-2 border-zinc-200/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 neo-flat rounded-full text-violet-600 bg-[#e0e5ec]">
                        <Pill className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-bold text-zinc-700">
                        Prescription #{rxIdx + 1}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-zinc-500">
                      {format(new Date(rx.prescriptionDate), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {/* Meds table */}
                  {rx.medications.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200/50">
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-8">#</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Medicine</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Dosage</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Frequency</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Duration</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/30">
                          {rx.medications.map((med, medIdx) => (
                            <tr key={med.id} className="hover:bg-zinc-100/30 transition-colors">
                              <td className="px-3 py-3 font-semibold text-zinc-400 text-xs">{medIdx + 1}</td>
                              <td className="px-3 py-3">
                                <p className="font-bold text-zinc-800 text-xs">{med.medicationName}</p>
                                {med.instructions && (
                                  <p className="text-[10px] font-semibold text-zinc-500 mt-1 italic">
                                    {med.instructions}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <span className="px-2 py-0.5 rounded-full neo-pressed bg-[#e0e5ec] text-[10px] font-bold text-blue-600">
                                  {med.dosage}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-xs font-semibold text-zinc-600">{med.frequency}</td>
                              <td className="px-3 py-3 text-xs font-semibold text-zinc-600">{med.duration}</td>
                              <td className="px-3 py-3">
                                <span className="font-bold text-zinc-800 text-xs">{med.quantity}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-zinc-500 font-medium text-xs">
                      No medications in this prescription
                    </div>
                  )}

                  {/* Instructions */}
                  {rx.instructions && (
                    <div className="mt-4 p-4 neo-flat rounded-[1rem] bg-[#e0e5ec]">
                      <p className="text-xs font-semibold text-amber-700">
                        <strong className="font-bold text-amber-800">Instructions:</strong>{" "}
                        {rx.instructions}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="inline-flex p-4 neo-pressed rounded-full text-zinc-300 mb-4">
                <FileText className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <p className="font-bold text-sm text-zinc-700">No prescriptions found</p>
              <p className="text-xs font-semibold text-zinc-500 mt-1">This patient has no recorded prescriptions</p>
            </div>
          )}

          {/* Footer actions */}
          {selectedPatient && (
            <div className="mt-8 pt-6 border-t-2 border-zinc-200/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <Link href={`/dashboard/clinical/patient/${selectedPatient.patientDbId}`}>
                <button className="px-4 py-2 rounded-full neo-button bg-[#e0e5ec] text-[11px] font-bold text-zinc-600 gap-2 inline-flex items-center">
                  <FolderOpen className="h-4 w-4" />
                  Full Patient History
                </button>
              </Link>
              <Link href={`/dashboard/clinical/emr/${selectedPatient.id}`}>
                <button className="px-6 py-2 rounded-full neo-flat bg-[#e0e5ec] text-[11px] font-black text-blue-600 gap-2 inline-flex items-center active:scale-95 transition-transform">
                  <Stethoscope className="h-4 w-4" />
                  Open EMR Record
                </button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
