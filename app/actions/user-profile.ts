"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { getSecureUrl } from "@/lib/s3-server"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// GET PROFILE
// ============================================

export async function getMyProfile() {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, message: "Not authenticated", data: null }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { staff: true },
  })

  if (!user) {
    return { success: false, message: "User not found", data: null }
  }

  return {
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ? await getSecureUrl(user.image) : null,
      role: user.role,
      hasPassword: !!user.password,
      createdAt: user.createdAt.toISOString(),
      staff: user.staff
        ? {
            id: user.staff.id,
            employeeId: user.staff.employeeId,
            phone: user.staff.phone,
            department: user.staff.department,
            designation: user.staff.designation,
            specialization: user.staff.specialization,
            joiningDate: user.staff.joiningDate.toISOString(),
          }
        : null,
    },
  }
}

// ============================================
// UPDATE PROFILE
// ============================================

export async function updateProfile(data: {
  phone?: string
  name?: string
  image?: string
}) {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, message: "Not authenticated" }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { staff: true },
    })

    if (!user) return { success: false, message: "User not found" }

    await prisma.$transaction(async (tx) => {
      // 1. Update user
      await tx.user.update({
        where: { id: user.id },
        data: { 
          name: data.name !== undefined ? data.name : user.name,
          image: data.image !== undefined ? data.image : user.image
        },
      })
    })

    // Update staff phone if user has a staff record
    if (user.staff && data.phone !== undefined) {
      await prisma.staff.update({
        where: { id: user.staff.id },
        data: { phone: data.phone.trim() || null },
      })
    }

    writeAuditLog({ userId: user.id, action: "UPDATE", module: "UserProfile", recordId: user.id, changes: { name: data.name } })

    revalidatePath("/dashboard/profile")

    return { success: true, message: "Profile updated successfully" }
  } catch (error: any) {
    console.error("[ERROR] updateProfile:", error)
    return { success: false, message: error.message || "Failed to update profile" }
  }
}

// ============================================
// CHANGE PASSWORD
// ============================================

export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}) {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, message: "Not authenticated" }
  }

  try {
    if (!data.currentPassword || !data.newPassword) {
      return { success: false, message: "Both current and new passwords are required" }
    }

    if (data.newPassword.length < 6) {
      return { success: false, message: "New password must be at least 6 characters" }
    }

    if (data.currentPassword === data.newPassword) {
      return { success: false, message: "New password must be different from current password" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || !user.password) {
      return { success: false, message: "User not found or no password set" }
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, user.password)
    if (!isValid) {
      return { success: false, message: "Current password is incorrect" }
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(data.newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    console.log(`[PROFILE] Password changed for ${user.email}`)

    writeAuditLog({ userId: user.id, action: "UPDATE", module: "UserPassword", recordId: user.id, changes: { passwordReset: true } })

    return { success: true, message: "Password updated successfully" }
  } catch (error: any) {
    console.error("[ERROR] changePassword:", error)
    return { success: false, message: error.message || "Failed to change password" }
  }
}
