"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface OTPrintClientProps {
  children?: React.ReactNode
  surgeryId: string
  title: string
}

export function OTPrintClient({ children, surgeryId, title }: OTPrintClientProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      <div className="no-print sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/ot/schedule?surgeryId=${surgeryId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Operation Profile
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <Button
            onClick={() => window.print()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
      <div className="no-print py-2 bg-blue-50 text-center text-xs text-blue-700 border-b border-blue-200">
        📋 {title} Preview — Print dialog will open automatically
      </div>
      {children}
    </div>
  )
}
