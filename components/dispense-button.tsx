"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileText, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cancelPrescription } from "@/lib/actions/pharmacy"

interface DispenseButtonProps {
  appointmentId: string
  patientName: string
}

export function DispenseButton({ appointmentId, patientName }: DispenseButtonProps) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleDispense = () => {
    // Redirect to dispense page with pre-loaded prescription
    router.push(`/dashboard/pharmacy/dispense/${appointmentId}`)
  }

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this prescription? The patient will be removed from the queue."
    )
    if (!confirmed) return

    const result = await cancelPrescription(appointmentId)
    if (result.success) {
      toast.success("Prescription cancelled.")
      router.refresh()
    } else {
      toast.error(result.message || "Failed to cancel.")
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <div className="flex w-full items-center gap-2">
      <Button
        onClick={handleDispense}
        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
      >
        <FileText className="mr-2 h-4 w-4" />
        Dispense & Bill
      </Button>
      <Button
        size="icon"
        variant="destructive"
        onClick={handleCancel}
        className="bg-red-500 hover:bg-red-600"
        title="Cancel Prescription"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
