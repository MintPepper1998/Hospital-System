"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { type PaginationParams, type PaginatedResult, getPaginationValues, paginatedResult } from "@/lib/pagination"
import { actionError, getErrorMessage, isPrismaUniqueError } from "@/lib/action-result"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// TYPES
// ============================================

export interface DepartmentData {
  id: string
  name: string
  itemCount: number
}

export interface GeneralItemData {
  id: string
  name: string
  departmentId: string
  departmentName: string
  stock: number
  unit: string
  minStock: number
  isLowStock: boolean
  updatedAt: string
}

// ============================================
// DEPARTMENTS
// ============================================

export async function getDepartments(): Promise<DepartmentData[]> {
  await requireAuth()

  const departments = await prisma.department.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: { name: "asc" },
  })
  return departments.map((d) => ({
    id: d.id,
    name: d.name,
    itemCount: d._count.items,
  }))
}

export async function addDepartment(name: string): Promise<{ success: boolean; message: string; id?: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!name?.trim()) return { success: false, message: "Department name is required" }
    const existing = await prisma.department.findUnique({ where: { name: name.trim() } })
    if (existing) return { success: false, message: "Department already exists" }
    const dept = await prisma.department.create({ data: { name: name.trim() } })
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Department", recordId: dept.id, changes: { name: name.trim() } })
    revalidatePath("/dashboard/inventory/general")
    return { success: true, message: "Department added", id: dept.id }
  } catch (error) {
    return actionError(getErrorMessage(error))
  }
}

export async function updateDepartment(id: string, name: string): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!name?.trim()) return { success: false, message: "Department name is required" }
    const existing = await prisma.department.findFirst({
      where: { name: name.trim(), NOT: { id } },
    })
    if (existing) return { success: false, message: "A department with this name already exists" }

    await prisma.department.update({ where: { id }, data: { name: name.trim() } })
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Department", recordId: id, changes: { name: name.trim() } })
    revalidatePath("/dashboard/inventory/general")
    return { success: true, message: "Department renamed successfully" }
  } catch (error) {
    return actionError(getErrorMessage(error))
  }
}

export async function deleteDepartment(id: string): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const dept = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    })
    if (!dept) return { success: false, message: "Department not found" }
    if (dept._count.items > 0) {
      return {
        success: false,
        message: `Cannot delete "${dept.name}" — it has ${dept._count.items} item(s). Move or delete all items first.`,
      }
    }

    await prisma.department.delete({ where: { id } })
    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "Department", recordId: id, changes: { name: dept.name } })
    revalidatePath("/dashboard/inventory/general")
    return { success: true, message: `Department "${dept.name}" deleted` }
  } catch (error) {
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// GENERAL ITEMS
// ============================================

export async function getGeneralItems(params?: PaginationParams): Promise<PaginatedResult<GeneralItemData>> {
  await requireAuth()

  const { page, limit, skip } = getPaginationValues(params)

  const [items, total] = await Promise.all([
    prisma.generalItem.findMany({
      include: { department: { select: { name: true } } },
      orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
      skip,
      take: limit,
    }),
    prisma.generalItem.count(),
  ])

  const data = items.map((i) => ({
    id: i.id,
    name: i.name,
    departmentId: i.departmentId,
    departmentName: i.department.name,
    stock: i.stock,
    unit: i.unit,
    minStock: i.minStock,
    isLowStock: i.stock <= i.minStock,
    updatedAt: i.updatedAt.toISOString(),
  }))

  return paginatedResult(data, total, page, limit)
}

export async function addGeneralItem(data: {
  name: string
  departmentId: string
  unit?: string
  minStock?: number
  stock?: number
}): Promise<{ success: boolean; message: string; id?: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.name?.trim()) return { success: false, message: "Item name is required" }
    if (!data.departmentId) return { success: false, message: "Department is required" }

    const item = await prisma.generalItem.create({
      data: {
        name: data.name.trim(),
        departmentId: data.departmentId,
        unit: data.unit?.trim() || "pcs",
        minStock: data.minStock ?? 5,
        stock: data.stock ?? 0,
      },
    })
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "GeneralItem", recordId: item.id, changes: { name: data.name, departmentId: data.departmentId, stock: data.stock } })
    revalidatePath("/dashboard/inventory/general")
    return { success: true, message: "Item added successfully", id: item.id }
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return actionError("An item with this name already exists in this department")
    }
    return actionError(getErrorMessage(error))
  }
}

export async function getInventoryStats() {
  await requireAuth()

  const [allItems, departments] = await Promise.all([
    prisma.generalItem.findMany({ select: { stock: true, minStock: true } }),
    prisma.department.count(),
  ])
  const totalItems = allItems.length
  const lowStockItems = allItems.filter((i) => i.stock <= i.minStock).length
  return { totalItems, lowStockItems, departments }
}

// ============================================
// SEARCH (for purchase form combobox)
// ============================================

export async function searchGeneralItems(query: string) {
  await requireAuth()

  if (!query || query.trim().length < 2) return []

  const items = await prisma.generalItem.findMany({
    where: {
      name: { contains: query.trim(), mode: "insensitive" },
    },
    include: { department: { select: { name: true } } },
    take: 10,
    orderBy: { name: "asc" },
  })

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    label: `${i.name} (${i.department.name}) — ${i.stock} ${i.unit}`,
    departmentName: i.department.name,
    stock: i.stock,
    unit: i.unit,
  }))
}

// ============================================
// UPDATE GENERAL ITEM
// ============================================

export async function updateGeneralItem(id: string, data: {
  name: string
  departmentId: string
  unit: string
  minStock: number
  stock: number
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.name?.trim()) return { success: false, message: "Item name is required" }
    if (!data.departmentId) return { success: false, message: "Department is required" }

    await prisma.generalItem.update({
      where: { id },
      data: {
        name: data.name.trim(),
        departmentId: data.departmentId,
        unit: data.unit?.trim() || "pcs",
        minStock: data.minStock ?? 5,
        stock: data.stock ?? 0,
      },
    })

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "GeneralItem", recordId: id, changes: { name: data.name, stock: data.stock } })

    revalidatePath("/dashboard/inventory/general")
    return { success: true, message: "Item updated successfully" }
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return actionError("An item with this name already exists in this department")
    }
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// DELETE GENERAL ITEM
// ============================================

export async function deleteGeneralItem(id: string): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const item = await prisma.generalItem.findUnique({ where: { id }, select: { name: true } })
    if (!item) return { success: false, message: "Item not found" }

    // Delete the item — purchase invoice items referencing this will have generalItemId set to null
    // (handled by Prisma's SetNull onDelete or we just delete directly)
    await prisma.generalItem.delete({ where: { id } })

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "GeneralItem", recordId: id, changes: { name: item.name } })

    revalidatePath("/dashboard/inventory/general")
    return { success: true, message: `"${item.name}" deleted successfully` }
  } catch (error) {
    return actionError(getErrorMessage(error))
  }
}
