"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  Search, ChevronLeft, ChevronRight, Calendar, User, 
  Stethoscope, BedDouble, Clock, ArrowRight, History,
  FileText, Phone
} from "lucide-react"
import { format } from "date-fns"

interface PastAdmission {
  id: string
  ipNumber: string | null
  patientName: string
  patientId: string
  gender: string | null
  phone: string | null
  admissionDate: string
  dischargeDate: string | null
  dischargeType: string | null
  daysAdmitted: number
  wardName: string
  bedNumber: string
  doctorName: string
  diagnosis: string | null
  totalBillAmount: number
  amountPaid: number
  balanceDue: number
  reason: string | null
}

interface PastRecordsListClientProps {
  admissions: PastAdmission[]
  total: number
  page: number
  totalPages: number
  initialSearch: string
}

const dischargeBadge: Record<string, { label: string; color: string }> = {
  NORMAL: { label: "Normal", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  LAMA: { label: "LAMA", color: "bg-amber-50 text-amber-700 border-amber-200" },
  DAMA: { label: "DAMA", color: "bg-orange-50 text-orange-700 border-orange-200" },
  ABSCONDED: { label: "Absconded", color: "bg-red-50 text-red-700 border-red-200" },
  REFERRED: { label: "Referred", color: "bg-blue-50 text-blue-700 border-blue-200" },
  EXPIRED: { label: "Expired", color: "bg-gray-100 text-gray-600 border-gray-300" },
}

export function PastRecordsListClient({ admissions, total, page, totalPages, initialSearch }: PastRecordsListClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search.trim()) params.set("q", search.trim())
    params.set("page", "1")
    router.push(`/dashboard/ipd/past-records?${params.toString()}`)
  }

  const goToPage = (p: number) => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("q", search.trim())
    params.set("page", String(p))
    router.push(`/dashboard/ipd/past-records?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Past Records</h1>
              <p className="text-sm text-slate-500">{total} discharged patient{total !== 1 ? 's' : ''} found</p>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
          className="mb-8"
        >
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient name, ID, phone, Aadhaar, IP number, or diagnosis..."
              className="w-full pl-12 pr-32 py-4 text-sm bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-300 placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 active:scale-[0.97] shadow-md shadow-indigo-200/50"
            >
              Search Records
            </button>
          </div>
        </motion.form>

        {/* Results List */}
        {admissions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No past records found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search criteria</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {admissions.map((adm, i) => {
              const badge = dischargeBadge[adm.dischargeType || "NORMAL"] || dischargeBadge.NORMAL
              return (
                <motion.div
                  key={adm.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease: [0.32, 0.72, 0, 1] }}
                  onClick={() => router.push(`/dashboard/ipd/past-records/${adm.id}`)}
                  className="group bg-white border border-slate-200/80 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:shadow-slate-200/50 hover:border-indigo-200/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Patient Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/50 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors duration-300">{adm.patientName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-slate-500 font-medium">{adm.patientId}</span>
                          {adm.ipNumber && <span className="text-xs text-slate-400">IP: {adm.ipNumber}</span>}
                          {adm.phone && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />{adm.phone}
                            </span>
                          )}
                        </div>
                        {adm.diagnosis && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-1">
                            <span className="font-semibold text-slate-600">Dx:</span> {adm.diagnosis}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Dates & Doctor */}
                    <div className="hidden md:flex flex-col items-start gap-1.5 min-w-[200px]">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {format(new Date(adm.admissionDate), "dd MMM yyyy")}
                        <span className="text-slate-300">→</span>
                        {adm.dischargeDate ? format(new Date(adm.dischargeDate), "dd MMM yyyy") : "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {adm.daysAdmitted} day{adm.daysAdmitted !== 1 ? "s" : ""} stay
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                        {adm.doctorName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                        {adm.wardName} · {adm.bedNumber}
                      </div>
                    </div>

                    {/* Right: Amount & Arrow */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">₹{adm.totalBillAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        {adm.balanceDue > 0 && (
                          <div className="text-[10px] text-red-500 font-semibold">Due: ₹{adm.balanceDue.toLocaleString("en-IN")}</div>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all duration-500" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 mt-8"
          >
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    pageNum === page
                      ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-200/50"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
