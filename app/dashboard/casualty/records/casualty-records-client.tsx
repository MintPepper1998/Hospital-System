"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format, formatDistanceStrict } from "date-fns"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Stethoscope,
  FileText,
  ArrowLeft,
  Syringe,
  Bandage,
  Receipt,
  History,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ──────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────
interface CasualtyRecord {
  id: string
  patientName: string
  patientId: string
  gender: string | null
  phone: string | null
  chiefComplaint: string | null
  status: string
  arrivalTime: string
  dischargeTime: string | null
  doctorName: string | null
  procedureCount: number
  procedureTotal: number
  opdBookings: Array<{ doctorName: string; status: string }>
  totalBilled: number
  totalPaid: number
  billNumbers: string[]
}

interface CasualtyRecordsClientProps {
  records: CasualtyRecord[]
  total: number
  page: number
  totalPages: number
  initialSearch: string
  initialFrom: string
  initialTo: string
  initialStatus: string
}

// ──────────────────────────────────────────────────
// STATUS CONFIG
// ──────────────────────────────────────────────────
const statusBadge: Record<string, { label: string; cls: string }> = {
  DISCHARGED: { label: "Discharged", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REFERRED_TO_OPD: { label: "Referred to OPD", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  ADMITTED: { label: "Admitted", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  TREATING: { label: "Treating", cls: "bg-blue-50 text-blue-700 border-blue-200" },
}

// ──────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────
export function CasualtyRecordsClient({
  records,
  total,
  page,
  totalPages,
  initialSearch,
  initialFrom,
  initialTo,
  initialStatus,
}: CasualtyRecordsClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [dateFrom, setDateFrom] = useState(initialFrom)
  const [dateTo, setDateTo] = useState(initialTo)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  function buildUrl(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams()
    const q = overrides.q ?? search.trim()
    const from = overrides.from ?? dateFrom
    const to = overrides.to ?? dateTo
    const st = overrides.status ?? statusFilter
    const pg = overrides.page ?? "1"
    if (q) params.set("q", q)
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (st && st !== "ALL") params.set("status", st)
    params.set("page", pg)
    return `/dashboard/casualty/records?${params.toString()}`
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl({ page: "1" }))
  }

  function goToPage(p: number) {
    router.push(buildUrl({ page: String(p) }))
  }

  return (
    <>
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/casualty"
            className="neo-button bg-[#e0e5ec] rounded-xl p-2.5 text-zinc-600 hover:text-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <History className="h-6 w-6 text-orange-500" />
              Casualty Records
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {total} record{total !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <Link href="/dashboard/casualty">
          <Button className="neo-button bg-[#e0e5ec] text-zinc-800 hover:bg-[#d5dae2] rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2">
            <Bandage className="h-4 w-4 text-orange-500" />
            Active Casualty Dashboard
          </Button>
        </Link>
      </div>

      {/* ═══════════════ FILTERS ═══════════════ */}
      <form onSubmit={handleSearch} className="neo-flat bg-[#e0e5ec] rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, ID, phone, complaint…"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/70 neo-pressed rounded-xl border-0 outline-none"
              />
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white/70 neo-pressed rounded-xl border-0 outline-none"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white/70 neo-pressed rounded-xl border-0 outline-none"
            />
          </div>

          {/* Status + Apply */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white/70 neo-pressed rounded-xl border-0 outline-none font-medium"
              >
                <option value="ALL">All Closed</option>
                <option value="DISCHARGED">Discharged</option>
                <option value="REFERRED_TO_OPD">Referred to OPD</option>
              </select>
            </div>
            <button
              type="submit"
              className="neo-button bg-[#e0e5ec] text-zinc-700 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#d5dae2] transition-colors active:scale-95"
            >
              Apply
            </button>
          </div>
        </div>
      </form>

      {/* ═══════════════ RECORDS LIST ═══════════════ */}
      {records.length === 0 ? (
        <div className="neo-flat bg-[#e0e5ec] rounded-3xl p-16 text-center">
          <FileText className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-600">No records found</h3>
          <p className="text-sm text-zinc-500 mt-1">Try adjusting your search or date filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const st = statusBadge[record.status] || statusBadge.DISCHARGED
            const duration =
              record.dischargeTime && record.arrivalTime
                ? formatDistanceStrict(new Date(record.arrivalTime), new Date(record.dischargeTime))
                : null
            const balance = record.totalBilled - record.totalPaid

            return (
              <div
                key={record.id}
                className="neo-flat bg-[#e0e5ec] rounded-2xl p-5 hover:translate-y-[-1px] transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Avatar + Patient Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-orange-600 font-bold text-sm flex-shrink-0">
                      {record.patientName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Link
                          href={`/dashboard/casualty/patient/${record.id}`}
                          className="font-bold text-sm text-zinc-800 hover:text-orange-600 transition-colors"
                        >
                          {record.patientName}
                        </Link>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                          {record.patientId}
                        </span>
                        <Badge className={`${st.cls} text-[9px] font-semibold border rounded-full px-2 py-0.5`}>
                          {st.label}
                        </Badge>
                      </div>

                      {/* Details row */}
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(record.arrivalTime), "dd MMM yyyy, hh:mm a")}
                        </span>
                        {duration && (
                          <span className="font-medium text-zinc-600">({duration})</span>
                        )}
                        {record.doctorName && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" />
                            Dr. {record.doctorName}
                          </span>
                        )}
                        {record.phone && (
                          <span className="flex items-center gap-1">📞 {record.phone}</span>
                        )}
                      </div>

                      {/* Complaint */}
                      {record.chiefComplaint && (
                        <p className="text-xs text-zinc-600 mt-2">
                          <span className="font-semibold text-zinc-700">Complaint:</span> {record.chiefComplaint}
                        </p>
                      )}

                      {/* Procedures + OPD info */}
                      <div className="flex items-center gap-3 flex-wrap mt-2">
                        {record.procedureCount > 0 && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            <Syringe className="h-3 w-3" />
                            {record.procedureCount} procedure{record.procedureCount !== 1 ? "s" : ""} · ₹{record.procedureTotal.toLocaleString("en-IN")}
                          </span>
                        )}
                        {record.opdBookings.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                            <FileText className="h-3 w-3" />
                            OPD: Dr. {record.opdBookings[0].doctorName}
                            {record.opdBookings.length > 1 && ` +${record.opdBookings.length - 1}`}
                          </span>
                        )}
                        {record.billNumbers.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Receipt className="h-3 w-3" />
                            {record.billNumbers.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Billing summary */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[120px]">
                    {record.totalBilled > 0 ? (
                      <>
                        <p className="text-sm font-bold text-zinc-800">₹{record.totalBilled.toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-zinc-500">
                          Paid: ₹{record.totalPaid.toLocaleString("en-IN")}
                        </p>
                        {balance > 0 && (
                          <p className="text-[10px] font-semibold text-red-600">
                            Due: ₹{balance.toLocaleString("en-IN")}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-zinc-400 font-medium">No billing</p>
                    )}
                    {record.dischargeTime && (
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {format(new Date(record.dischargeTime), "dd MMM, hh:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════ PAGINATION ═══════════════ */}
      {totalPages > 1 && (
        <div className="neo-flat bg-[#e0e5ec] rounded-2xl p-4 flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">
            Page {page} of {totalPages} · {total} total records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="neo-button bg-[#e0e5ec] rounded-xl p-2 text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = startPage + i
              if (p > totalPages) return null
              return (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`neo-button bg-[#e0e5ec] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    p === page ? "neo-pressed text-orange-600" : "text-zinc-600 hover:text-zinc-800"
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="neo-button bg-[#e0e5ec] rounded-xl p-2 text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
