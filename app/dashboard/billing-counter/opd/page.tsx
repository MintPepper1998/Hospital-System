"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BillingForm } from "@/components/billing-counter/billing-form"
import { BillingQueue } from "@/components/billing-counter/billing-queue"
import {
  getUnbilledAppointments,
  getActiveHospitalFees,
  createBill,
  sendBillViaWhatsApp,
} from "@/lib/actions/billing-counter"
import type { BillLineItem } from "@/lib/actions/billing-counter"

interface UnbilledAppointment {
  id: string
  patientId: string
  patientName: string
  patientDisplayId: string
  patientPhone: string | null
  doctorName: string
  doctorId: string
  consultationFee: number
  appointmentDate: string
  appointmentTime: string | null
  status: string
  hasPendingBill?: boolean
  pendingBillId?: string | null
  pendingBillNumber?: string | null
  pendingBillAmount?: number | null
  pendingBillItems?: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    serviceCategory: string
  }> | null
  totalAmount?: number
}

function OPDBillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentIdParam = searchParams?.get("appointmentId")

  const [appointments, setAppointments] = useState<UnbilledAppointment[]>([])
  const [hospitalFees, setHospitalFees] = useState<{ id: string; name: string; amount: number }[]>([])
  const [selectedAppt, setSelectedAppt] = useState<UnbilledAppointment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [apptResult, fees] = await Promise.all([
      getUnbilledAppointments(),
      getActiveHospitalFees("OPD"),
    ])
    const appts = (apptResult.data as UnbilledAppointment[]) || []
    setAppointments(appts)
    setHospitalFees(fees)

    if (appointmentIdParam) {
      const match = appts.find((a) => a.id === appointmentIdParam)
      if (match) {
        setSelectedAppt(match)
      }
    }

    setLoading(false)
  }

  // Build prefilled items when appointment is selected
  const getPrefilledItems = (): (BillLineItem & { isAutoDetected?: boolean })[] => {
    if (!selectedAppt) return []

    // If this appointment already has an existing pending bill, prefill its saved items
    if (selectedAppt.pendingBillItems && selectedAppt.pendingBillItems.length > 0) {
      return selectedAppt.pendingBillItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        serviceCategory: item.serviceCategory || "CONSULTATION",
        isAutoDetected: true,
      }))
    }

    const items: (BillLineItem & { isAutoDetected?: boolean })[] = []

    // Consultation fee
    if (selectedAppt.consultationFee > 0) {
      items.push({
        description: `Consultation Fee - ${selectedAppt.doctorName}`,
        quantity: 1,
        unitPrice: selectedAppt.consultationFee,
        serviceCategory: "CONSULTATION",
        isAutoDetected: true,
      })
    }

    // Hospital fees
    for (const fee of hospitalFees) {
      items.push({
        description: fee.name,
        quantity: 1,
        unitPrice: fee.amount,
        serviceCategory: "HOSPITAL_FEE",
        isAutoDetected: true,
      })
    }

    return items
  }

  // Map appointments to queue items
  const queueItems = appointments.map((a) => {
    const amount =
      (a.hasPendingBill && a.pendingBillAmount != null
        ? a.pendingBillAmount
        : a.totalAmount ?? a.consultationFee) ?? 0

    const sublabel = a.hasPendingBill
      ? `Pending Bill ${a.pendingBillNumber || ""} • ₹${amount.toLocaleString("en-IN")}`
      : `${a.appointmentTime || ""} • Dr. ${a.doctorName}`

    const label = a.hasPendingBill
      ? `Dr. ${a.doctorName} (Pending Bill)`
      : a.doctorName

    return {
      id: a.id,
      patientId: a.patientId,
      patientName: a.patientName,
      patientDisplayId: a.patientDisplayId,
      patientPhone: a.patientPhone,
      label,
      sublabel,
      time: a.appointmentDate,
      status: a.hasPendingBill ? "PENDING" : a.status,
      amount,
    }
  })

  const handleSelectFromQueue = (item: { id: string }) => {
    const appt = appointments.find((a) => a.id === item.id)
    if (appt) setSelectedAppt(appt)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/billing-counter">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <Stethoscope className="h-6 w-6" />
            OPD Billing
          </h2>
          <p className="text-sm text-gray-500">
            Bill consultation fees, hospital charges, and collect pending OPD bills
          </p>
        </div>
      </div>

      {/* Two Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Queue */}
        <div className="lg:col-span-4">
          <BillingQueue
            title="Unbilled & Pending OPD"
            items={queueItems}
            selectedId={selectedAppt?.id}
            onSelect={handleSelectFromQueue}
            emptyMessage={loading ? "Loading..." : "No unbilled or pending OPD appointments"}
          />
        </div>

        {/* Right: Billing Form */}
        <div className="lg:col-span-8">
          <BillingForm
            billingType="OPD"
            linkedEntityId={selectedAppt?.id}
            pendingBillNumber={selectedAppt?.pendingBillNumber}
            preselectedPatient={
              selectedAppt
                ? {
                    id: selectedAppt.patientId,
                    patientId: selectedAppt.patientDisplayId,
                    name: selectedAppt.patientName,
                    phone: selectedAppt.patientPhone,
                  }
                : undefined
            }
            prefilledItems={getPrefilledItems()}
            showPatientSearch={!selectedAppt}
            onSubmit={async (data) => {
              const result = await createBill(data)
              if (result.success) {
                // Remove from queue
                setAppointments((prev) =>
                  prev.filter((a) => a.id !== selectedAppt?.id)
                )
                setSelectedAppt(null)
              }
              return result
            }}
            onWhatsApp={sendBillViaWhatsApp}
            title="OPD Billing"
          />
        </div>
      </div>
    </div>
  )
}

export default function OPDBillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading OPD billing...</div>}>
      <OPDBillingContent />
    </Suspense>
  )
}
