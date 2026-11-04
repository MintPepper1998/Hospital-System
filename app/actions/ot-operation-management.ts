"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface SurgeryChargeItem {
  id?: string
  chargeLabel: string
  chargeType: string
  amount: number
}

export interface SurgeryMedicineItem {
  id: string
  medicineId: string
  medicineName: string
  strength?: string | null
  type?: string
  batchId?: string
  batchNumber?: string
  quantityIssued: number
  quantityReturned: number
  netQuantity: number
  unitPrice: number
  netTotal: number
  notes?: string | null
  issuedAt: string
  status?: "PENDING" | "DISPENSED" | "PARTIALLY_RETURNED" | "RETURNED"
}

export interface SurgeryMedicineReturnLog {
  id: string
  itemId: string
  medicineName: string
  quantityReturned: number
  refundAmount: number
  reason?: string
  returnedAt: string
}

// ─────────────────────────────────────────────────────────────
// 1. GET FULL SURGERY DETAILS
// ─────────────────────────────────────────────────────────────
export async function getSurgeryOperationDetails(surgeryId: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"])
  if (!auth.ok) return { success: false, message: auth.error, data: null }

  try {
    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      include: {
        patient: {
          include: {
            user: true,
            ipdAdmissions: {
              where: { status: "ADMITTED" },
              orderBy: { admissionDate: "desc" },
              take: 1,
              select: { id: true }
            }
          }
        },
        leadSurgeon: {
          include: { user: true }
        },
        theater: true,
        staffAssignments: {
          include: {
            staff: { include: { user: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    })

    if (!surgery) {
      return { success: false, message: "Surgery not found", data: null }
    }

    const consumables = (surgery.consumables as any) || {}
    const rawOtPharmacy: any[] = consumables.otPharmacy || []
    const otPharmacy: SurgeryMedicineItem[] = rawOtPharmacy.map((m: any, idx: number) => {
      const qtyIssued = Number(m.quantityIssued) || (m.batchId ? Number(m.quantity) || 1 : 0)
      const qtyReturned = Number(m.quantityReturned || m.returnedQuantity) || 0
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
        id: m.id || `otm_${idx}_${surgery.id}`,
        medicineId: m.medicineId,
        medicineName: m.medicineName || m.name || "Unknown Medicine",
        strength: m.strength || null,
        type: m.type || null,
        batchId: m.batchId || null,
        batchNumber: m.batchNumber || null,
        quantityIssued: qtyIssued,
        quantityReturned: qtyReturned,
        netQuantity: netQty,
        unitPrice,
        netTotal: total,
        notes: m.notes || null,
        issuedAt: m.issuedAt || new Date().toISOString(),
        status,
      }
    })
    const returnsLog: SurgeryMedicineReturnLog[] = consumables.returnsLog || []
    const chargeBreakdown: SurgeryChargeItem[] = (surgery.chargeBreakdown as any[]) || []

    return {
      success: true,
      data: {
        ...surgery,
        otPharmacy,
        returnsLog,
        chargeBreakdown
      }
    }
  } catch (error: any) {
    console.error("getSurgeryOperationDetails error:", error)
    return { success: false, message: error.message || "Failed to load surgery details", data: null }
  }
}

// ─────────────────────────────────────────────────────────────
// 2. GET AVAILABLE STAFF & DOCTORS
// ─────────────────────────────────────────────────────────────
export async function getAvailableStaffAndDoctors() {
  try {
    const allStaff = await prisma.staff.findMany({
      where: { user: { isActive: true } },
      include: { user: true },
      orderBy: { user: { name: "asc" } }
    })

    const doctors = allStaff.filter(s => s.user.role === "DOCTOR")
    const nurses = allStaff.filter(s => s.user.role === "NURSE")
    const all = allStaff.map(s => ({
      id: s.id,
      name: s.user.name || "Staff",
      role: s.user.role,
      department: s.department,
      phone: s.phone || s.user.phone
    }))

    return {
      success: true,
      doctors: doctors.map(d => ({ id: d.id, name: d.user.name, department: d.department })),
      nurses: nurses.map(n => ({ id: n.id, name: n.user.name })),
      allStaff: all
    }
  } catch (error: any) {
    return { success: false, error: "Failed to load staff list", doctors: [], nurses: [], allStaff: [] }
  }
}

// ─────────────────────────────────────────────────────────────
// 3. SEARCH MEDICINES FOR OT DISPENSING
// ─────────────────────────────────────────────────────────────
export async function searchMedicinesForOT(query: string) {
  if (!query || query.trim().length < 2) return []

  try {
    const clean = query.trim()
    const medicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: clean, mode: "insensitive" } },
          { genericName: { contains: clean, mode: "insensitive" } }
        ]
      },
      include: {
        inventoryBatches: {
          where: {
            isActive: true,
            isExpired: false,
            quantity: { gt: 0 }
          },
          orderBy: { expiryDate: "asc" }
        }
      },
      take: 20
    })

    return medicines.map(m => {
      const totalStock = m.inventoryBatches.reduce((sum, b) => sum + b.quantity, 0)
      const primaryBatch = m.inventoryBatches[0]
      const sellingPrice = primaryBatch?.sellingPrice || m.unitPrice

      return {
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        strength: m.strength,
        type: m.type,
        totalStock,
        sellingPrice,
        batches: m.inventoryBatches.map(b => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          sellingPrice: b.sellingPrice,
          expiryDate: b.expiryDate
        }))
      }
    })
  } catch (error) {
    console.error("searchMedicinesForOT error:", error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────
// 4. UPDATE SURGERY CHARGES
// ─────────────────────────────────────────────────────────────
export async function updateSurgeryCharges(surgeryId: string, charges: SurgeryChargeItem[]) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "DOCTOR", "ACCOUNTANT"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId } })
    if (!surgery) return { success: false, message: "Surgery not found" }

    const consumables = (surgery.consumables as any) || {}
    const otPharmacy: SurgeryMedicineItem[] = consumables.otPharmacy || []
    const medicineTotal = otPharmacy.reduce((sum, m) => sum + (m.netTotal || 0), 0)

    // Filter out OT_PHARMACY from user charges list so we sync it dynamically
    const nonPharmacyCharges = charges.filter(c => c.chargeType !== "OT_PHARMACY")

    const syncedCharges = [...nonPharmacyCharges]
    if (medicineTotal > 0) {
      syncedCharges.push({
        chargeLabel: "OT Pharmacy Charges",
        chargeType: "OT_PHARMACY",
        amount: medicineTotal
      })
    }

    const totalSurgeryCharge = syncedCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

    await prisma.surgery.update({
      where: { id: surgeryId },
      data: {
        chargeBreakdown: syncedCharges as any,
        surgeryCharge: totalSurgeryCharge,
        estimatedCost: totalSurgeryCharge,
        actualCost: totalSurgeryCharge,
      }
    })

    revalidatePath(`/dashboard/ipd/patient`)
    revalidatePath(`/dashboard/ot/schedule`)
    return { success: true, message: "Charges updated successfully", total: totalSurgeryCharge }
  } catch (error: any) {
    console.error("updateSurgeryCharges error:", error)
    return { success: false, message: error.message || "Failed to update charges" }
  }
}

