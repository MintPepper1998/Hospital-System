"use server"

import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"
import { requireAuth } from "@/lib/auth-guard"

// ============================================
// TYPES
// ============================================

export interface DoctorStats {
  todayAppointments: number
  completedToday: number
  inProgressToday: number
  pendingToday: number
  myInPatients: number
  pendingLabResults: number
}

export interface OpdAppointment {
  id: string
  appointmentTime: string
  status: string
  patientName: string
  patientId: string
  reason: string
  symptoms: string
  chiefComplaint: string
}

export interface IpdPatient {
  admissionId: string
  bedNumber: string
  wardName: string
  patientName: string
  patientAge: string
  patientGender: string
  diagnosis: string
  admissionDate: string
  activeMedsCount: number
}

// ============================================
// GET DOCTOR DASHBOARD DATA
// ============================================

export async function getDoctorDashboardData(staffId: string): Promise<{
  stats: DoctorStats
  todayOPD: OpdAppointment[]
  myIPD: IpdPatient[]
}> {
  await requireAuth(["SUPER_ADMIN", "DOCTOR"])

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  // ── Parallel fetch ──────────────────────────
  const [
    todayAppointments,
    todayStatuses,
    activeAdmissions,
    pendingLabCount,
  ] = await Promise.all([
    // 1. Today's OPD appointments
    prisma.appointment.findMany({
      where: {
        doctorId: staffId,
        appointmentDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        patient: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { appointmentTime: "asc" },
    }),

    // 2. Status breakdown for today
    prisma.appointment.groupBy({
      by: ["status"],
      where: {
        doctorId: staffId,
        appointmentDate: { gte: todayStart, lte: todayEnd },
      },
      _count: true,
    }),

    // 3. My admitted IPD patients
    prisma.iPDAdmission.findMany({
      where: {
        primaryDoctorId: staffId,
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
      orderBy: [
        { bed: { ward: { name: "asc" } } },
        { bed: { bedNumber: "asc" } },
      ],
    }),

    // 4. Pending lab results ordered by this doctor
    prisma.iPDLabRequest.count({
      where: {
        orderedById: staffId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    }),
  ])

  // ── Compute status counts ─────────────────
  const getCount = (status: string) =>
    todayStatuses.find((s) => s.status === status)?._count ?? 0

  // ── Map OPD appointments ──────────────────
  const todayOPD: OpdAppointment[] = todayAppointments.map((a) => ({
    id: a.id,
    appointmentTime: a.appointmentTime,
    status: a.status,
    patientName: a.patient.user?.name ?? "—",
    patientId: a.patient.patientId,
    reason: a.reason || "—",
    symptoms: a.symptoms || "—",
    chiefComplaint: a.chiefComplaint || "—",
  }))

  // ── Map IPD patients ──────────────────────
  const myIPD: IpdPatient[] = activeAdmissions.map((adm) => {
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

  return {
    stats: {
      todayAppointments: todayAppointments.length,
      completedToday: getCount("COMPLETED"),
      inProgressToday: getCount("IN_PROGRESS"),
      pendingToday: getCount("PENDING") + getCount("SCHEDULED") + getCount("CONFIRMED") + getCount("WAITING"),
      myInPatients: activeAdmissions.length,
      pendingLabResults: pendingLabCount,
    },
    todayOPD,
    myIPD,
  }
}
