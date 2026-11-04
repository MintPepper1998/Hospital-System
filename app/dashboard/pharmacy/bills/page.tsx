import { getPharmacyBills } from "@/lib/actions/pharmacy-bills"
import { PharmacyBillsClient } from "@/components/pharmacy/pharmacy-bills-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function PharmacyBillsPage() {
  const result = await getPharmacyBills()

  if (!result.success || !result.data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Billing Pharmacy</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {result.message || "Failed to load pharmacy bills."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing Pharmacy</h1>
          <p className="text-muted-foreground mt-1">
            View all pharmacy bills, process returns, and manage refunds.
          </p>
        </div>
      </div>

      <PharmacyBillsClient initialBills={result.data} />
    </div>
  )
}
