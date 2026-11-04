import { requireAuth } from "@/lib/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Calculator } from "lucide-react"

export default async function CostEstimatePage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">Treatment Cost Estimator</h2>
        <p className="text-muted-foreground mt-1">Estimate treatment costs against insurance coverage</p>
      </div>

      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Cost Estimator</p>
          <p className="text-sm mt-1">
            The cost estimator is integrated into the Insurance Verification flow. 
            Go to <a href="/dashboard/insurance/verify" className="text-blue-600 hover:underline">Verify & Register</a> to use it during patient onboarding.
          </p>
          <p className="text-sm mt-2 text-muted-foreground">
            Standalone estimator for existing patients coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
