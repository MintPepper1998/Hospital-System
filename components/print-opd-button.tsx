"use client"

import { Printer, Loader2 } from "lucide-react"
import { useIframePrint } from "@/lib/use-iframe-print"
import { cn } from "@/lib/utils"

interface PrintOPDButtonProps {
  appointmentId: string
  className?: string
  label?: string
  iconSize?: string
}

/**
 * Prints the OPD prescription paper in-place using a hidden iframe.
 * No navigation, no new tab — stays on the current page.
 */
export function PrintOPDButton({
  appointmentId,
  className,
  label = "Print",
  iconSize = "h-4 w-4",
}: PrintOPDButtonProps) {
  const { printUrl, isPrinting } = useIframePrint()

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        printUrl(`/dashboard/clinical/opd/print/${appointmentId}`)
      }}
      disabled={isPrinting}
      className={cn("flex items-center gap-1.5 cursor-pointer", className)}
    >
      {isPrinting ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : (
        <Printer className={iconSize} />
      )}
      {label}
    </button>
  )
}
