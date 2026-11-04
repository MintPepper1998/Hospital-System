"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { format, differenceInCalendarDays, isToday, isTomorrow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import {
  CalendarClock, Globe, Phone, Clock, User, Search, X,
  ChevronDown, ChevronRight, MapPin, Stethoscope, CalendarDays,
  ArrowRight, Bell, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// ── Types ──
export interface UpcomingAppointment {
  id: string
  appointmentDate: string
  appointmentTime: string
  status: string
  reason: string | null
  chiefComplaint: string | null
  patientName: string
  patientId: string
  patientDbId: string
  patientGender: string | null
  patientAge: number | null
  patientPhone: string | null
  doctorName: string | null
  doctorDepartment: string | null
}

export interface OnlineBookingItem {
  id: string
  patientName: string
  phone: string
  email: string | null
  age: number | null
  gender: string | null
  department: string
  preferredDate: string
  preferredTime: string
  reason: string | null
  bookingToken: string
  status: string
  createdAt: string
  doctorName: string | null
}

interface Props {
  upcomingAppointments: UpcomingAppointment[]
  onlineBookings: OnlineBookingItem[]
}

// ── Helpers ──
const AVATAR_COLORS = [
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
]

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function relativeDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  const diff = differenceInCalendarDays(date, new Date())
  if (diff <= 7) return `In ${diff} days`
  return format(date, "EEEE, MMM d")
}

// ── Spring animation configs ──
const springTransition = { type: "spring" as const, stiffness: 100, damping: 20 }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.06,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
}

// ── Pulsing dot (CSS-only, isolated) ──
function PulsingDot({ color = "bg-teal-500" }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  )
}

// ── Status badge helper ──
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "CONFIRMED":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
          Confirmed
        </Badge>
      )
    case "SCHEDULED":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5" />
          Scheduled
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 text-[10px]">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
  }
}

