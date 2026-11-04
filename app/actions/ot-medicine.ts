"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"

export interface OTMedicineSummary {
  totalSurgeries: number
  scheduledSurgeries: number
  inProgressSurgeries: number
  completedSurgeries: number
  totalMedicinesUsed: number
  totalMedicineCost: number
}

export interface OTSurgeryMedicine {
  id: string
  medicineId?: string
  name: string
  strength?: string | null
  type?: string | null
  batchId?: string | null
  batchNumber?: string | null
  quantityIssued: number
  quantityReturned: number
  quantity: number
  unitPrice: number
  total: number
  returnedQuantity?: number
  status: "PENDING" | "DISPENSED" | "PARTIALLY_RETURNED" | "RETURNED"
  issuedAt?: string | null
  notes?: string | null
}

export interface OTSurgeryItem {
  id: string
  procedureName: string
  category: string | null
  scheduledDate: string
  status: string
  durationMinutes: number
  patientName: string
  patientId: string
  patientDbId?: string
  leadSurgeonName: string
  theaterName: string
  medicinesCount: number
  dispensedCount: number
  medicineTotalCost: number
  medicines: OTSurgeryMedicine[]
}

export async function getOTMedicineDashboardData(search?: string, statusFilter?: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST", "DOCTOR", "NURSE", "ACCOUNTANT"])
  if (!authResult.ok) {
    return { success: false, message: authResult.error, data: null }
  }

  try {
    const surgeries = await prisma.surgery.findMany({
      where: {
        ...(statusFilter && statusFilter !== "ALL" ? { status: statusFilter as any } : {}),
        ...(search
          ? {
              OR: [
                { procedureName: { contains: search, mode: "insensitive" } },
                { patient: { user: { name: { contains: search, mode: "insensitive" } } } },
                { patient: { patientId: { contains: search, mode: "insensitive" } } },
                { leadSurgeon: { user: { name: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true } },
          },
        },
        leadSurgeon: {
          include: {
            user: { select: { name: true } },
          },
        },
        theater: {
          select: { name: true },
        },
      },
      orderBy: { scheduledDate: "desc" },
      take: 50,
    })

    let totalMedicinesCount = 0
    let totalMedicineCost = 0
    let scheduledCount = 0
    let inProgressCount = 0
    let completedCount = 0

    const formattedSurgeries: OTSurgeryItem[] = surgeries.map((s) => {
      if (s.status === "SCHEDULED") scheduledCount++
      else if (s.status === "IN_PROGRESS") inProgressCount++
      else if (s.status === "COMPLETED") completedCount++

      const consumables = (s.consumables as any) || {}
      const otMeds: any[] = Array.isArray(consumables.otPharmacy) ? consumables.otPharmacy : []

      const medItems: OTSurgeryMedicine[] = otMeds.map((m: any, idx: number) => {
        const qtyIssued = Number(m.quantityIssued) || (m.batchId ? Number(m.quantity) || 1 : 0)
        const qtyReturned = Number(m.returnedQuantity || m.quantityReturned) || 0
        const netQty = m.netQuantity !== undefined ? Number(m.netQuantity) : Math.max(0, (Number(m.quantity) || qtyIssued) - qtyReturned)
        const unitPrice = Number(m.unitPrice) || 0
        const total = m.netTotal !== undefined ? Number(m.netTotal) : (unitPrice * netQty)

        let status: "PENDING" | "DISPENSED" | "PARTIALLY_RETURNED" | "RETURNED" = m.status
        if (!status) {
          if (m.batchId || qtyIssued > 0) {
            status = qtyReturned >= qtyIssued && qtyIssued > 0 ? "RETURNED" : (qtyReturned > 0 ? "PARTIALLY_RETURNED" : "DISPENSED")
          } else {
            status = "PENDING"
          }
        }

        return {
          id: m.id || `otm_${idx}_${s.id}`,
          medicineId: m.medicineId,
          name: m.medicineName || m.name || "Unknown Medicine",
          strength: m.strength || null,
          type: m.type || null,
          batchId: m.batchId || null,
          batchNumber: m.batchNumber || null,
          quantityIssued: qtyIssued,
          quantityReturned: qtyReturned,
          quantity: netQty,
          unitPrice,
          total,
          returnedQuantity: qtyReturned,
          status,
          issuedAt: m.issuedAt || null,
          notes: m.notes || null,
        }
      })

      const medCost = medItems.reduce((acc, curr) => acc + (curr.status !== "PENDING" ? curr.total : 0), 0)
      const dispensedItems = medItems.filter(m => m.status === "DISPENSED" || m.status === "PARTIALLY_RETURNED")
      totalMedicinesCount += dispensedItems.length
      totalMedicineCost += medCost

      return {
        id: s.id,
        procedureName: s.procedureName,
        category: s.category,
        scheduledDate: s.scheduledDate.toISOString(),
        status: s.status,
        durationMinutes: s.durationMinutes,
        patientName: s.patient?.user?.name || "Unknown Patient",
        patientId: s.patient?.patientId || "N/A",
        patientDbId: s.patientId,
        leadSurgeonName: s.leadSurgeon?.user?.name || "Dr. Unassigned",
        theaterName: s.theater?.name || "General OT",
        medicinesCount: medItems.length,
        dispensedCount: dispensedItems.length,
        medicineTotalCost: medCost,
        medicines: medItems,
      }
    })

    const summary: OTMedicineSummary = {
      totalSurgeries: surgeries.length,
      scheduledSurgeries: scheduledCount,
      inProgressSurgeries: inProgressCount,
      completedSurgeries: completedCount,
      totalMedicinesUsed: totalMedicinesCount,
      totalMedicineCost,
    }

    return {
      success: true,
      data: {
        summary,
        surgeries: formattedSurgeries,
      },
    }
  } catch (error: any) {
    console.error("[ERROR] getOTMedicineDashboardData:", error)
    return {
      success: false,
      message: error.message || "Failed to fetch OT medicine data",
      data: null,
    }
  }
}

