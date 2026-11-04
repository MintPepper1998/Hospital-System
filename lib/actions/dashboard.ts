"use server"

import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays } from "date-fns"
import { requireAuth } from "@/lib/auth-guard"

export interface DashboardData {
  visits: {
    total: number
    consultations: number
    admissions: number
    trend: number // percentage change from yesterday
  }
  patients: {
    newToday: number
    returning: number
    admitted: number
    newTrend: number
    admittedTrend: number
  }
  emergency: Array<{
    id: string
    patientName: string
    room: string
    diagnosis: string
    admissionDate: Date
  }>
  specializationStats: Array<{
    department: string
    count: number
  }>
  doctors: Array<{
    id: string
    name: string
    phone: string | null
    specialization: string | null
    department: string | null
    isAvailable: boolean
  }>
  staffCheckIn: Array<{
    id: string
    name: string
    role: string
    shiftTime: string
    department: string | null
  }>
  availability: {
    appointments: number
    doctors: number
    nurses: number
    beds: number
  }
}

/**
 * Get comprehensive admin dashboard data
 */
export async function getAdminDashboardData(): Promise<DashboardData> {
  await requireAuth()
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)
  const yesterdayStart = startOfDay(subDays(today, 1))
  const yesterdayEnd = endOfDay(subDays(today, 1))

  // Run all queries in parallel for performance
  const [
    // Today's consultations
    todayConsultations,
    yesterdayConsultations,
    // Today's admissions
    todayAdmissions,
    yesterdayAdmissions,
    // Active admissions (currently admitted)
    activeAdmissions,
    yesterdayActiveAdmissions,
    // New patients today
    newPatientsToday,
    // Total patients (for returning calculation)
    totalPatients,
    // Emergency admissions
    emergencyAdmissions,
    // Consultations by department
    consultationsByDept,
    // Active doctors
    activeDoctors,
    // Today's roster with shifts
    todayRoster,
    // Today's appointments count
    todayAppointments,
    // Active nurses
    activeNurses,
    // Available beds
    availableBeds,
  ] = await Promise.all([
    // Today's consultations
    prisma.appointment.count({
      where: {
        appointmentDate: { gte: todayStart, lte: todayEnd },
        status: { in: ["COMPLETED", "IN_PROGRESS", "WAITING", "WAITING_FOR_REPORTS"] },
      },
    }),
    // Yesterday's consultations
    prisma.appointment.count({
      where: {
        appointmentDate: { gte: yesterdayStart, lte: yesterdayEnd },
        status: { in: ["COMPLETED", "IN_PROGRESS", "WAITING", "WAITING_FOR_REPORTS"] },
      },
    }),
    // Today's new admissions
    prisma.iPDAdmission.count({
      where: {
        admissionDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Yesterday's admissions
    prisma.iPDAdmission.count({
      where: {
        admissionDate: { gte: yesterdayStart, lte: yesterdayEnd },
      },
    }),
    // Currently admitted patients
    prisma.iPDAdmission.count({
      where: { status: "ADMITTED" },
    }),
    // Yesterday's active admissions
    prisma.iPDAdmission.count({
      where: {
        admissionDate: { lte: yesterdayEnd },
        OR: [
          { status: "ADMITTED" },
          { dischargeDate: { gte: yesterdayStart } },
        ],
      },
    }),
    // New patients created today
    prisma.patient.count({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Total patients
    prisma.patient.count(),
    // Emergency admissions (active, where reason contains emergency or is urgent)
    prisma.iPDAdmission.findMany({
      where: {
        status: "ADMITTED",
        OR: [
          { reason: { contains: "emergency", mode: "insensitive" } },
          { reason: { contains: "urgent", mode: "insensitive" } },
          { reason: { contains: "accident", mode: "insensitive" } },
          { reason: { contains: "critical", mode: "insensitive" } },
        ],
      },
      include: {
        patient: { include: { user: true } },
        bed: { include: { ward: true } },
      },
      take: 5,
      orderBy: { admissionDate: "desc" },
    }),
    // Consultations grouped by department
    prisma.appointment.groupBy({
      by: ["doctorId"],
      where: {
        appointmentDate: { gte: todayStart, lte: todayEnd },
      },
      _count: true,
    }),
    // Active doctors with details
    prisma.staff.findMany({
      where: {
        user: { role: "DOCTOR", isActive: true },
      },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
      take: 10,
    }),
    // Today's roster entries
    prisma.roster.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
      include: {
        staff: { include: { user: true } },
        shift: true,
      },
      orderBy: { shift: { startTime: "asc" } },
      take: 8,
    }),
    // Today's scheduled appointments
    prisma.appointment.count({
      where: {
        appointmentDate: { gte: todayStart, lte: todayEnd },
        status: { in: ["SCHEDULED", "CONFIRMED", "PENDING"] },
      },
    }),
    // Active nurses count
    prisma.staff.count({
      where: {
        user: { role: "NURSE", isActive: true },
      },
    }),
    // Available beds count
    prisma.bed.count({
      where: { status: "AVAILABLE" },
    }),
  ])

  // Get department info for doctors to calculate specialization stats
  const doctorDepartments = await prisma.staff.findMany({
    where: {
      id: { in: consultationsByDept.map((c) => c.doctorId) },
    },
    select: { id: true, department: true },
  })

  // Aggregate by department
  const deptMap = new Map<string, number>()
  consultationsByDept.forEach((c) => {
    const doctor = doctorDepartments.find((d) => d.id === c.doctorId)
    const dept = doctor?.department || "General"
    deptMap.set(dept, (deptMap.get(dept) || 0) + c._count)
  })

  const specializationStats = Array.from(deptMap.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Calculate trends
  const totalVisitsToday = todayConsultations + todayAdmissions
  const totalVisitsYesterday = yesterdayConsultations + yesterdayAdmissions
  const visitsTrend = totalVisitsYesterday > 0
    ? Math.round(((totalVisitsToday - totalVisitsYesterday) / totalVisitsYesterday) * 100)
    : 0

  const admittedTrend = yesterdayActiveAdmissions > 0
    ? Math.round(((activeAdmissions - yesterdayActiveAdmissions) / yesterdayActiveAdmissions) * 100)
    : 0

  return {
    visits: {
      total: totalVisitsToday,
      consultations: todayConsultations,
      admissions: todayAdmissions,
      trend: visitsTrend,
    },
    patients: {
      newToday: newPatientsToday,
      returning: Math.max(0, todayConsultations - newPatientsToday),
      admitted: activeAdmissions,
      newTrend: 12, // Placeholder - would need historical data
      admittedTrend,
    },
    emergency: emergencyAdmissions.map((a) => ({
      id: a.id,
      patientName: a.patient.user.name || "Unknown",
      room: `${a.bed.ward.name} - ${a.bed.bedNumber}`,
      diagnosis: a.diagnosis || a.reason || "Under observation",
      admissionDate: a.admissionDate,
    })),
    specializationStats,
    doctors: activeDoctors.map((d) => ({
      id: d.id,
      name: d.user.name || "Unknown",
      phone: d.phone,
      specialization: d.specialization,
      department: d.department,
      isAvailable: !d.isOnLeave,
    })),
    staffCheckIn: todayRoster.map((r) => ({
      id: r.id,
      name: r.staff.user.name || "Unknown",
      role: r.staff.user.role.replace("_", " "),
      shiftTime: r.shift.startTime,
      department: r.staff.department,
    })),
    availability: {
      appointments: todayAppointments,
      doctors: activeDoctors.length,
      nurses: activeNurses,
      beds: availableBeds,
    },
  }
}

/**
 * Get quick stats for mini dashboard
 */
export async function getQuickStats() {
  await requireAuth()
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const [appointments, patients, admissions, revenue] = await Promise.all([
    prisma.appointment.count({
      where: {
        appointmentDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.patient.count(),
    prisma.iPDAdmission.count({
      where: { status: "ADMITTED" },
    }),
    prisma.billing.aggregate({
      where: {
        billDate: { gte: todayStart, lte: todayEnd },
        status: "PAID",
      },
      _sum: { paidAmount: true },
    }),
  ])

  return {
    appointments,
    patients,
    admissions,
    revenue: revenue._sum.paidAmount || 0,
  }
}
