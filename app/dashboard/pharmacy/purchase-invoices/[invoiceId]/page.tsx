import { notFound } from "next/navigation"
import { getPurchaseInvoiceById } from "@/lib/actions/purchase-invoices"
import { PurchaseInvoiceDetailClient } from "@/components/pharmacy/purchase-invoice-detail-client"

interface PageProps {
  params: Promise<{ invoiceId: string }>
}

export default async function PurchaseInvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params
  const result = await getPurchaseInvoiceById(invoiceId)

  if (!result.success || !result.data) {
    notFound()
  }

  const { requireAuthSafe } = await import("@/lib/auth-guard")
  const { hasTemporaryPermission } = await import("@/lib/actions/permissions")
  
  const auth = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  let canEdit = false
  if (auth.ok) {
    if (auth.session.role === "SUPER_ADMIN") {
      canEdit = true
    } else {
      canEdit = await hasTemporaryPermission(auth.session.userId, "PHARMACY_EDIT")
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PurchaseInvoiceDetailClient invoice={result.data} canEdit={canEdit} />
      </div>
    </div>
  )
}
