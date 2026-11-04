"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Printer, ArrowLeft, Download, Share2, Microscope, Radiation } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface LabReportPrintActionsProps {
  requestId: string
  testType: "PATHOLOGY" | "RADIOLOGY"
}

export function LabReportPrintActions({ requestId, testType }: LabReportPrintActionsProps) {
  const router = useRouter()
  const isRadiology = testType === "RADIOLOGY"
  const colorClass = isRadiology ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"
  const IconComponent = isRadiology ? Radiation : Microscope

  const handlePrint = () => {
    window.print()
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isRadiology ? "bg-purple-100" : "bg-blue-100"}`}>
              <IconComponent className={`h-5 w-5 ${isRadiology ? "text-purple-600" : "text-blue-600"}`} />
            </div>
            <div>
              <h2 className="font-semibold">Lab Report Preview</h2>
              <p className="text-sm text-muted-foreground">
                Review the report before printing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <Button variant="outline" asChild>
              <Link href={`/dashboard/lab/entry/${requestId}`}>
                Edit Report
              </Link>
            </Button>

            <Button className={colorClass} onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
