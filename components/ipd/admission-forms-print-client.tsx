"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface AdmissionFormsPrintClientProps {
  children: React.ReactNode
}

export function AdmissionFormsPrintClient({ children }: AdmissionFormsPrintClientProps) {
  const router = useRouter()

  // Auto-trigger print dialog when the page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 1000) // 1s delay for full render including tables

    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      {/* Screen-only toolbar — hidden during print */}
      <div className="no-print sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:inline">
            Print dialog will open automatically
          </span>
          <Button
            onClick={() => window.print()}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print All Charts
          </Button>
        </div>
      </div>

      {/* Screen preview spacer */}
      <div className="no-print py-3 bg-gray-100 text-center text-xs text-gray-500">
        Preview: 5 pages — Nurses Chart, Treatment Sheet, Continuation Sheet, Intake/Output, Vital Signs
      </div>

      {children}
    </div>
  )
}
