"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface PrintPageWrapperProps {
  children: React.ReactNode
  title?: string
}

export function PrintPageWrapper({ children, title }: PrintPageWrapperProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="no-print sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <span className="text-sm font-medium text-gray-700">{title || "Print Preview"}</span>
        <Button size="sm" onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print content */}
      {children}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page { margin: 15mm 12mm; }
        }
      `}</style>
    </div>
  )
}
