"use client"

import { Printer, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export function PrintActions() {
  const router = useRouter()

  return (
    <div className="no-print sticky top-6 z-50 flex items-center justify-between max-w-[210mm] mx-auto mb-6 px-4 md:px-0">
      <button 
        onClick={() => router.push("/dashboard/billing-counter/ipd")}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Billing
      </button>

      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
      >
        <Printer className="w-4 h-4" />
        Print Invoice
      </button>
    </div>
  )
}
