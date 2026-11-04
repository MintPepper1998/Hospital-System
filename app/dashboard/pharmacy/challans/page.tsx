import { getChallans } from "@/app/actions/challan"
import { ChallansClient } from "@/components/pharmacy/challans-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ClipboardList } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ChallansPage() {
  const result = await getChallans()

  if (!result.success || !result.data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Challans</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {result.message || "Failed to load challans."}
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
          <ClipboardList className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Delivery Challans</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Receive stock from suppliers without purchase prices &mdash; convert to invoice later
          </p>
        </div>
      </div>

      <ChallansClient initialChallans={result.data} />
    </div>
  )
}
