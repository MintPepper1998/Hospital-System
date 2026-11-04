"use client"

import { useState, useTransition, useMemo } from "react"
import { format, subDays, startOfMonth } from "date-fns"
import {
  ArrowRightLeft,
  CreditCard,
  Receipt,
  FileText,
  Search,
  Calendar,
  Trash2,
  Printer,
  Loader2,
  AlertTriangle,
  X,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  VoucherPrintModal,
  VoucherData,
  HospitalSettingsInfo,
} from "./voucher-print-modal"
import {
  deletePharmacyVoucher,
  getPharmacyVouchers,
} from "@/app/actions/pharmacy-fin/vouchers"

export interface VoucherItem {
  id: string
  voucherNumber: string
  type: string
  date: Date | string
  amount: number
  accountId?: string | null
  contraAccountId?: string | null
  account?: { id?: string; name: string; type?: string } | null
  contraAccount?: { id?: string; name: string; type?: string } | null
  partyName?: string | null
  particulars: string
  notes?: string | null
  status?: string
  createdBy?: string | null
  createdAt?: Date | string
}

interface VouchersListProps {
  initialVouchers?: VoucherItem[]
  vouchers?: VoucherItem[]
  isAdmin?: boolean
  hospitalSettings?: HospitalSettingsInfo | null
}

type DatePreset = "all" | "today" | "yesterday" | "7d" | "30d" | "mtd" | "custom"

