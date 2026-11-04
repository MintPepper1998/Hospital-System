"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { deductFEFO, restoreToInventory, type FEFOAllocation } from "@/lib/inventory-service"
import { nextPharmacyBillNumber } from "@/lib/billing-number"
import type { Prisma } from "@prisma/client"

// Helper: parse frequency string into daily dose count
function parseDailyDose(frequency: string): number {
  const f = frequency.trim().toUpperCase()
  if (f.includes("-")) {
    return f.split("-").reduce((sum, n) => sum + (parseInt(n) || 0), 0)
  }
  switch (f) {
    case "OD": return 1
    case "BD": return 2
    case "TDS": return 3
    case "QID": return 4
    case "SOS": return 1
    case "STAT": return 1
    default: return 1
  }
}

// Helper: fuzzy match medicine by name (handles spaces vs dashes)
export async function findBestMatchingMedicine(txOrPrisma: any, medicineName: string) {
  const firstWord = medicineName.split(/[\s-]/)[0]
  if (!firstWord) return null

  const meds = await txOrPrisma.medicine.findMany({
    where: { name: { startsWith: firstWord, mode: "insensitive" } },
    include: {
      inventoryBatches: {
        where: { isActive: true, quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
        take: 1
      }
    }
  })

  if (meds.length === 0) return null

  const cleanName = medicineName.replace(/[\s-]/g, "").toLowerCase()
  const exactMatch = meds.find((m: any) => m.name.replace(/[\s-]/g, "").toLowerCase() === cleanName)

  return exactMatch || meds[0]
}

// ─────────────────────────────────────────────────────────────
// Internal helpers (not exported — "use server" files may only export async actions)
// ─────────────────────────────────────────────────────────────

/** Errors whose message is safe and useful to show to the pharmacist. */
class DispenseError extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100

type StoredBatchAllocation = {
  batchId: string
  batchNumber?: string
  units: number
}

function parseBatchAllocations(value: Prisma.JsonValue | null): StoredBatchAllocation[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
    const raw = entry as Record<string, unknown>
    const batchId = typeof raw.batchId === "string" ? raw.batchId : ""
    const batchNumber = typeof raw.batchNumber === "string" ? raw.batchNumber : undefined
    const units = typeof raw.units === "number" && Number.isInteger(raw.units) ? raw.units : 0
    return batchId && units > 0 ? [{ batchId, batchNumber, units }] : []
  })
}

const userFacingMessage = (error: unknown, fallback: string) => {
  if (error instanceof DispenseError) return error.message
  if (error instanceof Error && error.message.startsWith("Insufficient stock")) return error.message
  if (error instanceof Error && error.message.startsWith("Quantity must be")) return error.message
  return fallback
}

/** Price a FEFO allocation. MRP (sellingPrice) is GST-inclusive, so tax is extracted, not added. */
function priceAllocations(allocs: FEFOAllocation[], overrideUnitPrice?: number) {
  const units = allocs.reduce((s, a) => s + a.units, 0)
  let total = 0
  let tax = 0
  for (const a of allocs) {
    const unit = overrideUnitPrice && overrideUnitPrice > 0 ? overrideUnitPrice : a.sellingPrice
    const lineTotal = a.units * unit
    total += lineTotal
    tax += lineTotal - lineTotal / (1 + (a.taxPercent || 0) / 100)
  }
  total = round2(total)
  return {
    units,
    totalPrice: total,
    unitPrice: units > 0 ? round2(total / units) : 0,
    taxAmount: round2(tax),
    gstRate: allocs[0]?.taxPercent ?? 0,
  }
}

/** Create a PENDING-settlement PHARMACY bill linked to an IPD admission (hospital → pharmacy). */
async function createIPDPharmacyBill(
  tx: Prisma.TransactionClient,
  args: {
    patientId: string
    admissionId: string
    medicineName: string
    quantity: number
    unitPrice: number
    totalPrice: number
    taxAmount: number
    gstRate: number
    notes: string
    serviceCategory: "PHARMACY_IPD" | "PHARMACY_DISCHARGE"
    referenceId: string
    unitCost?: number
    costAmount?: number
  }
) {
  const billNumber = await nextPharmacyBillNumber(tx)
  return tx.billing.create({
    data: {
      billNumber,
      patientId: args.patientId,
      ipdAdmissionId: args.admissionId,
      type: "PHARMACY",
      billDate: new Date(),
      totalAmount: args.totalPrice,
      discountAmount: 0,
      taxAmount: args.taxAmount,
      netAmount: args.totalPrice,
      paidAmount: 0,
      balanceAmount: args.totalPrice,
      status: "PENDING",
      paymentMethod: "BANK_TRANSFER",
      notes: args.notes,
      settlementStatus: "PENDING",
      items: {
        create: {
          description: `${args.medicineName} × ${args.quantity}`,
          quantity: args.quantity,
          unitPrice: args.unitPrice,
          amount: args.totalPrice,
          gstRate: args.gstRate,
          gstAmount: args.taxAmount,
          totalAmount: args.totalPrice,
          serviceCategory: args.serviceCategory,
          referenceId: args.referenceId,
          unitCost: args.unitCost,
          costAmount: args.costAmount,
        },
      },
    },
  })
}

