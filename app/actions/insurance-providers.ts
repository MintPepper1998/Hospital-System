"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import type { ProviderType } from "@prisma/client"

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface InsuranceProviderFormData {
  name: string
  shortName?: string
  providerType: ProviderType
  supportsCashless: boolean
  supportsReimbursement: boolean
  defaultSettlementType: string
  isEmpaneled: boolean
  empanelmentDate?: string | null
  empanelmentExpiry?: string | null
  empanelmentNumber?: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  claimSubmissionEmail?: string
  website?: string
  defaultCopayPercent?: number | null
  defaultRoomRentCap?: number | null
  defaultIcuRentCap?: number | null
  defaultDeductible?: number | null
  linkedTpaId?: string | null
  isActive: boolean
  notes?: string
}

// ═══════════════════════════════════════════════════════════════════════
// LIST — with filtering
// ═══════════════════════════════════════════════════════════════════════

export async function getInsuranceProviders(filters?: {
  search?: string
  type?: ProviderType | "ALL"
  status?: "ALL" | "ACTIVE" | "INACTIVE"
  empaneled?: "ALL" | "YES" | "NO"
}) {
  const where: any = {}

  if (filters?.type && filters.type !== "ALL") {
    where.providerType = filters.type
  }

  if (filters?.status === "ACTIVE") {
    where.isActive = true
  } else if (filters?.status === "INACTIVE") {
    where.isActive = false
  }

  if (filters?.empaneled === "YES") {
    where.isEmpaneled = true
  } else if (filters?.empaneled === "NO") {
    where.isEmpaneled = false
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { shortName: { contains: filters.search, mode: "insensitive" } },
      { contactPerson: { contains: filters.search, mode: "insensitive" } },
    ]
  }

  const providers = await prisma.insuranceProvider.findMany({
    where,
    include: {
      linkedTpa: { select: { id: true, name: true } },
      _count: { select: { tariffs: true, linkedInsurers: true } },
    },
    orderBy: [{ providerType: "asc" }, { name: "asc" }],
  })

  return providers
}

// ═══════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════

