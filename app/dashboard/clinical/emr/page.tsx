import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Stethoscope, Clock, User, Activity, ArrowRight, FlaskConical, Printer, History, ShieldAlert, CalendarClock } from "lucide-react"
import { format, differenceInYears, addDays } from "date-fns"
import { PastPatientsSection } from "@/components/clinical/past-patients-section"
import { UpcomingAppointmentsSection } from "@/components/clinical/upcoming-appointments-section"
import { DoctorFilterSelect } from "@/components/clinical/doctor-filter-select"
import { PaperOPDDialog } from "@/components/clinical/paper-opd-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface EMRPageProps {
  searchParams: Promise<{ doctor?: string }>
}

export default async function DoctorQueuePage({ searchParams }: EMRPageProps) {
  const [session, params] = await Promise.all([auth(), searchParams])
  
  // Redirect if not logged in
  if (!session?.user) {
    redirect("/login")
  }

  const userRole = session.user.role as string
  const userId = session.user.id as string

  // Date Logic: Get Start and End of Today
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  // ── Resolve the logged-in user's own staff record ──
  let ownStaffId: string | undefined
  const staffRecord = userId
    ? await prisma.staff.findUnique({ where: { userId }, select: { id: true } })
    : null
  ownStaffId = staffRecord?.id

  // ── Determine which doctorId to filter by, based on role ──
  const selectedDoctorParam = params?.doctor || ""
  let filterDoctorId: string | undefined
  let isAdmin = userRole === "SUPER_ADMIN"
  let isDoctor = userRole === "DOCTOR"
  let isStaff = !isAdmin && !isDoctor // Nurse, Receptionist, etc.
  let needsDoctorSelection = false

  if (isDoctor) {
    // DOCTOR: Always filter by their own staff ID — ignore dropdown
    filterDoctorId = ownStaffId
  } else if (isAdmin) {
    // SUPER_ADMIN: Use dropdown selection. If none selected → show ALL
    filterDoctorId = selectedDoctorParam || undefined
  } else {
    // NURSE / Other staff: MUST select a doctor to see data
    if (selectedDoctorParam) {
      filterDoctorId = selectedDoctorParam
    } else {
      needsDoctorSelection = true
    }
  }

  // ── Fetch all doctors for the filter dropdown (only for non-doctor roles) ──
  let allDoctors: { id: string; name: string; department: string | null; specialization: string | null }[] = []
  if (!isDoctor) {
    const docs = await prisma.staff.findMany({
      where: { user: { role: "DOCTOR", isActive: true } },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    })
    allDoctors = docs.map(d => ({
      id: d.id,
      name: d.user.name || "Unknown",
      department: d.department,
      specialization: d.specialization,
    }))
  }

  // ── Build the doctorId filter clause ──
  const doctorWhere = filterDoctorId ? { doctorId: filterDoctorId } : {}

  // ── Fetch Today's Appointments ──
  const appointments = needsDoctorSelection ? [] : await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startOfDay, lte: endOfDay },
      status: {
        in: ["PENDING", "SCHEDULED", "CONFIRMED", "VITALS_DONE", "IN_PROGRESS", "WAITING", "WAITING_FOR_REPORTS"],
      },
      ...doctorWhere,
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
    orderBy: [
      { status: "desc" },
      { appointmentTime: "asc" },
    ],
  })

  // ── Fetch past patients (completed appointments before today) ──
  const pastAppointments = needsDoctorSelection ? [] : await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      ...doctorWhere,
    },
    include: {
      patient: {
        include: {
          user: { select: { name: true } },
          prescriptions: {
            orderBy: { prescriptionDate: "desc" },
            take: 10,
            include: { medications: true },
          },
        },
      },
    },
    orderBy: { appointmentDate: "desc" },
    take: 50,
  })

  // ── Fetch Upcoming Appointments (next 30 days, future only) ──
  const thirtyDaysLater = addDays(endOfDay, 30)
  const upcomingAppointmentsRaw = needsDoctorSelection ? [] : await prisma.appointment.findMany({
    where: {
      appointmentDate: { gt: endOfDay, lte: thirtyDaysLater },
      status: { in: ["PENDING", "SCHEDULED", "CONFIRMED"] },
      ...doctorWhere,
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
    orderBy: [
      { appointmentDate: "asc" },
      { appointmentTime: "asc" },
    ],
    take: 100,
  })

  // ── Fetch Pending Online Bookings ──
  const onlineBookingsRaw = needsDoctorSelection ? [] : await prisma.onlineBooking.findMany({
    where: {
      status: "PENDING",
      preferredDate: { gte: startOfDay },
      ...(filterDoctorId ? { preferredDoctorId: filterDoctorId } : {}),
    },
    include: {
      preferredDoctor: { include: { user: { select: { name: true } } } },
    },
    orderBy: { preferredDate: "asc" },
    take: 50,
  })

  // ── Calculate stats ──
  const pendingCount = appointments.filter(a =>
    ["PENDING", "SCHEDULED", "CONFIRMED", "WAITING", "VITALS_DONE"].includes(a.status)
  ).length
  const inProgressCount = appointments.filter(a => a.status === "IN_PROGRESS").length
  const waitingForReportsCount = appointments.filter(a => a.status === "WAITING_FOR_REPORTS").length

  const completedToday = needsDoctorSelection ? 0 : await prisma.appointment.count({
    where: {
      appointmentDate: { gte: startOfDay, lte: endOfDay },
      status: "COMPLETED",
      ...doctorWhere,
    },
  })

  // ── Serialize past patients for client component ──
  const now = new Date()
  const serializedPastPatients = pastAppointments.map(a => {
    const dob = a.patient.dateOfBirth
    const age = dob ? differenceInYears(now, new Date(dob)) : null
    return {
      id: a.id,
      appointmentDate: a.appointmentDate.toISOString(),
      appointmentTime: a.appointmentTime,
      diagnosis: a.diagnosis,
      chiefComplaint: a.chiefComplaint,
      patientName: a.patient.user?.name || "Unknown",
      patientId: a.patient.patientId,
      patientDbId: a.patient.id,
      patientGender: a.patient.gender,
      patientAge: age,
      isPaperConsultation: (a as any).isPaperConsultation || false,
      scannedPaperUrl: (a as any).scannedPaperUrl || null,
      prescriptions: a.patient.prescriptions.map(p => ({
        id: p.id,
        prescriptionDate: p.prescriptionDate.toISOString(),
        instructions: p.instructions,
        medications: p.medications.map(m => ({
          id: m.id,
          medicationName: m.medicationName,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: m.quantity,
          instructions: m.instructions,
        })),
      })),
    }
  })

  // ── Serialize upcoming appointments for client component ──
  const serializedUpcoming = upcomingAppointmentsRaw.map(a => {
    const dob = a.patient.dateOfBirth
    const age = dob ? differenceInYears(now, new Date(dob)) : null
    return {
      id: a.id,
      appointmentDate: a.appointmentDate.toISOString(),
      appointmentTime: a.appointmentTime,
      status: a.status,
      reason: a.reason,
      chiefComplaint: a.chiefComplaint,
      patientName: a.patient.user?.name || "Unknown",
      patientId: a.patient.patientId,
      patientDbId: a.patient.id,
      patientGender: a.patient.gender,
      patientAge: age,
      patientPhone: a.patient.phone,
      doctorName: a.doctor?.user?.name || null,
      doctorDepartment: a.doctor?.department || null,
    }
  })

  // ── Serialize online bookings for client component ──
  const serializedOnlineBookings = onlineBookingsRaw.map(b => ({
    id: b.id,
    patientName: b.patientName,
    phone: b.phone,
    email: b.email,
    age: b.age,
    gender: b.gender,
    department: b.department,
    preferredDate: b.preferredDate.toISOString(),
    preferredTime: b.preferredTime,
    reason: b.reason,
    bookingToken: b.bookingToken,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    doctorName: b.preferredDoctor?.user?.name || null,
  }))

  // ── Find selected doctor name for display ──
  const selectedDocName = selectedDoctorParam
    ? allDoctors.find(d => d.id === selectedDoctorParam)?.name
    : null

  return (
    <div className="space-y-8 bg-[#e0e5ec] min-h-[100dvh] p-4 md:p-8 rounded-[2.5rem] text-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tighter text-zinc-800 flex items-center gap-3">
            <div className="p-3 neo-pressed rounded-full text-blue-600">
              <Stethoscope className="h-8 w-8" strokeWidth={1.5} />
            </div>
            {isDoctor ? "My Consultation Queue" : "Doctor's Consultation Queue"}
          </h2>
          <p className="text-zinc-500 font-medium pl-14">
            {format(new Date(), "EEEE, MMMM dd, yyyy")} • Today's Schedule
            {isDoctor && " (Your patients only)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Doctor Filter Dropdown — only for non-doctor roles */}
          {!isDoctor && (
            <Suspense fallback={null}>
              <DoctorFilterSelect
                doctors={allDoctors}
                currentDoctorId={selectedDoctorParam}
                label={isAdmin ? "Filter by Doctor:" : "Select Doctor:"}
              />
            </Suspense>
          )}
          {!needsDoctorSelection && (
            <>
              <a href="#upcoming-section" className="neo-button flex items-center gap-2 px-6 py-3 rounded-full text-blue-700 bg-[#e0e5ec] font-semibold text-sm">
                <CalendarClock className="h-5 w-5" strokeWidth={1.5} />
                Upcoming ({serializedUpcoming.length})
              </a>
              <a href="#past-patients" className="neo-button flex items-center gap-2 px-6 py-3 rounded-full text-amber-700 bg-[#e0e5ec] font-semibold text-sm">
                <History className="h-5 w-5" strokeWidth={1.5} />
                Past Patients ({serializedPastPatients.length})
              </a>
            </>
          )}
        </div>
      </div>

      {/* Nurse/Staff: Must select doctor first */}
      {needsDoctorSelection ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <ShieldAlert className="h-16 w-16 mx-auto text-amber-500 opacity-70" />
              <h3 className="text-lg font-semibold text-amber-800">
                Select a Doctor to View Queue
              </h3>
              <p className="text-sm text-amber-700 max-w-md mx-auto">
                Please select a doctor from the dropdown above to view their patient queue, 
                today's appointments, and past patient records.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Show whose queue we're viewing */}
          {!isDoctor && selectedDocName && (
            <div className="flex items-center gap-3 px-6 py-4 rounded-[1.5rem] neo-pressed">
              <div className="p-2 neo-flat rounded-full text-blue-600">
                <User className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="text-base font-medium text-zinc-800">
                Viewing queue for: <strong>Dr. {selectedDocName}</strong>
              </span>
            </div>
          )}
          {!isDoctor && !selectedDoctorParam && isAdmin && (
            <div className="flex items-center gap-3 px-6 py-4 rounded-[1.5rem] neo-pressed">
              <div className="p-2 neo-flat rounded-full text-green-600">
                <User className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="text-base font-medium text-zinc-800">
                Viewing: <strong>All Doctors' Records</strong> — Use the dropdown to filter by specific doctor
              </span>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="neo-flat rounded-[2rem] p-6 bg-[#e0e5ec] flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Waiting</h3>
                <div className="p-2.5 neo-pressed rounded-full text-orange-500">
                  <Clock className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-zinc-800 tracking-tighter">{pendingCount}</div>
                <p className="text-sm text-zinc-500 mt-1 font-medium">Patients in queue</p>
              </div>
            </div>

            <div className="neo-flat rounded-[2rem] p-6 bg-[#e0e5ec] flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">In Progress</h3>
                <div className="p-2.5 neo-pressed rounded-full text-blue-500">
                  <Activity className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-zinc-800 tracking-tighter">{inProgressCount}</div>
                <p className="text-sm text-zinc-500 mt-1 font-medium">Active consultations</p>
              </div>
            </div>

            <div className="neo-flat rounded-[2rem] p-6 bg-[#e0e5ec] flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Reports</h3>
                <div className="p-2.5 neo-pressed rounded-full text-amber-500">
                  <FlaskConical className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-zinc-800 tracking-tighter">{waitingForReportsCount}</div>
                <p className="text-sm text-zinc-500 mt-1 font-medium">Awaiting lab results</p>
              </div>
            </div>

            <div className="neo-flat rounded-[2rem] p-6 bg-[#e0e5ec] flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Completed</h3>
                <div className="p-2.5 neo-pressed rounded-full text-emerald-500">
                  <User className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-zinc-800 tracking-tighter">{completedToday}</div>
                <p className="text-sm text-zinc-500 mt-1 font-medium">Done today</p>
              </div>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="neo-flat rounded-[2.5rem] bg-[#e0e5ec] p-8 mt-8">
            <div className="mb-8">
              <h3 className="text-2xl font-bold tracking-tight text-zinc-800">Today's Appointments</h3>
              <p className="text-zinc-500 font-medium">
                Click "Start Consultation" to begin recording clinical notes
              </p>
            </div>
            
            <div className="neo-pressed rounded-[2rem] p-6">
              {appointments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex p-6 neo-flat rounded-full text-zinc-400 mb-6">
                    <Stethoscope className="h-12 w-12" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-700">No pending appointments</h3>
                  <p className="text-zinc-500 mt-2 font-medium">
                    All consultations for today are completed or none scheduled.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Token</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Age / Gender</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Chief Complaint</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment, index) => {
                        const age = appointment.patient.dateOfBirth
                          ? differenceInYears(new Date(), new Date(appointment.patient.dateOfBirth))
                          : null

                        return (
                            <TableRow 
                              key={appointment.id} 
                              className="border-b border-zinc-200/50 hover:bg-zinc-50/30 transition-colors"
                            >
                              <TableCell className="font-mono font-bold text-zinc-500">
                                #{String(index + 1).padStart(2, '0')}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 neo-flat rounded-full flex items-center justify-center text-sm font-bold text-zinc-700 bg-[#e0e5ec]">
                                    {appointment.patient.user.name?.charAt(0) || "U"}
                                  </div>
                                  <div>
                                    <p className="font-bold text-zinc-800">
                                      {appointment.patient.user.name || "Unknown Patient"}
                                      {(appointment as any).source === "CASUALTY" && (
                                        <span className="ml-2 inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 align-middle">CASUALTY</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-zinc-500 font-medium">
                                      ID: {appointment.patient.patientId}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-zinc-700">
                                  {age || "N/A"} yrs / {appointment.patient.gender?.charAt(0) || "-"}
                                </span>
                              </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {appointment.appointmentTime}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate">
                                {appointment.reason || appointment.chiefComplaint || "—"}
                              </p>
                            </TableCell>
                            <TableCell>
                              {appointment.status === "WAITING_FOR_REPORTS" ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 neo-pressed rounded-full text-xs font-bold text-amber-600">
                                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse-subtle" />
                                  Pending Reports
                                </div>
                              ) : appointment.status === "IN_PROGRESS" ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 neo-pressed rounded-full text-xs font-bold text-blue-600">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-subtle" />
                                  In Progress
                                </div>
                              ) : appointment.status === "VITALS_DONE" ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 neo-pressed rounded-full text-xs font-bold text-emerald-600">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  Vitals Done
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 neo-pressed rounded-full text-xs font-bold text-zinc-500">
                                  <div className="w-2 h-2 rounded-full bg-zinc-400" />
                                  Awaiting Vitals
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2 items-center">
                                {appointment.status === "WAITING_FOR_REPORTS" && (
                                  <Link href={`/dashboard/clinical/emr/${appointment.id}/lab-slip`}>
                                    <button className="neo-button h-9 px-4 rounded-full text-sm font-semibold text-amber-600 bg-[#e0e5ec] flex items-center">
                                      <Printer className="mr-2 h-4 w-4" />
                                      Print Slip
                                    </button>
                                  </Link>
                                )}

                                <PaperOPDDialog
                                  appointmentId={appointment.id}
                                  patientId={appointment.patient.id}
                                  patientName={appointment.patient.user.name || "Patient"}
                                  patientPhone={appointment.patient.phone}
                                  triggerVariant="neo"
                                  triggerLabel="Done on Paper"
                                />
                                
                                {["PENDING", "SCHEDULED", "CONFIRMED", "WAITING"].includes(appointment.status) ? (
                                  <button disabled className="h-9 px-6 rounded-full text-sm font-bold text-zinc-400 bg-zinc-200 cursor-not-allowed">
                                    Awaiting Vitals
                                  </button>
                                ) : (
                                  <Link href={`/dashboard/clinical/emr/${appointment.id}`}>
                                    <button 
                                      className={`neo-button h-9 px-6 rounded-full text-sm font-bold flex items-center bg-[#e0e5ec] ${
                                        appointment.status === "WAITING_FOR_REPORTS"
                                          ? "text-amber-600"
                                          : appointment.status === "IN_PROGRESS"
                                            ? "text-blue-600"
                                            : "text-emerald-600"
                                      }`}
                                    >
                                      {appointment.status === "WAITING_FOR_REPORTS"
                                        ? "Review Reports"
                                        : appointment.status === "IN_PROGRESS"
                                          ? "Continue"
                                          : "Start"}
                                      <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.5} />
                                    </button>
                                  </Link>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Appointments & Online Bookings Section */}
          <UpcomingAppointmentsSection
            upcomingAppointments={serializedUpcoming}
            onlineBookings={serializedOnlineBookings}
          />

          {/* Past Patients Section */}
          <div id="past-patients">
            <PastPatientsSection pastPatients={serializedPastPatients} />
          </div>

          {/* Instructions Card */}
          <div className="neo-pressed rounded-[2.5rem] p-8 mt-12 mb-8 bg-[#e0e5ec]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 neo-flat rounded-full text-blue-600 bg-[#e0e5ec]">
                <Stethoscope className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-zinc-800">Quick Guide</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 text-sm">
              <div className="neo-flat rounded-3xl p-6 bg-[#e0e5ec]">
                <h4 className="font-bold text-zinc-700 mb-4 text-base">📋 Consultation Flow:</h4>
                <ol className="list-decimal list-inside space-y-2 font-medium text-zinc-600">
                  <li>Click "Start" for the patient</li>
                  <li>Record vitals (BP, Pulse, Temp, Weight)</li>
                  <li>Document chief complaint</li>
                  <li>Write prescription with codes</li>
                  <li>Order lab tests if needed</li>
                  <li>Save & print prescription</li>
                </ol>
              </div>
              <div className="neo-flat rounded-3xl p-6 bg-[#e0e5ec]">
                <h4 className="font-bold text-zinc-700 mb-4 text-base">💊 Indian Frequency Codes:</h4>
                <ul className="space-y-3 font-medium text-zinc-600">
                  <li className="flex items-center gap-3"><span className="neo-pressed px-3 py-1 rounded-full text-zinc-800 font-bold">1-0-1</span> Morning-Afternoon-Night</li>
                  <li className="flex items-center gap-3"><span className="neo-pressed px-3 py-1 rounded-full text-zinc-800 font-bold">1-0-0</span> Once daily (Morning)</li>
                  <li className="flex items-center gap-3"><span className="neo-pressed px-3 py-1 rounded-full text-zinc-800 font-bold">0-0-1</span> Once daily (Night)</li>
                  <li className="flex items-center gap-3"><span className="neo-pressed px-3 py-1 rounded-full text-zinc-800 font-bold">1-1-1</span> Three times daily</li>
                  <li className="flex items-center gap-3"><span className="neo-pressed px-3 py-1 rounded-full text-zinc-800 font-bold">SOS</span> As needed</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
