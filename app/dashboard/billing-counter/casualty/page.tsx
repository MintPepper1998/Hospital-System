"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Bandage, Printer, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BillingForm } from "@/components/billing-counter/billing-form"
import { BillingQueue } from "@/components/billing-counter/billing-queue"
import {
  getUnbilledCasualtyVisits,
  createBill,
  sendBillViaWhatsApp,
} from "@/lib/actions/billing-counter"
import type { BillLineItem } from "@/lib/actions/billing-counter"

interface CasualtyVisitData {
  id: string
  patientId: string
  patientName: string
  patientDisplayId: string
  patientPhone: string | null
  chiefComplaint: string | null
  doctorName: string
  arrivalTime: string
  status: string
  hasPendingBill?: boolean
  pendingBillNumber?: string | null
  pendingBillAmount?: number | null
  pendingBillItems?: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    serviceCategory: string
  }> | null
  linkedPendingOpdBill?: {
    id: string
    billNumber: string
    amount: number
    appointmentId: string | null
  } | null
  appointmentId?: string | null
  hasOpdConsultation?: boolean
  opdDoctorName?: string | null
  opdItems?: Array<{
    id?: string
    description: string
    quantity: number
    unitPrice: number
    serviceCategory: string
  }>
  opdTotal?: number
  diagnosticItems?: Array<{
    id?: string
    description: string
    quantity: number
    unitPrice: number
    serviceCategory: string
  }>
  diagnosticTotal?: number
  hasDiagnostics?: boolean
  procedures: Array<{
    id: string
    name: string
    category: string
    quantity: number
    unitPrice: number
  }>
  procedureTotal: number
  totalAmount?: number
}