export function VouchersList({
  initialVouchers,
  vouchers: fallbackVouchers,
  isAdmin = false,
  hospitalSettings,
}: VouchersListProps) {
  const router = useRouter()
  const rawList = initialVouchers || fallbackVouchers || []

  // List data state
  const [list, setList] = useState<VoucherItem[]>(rawList)
  const [isPending, startTransition] = useTransition()

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [activeType, setActiveType] = useState<string>("ALL")
  const [datePreset, setDatePreset] = useState<DatePreset>("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // Printing State
  const [printingVoucher, setPrintingVoucher] = useState<VoucherData | null>(null)

  // Deleting State (Admin only)
  const [deletingVoucher, setDeletingVoucher] = useState<VoucherItem | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Compute date strings for presets
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const yesterdayStr = useMemo(() => format(subDays(new Date(), 1), "yyyy-MM-dd"), [])
  const sevenDaysAgoStr = useMemo(() => format(subDays(new Date(), 7), "yyyy-MM-dd"), [])
  const thirtyDaysAgoStr = useMemo(() => format(subDays(new Date(), 30), "yyyy-MM-dd"), [])
  const startOfMonthStr = useMemo(() => format(startOfMonth(new Date()), "yyyy-MM-dd"), [])

  // Handler to fetch filtered data
  const applyFilters = (
    type = activeType,
    search = searchTerm,
    from = fromDate,
    to = toDate
  ) => {
    startTransition(async () => {
      const res = await getPharmacyVouchers({
        type: type === "ALL" ? undefined : type,
        search: search.trim() ? search.trim() : undefined,
        from: from ? from : undefined,
        to: to ? to : undefined,
        limit: 100,
      })

      if (res.success && res.data) {
        setList(res.data as VoucherItem[])
      } else {
        toast.error(res.message || "Failed to load vouchers")
      }
    })
  }

  // Handle Preset Changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    let newFrom = ""
    let newTo = ""

    if (preset === "today") {
      newFrom = todayStr
      newTo = todayStr
    } else if (preset === "yesterday") {
      newFrom = yesterdayStr
      newTo = yesterdayStr
    } else if (preset === "7d") {
      newFrom = sevenDaysAgoStr
      newTo = todayStr
    } else if (preset === "30d") {
      newFrom = thirtyDaysAgoStr
      newTo = todayStr
    } else if (preset === "mtd") {
      newFrom = startOfMonthStr
      newTo = todayStr
    } else if (preset === "all") {
      newFrom = ""
      newTo = ""
    }

    setFromDate(newFrom)
    setToDate(newTo)
    applyFilters(activeType, searchTerm, newFrom, newTo)
  }

  // Handle Type Filter Change
  const handleTypeChange = (type: string) => {
    setActiveType(type)
    applyFilters(type, searchTerm, fromDate, toDate)
  }

  // Handle Search Input submit / Enter key
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters(activeType, searchTerm, fromDate, toDate)
  }

  // Clear all filters
  const handleResetFilters = () => {
    setSearchTerm("")
    setActiveType("ALL")
    setDatePreset("all")
    setFromDate("")
    setToDate("")
    applyFilters("ALL", "", "", "")
  }

  // Handle Deletion Execution
  const handleConfirmDelete = async () => {
    if (!deletingVoucher) return
    setIsDeleting(true)

    try {
      const res = await deletePharmacyVoucher(deletingVoucher.id, deleteReason)
      if (res.success) {
        toast.success(res.message || "Voucher deleted and account balance adjusted")
        setDeletingVoucher(null)
        setDeleteReason("")
        // Refresh list
        applyFilters(activeType, searchTerm, fromDate, toDate)
        router.refresh()
      } else {
        toast.error(res.message || "Failed to delete voucher")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred")
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered list stats
  const stats = useMemo(() => {
    let receiptsTotal = 0
    let paymentsTotal = 0
    let contraCount = 0

    list.forEach((v) => {
      if (v.type === "RECEIPT") receiptsTotal += v.amount
      else if (v.type === "PAYMENT") paymentsTotal += v.amount
      else if (v.type === "CONTRA") contraCount += 1
    })

    return {
      count: list.length,
      receiptsTotal,
      paymentsTotal,
      netCash: receiptsTotal - paymentsTotal,
      contraCount,
    }
  }, [list])

  return (
    <div className="bg-card border border-border shadow-sm rounded-[1.5rem] overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="border-b border-border bg-muted/20 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight">Voucher Records</h2>
            <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5">
              {stats.count}
            </Badge>
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />}
          </div>

          {/* Quick Refresh */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyFilters(activeType, searchTerm, fromDate, toDate)}
              disabled={isPending}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {(searchTerm || activeType !== "ALL" || datePreset !== "all" || fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              placeholder="Search voucher #, party, narration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-9 text-xs sm:text-sm bg-background/80"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("")
                  applyFilters(activeType, "", fromDate, toDate)
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Date Presets Dropdown / Buttons */}
          <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs overflow-x-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handlePresetChange("all")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  datePreset === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("today")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  datePreset === "today"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("yesterday")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  datePreset === "yesterday"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("7d")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  datePreset === "7d"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("mtd")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  datePreset === "mtd"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("custom")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                  datePreset === "custom"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                Custom
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Range Selector (Visible when 'custom' is active or dates exist) */}
        {datePreset === "custom" && (
          <div className="flex flex-wrap items-center gap-2.5 bg-background/80 p-3 rounded-xl border border-border/80 text-xs animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-36 text-xs bg-card"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 w-36 text-xs bg-card"
              />
            </div>
            <Button
              size="sm"
              onClick={() => applyFilters(activeType, searchTerm, fromDate, toDate)}
              className="h-8 text-xs px-3"
            >
              Apply Range
            </Button>
          </div>
        )}

        {/* Type Filter Pills & Summary KPIs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "All Vouchers" },
              { id: "PAYMENT", label: "Payments" },
              { id: "RECEIPT", label: "Receipts" },
              { id: "CONTRA", label: "Contra / Transfer" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTypeChange(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeType === tab.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {stats.receiptsTotal > 0 && (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                In: +₹{stats.receiptsTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            )}
            {stats.paymentsTotal > 0 && (
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/50">
                Out: -₹{stats.paymentsTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vouchers List Container */}
      <div className="p-4 sm:p-6 divide-y divide-border/60">
        {list.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground/60">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No vouchers match your criteria</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try selecting a different date range, clearing search terms, or posting a new voucher.
              </p>
            </div>
            {(searchTerm || activeType !== "ALL" || datePreset !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-2 text-xs"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          list.map((voucher) => {
            const isPayment = voucher.type === "PAYMENT"
            const isReceipt = voucher.type === "RECEIPT"
            const isContra = voucher.type === "CONTRA"

            return (
              <div
                key={voucher.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-muted/15 -mx-2 px-2 rounded-xl transition-colors"
              >
                {/* Left side: Icon + Voucher Details */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 mt-0.5 transition-transform group-hover:scale-105 shadow-xs ${
                      isReceipt
                        ? "bg-emerald-100/80 text-emerald-800 border border-emerald-200"
                        : isPayment
                        ? "bg-rose-100/80 text-rose-800 border border-rose-200"
                        : "bg-blue-100/80 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {isReceipt && <Receipt className="h-5 w-5" />}
                    {isPayment && <CreditCard className="h-5 w-5" />}
                    {isContra && <ArrowRightLeft className="h-5 w-5" />}
                    {!isReceipt && !isPayment && !isContra && <FileText className="h-5 w-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm tracking-tight text-foreground">
                        {voucher.voucherNumber}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                        {format(new Date(voucher.date), "dd MMM yyyy")}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          isReceipt
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : isPayment
                            ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                            : "bg-blue-50 text-blue-700 border border-blue-200/60"
                        }`}
                      >
                        {voucher.type}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-foreground">
                      {voucher.particulars}
                      {voucher.partyName && (
                        <span className="text-muted-foreground ml-1 font-normal">
                          • {voucher.partyName}
                        </span>
                      )}
                    </p>

                    {/* Account flow path */}
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 pt-0.5">
                      {isContra ? (
                        <>
                          <span className="font-medium text-foreground/80">
                            {voucher.account?.name || "Account A"}
                          </span>
                          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-foreground/80">
                            {voucher.contraAccount?.name || "Account B"}
                          </span>
                        </>
                      ) : isPayment ? (
                        <>
                          <span>Paid from:</span>
                          <span className="font-medium text-foreground/80">
                            {voucher.account?.name || "Cash Drawer"}
                          </span>
                          {voucher.partyName && (
                            <>
                              <span>→</span>
                              <span className="font-medium text-foreground/80">
                                {voucher.partyName}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <span>Received into:</span>
                          <span className="font-medium text-foreground/80">
                            {voucher.account?.name || "Cash Drawer"}
                          </span>
                          {voucher.partyName && (
                            <>
                              <span>from</span>
                              <span className="font-medium text-foreground/80">
                                {voucher.partyName}
                              </span>
                            </>
                          )}
                        </>
                      )}
                      {voucher.notes && (
                        <span className="italic text-muted-foreground/75 truncate max-w-xs">
                          (Note: {voucher.notes})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Amount & Action Buttons */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                  <div
                    className={`text-lg font-bold font-mono tracking-tight ${
                      isReceipt
                        ? "text-emerald-600"
                        : isPayment
                        ? "text-rose-600"
                        : "text-blue-700"
                    }`}
                  >
                    {isPayment ? "-" : isReceipt ? "+" : "⇄ "}₹
                    {voucher.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>

                  {/* Action Buttons: Print & Delete */}
                  <div className="flex items-center gap-1.5">
                    {/* Print Slip Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrintingVoucher(voucher)}
                      title="Print Slip (80mm Bill Format)"
                      className="h-8 px-2.5 text-xs gap-1.5 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                      <span className="hidden sm:inline">Print Slip</span>
                    </Button>

                    {/* Delete Button (Only for Admins) */}
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeletingVoucher(voucher)
                          setDeleteReason("")
                        }}
                        title="Delete Voucher (Admin Only - Reverses Balance)"
                        className="h-8 px-2 text-rose-600 border-rose-200/70 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:inline sm:text-xs sm:ml-1">
                          Delete
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Print Slip Preview & Trigger Modal */}
      <VoucherPrintModal
        isOpen={!!printingVoucher}
        onClose={() => setPrintingVoucher(null)}
        voucher={printingVoucher}
        hospitalSettings={hospitalSettings}
      />

      {/* Delete Confirmation Modal (Admin Only) */}
      <Dialog
        open={!!deletingVoucher}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingVoucher(null)
            setDeleteReason("")
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Delete Voucher</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1.5">
              Only Administrators can delete vouchers. This action will reverse financial transactions
              and adjust the account balance.
            </DialogDescription>
          </DialogHeader>

          {deletingVoucher && (
            <div className="space-y-4 py-2">
              {/* Voucher Overview */}
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Voucher Number:</span>
                  <span className="font-mono font-bold">{deletingVoucher.voucherNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Type:</span>
                  <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                    {deletingVoucher.type}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Amount:</span>
                  <span className="font-bold font-mono text-sm">
                    ₹{deletingVoucher.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Particulars:</span>
                  <span className="font-medium truncate max-w-[200px]">
                    {deletingVoucher.particulars}
                  </span>
                </div>
              </div>

              {/* Balance Adjustment Notice */}
              <div className="bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>⚠️ Balance Adjustment Warning</span>
                </div>
                {deletingVoucher.type === "PAYMENT" && (
                  <p className="leading-relaxed">
                    This was an outflow payment. Deleting it will{" "}
                    <strong>refund ₹{deletingVoucher.amount.toFixed(2)}</strong> back to{" "}
                    <span className="underline decoration-dotted">
                      {deletingVoucher.account?.name || "the account"}
                    </span>
                    .
                  </p>
                )}
                {deletingVoucher.type === "RECEIPT" && (
                  <p className="leading-relaxed">
                    This was an inflow receipt. Deleting it will{" "}
                    <strong>deduct ₹{deletingVoucher.amount.toFixed(2)}</strong> from{" "}
                    <span className="underline decoration-dotted">
                      {deletingVoucher.account?.name || "the account"}
                    </span>
                    . (Requires sufficient current balance).
                  </p>
                )}
                {deletingVoucher.type === "CONTRA" && (
                  <p className="leading-relaxed">
                    This was a fund transfer. Deleting it will reverse the transfer: deduct{" "}
                    <strong>₹{deletingVoucher.amount.toFixed(2)}</strong> from{" "}
                    <span className="underline decoration-dotted">
                      {deletingVoucher.contraAccount?.name || "destination account"}
                    </span>{" "}
                    and refund it to{" "}
                    <span className="underline decoration-dotted">
                      {deletingVoucher.account?.name || "source account"}
                    </span>
                    .
                  </p>
                )}
              </div>

              {/* Optional Reason Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Reason for Deletion (Saved to Audit Log)
                </label>
                <Input
                  placeholder="e.g. Mistake in party name, duplicate entry..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeletingVoucher(null)
                setDeleteReason("")
              }}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Reversing & Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete & Reverse Balance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
