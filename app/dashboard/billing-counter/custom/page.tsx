"use client"

import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BillingForm } from "@/components/billing-counter/billing-form"
import {
  createBill,
  sendBillViaWhatsApp,
} from "@/lib/actions/billing-counter"

export default function CustomBillingPage() {
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
            <Plus className="h-6 w-6 text-gray-600" />
            Custom Service Billing
          </h2>
          <p className="text-sm text-gray-500">
            Create a bill for any custom hospital service, procedure, or charge
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <BillingForm
          billingType="CUSTOM"
          showPatientSearch={true}
          onSubmit={createBill}
          onWhatsApp={sendBillViaWhatsApp}
          title="Custom Service Bill"
        />
      </div>
    </div>
  )
}
