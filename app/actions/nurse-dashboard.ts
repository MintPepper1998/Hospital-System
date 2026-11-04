"use server"

import { prisma } from "@/lib/prisma"
import { subHours, startOfDay, endOfDay } from "date-fns"
import { requireAuth } from "@/lib/auth-guard"

// ============================================
// TYPES
// ============================================

export interface NurseStats {
  activePatients: number
  vitalsPending: number
  medsDue: number
  todayAdmissions: number
  todayDischarges: number
}

export interface WardPatient {
  admissionId: string
  bedNumber: string
  wardName: string
  wardType: string
  patientName: string
  patientAge: string
  patientGender: string
  doctorName: string
  diagnosis: string
  admissionDate: string
  lastVitalsAt: string | null
  vitalsPending: boolean
  activeMedsCount: number
  activeEquipmentCount: number
  equipmentNames: string[]
}

// ============================================
// FETCH NURSE DASHBOARD DATA
// ============================================

export async function getNurseStats(): Promise<{
  stats: NurseStats
  patients: WardPatient[]
}> {
  await requireAuth(["SUPER_ADMIN", "NURSE", "DOCTOR"])

  const now = new Date()
  const sixHoursAgo = subHours(now, 6)
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  // 1. All active (admitted) IPD patients with relations
  const activeAdmissions = await prisma.iPDAdmission.findMany({
    where: { status: "ADMITTED" },
    include: {
      patient: {
        include: { user: { select: { name: true } } },
      },
      bed: {
        include: { ward: true },
      },
      primaryDoctor: {
        include: { user: true },
      },
      clinicalNotes: {
        orderBy: { date: "desc" },
        take: 1, // Latest note only
        select: {
          date: true,
          bp: true,
          pulse: true,
          temperature: true,
          spO2: true,
        },
      },
      ipdPrescriptions: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
      equipmentUsages: {
        where: { status: "ACTIVE" },
        include: { equipment: { select: { name: true } } },
      },
    },
    orderBy: [
      { bed: { ward: { name: "asc" } } },
      { bed: { bedNumber: "asc" } },
    ],
  })

  // 2. Count today's admissions
  const todayAdmissions = await prisma.iPDAdmission.count({
    where: {
      admissionDate: { gte: todayStart, lte: todayEnd },
    },
  })

  // 3. Count today's discharges
  const todayDischarges = await prisma.iPDAdmission.count({
    where: {
      status: "DISCHARGED",
      dischargeDate: { gte: todayStart, lte: todayEnd },
    },
  })

  // 4. Build ward patient list + compute stats
  let vitalsPendingCount = 0
  let totalActiveMeds = 0

  const patients: WardPatient[] = activeAdmissions.map((adm) => {
    const lastNote = adm.clinicalNotes[0] ?? null
    const lastVitalsDate = lastNote?.date ?? null

    // Vitals are "pending" if no vitals recorded in the last 6 hours
    // OR if there has never been a vitals entry
    const hasRecentVitals = lastVitalsDate ? lastVitalsDate >= sixHoursAgo : false
    // Also consider if vitals fields were actually filled (not just a text note)
    const hadVitalData = lastNote
      ? !!(lastNote.bp || lastNote.pulse || lastNote.temperature || lastNote.spO2)
      : false
    const isPending = !hasRecentVitals || !hadVitalData

    if (isPending) vitalsPendingCount++
    totalActiveMeds += adm.ipdPrescriptions.length

    // Compute age string
    const dob = adm.patient.dateOfBirth
    let ageStr = "—"
    if (dob) {
      const ageDiff = now.getFullYear() - new Date(dob).getFullYear()
      ageStr = `${ageDiff}y`
    }

    return {
      admissionId: adm.id,
      bedNumber: adm.bed.bedNumber,
      wardName: adm.bed.ward.name,
      wardType: adm.bed.ward.type,
      patientName: adm.patient.user?.name ?? "—",
      patientAge: ageStr,
      patientGender: adm.patient.gender || "—",
      doctorName: adm.primaryDoctor.user.name || "Dr. Unknown",
      diagnosis: adm.diagnosis || adm.reason || "—",
      admissionDate: adm.admissionDate.toISOString(),
      lastVitalsAt: lastVitalsDate?.toISOString() ?? null,
      vitalsPending: isPending,
      activeMedsCount: adm.ipdPrescriptions.length,
      activeEquipmentCount: adm.equipmentUsages.length,
      equipmentNames: adm.equipmentUsages.map((eu: any) => eu.equipment.name),
    }
  })

  return {
    stats: {
      activePatients: activeAdmissions.length,
      vitalsPending: vitalsPendingCount,
      medsDue: totalActiveMeds,
      todayAdmissions,
      todayDischarges,
    },
    patients,
  }
}
