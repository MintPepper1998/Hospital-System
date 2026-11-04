"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BillingForm } from "@/components/billing-counter/billing-form"
import { BillingQueue } from "@/components/billing-counter/billing-queue"
import {
  getUnbilledSurgeries,
  createBill,
  sendBillViaWhatsApp,
} from "@/lib/actions/billing-counter"
import type { BillLineItem } from "@/lib/actions/billing-counter"

interface SurgeryData {
  id: string
  patientId: string
  patientName: string
  patientDisplayId: string
  patientPhone: string | null
  procedureName: string
  surgeonName: string
  theaterName: string
  scheduledDate: string
  estimatedCost: number
  actualCost: number
  surgeryCharge: number
  chargeBreakdown: any[]
  status: string
}

export default function SurgeryBillingPage() {
  const [surgeries, setSurgeries] = useState<SurgeryData[]>([])
  const [selectedSurgery, setSelectedSurgery] = useState<SurgeryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const result = await getUnbilledSurgeries()
    setSurgeries((result.data as SurgeryData[]) || [])
    setLoading(false)
  }

  const getPrefilledItems = (): (BillLineItem & { isAutoDetected?: boolean })[] => {
    if (!selectedSurgery) return []
    const items: (BillLineItem & { isAutoDetected?: boolean })[] = []

    // If chargeBreakdown is available (from SurgeryChargeComponent), use it
    if (
      selectedSurgery.chargeBreakdown &&
      Array.isArray(selectedSurgery.chargeBreakdown) &&
      selectedSurgery.chargeBreakdown.length > 0
    ) {
      for (const comp of selectedSurgery.chargeBreakdown) {
        items.push({
          description: comp.chargeLabel || comp.chargeType || "Surgery Charge",
          quantity: 1,
          unitPrice: comp.amount || 0,
          serviceCategory: "SURGERY",
          isAutoDetected: true,
        })
      }
    } else {
      // Fallback: use surgeryCharge or actualCost as a single line
      const charge =
        selectedSurgery.actualCost ||
        selectedSurgery.surgeryCharge ||
        selectedSurgery.estimatedCost
      if (charge > 0) {
        items.push({
          description: `Surgery: ${selectedSurgery.procedureName}`,
          quantity: 1,
          unitPrice: charge,
          serviceCategory: "SURGERY",
          isAutoDetected: true,
        })
      }
    }

    return items
  }

  const queueItems = surgeries.map((s) => ({
    id: s.id,
    patientId: s.patientId,
    patientName: s.patientName,
    patientDisplayId: s.patientDisplayId,
    patientPhone: s.patientPhone,
    label: s.procedureName,
    sublabel: `${s.surgeonName} • ${s.theaterName}`,
    time: s.scheduledDate,
    status: s.status,
    amount: s.actualCost || s.surgeryCharge || s.estimatedCost,
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
            <Scissors className="h-6 w-6 text-purple-600" />
            Surgery / OT Billing
          </h2>
          <p className="text-sm text-gray-500">
            Bill surgical procedures, OT charges, and consumables
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <BillingQueue
            title="Unbilled Surgeries"
            items={queueItems}
            selectedId={selectedSurgery?.id}
            onSelect={(item) => {
              const surgery = surgeries.find((s) => s.id === item.id)
              if (surgery) setSelectedSurgery(surgery)
            }}
            emptyMessage={loading ? "Loading..." : "No unbilled surgeries"}
          />
        </div>

        <div className="lg:col-span-8">
          <BillingForm
            billingType="OT"
            linkedEntityId={selectedSurgery?.id}
            preselectedPatient={
              selectedSurgery
                ? {
                    id: selectedSurgery.patientId,
                    patientId: selectedSurgery.patientDisplayId,
                    name: selectedSurgery.patientName,
                    phone: selectedSurgery.patientPhone,
                  }
                : undefined
            }
            prefilledItems={getPrefilledItems()}
            showPatientSearch={!selectedSurgery}
            onSubmit={async (data) => {
              const result = await createBill(data)
              if (result.success) {
                setSurgeries((prev) =>
                  prev.filter((s) => s.id !== selectedSurgery?.id)
                )
                setSelectedSurgery(null)
              }
              return result
            }}
            onWhatsApp={sendBillViaWhatsApp}
            title="Surgery / OT Billing"
          />
        </div>
      </div>
    </div>
  )
}
