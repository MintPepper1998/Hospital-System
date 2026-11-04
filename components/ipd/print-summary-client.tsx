"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface PrintSummaryClientProps {
  children: React.ReactNode
}

export function PrintSummaryClient({ children }: PrintSummaryClientProps) {
  const router = useRouter()

  // Auto-trigger print when page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 800) // Slight delay for page to fully render

    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      {/* Screen-only toolbar (hidden during print) */}
      <div className="no-print flex items-center justify-between p-4 bg-gray-50 border-b sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Preview — the print dialog will open automatically
          </span>
          <Button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Again
          </Button>
        </div>
      </div>

      {children}
    </div>
  )
}
