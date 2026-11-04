import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { getOTMedicineDashboardData } from "@/app/actions/ot-medicine"
import { OTMedicineClient } from "@/components/pharmacy/ot-medicine-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OTMedicinePage() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST", "DOCTOR", "NURSE", "ACCOUNTANT"])
  if (!authResult.ok) {
    redirect("/dashboard")
  }

  const result = await getOTMedicineDashboardData()

  if (!result.success || !result.data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">OT Medicine</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {result.message || "Failed to load OT medicine data."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <OTMedicineClient
        initialSummary={result.data.summary}
        initialSurgeries={result.data.surgeries}
      />
    </div>
  )
}

