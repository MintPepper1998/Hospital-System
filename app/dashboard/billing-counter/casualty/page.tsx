"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Bandage, ExternalLink } from "lucide-react"
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

    if (selectedVisit.pendingBillItems && selectedVisit.pendingBillItems.length > 0) {
      return selectedVisit.pendingBillItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        serviceCategory: item.serviceCategory || "PROCEDURE",
        isAutoDetected: true,
      }))
    }

    return selectedVisit.procedures.map((p) => ({
      description: `${p.name}${p.category !== "GENERAL" ? ` (${p.category})` : ""}`,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      serviceCategory: "PROCEDURE",
      isAutoDetected: true,
    }))
  }

  const queueItems = visits.map((v) => {
    const amount =
      (v.hasPendingBill && v.pendingBillAmount != null
        ? v.pendingBillAmount
        : v.totalAmount ?? v.procedureTotal) ?? 0

    let sublabel = v.hasPendingBill
      ? `Pending Bill ${v.pendingBillNumber || ""} • ₹${amount.toLocaleString("en-IN")}`
      : `${v.procedures.length} procedure(s) • ₹${amount.toLocaleString("en-IN")}`

    if (v.linkedPendingOpdBill) {
      sublabel += ` (+ OPD ₹${v.linkedPendingOpdBill.amount})`
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
          {selectedVisit?.linkedPendingOpdBill && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-800">⚠️ Pending OPD Consultation Bill:</span>
                <span className="font-bold text-zinc-800">{selectedVisit.linkedPendingOpdBill.billNumber}</span>
                <span>• ₹{selectedVisit.linkedPendingOpdBill.amount}</span>
              </div>
              <Link
                href={`/dashboard/billing-counter/opd?appointmentId=${selectedVisit.linkedPendingOpdBill.appointmentId || ""}`}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 underline bg-white/80 px-2.5 py-1 rounded-md shadow-xs transition-colors"
              >
                Collect OPD Bill <ExternalLink className="h-3 w-3" />
              </Link>
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
              const result = await createBill(data)
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