function revalidatePharmacyAndIPD(admissionId?: string | null) {
  revalidatePath("/dashboard/pharmacy/queue")
  revalidatePath("/dashboard/pharmacy/pos")
  revalidatePath("/dashboard/pharmacy-finance")
  revalidatePath("/dashboard/pharmacy-finance/settlements")
  revalidatePath("/dashboard/ipd/billing")
  revalidatePath("/dashboard/billing-counter/ipd")
  if (admissionId) {
    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    revalidatePath(`/dashboard/ipd/billing/${admissionId}`)
  }
}

export async function cancelPrescription(appointmentId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  if (!appointmentId) {
    return { success: false, message: "Appointment ID is required" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.prescription.deleteMany({
        where: { medicalRecord: { appointmentId } },
      })
      await tx.appointment.updateMany({
        where: { id: appointmentId },
        data: { prescription: null },
      })
    })

    revalidatePath("/dashboard/pharmacy/queue")
    revalidatePath("/dashboard/pharmacy/pos")

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "Prescription", recordId: appointmentId, changes: { status: "CANCELLED" } })
    return { success: true }
  } catch (error: unknown) {
    console.error("[ERROR] cancelPrescription failed:", error)
    return { success: false, message: "Failed to cancel prescription" }
  }
}

/**
 * Dispense an IPD prescription with quantity and price tracking.
 * Dispensing is a pharmacy fulfillment event — clinical status stays unchanged.
 * Stock deduction (FEFO), status change and the hospital → pharmacy billing record
 * are written in ONE transaction: either all succeed or nothing changes.
 */
