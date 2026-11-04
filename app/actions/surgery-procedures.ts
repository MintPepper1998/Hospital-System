"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface ChargeComponentInput {
  id?: string
  chargeLabel: string
  chargeType: string
  amount: number
  isOptional: boolean
  requiresAssignment: boolean
  sortOrder: number
}

export interface MedicineInput {
  medicineId: string
  medicineName: string
  quantity: number
  dosage?: string
  notes?: string
  sortOrder: number
}

export interface SurgeryProcedureFormData {
  name: string
  code?: string
  category?: string
  description?: string
  estimatedDuration?: number
  theaterType?: string
  isActive: boolean
  chargeComponents?: ChargeComponentInput[]
  medicines?: MedicineInput[]
}

// ═══════════════════════════════════════════════════════════════════════
// LIST — with filtering
// ═══════════════════════════════════════════════════════════════════════

export async function getSurgeryProcedures(filters?: {
  search?: string
  category?: string | "ALL"
  status?: "ALL" | "ACTIVE" | "INACTIVE"
}) {
  const where: any = {}

  if (filters?.category && filters.category !== "ALL") {
    where.category = filters.category
  }

  if (filters?.status === "ACTIVE") {
    where.isActive = true
  } else if (filters?.status === "INACTIVE") {
    where.isActive = false
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { category: { contains: filters.search, mode: "insensitive" } },
    ]
  }

  return prisma.surgeryProcedure.findMany({
    where,
    include: {
      chargeComponents: {
        orderBy: { sortOrder: "asc" },
      },
      medicines: {
        orderBy: { sortOrder: "asc" },
        include: { 
          medicine: { 
            select: { 
              unitPrice: true, 
              strength: true, 
              type: true,
              inventoryBatches: {
                where: { isActive: true, quantity: { gt: 0 } },
                orderBy: { expiryDate: "asc" },
                take: 1,
                select: { sellingPrice: true }
              }
            } 
          } 
        }
      },
      _count: { select: { chargeComponents: true, medicines: true } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
}

// ═══════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════

export async function getSurgeryProcedureStats() {
  const [total, active, categories] = await Promise.all([
    prisma.surgeryProcedure.count(),
    prisma.surgeryProcedure.count({ where: { isActive: true } }),
    prisma.surgeryProcedure.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { isActive: true },
    }),
  ])

  return {
    total,
    active,
    inactive: total - active,
    categoryCount: categories.filter(c => c.category).length,
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET SINGLE
// ═══════════════════════════════════════════════════════════════════════

export async function getSurgeryProcedure(id: string) {
  return prisma.surgeryProcedure.findUnique({
    where: { id },
    include: {
      chargeComponents: {
        orderBy: { sortOrder: "asc" },
      },
      medicines: {
        orderBy: { sortOrder: "asc" },
        include: { 
          medicine: { 
            select: { 
              unitPrice: true, 
              strength: true, 
              type: true,
              inventoryBatches: {
                where: { isActive: true, quantity: { gt: 0 } },
                orderBy: { expiryDate: "asc" },
                take: 1,
                select: { sellingPrice: true }
              }
            } 
          } 
        }
      },
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════
// GET CATEGORIES (for filter dropdown)
// ═══════════════════════════════════════════════════════════════════════

export async function getSurgeryCategories() {
  const categories = await prisma.surgeryProcedure.findMany({
    select: { category: true },
    distinct: ["category"],
    where: { category: { not: null } },
    orderBy: { category: "asc" },
  })
  return categories.map(c => c.category).filter(Boolean) as string[]
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════

export async function createSurgeryProcedure(data: SurgeryProcedureFormData) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const existing = await prisma.surgeryProcedure.findUnique({
      where: { name: data.name.trim() },
    })
    if (existing) {
      return { success: false, message: `Procedure "${data.name}" already exists` }
    }

    const chargeComponents = data.chargeComponents || []
    const totalCharge = chargeComponents.reduce((sum, c) => sum + (c.amount || 0), 0)

    const procedure = await prisma.surgeryProcedure.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() || null,
        category: data.category?.trim() || null,
        description: data.description?.trim() || null,
        estimatedDuration: data.estimatedDuration || null,
        theaterType: data.theaterType?.trim() || null,
        totalCharge,
        isActive: data.isActive,
        chargeComponents: {
          create: chargeComponents.map((c, i) => ({
            chargeLabel: c.chargeLabel.trim(),
            chargeType: c.chargeType.trim(),
            amount: c.amount || 0,
            isOptional: c.isOptional,
            requiresAssignment: c.requiresAssignment ?? false,
            sortOrder: c.sortOrder ?? i,
          })),
        },
        medicines: {
          create: (data.medicines || []).map((m, i) => ({
            medicineId: m.medicineId,
            medicineName: m.medicineName,
            quantity: m.quantity || 1,
            dosage: m.dosage || null,
            notes: m.notes || null,
            sortOrder: m.sortOrder ?? i,
          })),
        },
      },
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "CREATE",
      module: "SurgeryProcedure",
      changes: { name: procedure.name, totalCharge, components: chargeComponents.length },
    })

    revalidatePath("/dashboard/admin/surgery-procedures")
    revalidatePath("/dashboard/clinical/ot")
    return { success: true, message: `"${procedure.name}" created successfully` }
  } catch (error: any) {
    console.error("[ERROR] createSurgeryProcedure:", error)
    return { success: false, message: error.message || "Failed to create procedure" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════

export async function updateSurgeryProcedure(id: string, data: SurgeryProcedureFormData) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const existing = await prisma.surgeryProcedure.findFirst({
      where: { name: data.name.trim(), NOT: { id } },
    })
    if (existing) {
      return { success: false, message: `Procedure "${data.name}" already exists` }
    }

    const chargeComponents = data.chargeComponents || []
    const totalCharge = chargeComponents.reduce((sum, c) => sum + (c.amount || 0), 0)

    // Delete existing components and medicines, then recreate
    await prisma.surgeryChargeComponent.deleteMany({ where: { procedureId: id } })
    await prisma.surgeryProcedureMedicine.deleteMany({ where: { procedureId: id } })

    const procedure = await prisma.surgeryProcedure.update({
      where: { id },
      data: {
        name: data.name.trim(),
        code: data.code?.trim() || null,
        category: data.category?.trim() || null,
        description: data.description?.trim() || null,
        estimatedDuration: data.estimatedDuration || null,
        theaterType: data.theaterType?.trim() || null,
        totalCharge,
        isActive: data.isActive,
        chargeComponents: {
          create: chargeComponents.map((c, i) => ({
            chargeLabel: c.chargeLabel.trim(),
            chargeType: c.chargeType.trim(),
            amount: c.amount || 0,
            isOptional: c.isOptional,
            requiresAssignment: c.requiresAssignment ?? false,
            sortOrder: c.sortOrder ?? i,
          })),
        },
        medicines: {
          create: (data.medicines || []).map((m, i) => ({
            medicineId: m.medicineId,
            medicineName: m.medicineName,
            quantity: m.quantity || 1,
            dosage: m.dosage || null,
            notes: m.notes || null,
            sortOrder: m.sortOrder ?? i,
          })),
        },
      },
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "UPDATE",
      module: "SurgeryProcedure",
      changes: { id, name: procedure.name, totalCharge },
    })

    revalidatePath("/dashboard/admin/surgery-procedures")
    revalidatePath("/dashboard/clinical/ot")
    return { success: true, message: `"${procedure.name}" updated successfully` }
  } catch (error: any) {
    console.error("[ERROR] updateSurgeryProcedure:", error)
    return { success: false, message: error.message || "Failed to update procedure" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TOGGLE STATUS
// ═══════════════════════════════════════════════════════════════════════

export async function toggleSurgeryProcedureStatus(id: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const proc = await prisma.surgeryProcedure.findUnique({ where: { id } })
    if (!proc) return { success: false, message: "Procedure not found" }

    const updated = await prisma.surgeryProcedure.update({
      where: { id },
      data: { isActive: !proc.isActive },
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "UPDATE",
      module: "SurgeryProcedure",
      changes: { id, name: updated.name, action: updated.isActive ? "ACTIVATED" : "DEACTIVATED" },
    })

    revalidatePath("/dashboard/admin/surgery-procedures")
    return { success: true, message: `"${updated.name}" ${updated.isActive ? "activated" : "deactivated"}` }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to toggle status" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════

export async function deleteSurgeryProcedure(id: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const proc = await prisma.surgeryProcedure.findUnique({ where: { id } })
    if (!proc) return { success: false, message: "Procedure not found" }

    await prisma.surgeryProcedure.delete({ where: { id } })

    writeAuditLog({
      userId: auth.session.userId,
      action: "DELETE",
      module: "SurgeryProcedure",
      changes: { id, name: proc.name },
    })

    revalidatePath("/dashboard/admin/surgery-procedures")
    return { success: true, message: `"${proc.name}" deleted` }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete procedure" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET ACTIVE PROCEDURES (for scheduling dropdown)
// ═══════════════════════════════════════════════════════════════════════

export async function getActiveSurgeryProcedures() {
  return prisma.surgeryProcedure.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      estimatedDuration: true,
      theaterType: true,
      totalCharge: true,
      chargeComponents: {
        orderBy: { sortOrder: "asc" },
        select: {
          chargeLabel: true,
          chargeType: true,
          amount: true,
          isOptional: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
}

// ═══════════════════════════════════════════════════════════════════════
// SEARCH MEDICINES (for OT Pharmacy picker)
// ═══════════════════════════════════════════════════════════════════════

export async function searchMedicines(query: string) {
  if (!query || query.length < 2) return []
  
  const results = await prisma.medicine.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { genericName: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      genericName: true,
      strength: true,
      unitPrice: true,
      type: true,
      inventoryBatches: {
        where: { isActive: true, quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
        take: 1,
        select: { sellingPrice: true }
      }
    },
    take: 15,
    orderBy: { name: "asc" },
  })

  return results.map(med => ({
    id: med.id,
    name: med.name,
    genericName: med.genericName,
    strength: med.strength,
    type: med.type,
    unitPrice: med.inventoryBatches?.[0]?.sellingPrice || med.unitPrice
  }))
}
