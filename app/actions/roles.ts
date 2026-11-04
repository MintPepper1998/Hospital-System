"use server"

import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"

export async function getRoleTemplates() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const templates = await prisma.roleTemplate.findMany({
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: templates }
  } catch (error: any) {
    console.error("[ERROR] getRoleTemplates:", error)
    return { success: false, message: error.message || "Failed to fetch role templates" }
  }
}

export async function createRoleTemplate(data: { name: string; baseRole: Role; permissions: string[] }) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.name || !data.baseRole) {
      return { success: false, message: "Name and base role are required" }
    }

    const existing = await prisma.roleTemplate.findUnique({
      where: { name: data.name },
    })
    if (existing) {
      return { success: false, message: "A role with this name already exists" }
    }

    const template = await prisma.roleTemplate.create({
      data: {
        name: data.name,
        baseRole: data.baseRole,
        permissions: data.permissions,
      },
    })

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "RoleTemplate", recordId: template.id, changes: { name: data.name, baseRole: data.baseRole } })

    revalidatePath("/dashboard/admin/roles")
    revalidatePath("/dashboard/hr/staff")
    return { success: true, data: template, message: "Role template created successfully" }
  } catch (error: any) {
    console.error("[ERROR] createRoleTemplate:", error)
    return { success: false, message: error.message || "Failed to create role template" }
  }
}

export async function updateRoleTemplate(id: string, data: { name: string; baseRole: Role; permissions: string[] }) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const template = await prisma.roleTemplate.update({
      where: { id },
      data: {
        name: data.name,
        baseRole: data.baseRole,
        permissions: data.permissions,
      },
    })

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "RoleTemplate", recordId: id, changes: { name: data.name, baseRole: data.baseRole } })

    revalidatePath("/dashboard/admin/roles")
    revalidatePath("/dashboard/hr/staff")
    return { success: true, data: template, message: "Role template updated successfully" }
  } catch (error: any) {
    console.error("[ERROR] updateRoleTemplate:", error)
    return { success: false, message: error.message || "Failed to update role template" }
  }
}

export async function deleteRoleTemplate(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.roleTemplate.delete({
      where: { id },
    })

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "RoleTemplate", recordId: id, changes: {} })

    revalidatePath("/dashboard/admin/roles")
    revalidatePath("/dashboard/hr/staff")
    return { success: true, message: "Role template deleted successfully" }
  } catch (error: any) {
    console.error("[ERROR] deleteRoleTemplate:", error)
    return { success: false, message: error.message || "Failed to delete role template" }
  }
}