export async function dispenseIPDPrescription(
  prescriptionId: string,
  quantity?: number,
  overrideUnitPrice?: number
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  if (!prescriptionId) {
    return { success: false, message: "Prescription ID is required" }
  }

  try {
    const prescription = await prisma.iPDPrescription.findUnique({
      where: { id: prescriptionId },
      include: { admission: { include: { patient: true } } },
    })

    if (!prescription) return { success: false, message: "Prescription not found" }
    if (prescription.status !== "ACTIVE") return { success: false, message: "Only clinically active medications can be dispensed" }
    if (prescription.pharmacyStatus === "DISPENSED") return { success: false, message: "Prescription is already dispensed" }
    if (prescription.pharmacyStatus === "CANCELLED") return { success: false, message: "Prescription was cancelled from pharmacy queue" }

    // Use provided quantity, requestedQuantity, or auto-calculate from frequency × duration
    const dispensedQty = quantity ?? prescription.requestedQuantity ?? (parseDailyDose(prescription.frequency) * (parseInt(prescription.duration) || 1) || 1)
    if (!Number.isInteger(dispensedQty) || dispensedQty < 1) {
      return { success: false, message: "Quantity must be a whole number of at least 1" }
    }

    // Look up the medicine in the pharmacy master (fuzzy match — IPD prescriptions are free text)
    const drug = await findBestMatchingMedicine(prisma, prescription.medicineName)

    const result = await prisma.$transaction(async (tx) => {
      // Atomic claim: prevents double-dispense from two tabs/pharmacists
      const claim = await tx.iPDPrescription.updateMany({
        where: { id: prescriptionId, pharmacyStatus: "PENDING", status: "ACTIVE" },
        data: { pharmacyStatus: "DISPENSED", dispensedAt: new Date(), dispensedBy: authResult.session.name || "Pharmacy" },
      })
      if (claim.count !== 1) throw new DispenseError("Prescription was already dispensed or cancelled")

      let unitPrice = 0
      let totalPrice = 0
      let taxAmount = 0
      let gstRate = 0

      let costAmount = 0
      let unitCost = 0
      let allocations: FEFOAllocation[] = []

      if (drug) {
        // Throws on insufficient stock → whole transaction rolls back
        allocations = await deductFEFO(tx, { medicineId: drug.id, units: dispensedQty, medicineName: drug.name })
        const priced = priceAllocations(allocations, overrideUnitPrice)
        unitPrice = priced.unitPrice
        totalPrice = priced.totalPrice
        taxAmount = priced.taxAmount
        gstRate = priced.gstRate
        costAmount = round2(allocations.reduce((sum, a) => sum + (a.units * (a.purchasePrice || 0)), 0))
        unitCost = dispensedQty > 0 ? round2(costAmount / dispensedQty) : 0
      } else if (overrideUnitPrice && overrideUnitPrice > 0) {
        // Not in pharmacy master: no stock to deduct, bill at the price given by the pharmacist
        unitPrice = overrideUnitPrice
        totalPrice = round2(overrideUnitPrice * dispensedQty)
      }

      await tx.iPDPrescription.update({
        where: { id: prescriptionId },
        data: {
          dispensedQuantity: dispensedQty,
          unitPrice,
          totalPrice,
          batchAllocations: drug
            ? allocations.map((a) => ({
              batchId: a.batchId,
              batchNumber: a.batchNumber,
              units: a.units,
              sellingPrice: a.sellingPrice,
            }))
            : undefined,
        },
      })

      // Create pharmacy billing record for hospital → pharmacy settlement
      if (totalPrice > 0 && prescription.admissionId && prescription.admission) {
        await createIPDPharmacyBill(tx, {
          patientId: prescription.admission.patientId,
          admissionId: prescription.admissionId,
          medicineName: prescription.medicineName,
          quantity: dispensedQty,
          unitPrice,
          totalPrice,
          taxAmount,
          gstRate,
          notes: `IPD Dispense: ${prescription.medicineName} × ${dispensedQty} units`,
          serviceCategory: "PHARMACY_IPD",
          referenceId: prescriptionId,
          costAmount,
          unitCost,
        })
      }

      return { unitPrice, totalPrice }
    }, { timeout: 20000 })

    revalidatePharmacyAndIPD(prescription.admissionId)

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "IPDPrescription", recordId: prescriptionId, changes: { pharmacyStatus: "DISPENSED", medicineName: prescription.medicineName, quantity: dispensedQty, unitPrice: result.unitPrice, totalPrice: result.totalPrice } })
    return { success: true }
  } catch (error: unknown) {
    console.error("[ERROR] dispenseIPDPrescription failed:", error)
    return { success: false, message: userFacingMessage(error, "Failed to dispense prescription") }
  }
}

/**
 * Return a dispensed IPD prescription to the pharmacy (full or partial).
 * Restores inventory and adjusts the linked PHARMACY bill — all in one transaction.
 * If the bill was already settled to the pharmacy, the return is refused
 * (money has moved; it must go through Sales Return).
 */
