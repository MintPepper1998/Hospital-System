"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { ResultEntryDialog } from "./result-entry-dialog"

interface EnterResultButtonProps {
  request: {
    id: string
    testName: string
    patient: {
      user: {
        name: string
      }
      patientId: string
    }
  }
}

export function EnterResultButton({ request }: EnterResultButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="text-orange-600 border-orange-600 hover:bg-orange-50"
      >
        <FileText className="mr-2 h-4 w-4" />
        Enter Result
      </Button>

      <ResultEntryDialog
        open={open}
        onOpenChange={setOpen}
        request={request}
      />
    </>
  )
}
