"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer, Edit } from "lucide-react"
import Link from "next/link"

interface RadiologyReportPrintActionsProps {
  requestId: string
}

export function RadiologyReportPrintActions({ requestId }: RadiologyReportPrintActionsProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" asChild>
        <Link href="/dashboard/radiology/reports">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Link>
      </Button>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/radiology/entry/${requestId}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Report
          </Link>
        </Button>
        <Button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700">
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>
    </div>
  )
}