export async function getInsuranceProviderStats() {
  const [total, activeInsurers, activeTpas, empaneled, govtSchemes, expiringEmpanelment] =
    await Promise.all([
      prisma.insuranceProvider.count(),
      prisma.insuranceProvider.count({
        where: { providerType: "INSURER", isActive: true },
      }),
      prisma.insuranceProvider.count({
        where: { providerType: "TPA", isActive: true },
      }),
      prisma.insuranceProvider.count({
        where: { isEmpaneled: true, isActive: true },
      }),
      prisma.insuranceProvider.count({
        where: { providerType: "GOVT_SCHEME", isActive: true },
      }),
      // Empanelments expiring within 30 days
      prisma.insuranceProvider.count({
        where: {
          isEmpaneled: true,
          empanelmentExpiry: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
    ])

  return { total, activeInsurers, activeTpas, empaneled, govtSchemes, expiringEmpanelment }
}

// ═══════════════════════════════════════════════════════════════════════
// GET SINGLE
// ═══════════════════════════════════════════════════════════════════════

export async function getInsuranceProvider(id: string) {
  return prisma.insuranceProvider.findUnique({
    where: { id },
    include: {
      linkedTpa: { select: { id: true, name: true } },
      linkedInsurers: { select: { id: true, name: true } },
      tariffs: {
        where: { isActive: true },
        orderBy: { category: "asc" },
      },
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════

export async function createInsuranceProvider(data: InsuranceProviderFormData) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    // Check uniqueness
    const existing = await prisma.insuranceProvider.findUnique({
      where: { name: data.name.trim() },
    })
    if (existing) {
      return { success: false, message: `"${data.name}" already exists` }
    }

    const provider = await prisma.insuranceProvider.create({
      data: {
        name: data.name.trim(),
        shortName: data.shortName?.trim() || null,
        providerType: data.providerType,
        supportsCashless: data.supportsCashless,
        supportsReimbursement: data.supportsReimbursement,
        defaultSettlementType: data.defaultSettlementType,
        isEmpaneled: data.isEmpaneled,
        empanelmentDate: data.empanelmentDate ? new Date(data.empanelmentDate) : null,
        empanelmentExpiry: data.empanelmentExpiry ? new Date(data.empanelmentExpiry) : null,
        empanelmentNumber: data.empanelmentNumber?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
        claimSubmissionEmail: data.claimSubmissionEmail?.trim() || null,
        website: data.website?.trim() || null,
        defaultCopayPercent: data.defaultCopayPercent ?? 0,
        defaultRoomRentCap: data.defaultRoomRentCap ?? null,
        defaultIcuRentCap: data.defaultIcuRentCap ?? null,
        defaultDeductible: data.defaultDeductible ?? null,
        linkedTpaId: data.linkedTpaId || null,
        isActive: data.isActive,
        notes: data.notes?.trim() || null,
      },
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "CREATE",
      module: "InsuranceProvider",
      changes: { name: provider.name, type: provider.providerType },
    })

    revalidatePath("/dashboard/admin/insurance-providers")
    revalidatePath("/dashboard/insurance")
    return { success: true, message: `"${provider.name}" created successfully` }
  } catch (error: any) {
    console.error("[ERROR] createInsuranceProvider:", error)
    return { success: false, message: error.message || "Failed to create provider" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════

export async function updateInsuranceProvider(id: string, data: InsuranceProviderFormData) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    // Check uniqueness (excluding self)
    const existing = await prisma.insuranceProvider.findFirst({
      where: { name: data.name.trim(), NOT: { id } },
    })
    if (existing) {
      return { success: false, message: `"${data.name}" already exists` }
    }

    const provider = await prisma.insuranceProvider.update({
      where: { id },
      data: {
        name: data.name.trim(),
        shortName: data.shortName?.trim() || null,
        providerType: data.providerType,
        supportsCashless: data.supportsCashless,
        supportsReimbursement: data.supportsReimbursement,
        defaultSettlementType: data.defaultSettlementType,
        isEmpaneled: data.isEmpaneled,
        empanelmentDate: data.empanelmentDate ? new Date(data.empanelmentDate) : null,
        empanelmentExpiry: data.empanelmentExpiry ? new Date(data.empanelmentExpiry) : null,
        empanelmentNumber: data.empanelmentNumber?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
        claimSubmissionEmail: data.claimSubmissionEmail?.trim() || null,
        website: data.website?.trim() || null,
        defaultCopayPercent: data.defaultCopayPercent ?? 0,
        defaultRoomRentCap: data.defaultRoomRentCap ?? null,
        defaultIcuRentCap: data.defaultIcuRentCap ?? null,
        defaultDeductible: data.defaultDeductible ?? null,
        linkedTpaId: data.linkedTpaId || null,
        isActive: data.isActive,
        notes: data.notes?.trim() || null,
      },
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "UPDATE",
      module: "InsuranceProvider",
      changes: { id, name: provider.name },
    })

    revalidatePath("/dashboard/admin/insurance-providers")
    revalidatePath("/dashboard/insurance")
    return { success: true, message: `"${provider.name}" updated successfully` }
  } catch (error: any) {
    console.error("[ERROR] updateInsuranceProvider:", error)
    return { success: false, message: error.message || "Failed to update provider" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TOGGLE STATUS
// ═══════════════════════════════════════════════════════════════════════

export async function toggleInsuranceProviderStatus(id: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const provider = await prisma.insuranceProvider.findUnique({ where: { id } })
    if (!provider) return { success: false, message: "Provider not found" }

    const updated = await prisma.insuranceProvider.update({
      where: { id },
      data: { isActive: !provider.isActive },
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "UPDATE",
      module: "InsuranceProvider",
      changes: {
        id,
        name: updated.name,
        action: updated.isActive ? "ACTIVATED" : "DEACTIVATED",
      },
    })

    revalidatePath("/dashboard/admin/insurance-providers")
    revalidatePath("/dashboard/insurance")
    return {
      success: true,
      message: `"${updated.name}" ${updated.isActive ? "activated" : "deactivated"}`,
    }
  } catch (error: any) {
    console.error("[ERROR] toggleInsuranceProviderStatus:", error)
    return { success: false, message: error.message || "Failed to toggle status" }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET ACTIVE PROVIDERS (for dropdowns — used by insurance forms)
// ═══════════════════════════════════════════════════════════════════════

export async function getActiveInsurers() {
  return prisma.insuranceProvider.findMany({
    where: { isActive: true, providerType: "INSURER" },
    select: {
      id: true,
      name: true,
      shortName: true,
      supportsCashless: true,
      supportsReimbursement: true,
      defaultSettlementType: true,
      isEmpaneled: true,
      defaultCopayPercent: true,
      defaultRoomRentCap: true,
      defaultIcuRentCap: true,
      defaultDeductible: true,
      linkedTpaId: true,
    },
    orderBy: { name: "asc" },
  })
}

export async function getActiveTpas() {
  return prisma.insuranceProvider.findMany({
    where: { isActive: true, providerType: "TPA" },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
  })
}

// ═══════════════════════════════════════════════════════════════════════
// PROVIDER TARIFF CRUD
// ═══════════════════════════════════════════════════════════════════════

export async function getProviderTariffs(providerId: string) {
  return prisma.providerTariff.findMany({
    where: { providerId },
    orderBy: [{ category: "asc" }, { procedureName: "asc" }],
  })
}

export async function upsertProviderTariff(data: {
  id?: string
  providerId: string
  procedureName: string
  procedureCode?: string
  category?: string
  negotiatedRate: number
  hospitalRate?: number
  packageInclusions?: string
  effectiveFrom?: string
  effectiveTo?: string
  isActive: boolean
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    const tariffData = {
      providerId: data.providerId,
      procedureName: data.procedureName.trim(),
      procedureCode: data.procedureCode?.trim() || null,
      category: data.category?.trim() || null,
      negotiatedRate: data.negotiatedRate,
      hospitalRate: data.hospitalRate ?? null,
      packageInclusions: data.packageInclusions?.trim() || null,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      isActive: data.isActive,
    }

    if (data.id) {
      await prisma.providerTariff.update({
        where: { id: data.id },
        data: tariffData,
      })
    } else {
      await prisma.providerTariff.create({ data: tariffData })
    }

    writeAuditLog({
      userId: auth.session.userId,
      action: data.id ? "UPDATE" : "CREATE",
      module: "ProviderTariff",
      changes: { providerId: data.providerId, procedure: data.procedureName, rate: data.negotiatedRate },
    })

    revalidatePath("/dashboard/admin/insurance-providers")
    return { success: true, message: "Tariff saved" }
  } catch (error: any) {
    console.error("[ERROR] upsertProviderTariff:", error)
    return { success: false, message: error.message || "Failed to save tariff" }
  }
}

export async function deleteProviderTariff(id: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    await prisma.providerTariff.delete({ where: { id } })
    writeAuditLog({
      userId: auth.session.userId,
      action: "DELETE",
      module: "ProviderTariff",
      changes: { id },
    })
    revalidatePath("/dashboard/admin/insurance-providers")
    return { success: true, message: "Tariff deleted" }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete tariff" }
  }
}