function CasualtyBillingContent() {
  const searchParams = useSearchParams()
  const visitIdParam = searchParams?.get("visitId")

  const [visits, setVisits] = useState<CasualtyVisitData[]>([])
  const [selectedVisit, setSelectedVisit] = useState<CasualtyVisitData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const result = await getUnbilledCasualtyVisits()
    const visitList = (result.data as CasualtyVisitData[]) || []
    setVisits(visitList)

    if (visitIdParam) {
      const match = visitList.find((v) => v.id === visitIdParam)
      if (match) setSelectedVisit(match)
    }

    setLoading(false)
  }

  const getPrefilledItems = (): (BillLineItem & { isAutoDetected?: boolean })[] => {
    if (!selectedVisit) return []

    const list: (BillLineItem & { isAutoDetected?: boolean })[] = []

    // 1. OPD Consultation items (when an OPD booking/consultation was made under casualty)
    if (selectedVisit.opdItems && selectedVisit.opdItems.length > 0) {
      for (const item of selectedVisit.opdItems) {
        list.push({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          serviceCategory: item.serviceCategory || "CONSULTATION",
          isAutoDetected: true,
        })
      }
    }

    // 2. Casualty procedures / pending casualty bill items
    if (selectedVisit.pendingBillItems && selectedVisit.pendingBillItems.length > 0) {
      for (const item of selectedVisit.pendingBillItems) {
        if (!list.some((existing) => existing.description === item.description)) {
          list.push({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            serviceCategory: item.serviceCategory || "PROCEDURE",
            isAutoDetected: true,
          })
        }
      }
    } else if (selectedVisit.procedures && selectedVisit.procedures.length > 0) {
      for (const p of selectedVisit.procedures) {
        list.push({
          description: `${p.name}${p.category !== "GENERAL" ? ` (${p.category})` : ""}`,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          serviceCategory: "PROCEDURE",
          isAutoDetected: true,
        })
      }
    }

    // 3. Diagnostics items (Pathology & Radiology investigations)
    if (selectedVisit.diagnosticItems && selectedVisit.diagnosticItems.length > 0) {
      for (const diag of selectedVisit.diagnosticItems) {
        if (!list.some((existing) => existing.description === diag.description)) {
          list.push({
            description: diag.description,
            quantity: diag.quantity,
            unitPrice: diag.unitPrice,
            serviceCategory: diag.serviceCategory || "DIAGNOSTIC",
            isAutoDetected: true,
          })
        }
      }
    }

    return list
  }

  const queueItems = visits.map((v) => {
    const amount =
      (v.hasPendingBill && v.pendingBillAmount != null
        ? v.pendingBillAmount
        : v.totalAmount ?? v.procedureTotal) ?? 0

    const hasOpd = (v.opdItems && v.opdItems.length > 0) || v.hasOpdConsultation
    const parts: string[] = []
    if (hasOpd) parts.push(`OPD (${v.doctorName})`)
    if (v.procedures.length > 0) parts.push(`${v.procedures.length} proc`)
    if (v.diagnosticItems && v.diagnosticItems.length > 0) parts.push(`${v.diagnosticItems.length} tests`)

    let sublabel = ""
    if (parts.length > 0) {
      sublabel = `${parts.join(" + ")} • ₹${amount.toLocaleString("en-IN")}`
    } else if (v.hasPendingBill) {
      sublabel = `Pending Bill ${v.pendingBillNumber || ""} • ₹${amount.toLocaleString("en-IN")}`
    } else {
      sublabel = `₹${amount.toLocaleString("en-IN")}`
    }

    const label = v.chiefComplaint
      ? `${v.chiefComplaint}${v.hasPendingBill ? " (Pending Bill)" : ""}`
      : v.hasPendingBill
      ? "Discharged / Pending Bill"
      : "Casualty Visit"

    return {
      id: v.id,
      patientId: v.patientId,
      patientName: v.patientName,
      patientDisplayId: v.patientDisplayId,
      patientPhone: v.patientPhone,
      label,
      sublabel,
      time: v.arrivalTime,
      status: v.hasPendingBill ? "PENDING BILL" : v.status,
      amount,
    }
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/billing-counter">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <Bandage className="h-6 w-6 text-orange-600" />
            Casualty Billing
          </h2>
          <p className="text-sm text-gray-500">
            Bill procedures and services for casualty visits
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <BillingQueue
            title="Unbilled Casualty Visits"
            items={queueItems}
            selectedId={selectedVisit?.id}
            onSelect={(item) => {
              const visit = visits.find((v) => v.id === item.id)
              if (visit) setSelectedVisit(visit)
            }}
            emptyMessage={loading ? "Loading..." : "No unbilled casualty visits"}
          />
        </div>

        <div className="lg:col-span-8">
          {selectedVisit?.appointmentId && (
            <div className="mb-4 p-3.5 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl flex items-center justify-between text-xs text-violet-900 shadow-xs flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-violet-100 text-violet-700 rounded-lg flex-shrink-0">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-violet-900 text-sm">
                    OPD Consultation: Dr. {selectedVisit.doctorName}
                  </p>
                  <p className="text-[11px] text-violet-600 font-medium">
                    Consolidated into this Casualty bill. Consultation + procedures/tests are billed in 1 single invoice.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white border-violet-300 text-violet-700 hover:bg-violet-100 font-semibold shadow-xs text-xs"
                onClick={() =>
                  window.open(
                    `/dashboard/clinical/opd/print/${selectedVisit.appointmentId}`,
                    "_blank"
                  )
                }
              >
                <Printer className="h-3.5 w-3.5 mr-1.5 text-violet-600" /> Print OPD Slip
              </Button>
            </div>
          )}

          <BillingForm
            key={
              selectedVisit
                ? `${selectedVisit.id}-${selectedVisit.hasPendingBill ? "pending" : "active"}`
                : "empty"
            }
            billingType="CASUALTY"
            linkedEntityId={selectedVisit?.id}
            linkedAppointmentId={selectedVisit?.appointmentId || undefined}
            pendingBillNumber={selectedVisit?.pendingBillNumber}
            preselectedPatient={
              selectedVisit
                ? {
                    id: selectedVisit.patientId,
                    patientId: selectedVisit.patientDisplayId,
                    name: selectedVisit.patientName,
                    phone: selectedVisit.patientPhone,
                  }
                : undefined
            }
            prefilledItems={getPrefilledItems()}
            showPatientSearch={!selectedVisit}
            onSubmit={async (data) => {
              const result = await createBill({
                ...data,
                linkedAppointmentId: selectedVisit?.appointmentId || undefined,
              })
              if (result.success) {
                setVisits((prev) => prev.filter((v) => v.id !== selectedVisit?.id))
                setSelectedVisit(null)
              }
              return result
            }}
            onWhatsApp={sendBillViaWhatsApp}
            title={
              selectedVisit?.hasPendingBill
                ? `Casualty Bill (${selectedVisit.pendingBillNumber})`
                : selectedVisit?.hasOpdConsultation
                ? `Casualty & OPD Consolidated Bill`
                : "Casualty Billing"
            }
          />
        </div>
      </div>
    </div>
  )
}

export default function CasualtyBillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading casualty billing...</div>}>
      <CasualtyBillingContent />
    </Suspense>
  )
}
