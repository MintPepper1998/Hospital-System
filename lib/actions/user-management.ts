"use server"

import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { Role } from "@prisma/client"

// ============================================
// UPDATE USER
// ============================================

export async function updateUser(userId: string, formData: FormData) {
  const authSession = await requireAuth(["SUPER_ADMIN"])

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const role = formData.get("role") as string
  const phone = formData.get("phone") as string
  const isActive = formData.get("isActive") === "true"
  const newPassword = formData.get("newPassword") as string
  const permissionsStr = formData.get("permissions") as string
  let permissions: string[] = []
  if (permissionsStr) {
    try { permissions = JSON.parse(permissionsStr) } catch (e) {}
  }

  // Staff fields
  const department = formData.get("department") as string
  const designation = formData.get("designation") as string
  const specialization = formData.get("specialization") as string
  const licenseNumber = formData.get("licenseNumber") as string
  const consultationFeeRaw = formData.get("consultationFee") as string
  const basicSalaryRaw = formData.get("basicSalary") as string
  const staffPhone = formData.get("staffPhone") as string
  const address = formData.get("address") as string
  const emergencyContact = formData.get("emergencyContact") as string

  if (!name || !email || !role) {
    throw new Error("Name, email, and role are required")
  }

  // Check email uniqueness (excluding current user)
  const existingUser = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
  })
  if (existingUser) {
    throw new Error("Another user with this email already exists")
  }

  const userUpdateData: Record<string, unknown> = {
    name,
    email,
    role: role as Role,
    permissions,
    phone: phone || null,
    isActive,
  }

  // Only update password if a new one is provided
  if (newPassword && newPassword.trim().length > 0) {
    userUpdateData.password = await hash(newPassword, 10)
  }

  const staffRoles = ["DOCTOR", "NURSE", "PHARMACIST", "LAB_TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT"]

  await prisma.$transaction(async (tx) => {
    // Update user
    await tx.user.update({
      where: { id: userId },
      data: userUpdateData,
    })

    // Handle staff record
    if (staffRoles.includes(role)) {
      const existingStaff = await tx.staff.findUnique({
        where: { userId },
      })

      const staffData = {
        department: department || null,
        designation: designation || null,
        specialization: specialization || null,
        licenseNumber: licenseNumber || null,
        phone: staffPhone || phone || null,
        address: address || null,
        emergencyContact: emergencyContact || null,
        consultationFee: consultationFeeRaw ? parseFloat(consultationFeeRaw) : 500,
        basicSalary: basicSalaryRaw ? parseFloat(basicSalaryRaw) : null,
      }

      if (existingStaff) {
        await tx.staff.update({
          where: { userId },
          data: staffData,
        })
      } else {
        // Create staff record if transitioning to a staff role
        const staffCount = await tx.staff.count()
        const employeeId = `EMP-${role.substring(0, 3).toUpperCase()}-${String(staffCount + 1).padStart(4, "0")}`
        await tx.staff.create({
          data: {
            userId,
            employeeId,
            ...staffData,
          },
        })
      }
    }
  })

  writeAuditLog({
    userId: authSession.userId,
    action: "UPDATE",
    module: "User",
    recordId: userId,
    changes: { name, email, role, isActive },
  })

  revalidatePath("/dashboard/admin/users")
  redirect("/dashboard/admin/users")
}

// ============================================
// TOGGLE USER STATUS (Active/Inactive)
// ============================================

export async function toggleUserStatus(userId: string) {
  const authSession = await requireAuth(["SUPER_ADMIN"])

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  // Prevent deactivating yourself
  if (user.id === authSession.userId) {
    throw new Error("You cannot deactivate your own account")
  }

  const newStatus = !user.isActive

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: newStatus },
  })

  writeAuditLog({
    userId: authSession.userId,
    action: "UPDATE",
    module: "User",
    recordId: userId,
    changes: { isActive: newStatus },
  })

  revalidatePath("/dashboard/admin/users")
  return { success: true, isActive: newStatus }
}

// ============================================
// DELETE USER
// ============================================

export async function deleteUser(userId: string) {
  const authSession = await requireAuth(["SUPER_ADMIN"])

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  // Prevent self-deletion
  if (user.id === authSession.userId) {
    throw new Error("You cannot delete your own account")
  }

  // Prevent deleting other super admins
  if (user.role === "SUPER_ADMIN") {
    throw new Error("Cannot delete a Super Admin account")
  }

  await prisma.user.delete({ where: { id: userId } })

  writeAuditLog({
    userId: authSession.userId,
    action: "DELETE",
    module: "User",
    recordId: userId,
    changes: { name: user.name, email: user.email },
  })

  revalidatePath("/dashboard/admin/users")
  return { success: true }
}

// ============================================
// RESET USER PASSWORD
// ============================================

export async function resetUserPassword(userId: string, newPassword: string) {
  const authSession = await requireAuth(["SUPER_ADMIN"])

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }

  const hashedPassword = await hash(newPassword, 10)

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })

  writeAuditLog({
    userId: authSession.userId,
    action: "UPDATE",
    module: "User",
    recordId: userId,
    changes: { passwordReset: true },
  })

  revalidatePath("/dashboard/admin/users")
  return { success: true }
}