// ─────────────────────────────────────────────────────────────
// 5. UPDATE SURGERY STAFF ASSIGNMENTS
// ─────────────────────────────────────────────────────────────
export async function updateSurgeryStaffing(
  surgeryId: string,
  data: {
    leadSurgeonId?: string
    assistantSurgeons?: string
    anesthetistId?: string
    anesthetistName?: string
    staffAssignments?: Array<{ staffId: string; role: string; paymentAmount?: number; notes?: string }>
  }
) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update main doctor fields on Surgery
      await tx.surgery.update({
        where: { id: surgeryId },
        data: {
          ...(data.leadSurgeonId && { leadSurgeonId: data.leadSurgeonId }),
          assistantSurgeons: data.assistantSurgeons || null,
          anesthetistId: data.anesthetistId || null,
          anesthetistName: data.anesthetistName || null,
        }
      })

      // 2. Sync staff assignments if provided
      if (data.staffAssignments !== undefined) {
        await tx.surgeryStaffAssignment.deleteMany({ where: { surgeryId } })

        if (data.staffAssignments.length > 0) {
          await tx.surgeryStaffAssignment.createMany({
            data: data.staffAssignments.map(s => ({
              surgeryId,
              staffId: s.staffId,
              role: s.role,
              paymentAmount: s.paymentAmount || 0,
              notes: s.notes || null,
              status: "PENDING"
            }))
          })
        }
      }
    })

    revalidatePath(`/dashboard/ipd/patient`)
    revalidatePath(`/dashboard/ot/schedule`)
    return { success: true, message: "Staff assignments updated successfully" }
  } catch (error: any) {
    console.error("updateSurgeryStaffing error:", error)
    return { success: false, message: error.message || "Failed to update staff assignments" }
  }
}

