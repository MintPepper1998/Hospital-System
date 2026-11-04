"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

interface AdmissionSlipPrintClientProps {
  children: React.ReactNode
  admissionId: string
}

export function AdmissionSlipPrintClient({
  children,
  admissionId,
}: AdmissionSlipPrintClientProps) {
  const router = useRouter()

  // Auto-trigger print dialog when the page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      {/* Screen-only toolbar — hidden during print */}
      <div className="no-print sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/ipd")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to IPD
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/dashboard/ipd/print/admission-forms/${admissionId}`
              )
            }
          >
            <FileText className="h-4 w-4 mr-2" />
            Print Hospital Forms
          </Button>
          <Button
            onClick={() => window.print()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Slip
          </Button>
        </div>
      </div>

      {/* Screen preview label */}
      <div className="no-print py-2 bg-blue-50 text-center text-xs text-blue-700 border-b border-blue-200">
        📋 IPD Admission Slip Preview — Print dialog will open automatically
      </div>

      {children}
    </div>
  )
}
