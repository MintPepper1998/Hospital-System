"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// HOSPITAL FEE MANAGEMENT (Admin Only)
// ============================================

/**
 * Get all hospital fees
 */
export async function getHospitalFees() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error, data: [] }

  try {
    const fees = await prisma.hospitalFee.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })

    return { success: true, message: "Fees loaded", data: fees }
  } catch (error: any) {
    console.error("[ERROR] getHospitalFees:", error.message)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get active fees for a specific module (used by billing logic)
 * If patientId is provided, chargeOnce fees already paid by this patient are excluded.
 */
export async function getActiveFeesForModule(module: "OPD" | "IPD" | "SURGERY" | "INSURANCE", patientId?: string) {
  try {
    const whereClause: Record<string, boolean> = { isActive: true }

    switch (module) {
      case "OPD":
        whereClause.applyToOPD = true
        break
      case "IPD":
        whereClause.applyToIPD = true
        break
      case "SURGERY":
        whereClause.applyToSurgery = true
        break
      case "INSURANCE":
        whereClause.applyToInsurance = true
        break
    }

    const fees = await prisma.hospitalFee.findMany({
      where: whereClause,
      orderBy: [{ sortOrder: "asc" }],
    })

    // If patientId given, filter out chargeOnce fees already paid
    if (patientId) {
      const existingItems = await prisma.billingItem.findMany({
        where: { billing: { patientId } },
        select: { description: true },
      })
      const paidDescriptions = new Set(existingItems.map((i) => i.description))

      const filtered = fees.filter((fee) => {
        if (fee.chargeOnce && paidDescriptions.has(fee.name)) {
          return false
        }
        return true
      })

      return { success: true, data: filtered }
    }

    return { success: true, data: fees }
  } catch (error: any) {
    console.error("[ERROR] getActiveFeesForModule:", error.message)
    return { success: false, data: [] }
  }
}

/**
 * Create a new hospital fee
 */
export async function createHospitalFee(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const name = formData.get("name") as string
    const amount = parseFloat(formData.get("amount") as string)
    const description = formData.get("description") as string
    const feeType = (formData.get("feeType") as string) || "FIXED"
    const applyToOPD = formData.get("applyToOPD") === "true"
    const applyToIPD = formData.get("applyToIPD") === "true"
    const applyToSurgery = formData.get("applyToSurgery") === "true"
    const applyToInsurance = formData.get("applyToInsurance") === "true"
    const chargeOnce = formData.get("chargeOnce") === "true"

    if (!name || isNaN(amount) || amount < 0) {
      return { success: false, message: "Fee name and a valid amount are required." }
    }

    // Get max sortOrder for new entry
    const maxSort = await prisma.hospitalFee.aggregate({ _max: { sortOrder: true } })
    const sortOrder = (maxSort._max.sortOrder || 0) + 1

    await prisma.hospitalFee.create({
      data: {
        name,
        amount,
        description: description || null,
        feeType,
        applyToOPD,
        applyToIPD,
        applyToSurgery,
        applyToInsurance,
        chargeOnce,
        sortOrder,
      },
    })

    revalidatePath("/dashboard/admin/fees")
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "HospitalFee", changes: { name, amount } })
    return { success: true, message: `Fee "${name}" created successfully.` }
  } catch (error: any) {
    console.error("[ERROR] createHospitalFee:", error.message)
    return { success: false, message: error.message || "Failed to create fee." }
  }
}

/**
 * Update an existing hospital fee
 */
export async function updateHospitalFee(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const id = formData.get("id") as string
    const name = formData.get("name") as string
    const amount = parseFloat(formData.get("amount") as string)
    const description = formData.get("description") as string
    const feeType = (formData.get("feeType") as string) || "FIXED"
    const isActive = formData.get("isActive") === "true"
    const applyToOPD = formData.get("applyToOPD") === "true"
    const applyToIPD = formData.get("applyToIPD") === "true"
    const applyToSurgery = formData.get("applyToSurgery") === "true"
    const applyToInsurance = formData.get("applyToInsurance") === "true"
    const chargeOnce = formData.get("chargeOnce") === "true"

    if (!id || !name || isNaN(amount) || amount < 0) {
      return { success: false, message: "Fee ID, name, and a valid amount are required." }
    }

    await prisma.hospitalFee.update({
      where: { id },
      data: {
        name,
        amount,
        description: description || null,
        feeType,
        isActive,
        applyToOPD,
        applyToIPD,
        applyToSurgery,
        applyToInsurance,
        chargeOnce,
      },
    })

    revalidatePath("/dashboard/admin/fees")
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "HospitalFee", recordId: id, changes: { name, amount } })
    return { success: true, message: `Fee "${name}" updated successfully.` }
  } catch (error: any) {
    console.error("[ERROR] updateHospitalFee:", error.message)
    return { success: false, message: error.message || "Failed to update fee." }
  }
}

/**
 * Toggle a specific fee's applicability to a module
 */
export async function toggleFeeModule(feeId: string, field: string, value: boolean) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  const allowedFields = ["applyToOPD", "applyToIPD", "applyToSurgery", "applyToInsurance", "isActive", "chargeOnce"]
  if (!allowedFields.includes(field)) {
    return { success: false, message: "Invalid field" }
  }

  try {
    await prisma.hospitalFee.update({
      where: { id: feeId },
      data: { [field]: value },
    })

    revalidatePath("/dashboard/admin/fees")
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "HospitalFee", recordId: feeId, changes: { field, value } })
    return { success: true, message: "Updated" }
  } catch (error: any) {
    console.error("[ERROR] toggleFeeModule:", error.message)
    return { success: false, message: error.message || "Failed to toggle" }
  }
}

/**
 * Delete a hospital fee
 */
export async function deleteHospitalFee(feeId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const fee = await prisma.hospitalFee.findUnique({ where: { id: feeId } })
    if (!fee) return { success: false, message: "Fee not found" }

    await prisma.hospitalFee.delete({ where: { id: feeId } })

    revalidatePath("/dashboard/admin/fees")
    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "HospitalFee", recordId: feeId, changes: {} })
    return { success: true, message: `Fee "${fee.name}" deleted.` }
  } catch (error: any) {
    console.error("[ERROR] deleteHospitalFee:", error.message)
    return { success: false, message: error.message || "Failed to delete fee." }
  }
}
