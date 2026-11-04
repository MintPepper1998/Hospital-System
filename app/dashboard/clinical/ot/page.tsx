import { getSurgeries, getTheaters } from "@/lib/actions"
import { getActiveSurgeryProcedures } from "@/app/actions/surgery-procedures"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScheduleSurgeryDialog } from "@/components/ot/schedule-surgery-dialog"
import { SurgeryStatusBadge } from "@/components/ot/surgery-status-badge"
import { PACStatusBadge } from "@/components/ot/pac-status-badge"
import { UpdateSurgeryDialog } from "@/components/ot/update-surgery-dialog"
import { format } from "date-fns"
import { Activity, AlertCircle, CheckCircle2, Clock, DollarSign, ShieldCheck, Paperclip, Search, CalendarClock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function OTPage(props: {
  searchParams: Promise<{ tab?: string; q?: string }>
}) {
  const searchParams = await props.searchParams
  const tab = searchParams.tab || "confirmed"
  const q = searchParams.q || ""
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [confirmedResult, pendingResult, scheduledResult, recordsResult, theatersResult, procedureTemplates] = await Promise.all([
    getSurgeries({
      date: today,
      paymentStatus: ["PAID", "CASHLESS"],
      q: q || undefined
    }),
    getSurgeries({
      date: today,
      paymentStatus: "PENDING",
      q: q || undefined
    }),
    getSurgeries({
      status: "SCHEDULED",
      q: q || undefined,
      sortOrder: "asc"
    }),
    getSurgeries({
      status: "COMPLETED",
      q: q || undefined,
      sortOrder: "desc"
    }),
    getTheaters(),
    getActiveSurgeryProcedures(),
  ])

  const confirmedSurgeries = confirmedResult.success ? confirmedResult.data : []
  const pendingSurgeries = pendingResult.success ? (pendingResult.data?.filter((s: any) => s.status !== "CANCELLED") || []) : []
  const scheduledSurgeries = scheduledResult.success ? scheduledResult.data : []
  const recordsSurgeries = recordsResult.success ? recordsResult.data : []
  const theaters = theatersResult.success ? theatersResult.data : []
  const surgeries = tab === "pending" 
    ? pendingSurgeries 
    : tab === "scheduled"
      ? scheduledSurgeries
      : tab === "records" 
        ? recordsSurgeries 
        : confirmedSurgeries

  const theaterStatuses = theaters?.map((theater) => {
    const activeSurgery = theater.surgeries?.find(
      (s: any) => s.status === "IN_PROGRESS" && (s.paymentStatus === "PAID" || s.paymentStatus === "CASHLESS")
    )
    const scheduledSurgery = theater.surgeries?.find(
      (s: any) => s.status === "SCHEDULED" && (s.paymentStatus === "PAID" || s.paymentStatus === "CASHLESS")
    )

    let status = "AVAILABLE"
    let currentPatient = null
    let nextSurgery = null

    if (activeSurgery) {
      status = "IN_USE"
      currentPatient = activeSurgery.patient?.user?.name || "Patient"
    } else if (scheduledSurgery) {
      status = "SCHEDULED"
      nextSurgery = scheduledSurgery
    } else if (!theater.isOperational) {
      status = "MAINTENANCE"
    }

    return { ...theater, currentStatus: status, currentPatient, nextSurgery }
  })

  const statusCounts = {
    available: theaterStatuses?.filter((t) => t.currentStatus === "AVAILABLE").length || 0,
    inUse: theaterStatuses?.filter((t) => t.currentStatus === "IN_USE").length || 0,
    scheduled: theaterStatuses?.filter((t) => t.currentStatus === "SCHEDULED").length || 0,
    maintenance: theaterStatuses?.filter((t) => t.currentStatus === "MAINTENANCE").length || 0,
  }

  const confirmedCounts = {
    total: confirmedSurgeries?.length || 0,
    scheduled: confirmedSurgeries?.filter((s: any) => s.status === "SCHEDULED").length || 0,
    inProgress: confirmedSurgeries?.filter((s: any) => s.status === "IN_PROGRESS").length || 0,
    completed: confirmedSurgeries?.filter((s: any) => s.status === "COMPLETED").length || 0,
  }

  return (
    <div className="space-y-6 pb-8 bg-[#e0e5ec] min-h-screen p-4 sm:p-8 rounded-[2.5rem] neo-flat mt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-800">Operation Theater</h2>
          <p className="text-sm font-semibold text-zinc-500 mt-2">
            Live theater status and surgery schedule for {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/clinical/ot?tab=records">
            <button className={`px-4 py-2 rounded-full font-bold flex items-center transition-all active:scale-95 ${tab === "records" ? "neo-pressed bg-[#e0e5ec] text-blue-600" : "neo-flat bg-[#e0e5ec] text-zinc-600"}`}>
              <Activity className="h-4 w-4 mr-2" />
              OT Records
            </button>
          </Link>
          <div className="neo-flat rounded-full bg-[#e0e5ec] p-1">
            <ScheduleSurgeryDialog procedures={JSON.parse(JSON.stringify(procedureTemplates))} />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-zinc-600">Confirmed Surgeries</h3>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-800">{confirmedCounts.total}</div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">
              {confirmedCounts.scheduled} scheduled, {confirmedCounts.inProgress} ongoing
            </p>
          </div>
        </div>

        <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-zinc-600">Available Theaters</h3>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-800">{statusCounts.available}</div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">Ready for scheduling</p>
          </div>
        </div>

        <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-zinc-600">In Use</h3>
            <Activity className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-800">{statusCounts.inUse}</div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">Surgery in progress</p>
          </div>
        </div>

        <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-zinc-600">Pending Payment</h3>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-orange-600">{pendingSurgeries?.length || 0}</div>
            <p className="text-xs font-semibold text-zinc-500 mt-1">Awaiting payment clearance</p>
          </div>
        </div>
      </div>

      {/* Theater Status Board */}
      <div className="neo-flat rounded-[2rem] bg-[#e0e5ec] p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
            <div className="p-1.5 rounded-full neo-pressed text-zinc-600">
              <Activity className="h-5 w-5" />
            </div>
            Theater Status
          </h3>
          <p className="text-xs font-semibold text-zinc-500 mt-1 pl-10">Live status of all operation theaters</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {theaterStatuses?.map((theater: any) => (
            <div key={theater.id} className="rounded-[1.5rem] bg-[#e0e5ec] neo-pressed overflow-hidden flex flex-col">
              <div
                className={`h-2 w-full ${
                  theater.currentStatus === "AVAILABLE"
                    ? "bg-green-500"
                    : theater.currentStatus === "IN_USE"
                      ? "bg-red-500"
                      : theater.currentStatus === "SCHEDULED"
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                }`}
              />
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-bold text-zinc-800">{theater.name}</h4>
                    <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                      {theater.type} • {theater.floor || "Ground Floor"}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full neo-flat bg-[#e0e5ec] text-[10px] font-bold ${
                    theater.currentStatus === "AVAILABLE"
                      ? "text-green-600"
                      : theater.currentStatus === "IN_USE"
                        ? "text-red-600"
                        : theater.currentStatus === "SCHEDULED"
                          ? "text-yellow-600"
                          : "text-zinc-500"
                  }`}>
                    {theater.currentStatus.replace("_", " ")}
                  </span>
                </div>
                
                <div className="mt-4 pt-4 border-t-2 border-zinc-200/50 flex-1">
                  {theater.currentStatus === "IN_USE" && (
                    <div>
                      <p className="text-sm font-bold text-zinc-800">Current: {theater.currentPatient}</p>
                      <p className="text-xs font-semibold text-red-500 mt-1 flex items-center">
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Surgery in progress
                      </p>
                    </div>
                  )}
                  {theater.currentStatus === "SCHEDULED" && theater.nextSurgery && (
                    <div>
                      <p className="text-sm font-bold text-zinc-800">Next: {theater.nextSurgery.patient?.user?.name}</p>
                      <p className="text-xs font-semibold text-zinc-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(theater.nextSurgery.scheduledDate), "h:mm a")}
                      </p>
                    </div>
                  )}
                  {theater.currentStatus === "AVAILABLE" && (
                    <p className="text-sm font-bold text-green-600">Ready for booking</p>
                  )}
                  {theater.currentStatus === "MAINTENANCE" && (
                    <p className="text-sm font-bold text-zinc-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Under maintenance
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/clinical/ot?tab=confirmed">
          <Button variant={tab === "confirmed" ? "default" : "outline"} size="sm">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Confirmed ({confirmedSurgeries?.length || 0})
          </Button>
        </Link>
        <Link href="/dashboard/clinical/ot?tab=scheduled">
          <Button variant={tab === "scheduled" ? "default" : "outline"} size="sm">
            <CalendarClock className="h-4 w-4 mr-1.5" />
            Scheduled ({scheduledSurgeries?.length || 0})
          </Button>
        </Link>
        <Link href="/dashboard/clinical/ot?tab=pending">
          <Button variant={tab === "pending" ? "default" : "outline"} size="sm">
            <DollarSign className="h-4 w-4 mr-1.5" />
            Pending Payment ({pendingSurgeries?.length || 0})
          </Button>
        </Link>
        <Link href="/dashboard/clinical/ot?tab=records">
          <Button variant={tab === "records" ? "default" : "outline"} size="sm">
            <Activity className="h-4 w-4 mr-1.5" />
            OT Records ({recordsSurgeries?.length || 0})
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-6 max-w-md">
        <form action="/dashboard/clinical/ot" method="GET" className="relative">
          <input type="hidden" name="tab" value={tab} />
          <div className="neo-pressed rounded-full bg-[#e0e5ec] overflow-hidden flex items-center px-4 h-12">
            <Search className="h-5 w-5 text-zinc-500 mr-2 flex-shrink-0" />
            <input 
              name="q"
              placeholder="Search by patient name or procedure..." 
              defaultValue={q}
              className="flex-1 bg-transparent border-none outline-none text-zinc-700 font-semibold placeholder:text-zinc-400 text-sm"
            />
          </div>
        </form>
      </div>

      {/* Surgery Schedule Board */}
      <div className="neo-flat rounded-[2rem] bg-[#e0e5ec] p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
            <div className="p-1.5 rounded-full neo-pressed text-zinc-600">
              <CalendarClock className="h-5 w-5" />
            </div>
            {tab === "pending" 
              ? "Pending Payment — Draft Surgeries" 
              : tab === "scheduled"
                ? "All Scheduled Surgeries — Pre-Op Preparation"
                : tab === "records" 
                  ? "Past OT Sessions — Records" 
                  : "Today's Confirmed Schedule"}
          </h3>
          <p className="text-xs font-semibold text-zinc-500 mt-1 pl-10">
            {tab === "pending"
              ? "These surgeries are drafted but payment has not been collected. They are NOT visible on the surgeon's board."
              : tab === "scheduled"
                ? "All upcoming scheduled surgeries. Complete PAC checks, print forms, and upload signed documents here."
                : tab === "records"
                  ? "Archive of all completed OT sessions, media, and clinical notes."
                  : "Financially cleared surgeries for today"}
          </p>
        </div>

        <div>
          {surgeries && surgeries.length > 0 ? (
            <div className="space-y-4">
              {surgeries.map((surgery: any) => (
                <div key={surgery.id} className="rounded-[1.5rem] bg-[#e0e5ec] neo-pressed overflow-hidden flex flex-col">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-zinc-500">
                        <Clock className="h-4 w-4" />
                        {tab === "scheduled" ? (
                          <span className="text-zinc-700">
                            {format(new Date(surgery.scheduledDate), "dd MMM yyyy")}
                            <span className="text-zinc-400 font-normal mx-1">at</span>
                            {format(new Date(surgery.scheduledDate), "h:mm a")}
                          </span>
                        ) : (
                          <span className="text-zinc-700">
                            {format(new Date(surgery.scheduledDate), "h:mm a")}
                          </span>
                        )}
                        <span className="text-zinc-400">•</span>
                        <span>{surgery.durationMinutes} min</span>

                        {surgery.paymentStatus === "CASHLESS" && (
                          <span className="px-2 py-0.5 rounded-full neo-flat bg-[#e0e5ec] text-[10px] text-green-600 flex items-center">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            BSKY Cashless
                          </span>
                        )}
                        {surgery.paymentStatus === "PAID" && (
                          <span className="px-2 py-0.5 rounded-full neo-flat bg-[#e0e5ec] text-[10px] text-blue-600 flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Paid
                          </span>
                        )}
                        {surgery.paymentStatus === "PENDING" && (
                          <span className="px-2 py-0.5 rounded-full neo-flat bg-[#e0e5ec] text-[10px] text-orange-600 flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Payment Pending
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-lg text-zinc-800">{surgery.procedureName}</h4>
                          {surgery.isEmergency && (
                            <span className="px-2 py-0.5 rounded-full neo-flat bg-[#e0e5ec] text-[10px] font-bold text-red-600 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              EMERGENCY
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 text-xs font-semibold text-zinc-500">
                          <div>
                            <span className="font-bold text-zinc-700">Patient:</span>{" "}
                            {surgery.patient?.user?.name || "Unknown"}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-700">Surgeon:</span>{" "}
                            Dr. {surgery.leadSurgeon?.user?.name || "Unknown"}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-700">Theater:</span>{" "}
                            {surgery.theater?.name || "Unknown"}
                          </div>
                          {surgery.surgeryCharge > 0 && (
                            <div>
                              <span className="font-bold text-zinc-700">Charge:</span>{" "}
                              ₹{surgery.surgeryCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-3">
                      <div className="flex gap-2 flex-wrap">
                        {/* If components are not neumorphic by default, wrap them in a container if possible. Assuming they render badges, we leave them as is since modifying all of them is too broad, but they might look a bit off unless we apply a wrapper or if they use standard shadcn that we are replacing.  */}
                        <SurgeryStatusBadge status={surgery.status} />
                        <PACStatusBadge status={surgery.pacStatus} />
                        <DocsStatusBadge surgery={surgery} />
                      </div>
                      <div className="neo-flat bg-[#e0e5ec] p-1 rounded-full">
                        <UpdateSurgeryDialog 
                          surgery={surgery} 
                          buttonLabel={tab === "scheduled" ? "Pre-Op Prep" : surgery.status === 'COMPLETED' ? "OT Record" : "Manage"} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pre-Op Checklist — Shown on scheduled tab */}
                  {tab === "scheduled" && (
                    <div className="bg-[#e0e5ec] border-t-2 border-zinc-200/50 px-5 py-4">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-3">Pre-Op Checklist</p>
                      <div className="flex flex-wrap gap-3">
                        <PreOpItem 
                          label="PAC Check" 
                          status={surgery.pacStatus === "FIT" ? "done" : surgery.pacStatus === "CONDITIONAL" ? "warn" : surgery.pacStatus === "UNFIT" ? "error" : "pending"}
                          detail={surgery.pacStatus}
                        />
                        <PreOpItem 
                          label="Consent Form" 
                          status={surgery.consentFormUrl ? "done" : "pending"}
                          detail={surgery.consentFormUrl ? "Uploaded" : "Not uploaded"}
                        />
                        <PreOpItem 
                          label="Anaesthesia Record" 
                          status={surgery.anaesthesiaRecordUrl ? "done" : "pending"}
                          detail={surgery.anaesthesiaRecordUrl ? "Uploaded" : "Not uploaded"}
                        />
                        <PreOpItem 
                          label="Operation Note" 
                          status={surgery.operationNoteUrl ? "done" : "pending"}
                          detail={surgery.operationNoteUrl ? "Uploaded" : "Not uploaded"}
                        />
                        <PreOpItem 
                          label="Payment" 
                          status={surgery.paymentStatus === "PAID" || surgery.paymentStatus === "CASHLESS" ? "done" : "pending"}
                          detail={surgery.paymentStatus}
                        />
                      </div>
                    </div>
                  )}

                  {surgery.status === "SCHEDULED" && surgery.pacStatus === "UNFIT" && tab !== "scheduled" && (
                    <div className="bg-[#e0e5ec] border-t-2 border-zinc-200/50 p-4 flex items-center gap-3">
                      <div className="p-1.5 rounded-full neo-flat text-red-600">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <p className="text-sm text-red-600 font-bold">
                        Patient marked UNFIT for anesthesia. Surgery cannot proceed.
                      </p>
                    </div>
                  )}

                  {surgery.status === "SCHEDULED" && surgery.pacStatus === "PENDING" && tab !== "scheduled" && (
                    <div className="bg-[#e0e5ec] border-t-2 border-zinc-200/50 p-4 flex items-center gap-3">
                      <div className="p-1.5 rounded-full neo-flat text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <p className="text-sm text-yellow-600 font-bold">
                        PAC check pending. Please complete pre-anesthesia evaluation.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex p-4 neo-pressed rounded-full text-zinc-300 mb-4">
                <Activity className="h-10 w-10" />
              </div>
              <p className="font-bold text-sm text-zinc-700">
                {tab === "pending"
                  ? "No draft surgeries pending payment"
                  : tab === "scheduled"
                    ? "No upcoming scheduled surgeries"
                    : tab === "records"
                      ? "No past surgery records found"
                      : "No confirmed surgeries scheduled for today"}
              </p>
              <p className="text-xs font-semibold text-zinc-500 mt-1">Click "Schedule Surgery" to add one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DocsStatusBadge({ surgery }: { surgery: any }) {
  const count = [
    surgery.consentFormUrl,
    surgery.anaesthesiaRecordUrl,
    surgery.operationNoteUrl,
  ].filter(Boolean).length

  if (count === 3) {
    return (
      <Badge variant="outline" className="border-green-500 text-green-700 text-xs">
        <Paperclip className="h-3 w-3 mr-1" />
        Docs 3/3
      </Badge>
    )
  }
  if (count > 0) {
    return (
      <Badge variant="outline" className="border-orange-500 text-orange-700 text-xs">
        <Paperclip className="h-3 w-3 mr-1" />
        Docs {count}/3
      </Badge>
    )
  }
  return null
}

function PreOpItem({ label, status, detail }: { label: string; status: "done" | "warn" | "error" | "pending"; detail: string }) {
  const colors = {
    done: "bg-green-100 border-green-300 text-green-800",
    warn: "bg-yellow-100 border-yellow-300 text-yellow-800",
    error: "bg-red-100 border-red-300 text-red-800",
    pending: "bg-gray-100 border-gray-300 text-gray-600",
  }
  const icons = {
    done: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
    warn: <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />,
    error: <AlertCircle className="h-3.5 w-3.5 text-red-600" />,
    pending: <Clock className="h-3.5 w-3.5 text-gray-400" />,
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full neo-flat bg-[#e0e5ec] text-[11px] font-bold ${colors[status]}`}>
      {icons[status]}
      <span>{label}</span>
      <span className="opacity-70 font-semibold">— {detail}</span>
    </div>
  )
}
