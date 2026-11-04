"use server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { actionError, getErrorMessage } from "@/lib/action-result"

// ============================================
// GET ALL ACCOUNT GROUPS (tree structure)
// ============================================

export async function getAccountGroups(params?: { scope?: "HOSPITAL" | "PHARMACY" | "ALL" }) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false as const, message: authResult.error, data: [] }

  try {
    const where: Prisma.AccountGroupWhereInput = { isActive: true }
    if (params?.scope === "HOSPITAL") {
      where.scope = { in: ["HOSPITAL", "BOTH"] }
    } else if (params?.scope === "PHARMACY") {
      where.scope = { in: ["PHARMACY", "BOTH"] }
    }

    const groups = await prisma.accountGroup.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
      include: {
        parent: { select: { id: true, code: true, name: true } },
        _count: { select: { children: true } },
      },
    })

    return { success: true as const, data: groups }
  } catch (error) {
    console.error("[ERROR] getAccountGroups:", error)
    return { success: false as const, message: getErrorMessage(error), data: [] }
  }
}

// ============================================
// CREATE ACCOUNT GROUP
// ============================================

export async function createAccountGroup(data: {
  code: string
  name: string
  type: string
  nature: string
  parentId?: string | null
  scope?: string
  description?: string
  displayOrder?: number
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.code || !data.name || !data.type || !data.nature) {
      return { success: false, message: "Code, name, type, and nature are required" }
    }

    // Check for duplicate code
    const existing = await prisma.accountGroup.findUnique({ where: { code: data.code } })
    if (existing) return { success: false, message: `Account group code "${data.code}" already exists` }

    await prisma.accountGroup.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        nature: data.nature,
        parentId: data.parentId || null,
        scope: data.scope || "BOTH",
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder || 0,
        isSystemAccount: false,
      },
    })

    revalidatePath("/dashboard/master-finance/chart-of-accounts")
    revalidatePath("/dashboard/pharmacy-finance/chart-of-accounts")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/pharmacy-finance/vouchers")
    revalidatePath("/dashboard/settings/chart-of-accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "AccountGroup",
      changes: { code: data.code, name: data.name },
    })

    return { success: true, message: `Account group "${data.name}" (${data.code}) created` }
  } catch (error) {
    console.error("[ERROR] createAccountGroup:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// UPDATE ACCOUNT GROUP
// ============================================

export async function updateAccountGroup(
  id: string,
  data: {
    name?: string
    description?: string
    scope?: string
    displayOrder?: number
    isActive?: boolean
  }
): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const group = await prisma.accountGroup.findUnique({ where: { id } })
    if (!group) return { success: false, message: "Account group not found" }

    await prisma.accountGroup.update({
      where: { id },
      data: {
        name: data.name ?? group.name,
        description: data.description !== undefined ? data.description?.trim() || null : group.description,
        scope: data.scope ?? group.scope,
        displayOrder: data.displayOrder ?? group.displayOrder,
        isActive: data.isActive ?? group.isActive,
      },
    })

    revalidatePath("/dashboard/master-finance/chart-of-accounts")
    revalidatePath("/dashboard/pharmacy-finance/chart-of-accounts")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/pharmacy-finance/vouchers")
    revalidatePath("/dashboard/settings/chart-of-accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "AccountGroup",
      recordId: id,
      changes: data,
    })

    return { success: true, message: `Account group "${group.name}" updated` }
  } catch (error) {
    console.error("[ERROR] updateAccountGroup:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// DELETE ACCOUNT GROUP
// ============================================

export async function deleteAccountGroup(
  id: string,
  options?: { cascade?: boolean; force?: boolean }
): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const group = await prisma.accountGroup.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    })
    if (!group) return { success: false, message: "Account group not found" }

    // Core system root categories (Assets, Liabilities, etc.) cannot be deleted
    if (group.isSystemAccount && !group.parentId) {
      return { success: false, message: "Core system root categories (Assets, Liabilities, etc.) cannot be deleted." }
    }

    // Helper to recursively collect all descendant IDs and codes
    async function collectDescendants(groupId: string): Promise<{ ids: string[]; codes: string[] }> {
      const children = await prisma.accountGroup.findMany({
        where: { parentId: groupId },
        select: { id: true, code: true },
      })
      let ids = children.map((c) => c.id)
      let codes = children.map((c) => c.code)
      for (const child of children) {
        const sub = await collectDescendants(child.id)
        ids = ids.concat(sub.ids)
        codes = codes.concat(sub.codes)
      }
      return { ids, codes }
    }

    const { ids: descendantIds, codes: descendantCodes } = await collectDescendants(id)
    const allCodesToCheck = [group.code, ...descendantCodes]

    if (descendantIds.length > 0 && !options?.cascade) {
      return {
        success: false,
        message: `This group has ${descendantIds.length} sub-account(s). Please remove sub-accounts first or confirm removal of all sub-accounts.`,
      }
    }

    // Check if any transactions reference this group or any descendant
    const txCount = await prisma.transaction.count({
      where: { accountGroupCode: { in: allCodesToCheck } },
    })

    if (txCount > 0) {
      if (!options?.force) {
        return {
          success: false,
          message: `Cannot delete — ${txCount} transaction(s) reference this group or its sub-accounts. Please confirm to unlink or deactivate instead.`,
        }
      }
      // If force, unlink transactions so past transactions don't fail
      await prisma.transaction.updateMany({
        where: { accountGroupCode: { in: allCodesToCheck } },
        data: { accountGroupCode: null },
      })
    }

    // Unlink parentId for all descendants to prevent foreign key errors during cascading delete
    if (descendantIds.length > 0) {
      await prisma.accountGroup.updateMany({
        where: { id: { in: descendantIds } },
        data: { parentId: null },
      })
    }

    // Delete descendant groups then the target group
    if (descendantIds.length > 0) {
      await prisma.accountGroup.deleteMany({
        where: { id: { in: descendantIds } },
      })
    }
    await prisma.accountGroup.delete({ where: { id } })

    revalidatePath("/dashboard/master-finance/chart-of-accounts")
    revalidatePath("/dashboard/pharmacy-finance/chart-of-accounts")
    revalidatePath("/dashboard/master-finance/vouchers")
    revalidatePath("/dashboard/pharmacy-finance/vouchers")
    revalidatePath("/dashboard/settings/chart-of-accounts")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "AccountGroup",
      recordId: id,
      changes: { code: group.code, name: group.name, deletedDescendantCount: descendantIds.length },
    })

    return {
      success: true,
      message: descendantIds.length > 0
        ? `Account group "${group.name}" and ${descendantIds.length} sub-account(s) deleted.`
        : `Account group "${group.name}" deleted.`,
    }
  } catch (error) {
    console.error("[ERROR] deleteAccountGroup:", error)
    return actionError(getErrorMessage(error))
  }
}
