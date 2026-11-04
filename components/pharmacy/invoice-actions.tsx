"use client"

import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, RefreshCw, Home } from "lucide-react"
import { useRouter } from "next/navigation"

interface InvoiceActionsProps {
  invoiceId: string
}

export function InvoiceActions({ invoiceId }: InvoiceActionsProps) {
  const router = useRouter()

  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    router.push("/dashboard/pharmacy/queue")
  }

  const handleNewSale = () => {
    router.push("/dashboard/pharmacy/pos")
  }

  const handleGoHome = () => {
    router.push("/dashboard/pharmacy")
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="outline" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Queue
      </Button>
      <Button variant="outline" onClick={handleNewSale}>
        <RefreshCw className="h-4 w-4 mr-2" />
        New Sale
      </Button>
      <Button onClick={handlePrint} className="bg-[#0066CC] hover:bg-[#0052A3]">
        <Printer className="h-4 w-4 mr-2" />
        Print Invoice
      </Button>
    </div>
  )
}
