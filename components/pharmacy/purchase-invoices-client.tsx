"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  CreditCard,
  FileText,
  Merge,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  CircleCheck,
  Clock,
  CircleAlert,
} from "lucide-react"
import { deletePurchaseInvoice, mergePurchaseInvoices } from "@/lib/actions/purchase-invoices"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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

// ============================================
// HELPERS
// ============================================

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatINRShort(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    PAID: { bg: "bg-emerald-100/80", text: "text-emerald-700", dot: "bg-emerald-500", label: "Paid" },
    PARTIAL: { bg: "bg-amber-100/80", text: "text-amber-700", dot: "bg-amber-500", label: "Partial" },
    UNPAID: { bg: "bg-red-100/80", text: "text-red-600", dot: "bg-red-500", label: "Unpaid" },
  }
  const c = config[status] || config.UNPAID
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ============================================
// STAT CARD (neomorphic)
// ============================================

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className={`${neo.card} ${neo.shadow} p-5 flex flex-col gap-2 transition-all duration-300 hover:translate-y-[-2px]`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${neo.card} ${neo.shadowSm} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PurchaseInvoicesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const router = useRouter()
  const [invoices, setInvoices] = useState(initialInvoices)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection for merge
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMerging, setIsMerging] = useState(false)

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Payment dialog
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null)

  // Debounce search
  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim().toLowerCase())
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false
      if (debouncedQuery) {
        const q = debouncedQuery
        return (
          inv.invoiceNumber.toLowerCase().startsWith(q) ||
          inv.supplier?.name?.toLowerCase().startsWith(q)
        )
      }
      return true
    })
  }, [invoices, debouncedQuery, statusFilter])

  // ── Stats ────────────────────
  const stats = useMemo(() => {
    const totalInvoices = invoices.length
    const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.grandTotal || 0), 0)
    const totalPaid = invoices.reduce((sum: number, inv: any) => sum + (inv.amountPaid || 0), 0)
    const totalDue = totalAmount - totalPaid
    const paidCount = invoices.filter((inv: any) => inv.status === "PAID").length
    const partialCount = invoices.filter((inv: any) => inv.status === "PARTIAL").length
    const unpaidCount = invoices.filter((inv: any) => inv.status === "UNPAID").length
    return { totalInvoices, totalAmount, totalPaid, totalDue, paidCount, partialCount, unpaidCount }
  }, [invoices])

  // ── Delete ────────────────────
  const confirmDelete = (id: string) => {
    setInvoiceToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!invoiceToDelete) return
    setIsDeleting(true)
    try {
      const result = await deletePurchaseInvoice(invoiceToDelete)
      if (result.success) {
        toast.success(result.message)
        setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceToDelete))
      } else {
        toast.error(result.message || "Failed to delete")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsDeleting(false)
      setDeleteConfirmOpen(false)
      setInvoiceToDelete(null)
    }
  }

  // ── Merge ────────────────────
  const handleMerge = async () => {
    if (selectedIds.size < 2) { toast.error("Select at least 2 invoices to merge"); return }
    const selectedInvoices = invoices.filter((inv) => selectedIds.has(inv.id))
    const supplierIds = new Set(selectedInvoices.map((inv) => inv.supplierId))
    if (supplierIds.size > 1) { toast.error("Can only merge invoices from the same supplier"); return }

    setIsMerging(true)
    try {
      const result = await mergePurchaseInvoices(Array.from(selectedIds))
      if (result.success) {
        toast.success(result.message)
        setSelectedIds(new Set())
        router.refresh()
      } else { toast.error(result.message) }
    } catch { toast.error("Failed to merge invoices") }
    finally { setIsMerging(false) }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-8">
      {/* ══════════════════════════════════════════
          STATS ROW — neomorphic raised cards
         ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard
          icon={<Receipt className="h-4 w-4 text-indigo-500" />}
          label="Invoices"
          value={stats.totalInvoices.toString()}
          color="text-slate-800"
          sub={`${filteredInvoices.length} shown`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          label="Total Purchase"
          value={formatINRShort(stats.totalAmount)}
          color="text-blue-700"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
          label="Total Paid"
          value={formatINRShort(stats.totalPaid)}
          color="text-emerald-600"
        />
        <StatCard
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          label="Outstanding"
          value={formatINRShort(stats.totalDue)}
          color="text-red-600"
          sub={stats.totalDue > 0 ? "Due to suppliers" : "All clear!"}
        />
        <StatCard
          icon={<CircleCheck className="h-4 w-4 text-emerald-500" />}
          label="Paid"
          value={stats.paidCount.toString()}
          color="text-emerald-600"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          label="Partial"
          value={stats.partialCount.toString()}
          color="text-amber-600"
        />
        <StatCard
          icon={<CircleAlert className="h-4 w-4 text-red-500" />}
          label="Unpaid"
          value={stats.unpaidCount.toString()}
          color="text-red-600"
        />
      </div>

      {/* ══════════════════════════════════════════
          MAIN TABLE CARD — neomorphic
         ══════════════════════════════════════════ */}
      <div className={`${neo.card} ${neo.shadow} overflow-hidden`}>
        {/* ── Header / Toolbar ── */}
        <div className="px-6 pt-6 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${neo.card} ${neo.shadowSm} flex items-center justify-center`}>
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Purchase Invoices</h2>
                <p className="text-xs text-slate-400">{filteredInvoices.length} of {invoices.length} invoices</p>
              </div>
            </div>

            {/* Merge button */}
            {selectedIds.size >= 2 && (
              <Button
                onClick={handleMerge}
                disabled={isMerging}
                className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
              >
                <Merge className="h-4 w-4" />
                Merge {selectedIds.size} Invoices
              </Button>
            )}
          </div>

          {/* ── Search + Filter Row ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className={`relative flex-1 rounded-xl ${neo.inset} transition-all duration-200`}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Search by invoice number or supplier…"
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className={`w-full pl-11 pr-10 py-2.5 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400`}
              />
              {searchInput && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => { setSearchInput(""); setDebouncedQuery("") }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className={`rounded-xl ${neo.shadowSm} overflow-hidden`}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={`w-[160px] border-none ${neo.inputBg} rounded-xl h-10`}>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PAID">✅ Paid</SelectItem>
                  <SelectItem value="PARTIAL">⏳ Partial</SelectItem>
                  <SelectItem value="UNPAID">🔴 Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className={`w-16 h-16 rounded-2xl ${neo.card} ${neo.shadow} flex items-center justify-center mx-auto mb-4`}>
              <FileText className="h-7 w-7 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600">No invoices found</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Purchase invoices will appear here when you add stock through the inventory section.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-200/50">
                  <th className="px-4 py-3 text-left w-10">
                    <Checkbox
                      checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds(new Set(filteredInvoices.map((inv) => inv.id)))
                        else setSelectedIds(new Set())
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Invoice</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Supplier</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Items</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Grand Total</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Paid</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Balance</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {filteredInvoices.map((inv, idx) => {
                  const balance = (inv.grandTotal || 0) - (inv.amountPaid || 0)
                  const isSelected = selectedIds.has(inv.id)
                  return (
                    <tr
                      key={inv.id}
                      className={`
                        transition-all duration-200 group
                        ${isSelected ? "bg-indigo-50/60" : idx % 2 === 0 ? "bg-transparent" : "bg-slate-100/30"}
                        hover:bg-indigo-50/40
                      `}
                    >
                      <td className="px-4 py-3">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(inv.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/pharmacy/purchase-invoices/${inv.id}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{inv.supplier?.name || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[13px]">
                        {format(new Date(inv.date), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${neo.card} ${neo.shadowSm} text-slate-600`}>
                          {inv.items?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                        {formatINR(inv.grandTotal || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold tabular-nums">
                        {(inv.amountPaid || 0) > 0 ? formatINR(inv.amountPaid || 0) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {balance > 0.01 ? (
                          <span className="font-bold text-red-600">{formatINR(balance)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={`w-8 h-8 rounded-lg ${neo.card} ${neo.shadowSm} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                              <MoreHorizontal className="h-4 w-4 text-slate-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                            <DropdownMenuLabel className="text-xs text-slate-400">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/pharmacy/purchase-invoices/${inv.id}`} className="gap-2">
                                <Eye className="h-4 w-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            {inv.status !== "PAID" && (
                              <DropdownMenuItem onClick={() => setPaymentInvoice(inv)} className="gap-2">
                                <CreditCard className="h-4 w-4" /> Record Payment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                              onClick={() => confirmDelete(inv.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer ── */}
        {filteredInvoices.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-200/60">
            <p className="text-xs text-slate-400">
              {selectedIds.size > 0
                ? `${selectedIds.size} invoice${selectedIds.size > 1 ? "s" : ""} selected`
                : `Showing ${filteredInvoices.length} of ${invoices.length} invoices`
              }
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Total: <strong className="text-slate-700">{formatINR(filteredInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0))}</strong></span>
              <span>Due: <strong className="text-red-600">{formatINR(filteredInvoices.reduce((s, i) => s + Math.max((i.grandTotal || 0) - (i.amountPaid || 0), 0), 0))}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          DIALOGS
         ══════════════════════════════════════════ */}

      {/* Payment Dialog */}
      {paymentInvoice && (
        <RecordPaymentDialog
          invoice={paymentInvoice}
          open={!!paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSuccess={() => { setPaymentInvoice(null); router.refresh() }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this purchase invoice and all its line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
