import { getPurchaseOrderById } from "@/app/actions/purchase-order"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { PrintTrigger } from "@/app/dashboard/clinical/opd/print/[appointmentId]/print-trigger"

export default async function PrintPurchaseOrderPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getPurchaseOrderById(id)
  
  if (!result.success || !result.data) {
    notFound()
  }

  const po = result.data

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="bg-white min-h-screen text-black print:bg-white print:p-0 p-8 max-w-4xl mx-auto font-sans">
      <PrintTrigger />
      
      {/* Header */}
      <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900 uppercase">Purchase Order</h1>
          <p className="text-slate-500 mt-1">Shree Kamal Hospital Pharmacy</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">PO: {po.orderNumber}</p>
          <p className="text-slate-600">Date: {format(new Date(po.date), "dd MMM yyyy")}</p>
          <p className="text-slate-600">Status: {po.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        {/* Supplier Info */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Vendor / Supplier</h3>
          <p className="font-bold text-slate-900 text-lg">{po.supplier.name}</p>
          {po.supplier.contactPerson && <p className="text-slate-700">{po.supplier.contactPerson}</p>}
          {po.supplier.phone && <p className="text-slate-700">Ph: {po.supplier.phone}</p>}
          {po.supplier.email && <p className="text-slate-700">{po.supplier.email}</p>}
          {po.supplier.address && <p className="text-slate-700 mt-2">{po.supplier.address}</p>}
        </div>

        {/* Ship To Info */}
        <div className="text-right">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Ship To</h3>
          <p className="font-bold text-slate-900 text-lg">Shree Kamal Hospital</p>
          <p className="text-slate-700">Main Pharmacy Dept</p>
          <p className="text-slate-700">123 Hospital Road</p>
          {po.expectedDate && (
            <p className="text-slate-900 mt-4 font-semibold">
              Expected Delivery: {format(new Date(po.expectedDate), "dd MMM yyyy")}
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left border-collapse mb-8">
        <thead>
          <tr className="border-y-2 border-slate-300">
            <th className="py-3 px-2 font-bold text-slate-800 w-12 text-center">#</th>
            <th className="py-3 px-2 font-bold text-slate-800">Item / Medicine</th>
            <th className="py-3 px-2 font-bold text-slate-800 text-right">Qty</th>
            <th className="py-3 px-2 font-bold text-slate-800 text-right">Unit Price</th>
            <th className="py-3 px-2 font-bold text-slate-800 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {po.items.map((item: any, idx: number) => (
            <tr key={item.id}>
              <td className="py-3 px-2 text-center text-slate-500">{idx + 1}</td>
              <td className="py-3 px-2 font-medium text-slate-900">{item.medicine?.name || "Unknown"}</td>
              <td className="py-3 px-2 text-right">{item.quantity}</td>
              <td className="py-3 px-2 text-right">{formatCurrency(item.unitCost)}</td>
              <td className="py-3 px-2 text-right font-medium">{formatCurrency(item.totalCost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-800">
            <td colSpan={4} className="py-4 px-2 text-right font-bold text-slate-900 uppercase tracking-wider text-sm">
              Grand Total
            </td>
            <td className="py-4 px-2 text-right font-bold text-xl text-slate-900">
              {formatCurrency(po.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      {po.notes && (
        <div className="mb-12">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Instructions / Notes</h4>
          <p className="text-slate-800 border-l-4 border-slate-300 pl-4 py-1 italic">
            {po.notes}
          </p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-24 pt-8 border-t border-slate-200">
        <div>
          <div className="border-b border-slate-400 pb-1 mb-2">
            <span className="font-medium text-slate-800">{po.createdBy}</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Authorized Signature</p>
        </div>
        <div className="text-right">
          <div className="border-b border-slate-400 pb-1 mb-2">
            <span className="text-transparent">Supplier Signature</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Supplier Acceptance</p>
        </div>
      </div>
    </div>
  )
}
