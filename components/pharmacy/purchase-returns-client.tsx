"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Eye, Plus, RotateCcw } from "lucide-react"

// ============================================
// NEOMORPHIC STYLE TOKENS
// ============================================

const neo = {
  card: "rounded-2xl bg-[#e0e5ec] border-none",
  shadow: "shadow-[6px_6px_12px_#bec3c9,-6px_-6px_12px_#ffffff]",
  shadowSm: "shadow-[3px_3px_6px_#bec3c9,-3px_-3px_6px_#ffffff]",
  inset: "shadow-[inset_3px_3px_6px_#bec3c9,inset_-3px_-3px_6px_#ffffff]",
  inputBg: "bg-[#e0e5ec]",
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PurchaseReturnsClient({ initialReturns }: { initialReturns: any[] }) {
  const [returns, setReturns] = useState(initialReturns)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  const filteredReturns = useMemo(() => {
    if (!debouncedQuery) return returns
    const q = debouncedQuery.toLowerCase()
    return returns.filter((r) => 
      r.returnNumber.toLowerCase().includes(q) || 
      r.supplier.name.toLowerCase().includes(q)
    )
  }, [returns, debouncedQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Search */}
        <div className={`relative flex-1 max-w-md ${neo.inset} rounded-xl flex items-center px-4 py-1.5`}>
          <Search className="h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search returns by number, supplier..." 
            className={`border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm h-9 placeholder:text-slate-400`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Button - this could be a new page or dialog */}
        <Link href="/dashboard/pharmacy/purchase-returns/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-[4px_4px_8px_#bec3c9,-4px_-4px_8px_#ffffff]">
            <Plus className="mr-2 h-4 w-4" />
            New Return
          </Button>
        </Link>
      </div>

      {/* Main Table */}
      <div className={`${neo.card} ${neo.shadow} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[#d1d9e6]/50 text-slate-500 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Return No.</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Supplier</th>
                <th className="px-6 py-4 font-semibold">Reason</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d1d9e6]/30">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <RotateCcw className="h-12 w-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No returns found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{r.returnNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(r.date), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{r.supplier.name}</div>
                      {r.invoiceId && <div className="text-xs text-slate-400">Linked to Invoice</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 bg-slate-200/50 text-slate-600 rounded-md text-xs font-medium">
                        {r.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-slate-700">{formatINR(r.totalAmount)}</div>
                      <div className="text-xs text-slate-400">{r.items.length} items</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-none">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-200 rounded-xl">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-xl min-w-[160px]">
                          <DropdownMenuLabel className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-slate-600 focus:bg-slate-100">
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
