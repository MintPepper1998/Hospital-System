import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { DoctorDashboardClient } from "@/components/doctor/doctor-dashboard-client"

export default async function DoctorDashboardPage() {
  // ── Auth guard ──
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { staff: true },
  })

  if (!user || (user.role !== "DOCTOR" && user.role !== "SUPER_ADMIN") || !user.staff) {
    redirect("/dashboard")
  }

  const doctorId = user.staff.id

  // ── Date boundaries ──
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // ── Parallel data fetch ──
  const [
    todayAppointments,
    todayStats,
    upcomingAppointments,
    recentPatients,
    activeAdmissions,
    pendingLabCount,
    totalPatientsSeen,
    pastPatientAppointments,
  ] = await Promise.all([
    // Today's OPD appointments
    prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: today, lt: tomorrow },
      },
      include: {
        patient: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { appointmentTime: "asc" },
    }),

    // Today's status breakdown
    prisma.appointment.groupBy({
      by: ["status"],
      where: {
        doctorId,
        appointmentDate: { gte: today, lt: tomorrow },
      },
      _count: true,
    }),

    // Upcoming appointments (next 7 days)
    prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: tomorrow },
        status: { in: ["SCHEDULED", "CONFIRMED", "PENDING"] },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
      },
      orderBy: { appointmentDate: "asc" },
      take: 8,
    }),

    // Recent completed consultations
    prisma.appointment.findMany({
      where: { doctorId, status: "COMPLETED" },
      include: {
        patient: { include: { user: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),

    // My active IPD patients
    prisma.iPDAdmission.findMany({
      where: {
        primaryDoctorId: doctorId,
        status: "ADMITTED",
      },
      include: {
        patient: {
          include: { user: { select: { name: true } } },
        },
        bed: {
          include: { ward: true },
        },
        ipdPrescriptions: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
      },
      orderBy: { admissionDate: "desc" },
    }),

    // Pending lab results
    prisma.iPDLabRequest.count({
      where: {
        orderedById: doctorId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    }),

    // Total patients this doctor has seen
    prisma.appointment.count({
      where: { doctorId, status: "COMPLETED" },
    }),

    // Past patients — completed appointments before today (last 50)
    prisma.appointment.findMany({
      where: {
        doctorId,
        status: "COMPLETED",
        appointmentDate: { lt: today },
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true } },
            prescriptions: {
              orderBy: { prescriptionDate: "desc" },
              take: 10,
              include: {
                medications: true,
              },
            },
          },
        },
      },
      orderBy: { appointmentDate: "desc" },
      take: 50,
    }),
  ])

  // ── Compute stats ──
  const getCount = (status: string) =>
    todayStats.find((s) => s.status === status)?._count ?? 0

  const totalToday = todayAppointments.length
  const completed = getCount("COMPLETED")
  const pending = getCount("PENDING") + getCount("SCHEDULED") + getCount("CONFIRMED") + getCount("WAITING")
  const inProgress = getCount("IN_PROGRESS")
  const vitalsDone = getCount("VITALS_DONE")

  // ── Serialize dates for client component ──
  const serializedToday = todayAppointments.map((a) => ({
    id: a.id,
    patientDbId: a.patientId,
    appointmentTime: a.appointmentTime,
    reason: a.reason,
    chiefComplaint: a.chiefComplaint,
    symptoms: a.symptoms,
    status: a.status,
    bloodPressure: a.bloodPressure,
    pulse: a.pulse,
    temperature: a.temperature,
    spo2: a.spo2,
    weight: a.weight,
    patient: {
      patientId: a.patient.patientId,
      user: { name: a.patient.user.name },
    },
  }))

  const serializedUpcoming = upcomingAppointments.map((a) => ({
    id: a.id,
    appointmentDate: a.appointmentDate.toISOString(),
    appointmentTime: a.appointmentTime,
    status: a.status,
    reason: a.reason,
    patient: {
      patientId: a.patient.patientId,
      user: { name: a.patient.user.name },
    },
  }))

  const serializedRecent = recentPatients.map((a) => ({
    id: a.id,
    appointmentDate: a.appointmentDate.toISOString(),
    diagnosis: a.diagnosis,
    patient: {
      patientId: a.patient.patientId,
      user: { name: a.patient.user.name },
    },
  }))

  // Serialize past patients with prescriptions
  const serializedPastPatients = pastPatientAppointments.map((a) => ({
    id: a.id,
    appointmentDate: a.appointmentDate.toISOString(),
    appointmentTime: a.appointmentTime,
    diagnosis: a.diagnosis,
    chiefComplaint: a.chiefComplaint,
    patient: {
      patientId: a.patient.patientId,
      user: { name: a.patient.user.name },
      prescriptions: a.patient.prescriptions.map((p) => ({
        id: p.id,
        prescriptionDate: p.prescriptionDate.toISOString(),
        instructions: p.instructions,
        medications: p.medications.map((m) => ({
          id: m.id,
          medicationName: m.medicationName,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: m.quantity,
          instructions: m.instructions,
        })),
      })),
    },
  }))

  const now = new Date()
  const serializedIPD = activeAdmissions.map((adm) => {
    const dob = adm.patient.dateOfBirth
    let ageStr = "—"
    if (dob) {
      ageStr = `${now.getFullYear() - new Date(dob).getFullYear()}y`
    }
    return {
      admissionId: adm.id,
      bedNumber: adm.bed.bedNumber,
      wardName: adm.bed.ward.name,
      patientName: adm.patient.user?.name ?? "—",
      patientAge: ageStr,
      patientGender: adm.patient.gender || "—",
      diagnosis: adm.diagnosis || adm.reason || "—",
      admissionDate: adm.admissionDate.toISOString(),
      activeMedsCount: adm.ipdPrescriptions.length,
    }
  })

  const dateLabel = format(today, "EEEE, MMMM d, yyyy")

  return (
    <DoctorDashboardClient
      doctorName={user.name || "Doctor"}
      specialization={user.staff.specialization}
      department={user.staff.department}
      dateLabel={dateLabel}
      stats={{
        totalToday,
        completed,
        pending,
        inProgress,
        vitalsDone,
        myInPatients: activeAdmissions.length,
        pendingLabResults: pendingLabCount,
        totalPatientsSeen,
      }}
      todayAppointments={serializedToday}
      upcomingAppointments={serializedUpcoming}
      recentPatients={serializedRecent}
      ipdPatients={serializedIPD}
      pastPatients={serializedPastPatients}
    />
  )
}