// ─────────────────────────────────────────────────────────────
// 6. DISPENSE / ADD MEDICINE TO SURGERY
// ─────────────────────────────────────────────────────────────
export async function dispenseMedicineToSurgery(
  surgeryId: string,
  data: {
    medicineId: string
    batchId?: string
    quantity: number
    notes?: string
    itemId?: string
  }
) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error }

  if (!data.quantity || data.quantity <= 0) {
    return { success: false, message: "Quantity must be greater than 0" }
  }

  try {
    const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId } })
    if (!surgery) return { success: false, message: "Surgery not found" }

    const medicine = await prisma.medicine.findUnique({
      where: { id: data.medicineId },
      include: {
        inventoryBatches: {
          where: { isActive: true, isExpired: false, quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" }
        }
      }
    })

    if (!medicine) return { success: false, message: "Medicine not found" }

    // Select batch
    let targetBatch = data.batchId
      ? medicine.inventoryBatches.find(b => b.id === data.batchId)
      : medicine.inventoryBatches[0]

    if (!targetBatch || targetBatch.quantity < data.quantity) {
      return {
        success: false,
        message: `Insufficient stock in batch. Available: ${targetBatch ? targetBatch.quantity : 0}`
      }
    }

    const unitPrice = targetBatch.sellingPrice || medicine.unitPrice
    const itemTotal = unitPrice * data.quantity

    const newItem: SurgeryMedicineItem = {
      id: data.itemId || `otm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      medicineId: medicine.id,
      medicineName: medicine.name,
      strength: medicine.strength,
      type: medicine.type,
      batchId: targetBatch.id,
      batchNumber: targetBatch.batchNumber,
      quantityIssued: data.quantity,
      quantityReturned: 0,
      netQuantity: data.quantity,
      unitPrice,
      netTotal: itemTotal,
      notes: data.notes || null,
      issuedAt: new Date().toISOString(),
      status: "DISPENSED",
    }

    await prisma.$transaction(async (tx) => {
      // 1. Deduct stock from batch
      await tx.inventoryBatch.update({
        where: { id: targetBatch.id },
        data: { quantity: { decrement: data.quantity } }
      })

      // 2. Update surgery consumables
      const currentConsumables = (surgery.consumables as any) || {}
      const rawOtPharmacy: any[] = currentConsumables.otPharmacy || []
      let otPharmacy: SurgeryMedicineItem[] = []

      if (data.itemId) {
        let found = false
        otPharmacy = rawOtPharmacy.map((m: any) => {
          if (m.id === data.itemId) {
            found = true
            return newItem
          }
          return m
        })
        if (!found) otPharmacy.push(newItem)
      } else {
        otPharmacy = [...rawOtPharmacy, newItem]
      }

      currentConsumables.otPharmacy = otPharmacy

      // 3. Recalculate medicine total
      const medicineTotal = otPharmacy.reduce((sum, m) => sum + (m.status !== "PENDING" ? (m.netTotal || 0) : 0), 0)

      // 4. Update chargeBreakdown OT_PHARMACY component
      let charges: SurgeryChargeItem[] = (surgery.chargeBreakdown as any[]) || []
      const pharmacyIdx = charges.findIndex(c => c.chargeType === "OT_PHARMACY")

      if (pharmacyIdx !== -1) {
        charges[pharmacyIdx].amount = medicineTotal
      } else if (medicineTotal > 0) {
        charges.push({
          chargeLabel: "OT Pharmacy Charges",
          chargeType: "OT_PHARMACY",
          amount: medicineTotal
        })
      }

      const totalCharge = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

      await tx.surgery.update({
        where: { id: surgeryId },
        data: {
          consumables: currentConsumables as any,
          chargeBreakdown: charges as any,
          surgeryCharge: totalCharge,
          estimatedCost: totalCharge,
          actualCost: totalCharge,
        }
      })
    })

    revalidatePath(`/dashboard/ipd/patient`)
    revalidatePath(`/dashboard/ot/schedule`)
    revalidatePath(`/dashboard/pharmacy/ot-medicine`)
    return {
      success: true,
      message: `Dispensed ${data.quantity} × ${medicine.name} (Batch: ${targetBatch.batchNumber})`,
      item: newItem
    }
  } catch (error: any) {
    console.error("dispenseMedicineToSurgery error:", error)
    return { success: false, message: error.message || "Failed to dispense medicine" }
  }
}

// ─────────────────────────────────────────────────────────────
// 7. RETURN MEDICINE FROM SURGERY (Restore Stock & Deduct Bill)
// ─────────────────────────────────────────────────────────────
export async function returnMedicineFromSurgery(
  surgeryId: string,
  data: {
    itemId: string
    quantity: number
    reason?: string
  }
) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error }

  if (!data.quantity || data.quantity <= 0) {
    return { success: false, message: "Return quantity must be greater than 0" }
  }

  try {
    const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId } })
    if (!surgery) return { success: false, message: "Surgery not found" }

    const consumables = (surgery.consumables as any) || {}
    const otPharmacy: SurgeryMedicineItem[] = consumables.otPharmacy || []
    const returnsLog: SurgeryMedicineReturnLog[] = consumables.returnsLog || []

    const itemIndex = otPharmacy.findIndex(m => m.id === data.itemId)
    if (itemIndex === -1) {
      return { success: false, message: "Medicine item not found in this surgery" }
    }

    const item = otPharmacy[itemIndex]
    const currentNetQty = item.netQuantity !== undefined ? item.netQuantity : item.quantityIssued
    if (data.quantity > currentNetQty) {
      return {
        success: false,
        message: `Cannot return ${data.quantity}. Maximum returnable quantity is ${currentNetQty}.`
      }
    }

    const refundAmount = data.quantity * item.unitPrice

    // Update item net quantities
    item.quantityReturned = (item.quantityReturned || 0) + data.quantity
    item.netQuantity = item.quantityIssued - item.quantityReturned
    item.netTotal = item.netQuantity * item.unitPrice
    item.status = item.netQuantity === 0 ? "RETURNED" : "PARTIALLY_RETURNED"

    // Add return record
    const returnEntry: SurgeryMedicineReturnLog = {
      id: `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      itemId: item.id,
      medicineName: item.medicineName,
      quantityReturned: data.quantity,
      refundAmount,
      reason: data.reason || "Unused in surgery",
      returnedAt: new Date().toISOString()
    }
    returnsLog.push(returnEntry)

    consumables.otPharmacy = otPharmacy
    consumables.returnsLog = returnsLog

    await prisma.$transaction(async (tx) => {
      // 1. Restore stock in inventory batch if batchId exists
      if (item.batchId) {
        await tx.inventoryBatch.update({
          where: { id: item.batchId },
          data: { quantity: { increment: data.quantity } }
        })
      }

      // 2. Recalculate medicine total
      const medicineTotal = otPharmacy.reduce((sum, m) => sum + (m.status !== "PENDING" ? (m.netTotal || 0) : 0), 0)

      // 3. Update chargeBreakdown OT_PHARMACY component
      let charges: SurgeryChargeItem[] = (surgery.chargeBreakdown as any[]) || []
      const pharmacyIdx = charges.findIndex(c => c.chargeType === "OT_PHARMACY")

      if (pharmacyIdx !== -1) {
        charges[pharmacyIdx].amount = medicineTotal
      } else if (medicineTotal > 0) {
        charges.push({
          chargeLabel: "OT Pharmacy Charges",
          chargeType: "OT_PHARMACY",
          amount: medicineTotal
        })
      }

      const totalCharge = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

      // 4. Update surgery
      await tx.surgery.update({
        where: { id: surgeryId },
        data: {
          consumables: consumables as any,
          chargeBreakdown: charges as any,
          surgeryCharge: totalCharge,
          estimatedCost: totalCharge,
          actualCost: totalCharge,
        }
      })
    })

    revalidatePath(`/dashboard/ipd/patient`)
    revalidatePath(`/dashboard/ot/schedule`)
    revalidatePath(`/dashboard/pharmacy/ot-medicine`)
    return {
      success: true,
      message: `Returned ${data.quantity} × ${item.medicineName}. Stock restored in inventory and ₹${refundAmount.toLocaleString("en-IN")} deducted from bill.`,
      refundAmount
    }
  } catch (error: any) {
    console.error("returnMedicineFromSurgery error:", error)
    return { success: false, message: error.message || "Failed to return medicine" }
  }
}