export async function returnDispensedIPDPrescription(
  prescriptionId: string,
  returnQty?: number,
  reason?: string
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  if (!prescriptionId) {
    return { success: false, message: "Prescription ID is required" }
  }

  try {
    const prescription = await prisma.iPDPrescription.findUnique({
      where: { id: prescriptionId },
    })

    if (!prescription) return { success: false, message: "Prescription not found" }
    if (prescription.pharmacyStatus !== "DISPENSED") {
      return { success: false, message: "Only dispensed prescriptions can be returned" }
    }

    const currentQty = prescription.dispensedQuantity || 0
    const qtyToReturn = returnQty !== undefined ? returnQty : currentQty

    if (!Number.isInteger(qtyToReturn) || qtyToReturn <= 0 || qtyToReturn > currentQty) {
      return { success: false, message: "Invalid return quantity" }
    }

    const drug = await findBestMatchingMedicine(prisma, prescription.medicineName)
    const newDispensedQty = currentQty - qtyToReturn
    const unitPrice = prescription.unitPrice || 0
    const newTotalPrice = round2(newDispensedQty * unitPrice)
    const storedAllocations = parseBatchAllocations(prescription.batchAllocations)
    const allocationTotal = storedAllocations.reduce((sum, allocation) => sum + allocation.units, 0)
    const restorePlan: StoredBatchAllocation[] = []
    const remainingAllocations = storedAllocations.map((allocation) => ({ ...allocation }))

    if (storedAllocations.length > 0) {
      if (allocationTotal < currentQty) {
        return { success: false, message: "Stored batch allocation is incomplete — ask an administrator to correct this dispense record." }
      }

      let remainingToRestore = qtyToReturn
      for (let index = remainingAllocations.length - 1; index >= 0 && remainingToRestore > 0; index -= 1) {
        const allocation = remainingAllocations[index]
        const units = Math.min(allocation.units, remainingToRestore)
        if (units > 0) {
          restorePlan.push({ batchId: allocation.batchId, batchNumber: allocation.batchNumber, units })
          allocation.units -= units
          remainingToRestore -= units
        }
      }
    }

    // Find the PHARMACY bill created at dispense time
    // (new rows: BillingItem.referenceId; legacy rows: the deterministic notes text)
    let bill = await prisma.billing.findFirst({
      where: { type: "PHARMACY", items: { some: { referenceId: prescriptionId } } },
      include: { items: true },
    })
    if (!bill && prescription.admissionId) {
      bill = await prisma.billing.findFirst({
        where: {
          type: "PHARMACY",
          ipdAdmissionId: prescription.admissionId,
          notes: `IPD Dispense: ${prescription.medicineName} × ${currentQty} units`,
        },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      })
    }
    if (bill?.settlementStatus === "SETTLED") {
      return { success: false, message: `Bill ${bill.billNumber} is already settled to pharmacy — process this via Sales Return.` }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Atomic: only if still DISPENSED with the same quantity we priced against
      const upd = await tx.iPDPrescription.updateMany({
        where: { id: prescriptionId, pharmacyStatus: "DISPENSED", dispensedQuantity: currentQty },
        data: {
          pharmacyStatus: newDispensedQty === 0 ? "CANCELLED" : "DISPENSED",
          dispensedQuantity: newDispensedQty,
          totalPrice: newTotalPrice,
          batchAllocations: storedAllocations.length > 0
            ? remainingAllocations.filter((allocation) => allocation.units > 0)
            : undefined,
        },
      })
      if (upd.count !== 1) throw new DispenseError("Prescription changed in the meantime — please refresh and try again")

      // 2. Restore the batches that were actually used for this dispense.
      // Legacy rows without allocations fall back to the previous latest-expiry behavior.
      if (storedAllocations.length > 0) {
        for (const allocation of restorePlan) {
          await restoreToInventory(tx, {
            batchId: allocation.batchId,
            units: allocation.units,
          })
        }
      } else if (drug) {
        const batch = await tx.inventoryBatch.findFirst({
          where: { medicineId: drug.id, isActive: true },
          orderBy: { expiryDate: "desc" },
        })
        if (batch) {
          await restoreToInventory(tx, { batchId: batch.id, units: qtyToReturn })
        }
      }

      // 3. Adjust the linked bill (only while settlement is still PENDING)
      if (bill) {
        const claim = await tx.billing.updateMany({
          where: { id: bill.id, settlementStatus: { not: "SETTLED" } },
          data: { updatedAt: new Date() },
        })
        if (claim.count !== 1) throw new DispenseError("Bill was settled in the meantime — process this via Sales Return.")

        if (newDispensedQty === 0) {
          await tx.billing.delete({ where: { id: bill.id } })
        } else {
          const item = bill.items[0]
          const gstRate = item?.gstRate ?? 0
          const taxAmount = round2(newTotalPrice - newTotalPrice / (1 + gstRate / 100))
          if (item) {
            await tx.billingItem.update({
              where: { id: item.id },
              data: {
                description: `${prescription.medicineName} × ${newDispensedQty}`,
                quantity: newDispensedQty,
                amount: newTotalPrice,
                gstAmount: taxAmount,
                totalAmount: newTotalPrice,
                referenceId: prescriptionId,
              },
            })
          }
          await tx.billing.update({
            where: { id: bill.id },
            data: {
              totalAmount: newTotalPrice,
              taxAmount,
              netAmount: newTotalPrice,
              balanceAmount: newTotalPrice,
              notes: `IPD Dispense: ${prescription.medicineName} × ${newDispensedQty} units`,
            },
          })
        }
      }
    })

    revalidatePharmacyAndIPD(prescription.admissionId)

    writeAuditLog({ 
      userId: authResult.session.userId, 
      action: "UPDATE", 
      module: "IPDPrescription", 
      recordId: prescriptionId, 
      changes: { 
        action: newDispensedQty === 0 ? "FULL_RETURN" : "PARTIAL_RETURN",
        returnedQuantity: qtyToReturn, 
        remainingQuantity: newDispensedQty,
        newTotalPrice,
        reason: reason || "Unused medicine returned",
        billId: bill?.id ?? null,
      } 
    })
    
    return { 
      success: true, 
      newDispensedQty, 
      newTotalPrice, 
      returnedQty: qtyToReturn,
      message: `Successfully returned ${qtyToReturn} unit(s) to inventory.` 
    }
  } catch (error: unknown) {
    console.error("[ERROR] returnDispensedIPDPrescription failed:", error)
    return { success: false, message: userFacingMessage(error, "Failed to return prescription to pharmacy") }
  }
}

