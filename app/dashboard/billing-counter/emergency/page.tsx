"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Siren } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BillingForm } from "@/components/billing-counter/billing-form"
import { BillingQueue } from "@/components/billing-counter/billing-queue"
import {
  getUnbilledEmergencyVisits,
  createBill,
  sendBillViaWhatsApp,
} from "@/lib/actions/billing-counter"
import type { BillLineItem } from "@/lib/actions/billing-counter"

interface EmergencyVisitData {
  id: string
  patientId: string
  patientName: string
  patientDisplayId: string
  patientPhone: string | null
  chiefComplaint: string | null
  triageLevel: string
  doctorName: string
  bedInfo: string | null
  arrivalTime: string
  status: string
  treatmentGiven: string | null
  proceduresDone: string | null
}

export default function EmergencyBillingPage() {
  const [visits, setVisits] = useState<EmergencyVisitData[]>([])
  const [selectedVisit, setSelectedVisit] = useState<EmergencyVisitData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const result = await getUnbilledEmergencyVisits()
    setVisits((result.data as EmergencyVisitData[]) || [])
    setLoading(false)
  }

  const getPrefilledItems = (): (BillLineItem & { isAutoDetected?: boolean })[] => {
    if (!selectedVisit) return []
    const items: (BillLineItem & { isAutoDetected?: boolean })[] = []

    // ER treatment charge (base)
    items.push({
      description: "Emergency Treatment Charge",
      quantity: 1,
      unitPrice: 500,
      serviceCategory: "TREATMENT",
      isAutoDetected: true,
    })

    // If procedures recorded in text, add placeholder
    if (selectedVisit.proceduresDone) {
      items.push({
        description: `Procedures: ${selectedVisit.proceduresDone.substring(0, 60)}`,
        quantity: 1,
        unitPrice: 0,
        serviceCategory: "PROCEDURE",
        isAutoDetected: true,
      })
    }

    return items
  }

  const triageBadge = (level: string) => {
    const map: Record<string, string> = {
      IMMEDIATE: "🔴",
      URGENT: "🟠",
      DELAYED: "🟡",
      NON_URGENT: "🟢",
    }
    return map[level] || ""
  }

  const queueItems = visits.map((v) => ({
    id: v.id,
    patientId: v.patientId,
    patientName: v.patientName,
    patientDisplayId: v.patientDisplayId,
    patientPhone: v.patientPhone,
    label: `${triageBadge(v.triageLevel)} ${v.chiefComplaint || "ER Visit"}`,
    sublabel: v.bedInfo || v.doctorName,
    time: v.arrivalTime,
    status: v.status,
  }))

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
            <Siren className="h-6 w-6 text-red-600" />
            Emergency (ER) Billing
          </h2>
          <p className="text-sm text-gray-500">
            Bill ER treatment, procedures, and bed charges
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <BillingQueue
            title="Unbilled ER Visits"
            items={queueItems}
            selectedId={selectedVisit?.id}
            onSelect={(item) => {
              const visit = visits.find((v) => v.id === item.id)
              if (visit) setSelectedVisit(visit)
            }}
            emptyMessage={loading ? "Loading..." : "No unbilled emergency visits"}
          />
        </div>

        <div className="lg:col-span-8">
          <BillingForm
            billingType="EMERGENCY"
            linkedEntityId={selectedVisit?.id}
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
            title="Emergency Billing"
          />
        </div>
      </div>
    </div>
  )
}
