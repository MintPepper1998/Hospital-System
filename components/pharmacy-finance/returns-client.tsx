"use client"

import { DateRangeFilter } from "./date-range-filter"
import { PageHeader } from "./page-header"
import { DataTable } from "./data-table"
import { Money } from "./money"
import { StatusBadge } from "./status-badge"
import { fmtIST } from "@/lib/pharmacy-finance/dates"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import * as React from "react"
import { KpiCard } from "./kpi-card"
import { RefreshCcw, AlertTriangle, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ReturnsClient({ range, data, searchParams }: { range: any; data: any; searchParams: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value && value !== "ALL") params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const columns = [
    { header: "Date", accessor: (r: any) => fmtIST(r.date) },
    { header: "Return No", accessor: (r: any) => <span className="font-mono text-xs">{r.returnNumber}</span> },
    { header: "Original Bill", accessor: (r: any) => <span className="font-mono text-xs">{r.billNumber}</span> },
    { header: "Patient", accessor: (r: any) => r.patientName },
    { header: "Items", accessor: (r: any) => r.itemsCount, className: "text-right" },
    { header: "Refund Amount", accessor: (r: any) => <Money value={r.refundAmount} />, className: "text-right" },
    { header: "Refund Mode", accessor: (r: any) => r.refundMode },
    { header: "Status", accessor: (r: any) => <StatusBadge status={r.status} /> },
    { header: "Approved By", accessor: (r: any) => r.approvedBy },
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Returns & Refunds" 
        subtitle="Read-only view of processed and pending returns."
        action={
          <div className="flex items-center gap-2">
            <DateRangeFilter />
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/pharmacy/sales-returns">
                Manage Approvals
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard 
          label="Total Returns" 
          value={data.kpis.totalReturns} 
          icon={RefreshCcw} 
        />
        <KpiCard 
          label="Total Refunded" 
          value={<Money value={data.kpis.totalAmount} />} 
          icon={RefreshCcw} 
        />
        <KpiCard 
          label="Return Rate" 
          value={`${data.kpis.returnRate.toFixed(2)}%`} 
          icon={Percent} 
        />
        <KpiCard 
          label="Pending Approvals" 
          value={
            <div className="flex items-baseline gap-2">
              {data.kpis.pendingCount}
              <span className="text-sm font-medium text-slate-500">
                (<Money value={data.kpis.pendingAmount} />)
              </span>
            </div>
          } 
          icon={AlertTriangle} 
        />
      </div>

      <div className="flex gap-3 bg-slate-50 p-3 rounded-lg border">
        <Select value={sp.get("status") || "ALL"} onValueChange={(v) => handleFilter("status", v)}>
          <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
            <SelectItem value="APPROVED">APPROVED</SelectItem>
            <SelectItem value="REJECTED">REJECTED</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable 
        data={data.rows} 
        columns={columns} 
        keyExtractor={r => r.id}
        page={data.page}
        totalPages={data.totalPages}
      />
    </div>
  )
}