/**
 * Cancel/remove an IPD prescription from the pharmacy queue.
 */
export async function cancelIPDPrescriptionFromQueue(prescriptionId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (!prescriptionId) {
    return { success: false, message: "Prescription ID is required" }
  }

  try {
    const rx = await prisma.iPDPrescription.findUnique({
      where: { id: prescriptionId },
    })

    if (!rx) return { success: false, message: "Prescription not found" }
    if (rx.pharmacyStatus !== "PENDING") {
      return { success: false, message: `Cannot cancel a prescription that is ${rx.pharmacyStatus.toLowerCase()}` }
    }

    await prisma.iPDPrescription.update({
      where: { id: prescriptionId },
      data: {
        pharmacyStatus: "CANCELLED",
      },
    })

    revalidatePath("/dashboard/pharmacy/pos")
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "IPDPrescription", recordId: prescriptionId, changes: { pharmacyStatus: "CANCELLED" } })
    return { success: true }
  } catch (error: unknown) {
    console.error("[ERROR] cancelIPDPrescriptionFromQueue failed:", error)
    return { success: false, message: userFacingMessage(error, "Failed to cancel prescription") }
  }
}

/**
 * Search active medicines with sellable inventory batches for direct IPD sending.
 */
export async function searchMedicinesForIPDSend(query: string) {
  if (!query || query.trim().length < 2) return []

  try {
    const clean = query.trim()
    const medicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: clean, mode: "insensitive" } },
          { genericName: { contains: clean, mode: "insensitive" } },
        ],
      },
      include: {
        inventoryBatches: {
          where: {
            isActive: true,
            isExpired: false,
            quantity: { gt: 0 },
          },
          orderBy: { expiryDate: "asc" },
        },
      },
      take: 20,
    })

    return medicines.map((m) => {
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
        batches: m.inventoryBatches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          sellingPrice: b.sellingPrice,
          expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        })),
      }
    })
  } catch (error) {
    console.error("[ERROR] searchMedicinesForIPDSend failed:", error)
    return []
  }
}

/**
 * Send / issue a medicine directly from pharmacy stock to an admitted IPD patient.
 * Deducts inventory batch, creates an active dispensed IPDPrescription, and adds
 * the corresponding IPD billing record so it appears immediately under patient medications.
 */
