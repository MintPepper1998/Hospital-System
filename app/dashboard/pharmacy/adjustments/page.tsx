import { getStockAdjustments } from "@/app/actions/stock-adjustment"
import { StockAdjustmentsClient } from "@/components/pharmacy/stock-adjustments-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileWarning } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function StockAdjustmentsPage() {
  const result = await getStockAdjustments()

  if (!result.success || !result.data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Stock Adjustments</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {result.message || "Failed to load stock adjustments."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec3c9,-4px_-4px_8px_#ffffff] flex items-center justify-center">
          <FileWarning className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Stock Adjustments</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Log damages, expirations, and audit reconciliations
          </p>
        </div>
      </div>

      <StockAdjustmentsClient initialAdjustments={result.data} />
    </div>
  )
}
