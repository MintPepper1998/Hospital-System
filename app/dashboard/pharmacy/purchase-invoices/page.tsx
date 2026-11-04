import { getPurchaseInvoices } from "@/lib/actions/purchase-invoices"
import { PurchaseInvoicesClient } from "@/components/pharmacy/purchase-invoices-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Receipt } from "lucide-react"

export default async function PurchaseInvoicesPage() {
  const result = await getPurchaseInvoices()

  if (!result.success || !result.data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Invoices</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {result.message || "Failed to load purchase invoices."}
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
          <Receipt className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Purchase Invoices</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track supplier bills, payments &amp; outstanding balances
          </p>
        </div>
      </div>

      <PurchaseInvoicesClient initialInvoices={result.data} />
    </div>
  )
}