export async function sendMedicineToIPDPatient(data: {
  admissionId: string
  medicineId?: string
  medicineName: string
  batchId?: string
  quantity: number
  dosage?: string
  frequency?: string
  duration?: string
  instruction?: string
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  const {
    admissionId,
    medicineId,
    medicineName,
    batchId,
    quantity,
    dosage,
    frequency,
    duration,
    instruction,
  } = data

  if (!admissionId) return { success: false, message: "Admission ID is required" }
  if (!medicineName?.trim()) return { success: false, message: "Medicine name is required" }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, message: "Quantity must be a positive whole number" }
  }

  try {
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      include: { patient: true },
    })

    if (!admission) return { success: false, message: "Admission record not found" }
    if (admission.status !== "ADMITTED") {
      return { success: false, message: "Patient is no longer admitted in IPD" }
    }

    let drug = medicineId
      ? await prisma.medicine.findUnique({ where: { id: medicineId } })
      : null
    if (!drug) {
      drug = await findBestMatchingMedicine(prisma, medicineName)
    }

    const result = await prisma.$transaction(
      async (tx) => {
        let unitPrice = 0
        let totalPrice = 0
        let taxAmount = 0
        let gstRate = 0
        let costAmount = 0
        let unitCost = 0
        let batchAllocations: any[] = []

        if (batchId) {
          const batch = await tx.inventoryBatch.findUnique({ where: { id: batchId } })
          if (!batch || batch.quantity < quantity) {
            throw new DispenseError(
              `Insufficient stock in selected batch. Available: ${batch?.quantity || 0}`
            )
          }
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: quantity } },
          })

          unitPrice = batch.sellingPrice || drug?.unitPrice || 0
          totalPrice = round2(unitPrice * quantity)
          gstRate = batch.taxPercent || 12
          taxAmount = round2(totalPrice - totalPrice / (1 + gstRate / 100))
          costAmount = round2(quantity * (batch.purchasePrice || 0))
          unitCost = quantity > 0 ? round2(costAmount / quantity) : 0

          batchAllocations = [
            {
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              units: quantity,
              sellingPrice: unitPrice,
            },
          ]
        } else if (drug) {
          const allocations = await deductFEFO(tx, {
            medicineId: drug.id,
            units: quantity,
            medicineName: drug.name,
          })
          const priced = priceAllocations(allocations)
          unitPrice = priced.unitPrice
          totalPrice = priced.totalPrice
          taxAmount = priced.taxAmount
          gstRate = priced.gstRate
          costAmount = round2(
            allocations.reduce((sum, a) => sum + a.units * (a.purchasePrice || 0), 0)
          )
          unitCost = quantity > 0 ? round2(costAmount / quantity) : 0

          batchAllocations = allocations.map((a) => ({
            batchId: a.batchId,
            batchNumber: a.batchNumber,
            units: a.units,
            sellingPrice: a.sellingPrice,
          }))
        } else {
          unitPrice = 0
          totalPrice = 0
        }

        // Create active dispensed IPD prescription record
        const rx = await tx.iPDPrescription.create({
          data: {
            admissionId,
            prescribedById: authResult.session.userId,
            prescribedByName: authResult.session.name || "Pharmacy Staff",
            medicineName: drug?.name || medicineName,
            dosage: dosage || drug?.strength || "As Directed",
            frequency: frequency || "STAT",
            duration: duration || "1 Day",
            instruction: instruction || "Directly issued by Pharmacy to admitted patient",
            requestedQuantity: quantity,
            status: "ACTIVE",
            pharmacyStatus: "DISPENSED",
            dispensedAt: new Date(),
            dispensedBy: authResult.session.name || "Pharmacy Staff",
            dispensedQuantity: quantity,
            unitPrice,
            totalPrice,
            batchAllocations: batchAllocations.length > 0 ? batchAllocations : undefined,
          },
        })

        // Create linked pharmacy bill
        if (totalPrice > 0) {
          await createIPDPharmacyBill(tx, {
            patientId: admission.patientId,
            admissionId,
            medicineName: drug?.name || medicineName,
            quantity,
            unitPrice,
            totalPrice,
            taxAmount,
            gstRate,
            notes: `IPD Pharmacy Send: ${drug?.name || medicineName} × ${quantity} units`,
            serviceCategory: "PHARMACY_IPD",
            referenceId: rx.id,
            costAmount,
            unitCost,
          })
        }

        return {
          id: rx.id,
          medicineName: rx.medicineName,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          instruction: rx.instruction,
          requestedQuantity: rx.requestedQuantity,
          dispensedQuantity: rx.dispensedQuantity,
          unitPrice: rx.unitPrice,
          totalPrice: rx.totalPrice,
          status: rx.status,
          pharmacyStatus: rx.pharmacyStatus,
          dispensedAt: rx.dispensedAt?.toISOString() || null,
          dispensedBy: rx.dispensedBy,
          createdAt: rx.createdAt.toISOString(),
        }
      },
      { timeout: 20000 }
    )

    revalidatePharmacyAndIPD(admissionId)

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "IPDPrescription",
      recordId: result.id,
      changes: {
        admissionId,
        medicineName: result.medicineName,
        quantity,
        unitPrice: result.unitPrice,
        totalPrice: result.totalPrice,
        action: "DIRECT_WARD_SEND",
      },
    })

    return {
      success: true,
      medicine: result,
      message: `Successfully issued ${quantity} unit(s) of ${result.medicineName} to patient.`,
    }
  } catch (error: unknown) {
    console.error("[ERROR] sendMedicineToIPDPatient failed:", error)
    return {
      success: false,
      message: userFacingMessage(error, "Failed to send medicine to patient"),
    }
  }
}