// ─────────────────────────────────────────────────────────────
// 8. REQUEST / REQUISITION MEDICINE FOR SURGERY (Pending Dispense)
// ─────────────────────────────────────────────────────────────
export async function requestMedicineForSurgery(
  surgeryId: string,
  data: {
    medicineId: string
    quantity: number
    notes?: string
  }
) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error }

  if (!data.quantity || data.quantity <= 0) {
    return { success: false, message: "Quantity must be greater than 0" }
  }

  try {
    const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId } })
    if (!surgery) return { success: false, message: "Surgery not found" }

    const medicine = await prisma.medicine.findUnique({
      where: { id: data.medicineId },
      select: { id: true, name: true, strength: true, type: true, unitPrice: true }
    })
    if (!medicine) return { success: false, message: "Medicine not found" }

    const requestedItem: SurgeryMedicineItem = {
      id: `otm_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      medicineId: medicine.id,
      medicineName: medicine.name,
      strength: medicine.strength,
      type: medicine.type,
      quantityIssued: 0,
      quantityReturned: 0,
      netQuantity: data.quantity,
      unitPrice: medicine.unitPrice,
      netTotal: medicine.unitPrice * data.quantity,
      notes: data.notes || null,
      issuedAt: new Date().toISOString(),
      status: "PENDING",
    }

    const currentConsumables = (surgery.consumables as any) || {}
    const otPharmacy: SurgeryMedicineItem[] = currentConsumables.otPharmacy || []
    otPharmacy.push(requestedItem)
    currentConsumables.otPharmacy = otPharmacy

    await prisma.surgery.update({
      where: { id: surgeryId },
      data: { consumables: currentConsumables as any }
    })

    revalidatePath(`/dashboard/ipd/patient`)
    revalidatePath(`/dashboard/ot/schedule`)
    revalidatePath(`/dashboard/pharmacy/ot-medicine`)

    return {
      success: true,
      message: `Requested ${data.quantity} × ${medicine.name} for OT`,
      item: requestedItem
    }
  } catch (error: any) {
    console.error("requestMedicineForSurgery error:", error)
    return { success: false, message: error.message || "Failed to request medicine" }
  }
}
