"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"

export async function grantTemporaryPermission(
  targetUserId: string,
  permission: string,
  durationInHours: number | null // null means "Always"
) {
  try {
    const authResult = await requireAuthSafe(["SUPER_ADMIN"])
    if (!authResult.ok) return { success: false, message: "Unauthorized" }

    const adminId = authResult.session.userId
    
    // Check if permission already exists
    const existing = await prisma.temporaryPermission.findFirst({
      where: { userId: targetUserId, permission },
    })

    let expiresAt = null
    if (durationInHours !== null) {
      expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + durationInHours)
    }

    if (existing) {
      await prisma.temporaryPermission.update({
        where: { id: existing.id },
        data: {
          expiresAt,
          grantedBy: adminId,
          grantedAt: new Date(),
        },
      })
    } else {
      await prisma.temporaryPermission.create({
        data: {
          userId: targetUserId,
          permission,
          expiresAt,
          grantedBy: adminId,
        },
      })
    }

    revalidatePath("/dashboard/hr/staff-directory")
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Permission", recordId: targetUserId, changes: { targetUserId, permission } })
    return { success: true, message: "Permission granted successfully" }
  } catch (error: any) {
    console.error("[grantTemporaryPermission] Error:", error)
    return { success: false, message: error.message || "Failed to grant permission" }
  }
}

export async function revokeTemporaryPermission(id: string) {
  try {
    const authResult = await requireAuthSafe(["SUPER_ADMIN"])
    if (!authResult.ok) return { success: false, message: "Unauthorized" }

    await prisma.temporaryPermission.delete({
      where: { id },
    })

    revalidatePath("/dashboard/hr/staff-directory")
    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "Permission", recordId: id, changes: {} })

    return { success: true, message: "Permission revoked successfully" }
  } catch (error: any) {
    console.error("[revokeTemporaryPermission] Error:", error)
    return { success: false, message: error.message || "Failed to revoke permission" }
  }
}

export async function getTemporaryPermissions(userId: string) {
  try {
    const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"]) // Or whoever needs to view
    if (!authResult.ok) return { success: false, message: "Unauthorized" }

    const permissions = await prisma.temporaryPermission.findMany({
      where: { userId },
      orderBy: { grantedAt: "desc" },
    })

    return { success: true, data: permissions }
  } catch (error: any) {
    console.error("[getTemporaryPermissions] Error:", error)
    return { success: false, message: error.message || "Failed to fetch permissions" }
  }
}

/**
 * Utility function to check if a user currently has a valid temporary permission.
 * Should be called inside server actions.
 */
export async function hasTemporaryPermission(userId: string, permission: string): Promise<boolean> {
  const perm = await prisma.temporaryPermission.findFirst({
    where: { userId, permission },
  })

  if (!perm) return false

  // If expiresAt is null, it means "Always"
  if (perm.expiresAt === null) return true

  return new Date() < perm.expiresAt
}