/**
 * Dispense a Discharge Medicine.
 *
 * In ONE transaction:
 *  1. atomically claim the row (PENDING → DISPENSED) — prevents double dispense
 *  2. deduct stock FEFO across batches — throws (rolls back everything) if stock is short
 *  3. price from the batches actually used (server-side; the client never sends a price)
 *  4. create a PHARMACY bill on the admission with settlementStatus PENDING
 *     → it is added to the IPD final bill, and later settled hospital → pharmacy
 */
export async function dispenseDischargeMedicine(
  medicineId: string,
  quantity?: number
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  if (!medicineId) {
    return { success: false, message: "Medicine ID is required" }
  }

  try {
    const rx = await prisma.dischargeMedicine.findUnique({
      where: { id: medicineId },
      include: { admission: { select: { id: true, patientId: true, status: true } } },
    })

    if (!rx) return { success: false, message: "Discharge medicine not found" }
    if (rx.pharmacyStatus === "DISPENSED") return { success: false, message: "Medicine is already dispensed" }
    if (rx.pharmacyStatus === "CANCELLED") return { success: false, message: "Medicine was cancelled from pharmacy queue" }
    if (rx.admission.status !== "ADMITTED") {
      return { success: false, message: "Patient is already discharged — discharge medicines can no longer be dispensed" }
    }

    const dispensedQty = quantity ?? rx.quantity
    if (!Number.isInteger(dispensedQty) || dispensedQty < 1) {
      return { success: false, message: "Quantity must be a whole number of at least 1" }
    }

    // Resolve the pharmacy medicine: by id (new rows) or exact name (legacy rows only)
    let med: { id: string; name: string } | null = null
    if (rx.medicineId) {
      med = await prisma.medicine.findUnique({ where: { id: rx.medicineId }, select: { id: true, name: true } })
    } else {
      const match = await findBestMatchingMedicine(prisma, rx.medicineName)
      const norm = (s: string) => s.replace(/[\s-]/g, "").toLowerCase()
      if (match && norm(match.name) === norm(rx.medicineName)) med = { id: match.id, name: match.name }
    }
    if (!med) {
      return { success: false, message: `"${rx.medicineName}" is not linked to a pharmacy medicine. Ask the doctor to re-select it in the discharge summary.` }
    }
    const resolvedMed = med

    const result = await prisma.$transaction(async (tx) => {
      const admission = await tx.iPDAdmission.findUnique({ where: { id: rx.admissionId }, select: { status: true } })
      if (admission?.status !== "ADMITTED") {
        throw new DispenseError("Patient is already discharged — discharge medicines can no longer be dispensed")
      }

      const claim = await tx.dischargeMedicine.updateMany({
        where: { id: medicineId, pharmacyStatus: "PENDING" },
        data: { pharmacyStatus: "DISPENSED", dispensedAt: new Date(), dispensedBy: authResult.session.name || "Pharmacy" },
      })
      if (claim.count !== 1) throw new DispenseError("Medicine was already dispensed or cancelled")

      const allocs = await deductFEFO(tx, { medicineId: resolvedMed.id, units: dispensedQty, medicineName: resolvedMed.name })
      const priced = priceAllocations(allocs)
      const costAmount = round2(allocs.reduce((sum, a) => sum + (a.units * (a.purchasePrice || 0)), 0))
      const unitCost = dispensedQty > 0 ? round2(costAmount / dispensedQty) : 0

      let billingId: string | null = null
      if (priced.totalPrice > 0) {
        const bill = await createIPDPharmacyBill(tx, {
          patientId: rx.admission.patientId,
          admissionId: rx.admissionId,
          medicineName: resolvedMed.name,
          quantity: dispensedQty,
          unitPrice: priced.unitPrice,
          totalPrice: priced.totalPrice,
          taxAmount: priced.taxAmount,
          gstRate: priced.gstRate,
          notes: `Discharge Dispense: ${resolvedMed.name} × ${dispensedQty} units`,
          serviceCategory: "PHARMACY_DISCHARGE",
          referenceId: medicineId,
          costAmount,
          unitCost,
        })
        billingId = bill.id
      }

      await tx.dischargeMedicine.update({
        where: { id: medicineId },
        data: {
          medicineId: resolvedMed.id,
          dispensedQuantity: dispensedQty,
          unitPrice: priced.unitPrice,
          totalPrice: priced.totalPrice,
          batchAllocations: allocs.map((a) => ({ batchId: a.batchId, batchNumber: a.batchNumber, units: a.units, sellingPrice: a.sellingPrice })),
          billingId,
        },
      })

      return { ...priced, billingId }
    }, { timeout: 20000 })

    revalidatePharmacyAndIPD(rx.admissionId)

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "DischargeMedicine", recordId: medicineId, changes: { status: "DISPENSED", medicine: resolvedMed.name, qty: dispensedQty, unitPrice: result.unitPrice, totalPrice: result.totalPrice, billingId: result.billingId } })
    return { success: true, totalPrice: result.totalPrice }
  } catch (error: unknown) {
    console.error("[ERROR] dispenseDischargeMedicine failed:", error)
    return { success: false, message: userFacingMessage(error, "Failed to dispense discharge medicine") }
  }
}

