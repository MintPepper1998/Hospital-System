"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, FileText, Stethoscope, ClipboardList } from "lucide-react"

interface OTPrintClientProps {
  children: React.ReactNode
  formType: string
}

const FORM_LABELS: Record<string, string> = {
  consent: "Patient Consent Form",
  anaesthesia: "Anaesthesia Record",
  op_note: "Operation Note",
}

export function OTPrintClient({ children, formType }: OTPrintClientProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="no-print sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to OT
          </Button>
          <span className="text-sm font-medium text-gray-700">
            {FORM_LABELS[formType] || "OT Print"}
          </span>
          <Button size="sm" onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Form type switcher */}
        <div className="flex items-center justify-center gap-2 px-4 pb-3">
          <Button
            variant={formType === "consent" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set("type", "consent")
              router.push(url.pathname + url.search)
            }}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Consent
          </Button>
          <Button
            variant={formType === "anaesthesia" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set("type", "anaesthesia")
              router.push(url.pathname + url.search)
            }}
          >
            <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
            Anaesthesia
          </Button>
          <Button
            variant={formType === "op_note" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set("type", "op_note")
              router.push(url.pathname + url.search)
            }}
          >
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Op Note
          </Button>
        </div>
      </div>

      {/* Print content */}
      <div className="print-content">
        {children}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page { margin: 12mm 10mm; }
        }
      `}</style>
    </div>
  )
}
