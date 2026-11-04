"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { markBedReady } from "@/lib/actions/ipd"

interface MarkBedReadyButtonProps {
  bedId: string
  bedNumber: string
}

export function MarkBedReadyButton({ bedId, bedNumber }: MarkBedReadyButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleMarkReady = () => {
    startTransition(async () => {
      const result = await markBedReady(bedId)

      if (result.success) {
        toast.success(`Bed ${bedNumber} is now available`)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleMarkReady}
      disabled={isPending}
      className="w-full h-6 text-xs border-green-600 text-green-700 hover:bg-green-50"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Mark Ready
        </>
      )}
    </Button>
  )
}