export function UpcomingAppointmentsSection({ upcomingAppointments, onlineBookings }: Props) {
  const [apptSearch, setApptSearch] = useState("")
  const [bookingSearch, setBookingSearch] = useState("")
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set())

  // Filter upcoming appointments
  const filteredAppointments = useMemo(() => {
    if (!apptSearch.trim()) return upcomingAppointments
    const q = apptSearch.toLowerCase()
    return upcomingAppointments.filter(a =>
      a.patientName?.toLowerCase().includes(q) ||
      a.patientId.toLowerCase().includes(q) ||
      a.doctorName?.toLowerCase().includes(q) ||
      a.reason?.toLowerCase().includes(q) ||
      a.chiefComplaint?.toLowerCase().includes(q)
    )
  }, [upcomingAppointments, apptSearch])

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, UpcomingAppointment[]> = {}
    filteredAppointments.forEach(a => {
      const dateKey = format(new Date(a.appointmentDate), "yyyy-MM-dd")
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(a)
    })
    // Sort dates ascending
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredAppointments])

  // Filter online bookings
  const filteredBookings = useMemo(() => {
    if (!bookingSearch.trim()) return onlineBookings
    const q = bookingSearch.toLowerCase()
    return onlineBookings.filter(b =>
      b.patientName?.toLowerCase().includes(q) ||
      b.phone.includes(q) ||
      b.bookingToken.toLowerCase().includes(q) ||
      b.department.toLowerCase().includes(q)
    )
  }, [onlineBookings, bookingSearch])

  const toggleDate = (dateKey: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  return (
    <div id="upcoming-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ── Left Panel: Upcoming Appointments ── */}
      <div className="lg:col-span-8">
        <div className="neo-flat rounded-[2.5rem] bg-[#e0e5ec] p-6 sm:p-8">
          <div className="pb-6 mb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-zinc-800 tracking-tight">
                  <div className="p-2 neo-pressed rounded-full text-blue-600 bg-[#e0e5ec]">
                    <CalendarClock className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  Upcoming Appointments
                </h3>
                <p className="text-sm font-medium text-zinc-500 mt-2 pl-12">
                  {upcomingAppointments.length} scheduled across {groupedByDate.length} date{groupedByDate.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="relative flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search patient, doctor..."
                  value={apptSearch}
                  onChange={e => setApptSearch(e.target.value)}
                  className="pl-11 pr-10 py-3 text-sm rounded-[1.25rem] neo-pressed bg-[#e0e5ec] text-zinc-700 placeholder:text-zinc-400 outline-none w-full sm:w-72 font-medium"
                />
                {apptSearch && (
                  <button
                    onClick={() => setApptSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 neo-button rounded-full p-1.5 text-zinc-500 bg-[#e0e5ec]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="neo-pressed rounded-[2rem] p-4 sm:p-6 bg-[#e0e5ec]">
            {groupedByDate.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springTransition}
                className="text-center py-16"
              >
                <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
                <h3 className="mt-4 text-lg font-semibold">
                  {apptSearch ? "No matching appointments" : "No upcoming appointments"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  {apptSearch
                    ? "Try a different search term"
                    : "Future scheduled appointments will appear here grouped by date"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                {groupedByDate.map(([dateKey, appointments]) => {
                  const isCollapsed = collapsedDates.has(dateKey)
                  const dateObj = new Date(dateKey)
                  const label = relativeDateLabel(dateKey)
                  const dayName = format(dateObj, "EEEE")
                  const fullDate = format(dateObj, "MMM d, yyyy")

                  return (
                    <motion.div key={dateKey} variants={itemVariants} layout className="mb-4 last:mb-0">
                      {/* Date header */}
                      <button
                        onClick={() => toggleDate(dateKey)}
                        className="w-full flex items-center gap-4 group mb-4 cursor-pointer outline-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full neo-flat bg-[#e0e5ec] flex items-center justify-center text-blue-600 transition-transform group-hover:scale-105">
                            <CalendarDays className="h-4 w-4" strokeWidth={2} />
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-bold text-zinc-800">
                              {label}
                            </span>
                            {label !== dayName && label !== fullDate && (
                              <span className="text-xs font-semibold text-zinc-500 ml-2">
                                {dayName}, {fullDate}
                              </span>
                            )}
                            {(label === dayName || label === fullDate) && (
                              <span className="text-xs font-semibold text-zinc-500 ml-2">
                                {fullDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="px-2.5 py-0.5 rounded-full neo-pressed text-[10px] font-bold text-zinc-600 bg-[#e0e5ec] ml-1">
                          {appointments.length}
                        </div>
                        <div className="flex-1 border-t-2 border-dashed border-zinc-300 mx-4 opacity-50" />
                        <motion.div
                          animate={{ rotate: isCollapsed ? -90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </motion.div>
                      </button>

                      {/* Appointment cards */}
                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-4 pl-1 pb-2">
                              {appointments.map((appt, idx) => {
                                return (
                                  <motion.div
                                    key={appt.id}
                                    layout
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={springTransition}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-[1.5rem] neo-flat bg-[#e0e5ec] gap-4 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="h-12 w-12 rounded-full neo-pressed bg-[#e0e5ec] flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-black text-zinc-700 tracking-tighter">
                                          {initials(appt.patientName)}
                                        </span>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-base font-bold text-zinc-800 truncate">{appt.patientName}</p>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mt-1 flex-wrap">
                                          <span className="px-2 py-0.5 rounded-full neo-pressed text-[10px] text-blue-600 bg-[#e0e5ec]">{appt.patientId}</span>
                                          {appt.patientAge && (
                                            <>
                                              <span className="text-zinc-300">•</span>
                                              <span>{appt.patientAge} yrs{appt.patientGender ? ` / ${appt.patientGender}` : ""}</span>
                                            </>
                                          )}
                                          {appt.doctorName && (
                                            <>
                                              <span className="text-zinc-300">•</span>
                                              <span className="flex items-center gap-1">
                                                <Stethoscope className="h-3 w-3" />
                                                Dr. {appt.doctorName}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                      <div className="text-right hidden sm:block">
                                        <div className="flex justify-end items-center gap-1.5 text-sm font-bold text-zinc-700">
                                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                                          {appt.appointmentTime}
                                        </div>
                                        {appt.reason && (
                                          <p className="text-[11px] text-muted-foreground truncate max-w-[140px] mt-0.5">
                                            {appt.reason}
                                          </p>
                                        )}
                                      </div>
                                      <StatusBadge status={appt.status} />
                                    </div>
                                  </motion.div>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Online Bookings ── */}
      <div className="lg:col-span-4">
        <div className="neo-flat rounded-[2.5rem] bg-[#e0e5ec] p-6 sm:p-8 flex flex-col h-full">
          <div className="pb-6 mb-2">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-xl font-bold flex items-center gap-3 text-zinc-800 tracking-tight">
                <div className="p-2 neo-pressed rounded-full text-teal-600 bg-[#e0e5ec]">
                  <Globe className="h-5 w-5" strokeWidth={1.5} />
                </div>
                Online Bookings
                {onlineBookings.length > 0 && (
                  <div className="px-2 py-0.5 neo-pressed rounded-full text-[10px] font-bold text-teal-600 bg-[#e0e5ec] ml-1">
                    {onlineBookings.length}
                  </div>
                )}
              </h3>
              {onlineBookings.length > 0 && <PulsingDot />}
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={bookingSearch}
                onChange={e => setBookingSearch(e.target.value)}
                className="w-full pl-11 pr-10 py-3 text-sm rounded-[1.25rem] neo-pressed bg-[#e0e5ec] text-zinc-700 placeholder:text-zinc-400 outline-none font-medium"
              />
              {bookingSearch && (
                <button
                  onClick={() => setBookingSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 neo-button rounded-full p-1.5 text-zinc-500 bg-[#e0e5ec]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 neo-pressed rounded-[2rem] p-4 bg-[#e0e5ec] overflow-hidden">
            {filteredBookings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center py-16"
              >
                <div className="inline-flex p-4 neo-flat rounded-full text-zinc-300 mb-4">
                  <Globe className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-zinc-700">
                  {bookingSearch ? "No matching bookings" : "No pending bookings"}
                </h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">
                  {bookingSearch
                    ? "Try a different search"
                    : "Online booking requests will appear here"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide pr-1 pb-2"
              >
                {filteredBookings.map((booking, idx) => (
                  <motion.div
                    key={booking.id}
                    variants={itemVariants}
                    layout
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springTransition}
                    className="p-5 rounded-[1.5rem] neo-flat bg-[#e0e5ec] cursor-pointer group"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full neo-pressed bg-[#e0e5ec] flex items-center justify-center flex-shrink-0 text-teal-600">
                          <span className="text-[11px] font-black tracking-tighter">
                            {initials(booking.patientName)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-800 truncate">{booking.patientName}</p>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mt-0.5">
                            <Phone className="h-3 w-3 text-zinc-400" />
                            <span>{booking.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-full neo-pressed text-[9px] font-bold text-teal-600 bg-[#e0e5ec] flex items-center gap-1 flex-shrink-0">
                        <Globe className="h-2.5 w-2.5" />
                        Online
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-medium text-zinc-600 mt-4 pl-[3.25rem]">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
                        <span className="truncate">{booking.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
                        <span>{format(new Date(booking.preferredDate), "MMM d")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
                        <span>{booking.preferredTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
                        <span className="font-mono text-[10px] font-bold text-teal-600">{booking.bookingToken}</span>
                      </div>
                    </div>

                    {/* Reason */}
                    {booking.reason && (
                      <p className="text-xs font-medium text-zinc-500 mt-3 pl-[3.25rem] line-clamp-2">
                        "{booking.reason}"
                      </p>
                    )}

                    {/* Doctor + age/gender */}
                    <div className="flex items-center gap-3 mt-4 pl-[3.25rem] flex-wrap">
                      {booking.doctorName && (
                        <div className="px-2.5 py-1 rounded-full neo-pressed text-[10px] font-bold text-zinc-700 bg-[#e0e5ec] flex items-center gap-1.5">
                          <Stethoscope className="h-3 w-3 text-blue-500" />
                          Dr. {booking.doctorName}
                        </div>
                      )}
                      {booking.age && (
                        <span className="text-xs font-bold text-zinc-400">
                          {booking.age} yrs{booking.gender ? ` / ${booking.gender.charAt(0)}` : ""}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
