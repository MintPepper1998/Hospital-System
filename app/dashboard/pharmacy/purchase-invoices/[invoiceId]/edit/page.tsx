import { notFound } from "next/navigation"
import { getPurchaseInvoiceById } from "@/lib/actions/purchase-invoices"
import { getSuppliers } from "@/app/actions/purchase"
import { getMedicines } from "@/lib/actions"
import { PurchaseInvoiceEditForm } from "@/components/pharmacy/purchase-invoice-edit-form"

interface PageProps {
  params: Promise<{ invoiceId: string }>
}

export default async function EditPurchaseInvoicePage({ params }: PageProps) {
  const { invoiceId } = await params
  const [invoiceResult, suppliers, medicinesResult] = await Promise.all([
    getPurchaseInvoiceById(invoiceId),
    getSuppliers(),
    getMedicines(),
  ])

  if (!invoiceResult.success || !invoiceResult.data) {
    notFound()
  }

  const medicines = medicinesResult.success ? medicinesResult.data : []

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1440px] mx-auto">
        <PurchaseInvoiceEditForm
          invoice={invoiceResult.data}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          medicines={medicines || []}
        />
      </div>
    </div>
  )
}
