"use client"

import { DateRangeFilter } from "./date-range-filter"
import { PageHeader } from "./page-header"
import { DataTable } from "./data-table"
import { Money } from "./money"
import { StatusBadge } from "./status-badge"
import { ExportButton } from "./export-button"
import { exportSalesRegister } from "@/app/actions/pharmacy-fin/sales"
import { fmtIST } from "@/lib/pharmacy-finance/dates"
import { pct } from "@/lib/pharmacy-finance/money"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import * as React from "react"
import { SALE_CHANNELS, VALID_SALE_STATUSES } from "@/lib/pharmacy-finance/constants"
import { Badge } from "@/components/ui/badge"

export function SalesClient({ range, data, searchParams }: { range: any; data: any; searchParams: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [search, setSearch] = useState(sp.get("search") || "")
  const debouncedSearch = useDebounce(search, 500)

  React.useEffect(() => {
    const params = new URLSearchParams(sp.toString())
    if (debouncedSearch) {
      params.set("search", debouncedSearch)
    } else {
      params.delete("search")
    }
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value && value !== "ALL") params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const columns = [
    { header: "Date", accessor: (r: any) => fmtIST(r.billDate) },
    { header: "Bill No", accessor: (r: any) => <span className="font-mono text-xs">{r.billNumber}</span> },
    { header: "Patient", accessor: (r: any) => r.patientName },
    { header: "Channel", accessor: (r: any) => <Badge variant="outline">{r.channel}</Badge> },
    { header: "Items", accessor: (r: any) => r.itemsCount, className: "text-right" },
    { header: "Gross", accessor: (r: any) => <Money value={r.gross} />, className: "text-right" },
    { header: "Discount", accessor: (r: any) => <Money value={r.discount} />, className: "text-right text-slate-500" },
    { header: "GST", accessor: (r: any) => <Money value={r.gst} />, className: "text-right text-slate-500" },
    { header: "Net", accessor: (r: any) => <Money value={r.net} className="font-medium" />, className: "text-right" },
    { header: "Cost", accessor: (r: any) => <Money value={r.cost} />, className: "text-right" },
    { header: "Profit", accessor: (r: any) => (
      <div>
        <Money value={r.profit} />
        <div className="text-[10px] text-slate-500">{pct(r.profit, r.net)}%</div>
      </div>
    ), className: "text-right" },
    { header: "Payment", accessor: (r: any) => r.paymentMethod },
    { header: "Status", accessor: (r: any) => <StatusBadge status={r.status} /> },
  ]

  const totals = [
    "Totals", "", "", "", "",
    <Money key="tg" value={data.totals.gross} />,
    <Money key="td" value={data.totals.discount} className="text-slate-500" />,
    <Money key="tgs" value={data.totals.gst} className="text-slate-500" />,
    <Money key="tn" value={data.totals.net} className="font-medium" />,
    <Money key="tc" value={data.totals.cost} />,
    <div key="tp">
      <Money value={data.totals.profit} />
      <div className="text-[10px] text-slate-500 font-normal">{pct(data.totals.profit, data.totals.net)}%</div>
    </div>,
    "", ""
  ]

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Sales Register" 
        action={
          <div className="flex items-center gap-2">
            <DateRangeFilter />
            <ExportButton 
              filename={`Sales_Register_${range.fromStr.split("T")[0]}`}
              fetchRows={async () => {
                const params = Object.fromEntries(new URLSearchParams(sp.toString()))
                return exportSalesRegister({ ...params, range })
              }}
            />
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 bg-slate-50 p-3 rounded-lg border">
        <Input 
          placeholder="Search bill, patient, phone..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 bg-white"
        />
        <Select value={sp.get("channel") || "ALL"} onValueChange={(v) => handleFilter("channel", v)}>
          <SelectTrigger className="w-32 bg-white"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Channels</SelectItem>
            {SALE_CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sp.get("paymentMethod") || "ALL"} onValueChange={(v) => handleFilter("paymentMethod", v)}>
          <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Payments</SelectItem>
            <SelectItem value="CASH">CASH</SelectItem>
            <SelectItem value="UPI">UPI</SelectItem>
            <SelectItem value="CARD">CARD</SelectItem>
            <SelectItem value="SPLIT">SPLIT</SelectItem>
            <SelectItem value="CREDIT">CREDIT</SelectItem>
            <SelectItem value="INSURANCE">INSURANCE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sp.get("status") || "ALL"} onValueChange={(v) => handleFilter("status", v)}>
          <SelectTrigger className="w-32 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {VALID_SALE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable 
        data={data.rows} 
        columns={columns} 
        keyExtractor={r => r.id}
        totals={totals}
        page={data.page}
        totalPages={data.totalPages}
      />
    </div>
  )
}
