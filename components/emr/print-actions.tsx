"use client"

import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function PrintActions() {
  const router = useRouter()

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex items-center justify-between print:hidden">
      <Link href="/dashboard/clinical/emr">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to EMR Queue
        </Button>
      </Link>
      <Button 
        onClick={handlePrint} 
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Printer className="mr-2 h-4 w-4" />
        Print Prescription
      </Button>
    </div>
  )
}