export async function cancelDischargeMedicineFromQueue(medicineId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (!medicineId) {
    return { success: false, message: "Medicine ID is required" }
  }

  try {
    const rx = await prisma.dischargeMedicine.findUnique({
      where: { id: medicineId },
    })

    if (!rx) return { success: false, message: "Medicine not found" }
    if (rx.pharmacyStatus !== "PENDING") {
      return { success: false, message: `Cannot cancel a medicine that is ${rx.pharmacyStatus.toLowerCase()}` }
    }

    // Atomic: never cancel a row that was dispensed a moment ago
    const res = await prisma.dischargeMedicine.updateMany({
      where: { id: medicineId, pharmacyStatus: "PENDING" },
      data: {
        pharmacyStatus: "CANCELLED",
      },
    })
    if (res.count !== 1) {
      return { success: false, message: "Medicine was already dispensed or cancelled" }
    }

    revalidatePharmacyAndIPD(rx.admissionId)
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "DischargeMedicine", recordId: medicineId, changes: { pharmacyStatus: "CANCELLED" } })
    return { success: true }
  } catch (error: unknown) {
    console.error("[ERROR] cancelDischargeMedicineFromQueue failed:", error)
    return { success: false, message: "Failed to cancel medicine" }
  }
}

export async function cancelIPDPrescriptionItem(prescriptionId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (!prescriptionId) {
    return { success: false, message: "Prescription ID is required" }
  }

  try {
    const rx = await prisma.iPDPrescription.findUnique({
      where: { id: prescriptionId },
    })

    if (!rx) return { success: false, message: "Prescription not found" }
    if (rx.pharmacyStatus !== "PENDING") {
      return { success: false, message: `Cannot cancel a prescription that is ${rx.pharmacyStatus.toLowerCase()}` }
    }

    await prisma.iPDPrescription.update({
      where: { id: prescriptionId },
      data: {
        pharmacyStatus: "CANCELLED",
        status: "STOPPED",
      },
    })

    revalidatePath("/dashboard/pharmacy/queue")
    revalidatePath("/dashboard/pharmacy/pos")
    if (rx.admissionId) {
      revalidatePath(`/dashboard/ipd/patient/${rx.admissionId}`)
    }
    
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "IPDPrescription", recordId: prescriptionId, changes: { pharmacyStatus: "CANCELLED", status: "STOPPED" } })
    return { success: true }
  } catch (error: unknown) {
    console.error("[ERROR] cancelIPDPrescriptionItem failed:", error)
    return { success: false, message: "Failed to cancel prescription" }
  }
}

export async function updateIPDPrescriptionItem(
  id: string,
  data: {
    medicineName: string
    dosage?: string
    frequency?: string
    duration?: string
    instruction?: string
    quantity?: number
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.iPDPrescription.update({
      where: { id },
      data: {
        medicineName: data.medicineName,
        dosage: data.dosage || "",
        frequency: data.frequency || "",
        duration: data.duration || "",
        instruction: data.instruction || null,
        requestedQuantity: data.quantity || null,
      },
    })
    revalidatePath("/dashboard/pharmacy/queue")
    return { success: true }
  } catch (error: any) {
    console.error("[ERROR] updateIPDPrescriptionItem:", error)
    return { success: false, message: "Failed to update IPD prescription" }
  }
}

export async function updateOPDPrescriptionItem(
  id: string,
  data: {
    medicationName: string
    dosage: string
    frequency: string
    duration: string
    quantity: number
    instructions?: string
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.prescriptionItem.update({
      where: { id },
      data: {
        medicationName: data.medicationName,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        quantity: data.quantity,
        instructions: data.instructions || null,
      },
    })
    revalidatePath("/dashboard/pharmacy/queue")
    return { success: true }
  } catch (error: any) {
    console.error("[ERROR] updateOPDPrescriptionItem:", error)
    return { success: false, message: "Failed to update OPD prescription" }
  }
}
