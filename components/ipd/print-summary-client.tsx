"use client"

import React, { createContext, useContext, useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Printer, ArrowLeft, Stethoscope, FileSignature, Loader2, Check, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { updateDischargeSignatures } from "@/app/actions/discharge-summary"
import { toast } from "sonner"

export interface AssignedDoctorOption {
  id: string
  name: string
  department?: string | null
  specialization?: string | null
  signatureUrl?: string | null
  isPrimary?: boolean
  roleLabel?: string
}

export interface IpdSignatoryOption {
  id: string
  name: string
  department?: string | null
  designation?: string | null
  signatureUrl?: string | null
  hasSignature?: boolean
}

interface PrintSummaryContextValue {
  selectedDoctor: AssignedDoctorOption | null
  selectedSignatory: IpdSignatoryOption | null
  selectedDoctorId: string
  selectedSignatoryId: string
  setSelectedDoctorId: (id: string) => void
  setSelectedSignatoryId: (id: string) => void
  isUpdating: boolean
}

const PrintSummaryContext = createContext<PrintSummaryContextValue | null>(null)

export function usePrintSummarySignatures() {
  const context = useContext(PrintSummaryContext)
  return context
}

interface PrintSummaryClientProps {
  admissionId?: string
  emergencyVisitId?: string
  assignedDoctors?: AssignedDoctorOption[]
  ipdSignatories?: IpdSignatoryOption[]
  initialDoctorId?: string | null
  initialSignatoryId?: string | null
  children: React.ReactNode
}

export function PrintSummaryClient({
  admissionId,
  emergencyVisitId,
  assignedDoctors = [],
  ipdSignatories = [],
  initialDoctorId,
  initialSignatoryId,
  children,
}: PrintSummaryClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Find initial selections
  const defaultDocId =
    initialDoctorId && assignedDoctors.some((d) => d.id === initialDoctorId)
      ? initialDoctorId
      : assignedDoctors[0]?.id || ""

  const defaultSigId =
    initialSignatoryId && ipdSignatories.some((s) => s.id === initialSignatoryId)
      ? initialSignatoryId
      : ipdSignatories[0]?.id || "none"

  const [selectedDoctorId, setSelectedDoctorIdState] = useState<string>(defaultDocId)
  const [selectedSignatoryId, setSelectedSignatoryIdState] = useState<string>(defaultSigId)
  const [autoPrintFired, setAutoPrintFired] = useState(false)

  // Current selected doctor object
  const selectedDoctor =
    assignedDoctors.find((d) => d.id === selectedDoctorId) || assignedDoctors[0] || null

  // Current selected signatory object
  const selectedSignatory =
    selectedSignatoryId === "none"
      ? null
      : ipdSignatories.find((s) => s.id === selectedSignatoryId) || null

  // Auto-trigger print when page loads for the first time
  useEffect(() => {
    if (autoPrintFired) return
    const timer = setTimeout(() => {
      setAutoPrintFired(true)
      window.print()
    }, 900)

    return () => clearTimeout(timer)
  }, [autoPrintFired])

  const handleDoctorChange = (newDoctorId: string) => {
    setSelectedDoctorIdState(newDoctorId)
    setAutoPrintFired(true) // don't pop print dialog while user is customizing

    if (admissionId) {
      startTransition(async () => {
        const res = await updateDischargeSignatures(admissionId, {
          dischargeDoctorId: newDoctorId,
        })
        if (res.success) {
          toast.success("Treating doctor updated on discharge summary")
        } else {
          toast.error(res.message)
        }
      })
    }
  }

  const handleSignatoryChange = (newSignatoryId: string) => {
    setSelectedSignatoryIdState(newSignatoryId)
    setAutoPrintFired(true)

    if (admissionId) {
      startTransition(async () => {
        const res = await updateDischargeSignatures(admissionId, {
          dischargeSignatoryId: newSignatoryId === "none" ? null : newSignatoryId,
        })
        if (res.success) {
          toast.success("Authorized signatory updated on discharge summary")
        } else {
          toast.error(res.message)
        }
      })
    }
  }

  return (
    <PrintSummaryContext.Provider
      value={{
        selectedDoctor,
        selectedSignatory,
        selectedDoctorId,
        selectedSignatoryId,
        setSelectedDoctorId: handleDoctorChange,
        setSelectedSignatoryId: handleSignatoryChange,
        isUpdating: isPending,
      }}
    >
      <div>
        {/* Screen-only toolbar (hidden during print) */}
        <div className="no-print bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            {/* Middle: Signature Selectors */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-inner">
              {/* Treating Doctor Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-blue-400" />
                  Treating Doctor:
                </span>
                {assignedDoctors.length > 0 ? (
                  <Select value={selectedDoctorId} onValueChange={handleDoctorChange}>
                    <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-700 text-slate-100 min-w-[210px] focus:ring-blue-500">
                      <SelectValue placeholder="Select Treating Doctor" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                      {assignedDoctors.map((doc) => (
                        <SelectItem
                          key={doc.id}
                          value={doc.id}
                          className="text-xs focus:bg-slate-800 focus:text-white cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span>
                              Dr. {doc.name}{" "}
                              {doc.specialization ? `(${doc.specialization})` : ""}
                            </span>
                            {doc.signatureUrl ? (
                              <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                                ✓ Signature
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                No Sig
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-slate-400 italic">No assigned doctors</span>
                )}
              </div>

              <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

              {/* Authorized Signatory Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileSignature className="h-3.5 w-3.5 text-indigo-400" />
                  Authorized Signatory:
                </span>
                <Select value={selectedSignatoryId} onValueChange={handleSignatoryChange}>
                  <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-700 text-slate-100 min-w-[220px] focus:ring-indigo-500">
                    <SelectValue placeholder="Select Authorized Signatory" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectItem
                      value="none"
                      className="text-xs focus:bg-slate-800 focus:text-white cursor-pointer"
                    >
                      <span className="text-slate-400 italic">None / Blank Signature Line</span>
                    </SelectItem>
                    {ipdSignatories.map((sig) => (
                      <SelectItem
                        key={sig.id}
                        value={sig.id}
                        className="text-xs focus:bg-slate-800 focus:text-white cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span>
                            {sig.name} ({sig.designation || sig.department || "Staff"})
                          </span>
                          {sig.hasSignature ? (
                            <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                              ✓ Signature
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              No Sig
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isPending && (
                <div className="flex items-center gap-1 text-[11px] text-indigo-300 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>

            {/* Right: Print Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
                size="sm"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Summary
              </Button>
            </div>
          </div>
        </div>

        {children}
      </div>
    </PrintSummaryContext.Provider>
  )
}

/**
 * DischargeSignaturesFooter — Renders the bottom signatures row for both
 * screen preview and physical print media.
 * Consumes live reactive state from PrintSummaryContext if inside PrintSummaryClient,
 * or gracefully falls back to passed default values.
 */
export function DischargeSignaturesFooter({
  fallbackDoctor,
  fallbackSignatory,
}: {
  fallbackDoctor?: {
    name: string
    specialization?: string | null
    department?: string | null
    signatureUrl?: string | null
  }
  fallbackSignatory?: {
    name: string
    designation?: string | null
    department?: string | null
    signatureUrl?: string | null
  }
}) {
  const context = usePrintSummarySignatures()

  const doctor = context?.selectedDoctor || fallbackDoctor || null
  const signatory = context?.selectedSignatory || fallbackSignatory || null

  return (
    <div
      style={{
        marginTop: "40px",
        paddingTop: "16px",
        borderTop: "2px solid #1e40af",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      {/* Signatures 2-Column Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "24px",
          padding: "0 10px",
        }}
      >
        {/* Left Column: Treating Doctor */}
        <div style={{ textAlign: "center", minWidth: "220px", maxWidth: "260px" }}>
          {/* Digital Signature Display */}
          <div
            style={{
              height: "58px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              marginBottom: "4px",
            }}
          >
            {doctor?.signatureUrl ? (
              <img
                src={doctor.signatureUrl}
                alt={`Signature of Dr. ${doctor.name}`}
                style={{
                  maxHeight: "54px",
                  maxWidth: "190px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div style={{ height: "54px" }} />
            )}
          </div>

          <div
            className="dotted-line"
            style={{
              width: "210px",
              margin: "0 auto 4px auto",
              borderBottom: "1px dotted #4b5563",
            }}
          >
            &nbsp;
          </div>

          <p style={{ fontSize: "12px", fontWeight: 700, margin: 0, color: "#111" }}>
            Dr. {doctor ? doctor.name : "Treating Doctor"}
          </p>

          {doctor?.specialization && (
            <p style={{ fontSize: "10px", color: "#4b5563", margin: "1px 0 0 0" }}>
              {doctor.specialization}
              {doctor.department ? `, ${doctor.department}` : ""}
            </p>
          )}

          <p style={{ fontSize: "10px", color: "#4b5563", fontWeight: 600, margin: "2px 0 0 0" }}>
            Treating Doctor
          </p>
        </div>

        {/* Right Column: Authorized Signatory */}
        <div style={{ textAlign: "center", minWidth: "220px", maxWidth: "260px" }}>
          {/* Digital Signature Display */}
          <div
            style={{
              height: "58px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              marginBottom: "4px",
            }}
          >
            {signatory?.signatureUrl ? (
              <img
                src={signatory.signatureUrl}
                alt={`Signature of ${signatory.name}`}
                style={{
                  maxHeight: "54px",
                  maxWidth: "190px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div style={{ height: "54px" }} />
            )}
          </div>

          <div
            className="dotted-line"
            style={{
              width: "210px",
              margin: "0 auto 4px auto",
              borderBottom: "1px dotted #4b5563",
            }}
          >
            &nbsp;
          </div>

          <p style={{ fontSize: "12px", fontWeight: 700, margin: 0, color: "#111" }}>
            {signatory ? signatory.name : "Authorized Signatory"}
          </p>

          <p style={{ fontSize: "10px", color: "#4b5563", margin: "1px 0 0 0" }}>
            {signatory?.designation
              ? `${signatory.designation} — Authorized Signatory`
              : "Authorized Signatory"}
          </p>

          <p style={{ fontSize: "10px", color: "#4b5563", fontWeight: 600, margin: "2px 0 0 0" }}>
            Shree Kamal Hospital
          </p>
        </div>
      </div>

      {/* Hospital Disclaimer */}
      <div
        style={{
          textAlign: "center",
          fontSize: "10px",
          color: "#6b7280",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "8px",
        }}
      >
        <p style={{ margin: "2px 0" }}>
          This is an electronically generated discharge summary from the Shree Kamal Hospital Management System.
        </p>
        <p style={{ margin: "2px 0" }}>
          For queries, contact the hospital reception or the treating doctor.
        </p>
      </div>
    </div>
  )
}
