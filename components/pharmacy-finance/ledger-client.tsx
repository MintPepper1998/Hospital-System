"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { DateRangeFilter } from "./date-range-filter"
import { DataTable } from "./data-table"
import { Money } from "./money"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export function LedgerClient({ data, searchParams }: { data: any; searchParams: any }) {
  const columns = [
    { header: "Date", accessor: (r: any) => new Date(r.date).toLocaleDateString("en-IN") },
    { header: "Category", accessor: (r: any) => r.category.replace(/_/g, " ") },
    { header: "Description", accessor: (r: any) => r.description },
    { header: "Method", accessor: (r: any) => r.method },
    { header: "In (Dr)", accessor: (r: any) => r.in > 0 ? <Money value={r.in} /> : "-", className: "text-right text-emerald-600" },
    { header: "Out (Cr)", accessor: (r: any) => r.out > 0 ? <Money value={r.out} /> : "-", className: "text-right text-rose-600" },
    { header: "Balance", accessor: (r: any) => <span className="font-medium"><Money value={r.balance} /></span>, className: "text-right" }
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Ledger: ${data.account.name}`} 
        subtitle={`${data.account.type} Account`}
        action={
          <div className="flex items-center gap-3">
            <DateRangeFilter />
            <Button asChild variant="outline">
              <Link href="/dashboard/pharmacy-finance/accounts">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Accounts
              </Link>
            </Button>
          </div>
        }
      />

      <div className="bg-slate-50 p-4 rounded-lg border flex justify-between items-center text-sm">
        <div>
          <span className="text-muted-foreground mr-2">Opening Balance:</span>
          <span className="font-bold"><Money value={data.openingBalance} /></span>
        </div>
        <div>
          <span className="text-muted-foreground mr-2">Closing Balance:</span>
          <span className="font-bold"><Money value={data.closingBalance} /></span>
        </div>
      </div>

      <DataTable 
        data={data.rows} 
        columns={columns} 
        keyExtractor={(r: any) => r.id}
        emptyState="No transactions in this period"
        page={data.page}
        totalPages={data.totalPages}
      />
    </div>
  )
}
