import { getMedicineOutReport } from "@/app/actions/medicine-out"
import { MedicineOutClient } from "@/components/pharmacy/medicine-out-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MedicineOutPage({
  searchParams,
}: {
  searchParams: Promise<{ fromDate?: string; toDate?: string }>
}) {
  const params = await searchParams
  // Default to today in local timezone
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  const fromDateStr = params?.fromDate || today
  const toDateStr = params?.toDate || today

  const result = await getMedicineOutReport(fromDateStr, toDateStr)

  if (!result.success || !result.data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Medicine Out</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {result.message || "Failed to load medicine out records."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:block print:max-w-none print:space-y-0">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medicine Out</h1>
          <p className="text-muted-foreground mt-1">
            Track and monitor all medicine sold on a specific date.
          </p>
        </div>
      </div>

      <MedicineOutClient 
        initialData={result.data} 
        initialFromDate={fromDateStr} 
        initialToDate={toDateStr}
        initialSummary={result.summary!}
      />
    </div>
  )
}
