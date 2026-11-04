"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { DataTable } from "./data-table"
import { Money } from "./money"
import { StatusBadge } from "./status-badge"
import { fmtIST } from "@/lib/pharmacy-finance/dates"
import { DateRangeFilter } from "./date-range-filter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function PurchasesClient({ range, data, suppliers, searchParams }: { range: any; data: any; suppliers: any[]; searchParams: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null)

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value && value !== "ALL") params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const columns = [
    { header: "Date", accessor: (r: any) => fmtIST(r.date, "dd MMM yyyy") },
    { header: "Invoice No", accessor: (r: any) => <span className="font-mono text-xs cursor-pointer text-blue-600 hover:underline" onClick={() => setSelectedInvoice(r)}>{r.invoiceNumber}</span> },
    { header: "Supplier", accessor: (r: any) => <span className="font-medium text-slate-900">{r.supplierName}</span> },
    { header: "GSTIN", accessor: (r: any) => <span className="font-mono text-xs">{r.gstin || "-"}</span> },
    { header: "Taxable", accessor: (r: any) => <Money value={r.taxable} />, className: "text-right" },
    { header: "GST", accessor: (r: any) => <Money value={r.gst} />, className: "text-right" },
    { header: "Total", accessor: (r: any) => <span className="font-bold"><Money value={r.grandTotal} /></span>, className: "text-right" },
    { header: "Paid", accessor: (r: any) => <Money value={r.paid} />, className: "text-right" },
    { header: "Due", accessor: (r: any) => r.due > 0.01 ? <span className="text-rose-600 font-medium"><Money value={r.due} /></span> : <Money value={0} />, className: "text-right" },
    { header: "Due Date", accessor: (r: any) => r.dueDate ? fmtIST(r.dueDate, "dd MMM yyyy") : "-" },
    { header: "Status", accessor: (r: any) => <StatusBadge status={r.status} /> },
  ]

  const totals = [
    <span key="1" />,
    <span key="2" />,
    <span key="3" />,
    <span key="4" className="text-right">Totals:</span>,
    <Money key="5" value={data.totals.taxable} />,
    <Money key="6" value={data.totals.gst} />,
    <Money key="7" value={data.totals.grandTotal} />,
    <Money key="8" value={data.totals.paid} />,
    <Money key="9" value={data.totals.due} />,
    <span key="10" />,
    <span key="11" />,
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Purchase Register" 
        subtitle="View inward supplies and track invoice-level dues."
        action={<DateRangeFilter />}
      />

      <div className="flex gap-4 bg-slate-50 p-3 rounded-lg border items-center">
        <Select value={sp.get("supplier") || "ALL"} onValueChange={(v) => handleFilter("supplier", v)}>
          <SelectTrigger className="w-64 bg-white"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Suppliers</SelectItem>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sp.get("status") || "ALL"} onValueChange={(v) => handleFilter("status", v)}>
          <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1">
          <DataTable 
            data={data.rows} 
            columns={columns} 
            keyExtractor={r => r.id}
            totals={totals}
            page={data.page}
            totalPages={data.totalPages}
          />
        </div>

        {data.gstSummary.length > 0 && (
          <div className="w-72 bg-white rounded-lg border p-4 sticky top-6">
            <h3 className="font-semibold text-slate-800 mb-4 pb-2 border-b">Input GST Summary</h3>
            <div className="space-y-3">
              {data.gstSummary.map((g: any) => (
                <div key={g.rate} className="flex justify-between items-center text-sm">
                  <div className="text-slate-600 font-medium">{g.rate}% GST</div>
                  <div className="text-right">
                    <div><Money value={g.gst} /></div>
                    <div className="text-xs text-slate-400">on <Money value={g.taxable} /></div>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t flex justify-between items-center font-bold">
                <div>Total Input Tax</div>
                <div className="text-blue-600"><Money value={data.totals.gst} /></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invoice Items: {selectedInvoice?.invoiceNumber}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedInvoice?.items?.map((it: any) => (
              <div key={it.id} className="border-b pb-3 mb-3 last:border-0 text-sm">
                <div className="font-semibold">{it.name}</div>
                <div className="flex justify-between mt-1 text-slate-500">
                  <div>Batch: {it.batch}</div>
                  <div>Exp: {it.expiry ? fmtIST(it.expiry, "MMM yyyy") : "-"}</div>
                </div>
                <div className="flex justify-between mt-2">
                  <div>
                    {it.qty} {it.free > 0 && <span className="text-emerald-600">(+{it.free} free)</span>} 
                    {" x "} <Money value={it.rate} />
                  </div>
                  <div className="text-right">
                    {it.discPct > 0 && <div className="text-xs text-rose-500">-{it.discPct}%</div>}
                    <div><Money value={it.total} /></div>
                    {it.gstPct > 0 && <div className="text-xs text-slate-400">+ {it.gstPct}% GST</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
