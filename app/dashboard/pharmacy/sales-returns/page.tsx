import { getSalesReturns } from "@/app/actions/sales-returns"
import { SalesReturnsClient } from "@/components/pharmacy/sales-returns-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RotateCcw } from "lucide-react"
import { auth } from "@/auth"

export default async function SalesReturnsPage() {
  const session = await auth()
  const userRole = session?.user?.role || ""
  const result = await getSalesReturns()

  if (!result.success || !result.data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Customer Returns</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {result.message || "Failed to load customer returns."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { requireAuthSafe } = await import("@/lib/auth-guard")
  const { hasTemporaryPermission } = await import("@/lib/actions/permissions")
  
  const authRes = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  let canReturn = false
  if (authRes.ok) {
    if (authRes.session.role === "SUPER_ADMIN") {
      canReturn = true
    } else {
      canReturn = await hasTemporaryPermission(authRes.session.userId, "PHARMACY_RETURN")
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec3c9,-4px_-4px_8px_#ffffff] flex items-center justify-center">
          <RotateCcw className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Customer Returns & Exchanges</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage pharmacy sales returns, exchanges, and refund approvals
          </p>
        </div>
      </div>

      <SalesReturnsClient initialReturns={result.data} userRole={userRole} canReturn={canReturn} />
    </div>
  )
}
