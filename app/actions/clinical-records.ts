"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"

// ──────────────────────────────────────────────────
// Emergency Past Records
// ──────────────────────────────────────────────────
export async function getEmergencyRecords(
  q: string = "",
  page: number = 1,
  pageSize: number = 20,
  dateFrom?: string,
  dateTo?: string,
  statusFilter?: string
) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "ACCOUNTANT"])

  const skip = (page - 1) * pageSize

  const where: any = {}

  // Status filter
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter
  } else {
    // Default: show discharged/admitted-to-ipd/deceased
    where.status = { in: ["DISCHARGED", "ADMITTED_TO_IPD", "DECEASED"] }
  }

  // Date range
  if (dateFrom) {
    where.arrivalTime = { ...where.arrivalTime, gte: new Date(dateFrom) }
  }
  if (dateTo) {
    const end = new Date(dateTo)
    end.setDate(end.getDate() + 1)
    where.arrivalTime = { ...where.arrivalTime, lt: end }
  }

  // Search
  if (q.trim()) {
    where.OR = [
      { patient: { user: { name: { contains: q, mode: "insensitive" } } } },
      { patient: { patientId: { contains: q, mode: "insensitive" } } },
      { patient: { phone: { contains: q, mode: "insensitive" } } },
      { chiefComplaint: { contains: q, mode: "insensitive" } },
      { finalDiagnosis: { contains: q, mode: "insensitive" } },
    ]
  }

  const [records, total] = await Promise.all([
    prisma.emergencyVisit.findMany({
      where,
      include: {
        patient: { include: { user: true } },
        assignedDoctor: { include: { user: true } },
        bed: { include: { ward: true } },
        billings: { select: { totalAmount: true, paidAmount: true, status: true } },
      },
      orderBy: { arrivalTime: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.emergencyVisit.count({ where }),
  ])

  const serialized = records.map((r) => ({
    id: r.id,
    patientName: r.patient?.user?.name || "Unknown",
    patientId: r.patient?.patientId || "—",
    gender: r.patient?.gender || null,
    phone: r.patient?.phone || null,
    chiefComplaint: r.chiefComplaint,
    triageLevel: r.triageLevel,
    status: r.status,
    arrivalTime: r.arrivalTime.toISOString(),
    dischargeTime: r.dischargeTime?.toISOString() || null,
    doctorName: r.assignedDoctor?.user?.name || null,
    bedInfo: r.bed ? `${r.bed.ward?.name || "—"} / Bed ${r.bed.bedNumber}` : null,
    finalDiagnosis: r.finalDiagnosis,
    treatmentGiven: r.treatmentGiven,
    totalBilled: r.billings.reduce((s, b) => s + (b.totalAmount || 0), 0),
    totalPaid: r.billings.reduce((s, b) => s + (b.paidAmount || 0), 0),
  }))

  return {
    records: serialized,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ──────────────────────────────────────────────────
// Casualty Past Records
// ──────────────────────────────────────────────────
export async function getCasualtyRecords(
  q: string = "",
  page: number = 1,
  pageSize: number = 20,
  dateFrom?: string,
  dateTo?: string,
  statusFilter?: string
) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "ACCOUNTANT"])

  const skip = (page - 1) * pageSize

  const where: any = {}

  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter
  } else {
    where.status = { in: ["DISCHARGED", "REFERRED_TO_OPD"] }
  }

  if (dateFrom) {
    where.arrivalTime = { ...where.arrivalTime, gte: new Date(dateFrom) }
  }
  if (dateTo) {
    const end = new Date(dateTo)
    end.setDate(end.getDate() + 1)
    where.arrivalTime = { ...where.arrivalTime, lt: end }
  }

  if (q.trim()) {
    where.OR = [
      { patient: { user: { name: { contains: q, mode: "insensitive" } } } },
      { patient: { patientId: { contains: q, mode: "insensitive" } } },
      { patient: { phone: { contains: q, mode: "insensitive" } } },
      { chiefComplaint: { contains: q, mode: "insensitive" } },
    ]
  }

  const [records, total] = await Promise.all([
    prisma.casualtyVisit.findMany({
      where,
      include: {
        patient: { include: { user: true } },
        assignedDoctor: { include: { user: true } },
        procedures: true,
        appointments: {
          include: { doctor: { include: { user: true } } },
          take: 3,
        },
        billings: { select: { totalAmount: true, paidAmount: true, status: true, billNumber: true } },
      },
      orderBy: { arrivalTime: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.casualtyVisit.count({ where }),
  ])

  const serialized = records.map((r) => ({
    id: r.id,
    patientName: r.patient?.user?.name || "Unknown",
    patientId: r.patient?.patientId || "—",
    gender: r.patient?.gender || null,
    phone: r.patient?.phone || null,
    chiefComplaint: r.chiefComplaint,
    status: r.status,
    arrivalTime: r.arrivalTime.toISOString(),
    dischargeTime: r.dischargeTime?.toISOString() || null,
    doctorName: r.assignedDoctor?.user?.name || null,
    procedureCount: r.procedures.length,
    procedureTotal: r.procedures.reduce((s, p) => s + p.unitPrice * p.quantity, 0),
    opdBookings: r.appointments.map((a) => ({
      doctorName: a.doctor?.user?.name || "—",
      status: a.status,
    })),
    totalBilled: r.billings.reduce((s, b) => s + (b.totalAmount || 0), 0),
    totalPaid: r.billings.reduce((s, b) => s + (b.paidAmount || 0), 0),
    billNumbers: r.billings.map((b) => b.billNumber).filter(Boolean),
  }))

  return {
    records: serialized,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  }
}
