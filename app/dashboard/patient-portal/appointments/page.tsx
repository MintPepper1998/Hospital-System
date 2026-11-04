import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { Calendar, Clock, User, CheckCircle2, Globe, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  WAITING: "bg-orange-100 text-orange-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  NO_SHOW: "bg-gray-100 text-gray-800",
  WAITING_FOR_REPORTS: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-800",
}

export default async function PatientAppointmentsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/patient-login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { patient: { select: { id: true, phone: true } } },
  })

  if (!user || user.role !== "PATIENT" || !user.patient) redirect("/patient-login")

  const appointments = await prisma.appointment.findMany({
    where: { patientId: user.patient.id },
    orderBy: { appointmentDate: "desc" },
    take: 50,
    include: { doctor: { include: { user: { select: { name: true } } } } },
  })

  const onlineBookings = await prisma.onlineBooking.findMany({
    where: {
      OR: [
        { patientId: user.patient.id },
        ...(user.patient.phone ? [{ phone: user.patient.phone }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      preferredDoctor: {
        include: { user: { select: { name: true } } },
      },
    },
  })

  const pendingOrRejectedBookings = onlineBookings.filter(
    (b) => b.status === "PENDING" || b.status === "REJECTED"
  )

  const now = new Date()
  const upcoming = appointments.filter(
    (a) => a.appointmentDate >= now && !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status)
  )
  const past = appointments.filter(
    (a) => a.appointmentDate < now || ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status)
  )

  return (
    <div className="skp-sub">
      <div className="skp-sub-header">
        <div className="skp-sub-icon" style={{ background: "#e0f7f4" }}>
          <Calendar style={{ width: 24, height: 24, color: "#00b4a0" }} />
        </div>
        <div>
          <h1 className="skp-sub-title">My Appointments</h1>
          <p className="skp-sub-desc">View your upcoming and past appointments</p>
        </div>
      </div>

      {pendingOrRejectedBookings.length > 0 && (
        <div className="skp-sub-section">
          <h2 className="skp-sub-h2">
            <span className="skp-sub-dot" style={{ background: "#f59e0b" }} />
            Online Booking Requests ({pendingOrRejectedBookings.length})
          </h2>
          <div className="skp-sub-list">
            {pendingOrRejectedBookings.map((booking) => (
              <Card
                key={booking.id}
                className={`border-l-4 ${booking.status === "REJECTED" ? "border-l-red-400" : "border-l-amber-400"}`}
              >
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-amber-600" />
                        <span className="font-semibold">
                          {format(booking.preferredDate, "EEEE, dd MMM yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {booking.preferredTime}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        {booking.department}
                        {booking.preferredDoctor && (
                          <span> · Dr. {booking.preferredDoctor.user.name}</span>
                        )}
                      </div>
                      {booking.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {booking.reason}
                        </p>
                      )}
                      {booking.status === "REJECTED" && booking.rejectionReason && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded-md border border-red-100">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-700">
                            <span className="font-medium">Declined:</span>{" "}
                            {booking.rejectionReason}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Booking Token: {booking.bookingToken}
                      </p>
                    </div>
                    <Badge className={statusColors[booking.status] || "bg-gray-100"}>
                      {booking.status === "PENDING" ? "AWAITING CONFIRMATION" : booking.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="skp-sub-section">
        <h2 className="skp-sub-h2"><span className="skp-sub-dot" style={{ background: "#00b4a0" }} />Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><CheckCircle2 style={{ width: 32, height: 32, color: "#00b4a0", margin: "0 auto 0.75rem" }} /><p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No upcoming appointments</p></CardContent></Card>
        ) : (
          <div className="skp-sub-list">
            {upcoming.map((apt) => (
              <Card key={apt.id} className="border-l-4 border-l-teal-500">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-teal-600" /><span className="font-semibold">{format(apt.appointmentDate, "EEEE, dd MMM yyyy")}</span></div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" />{apt.appointmentTime}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-3.5 w-3.5" />Dr. {apt.doctor.user.name}{apt.doctor.specialization && <span className="text-xs">({apt.doctor.specialization})</span>}</div>
                      {apt.reason && <p className="text-sm text-muted-foreground mt-1">Reason: {apt.reason}</p>}
                    </div>
                    <Badge className={statusColors[apt.status] || "bg-gray-100"}>{apt.status.replace(/_/g, " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="skp-sub-section">
        <h2 className="skp-sub-h2 skp-sub-h2--muted">Past Appointments ({past.length})</h2>
        {past.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No past appointments found</p></CardContent></Card>
        ) : (
          <div className="skp-sub-list">
            {past.map((apt) => (
              <Card key={apt.id} className="opacity-80">
                <CardContent className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{format(apt.appointmentDate, "dd MMM yyyy")} at {apt.appointmentTime}</p>
                      <p className="text-sm text-muted-foreground">Dr. {apt.doctor.user.name}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[apt.status] || ""}>{apt.status.replace(/_/g, " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .skp-sub{display:flex;flex-direction:column;gap:2rem}
        .skp-sub-header{display:flex;align-items:center;gap:1rem;padding-bottom:1.5rem;border-bottom:1px solid #e2e8f0}
        .skp-sub-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .skp-sub-title{font-family:'Playfair Display',Georgia,serif!important;font-size:1.75rem!important;font-weight:700!important;color:#0a3d6b!important;margin:0 0 .25rem;line-height:1.1}
        .skp-sub-desc{font-size:.82rem;color:#94a3b8;margin:0}
        .skp-sub-section{display:flex;flex-direction:column;gap:.75rem}
        .skp-sub-h2{display:flex;align-items:center;gap:.5rem;font-family:'DM Sans',sans-serif!important;font-size:.875rem!important;font-weight:600!important;color:#334155!important;text-transform:uppercase;letter-spacing:.04em}
        .skp-sub-h2--muted{color:#94a3b8!important}
        .skp-sub-dot{width:8px;height:8px;border-radius:50%}
        .skp-sub-list{display:flex;flex-direction:column;gap:.625rem}
      `}</style>
    </div>
  )
}
