"use client"

import { Button } from "@/components/ui/button"
import { Trash2, Pill } from "lucide-react"
import Link from "next/link"
import { cancelPrescription } from "@/lib/actions/pharmacy"
import { toast } from "sonner"

export default function QueueActions({ appointmentId }: { appointmentId: string }) {
  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this prescription? The patient will be removed from the queue."
    )
    if (!confirmDelete) return

    try {
      const result = await cancelPrescription(appointmentId)
      if (result?.success === false) {
        toast.error(result.message || "Failed to cancel.")
        return
      }
      toast.success("Prescription cancelled.")
    } catch (error) {
      console.error(error)
      toast.error("Failed to cancel.")
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/dashboard/pharmacy/dispense/${appointmentId}`}>
        <Button size="sm" className="bg-[#0066CC] hover:bg-[#0052A3]">
          <Pill className="mr-2 h-4 w-4" />
          Dispense
        </Button>
      </Link>

      {/* Delete Button - DESTROY VARIANT */}
      <Button
        size="sm"
        variant="destructive"
        onClick={handleDelete}
        className="bg-red-500 hover:bg-red-600"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
