"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { Money } from "./money"
import { fmtIST } from "@/lib/pharmacy-finance/dates"
import { DateRangeFilter } from "./date-range-filter"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export function StatementClient({ data, supplier, range, searchParams }: { data: any[]; supplier: any; range: any; searchParams: any }) {
  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Statement: ${supplier?.name || "Supplier"}`} 
        subtitle={`Outstanding: ₹${supplier?.outstanding.toLocaleString("en-IN") || 0}`}
        action={
          <div className="flex items-center gap-3">
            <DateRangeFilter />
            <Button asChild variant="outline">
              <Link href="/dashboard/pharmacy-finance/payables">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Payables
              </Link>
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-100">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Debit (₹)</th>
              <th className="px-6 py-3 text-right">Credit (₹)</th>
              <th className="px-6 py-3 text-right">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">No transactions found for this period.</td>
              </tr>
            ) : (
              data.map((r, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-3 whitespace-nowrap">{fmtIST(r.date, "dd MMM yyyy")}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{r.description}</td>
                  <td className="px-6 py-3 text-right">{r.debit > 0 ? <Money value={r.debit} /> : ""}</td>
                  <td className="px-6 py-3 text-right">{r.credit > 0 ? <Money value={r.credit} /> : ""}</td>
                  <td className="px-6 py-3 text-right font-medium">
                    <span className={r.runningBalance < 0 ? "text-emerald-600" : ""}>
                      {r.runningBalance < 0 ? "" : ""}<Money value={r.runningBalance} />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
