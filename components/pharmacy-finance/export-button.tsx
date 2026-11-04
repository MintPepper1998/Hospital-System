"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useTransition } from "react"
import { exportRows } from "@/lib/pharmacy-finance/export"
import { toast } from "sonner"

export function ExportButton({
  fetchRows,
  filename,
}: {
  fetchRows: () => Promise<{ success: boolean; data?: Record<string, any>[]; message?: string }>
  filename: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetchRows()
          if (!res.success) {
            toast.error(res.message || "Failed to export data")
            return
          }
          if (!res.data || res.data.length === 0) {
            toast.error("No data to export")
            return
          }
          await exportRows(filename, res.data, "xlsx")
        })
      }}
    >
      <Download className="mr-2 h-4 w-4" />
      {isPending ? "Exporting..." : "Export"}
    </Button>
  )
}
