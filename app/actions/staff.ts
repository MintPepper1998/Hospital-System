"use server"

import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// TYPES
// ============================================

interface CreateStaffInput {
  name: string
  email: string
  password: string
  phone?: string
  role: string
  department: string
  designation?: string
  specialization?: string
  consultationFee?: number
  basicSalary?: number
  licenseNumber?: string
  image?: string
  idCardImage?: string
  signatureUrl?: string
  permissions?: string[]
}

// ============================================
// CREATE STAFF (with password hashing)
// ============================================

export async function createStaff(data: CreateStaffInput) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    // Validate required fields
    if (!data.name || !data.email || !data.password || !data.role || !data.department) {
      return { success: false, message: "Name, email, password, role, and department are required" }
    }

    if (data.password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters" }
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    })
    if (existing) {
      return { success: false, message: "An account with this email already exists" }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 12)

    // Generate employee ID — properly calculate max number ignoring non-standard prefixes
    const allStaff = await prisma.staff.findMany({
      select: { employeeId: true },
    })
    
    let maxNum = 0
    for (const staff of allStaff) {
      const match = staff.employeeId.match(/\d+$/)
      if (match) {
        const num = parseInt(match[0], 10)
        if (num > maxNum) maxNum = num
      }
    }
    const employeeId = `EMP-${String(maxNum + 1).padStart(4, "0")}`

    // Create user + staff in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          password: hashedPassword,
          role: data.role as Role,
          isActive: true,
          permissions: data.permissions || [],
          image: data.image || null,
          signatureUrl: data.signatureUrl || null,
        },
      })

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          employeeId,
          department: data.department,
          designation: data.designation?.trim() || null,
          phone: data.phone?.trim() || null,
          specialization: data.role === "DOCTOR" ? (data.specialization?.trim() || null) : null,
          consultationFee: data.role === "DOCTOR" ? (data.consultationFee ?? 500) : 0,
          basicSalary: data.basicSalary ?? null,
          licenseNumber: data.licenseNumber?.trim() || null,
          idCardImage: data.idCardImage || null,
          signatureUrl: data.signatureUrl || null,
          joiningDate: new Date(),
        },
        include: { user: true },
      })

      return staff
    })

    console.log(`[SUCCESS] Staff created: ${result.employeeId} — ${data.name} (${data.role})`)

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Staff", recordId: result.id, changes: { name: data.name, role: data.role, department: data.department, employeeId: result.employeeId } })

    revalidatePath("/dashboard/hr/staff")
    revalidatePath("/dashboard/hr/roster")

    return {
      success: true,
      message: `${data.name} has been added as ${data.role.replace("_", " ")}. Employee ID: ${result.employeeId}`,
      data: { id: result.id, userId: result.userId, employeeId: result.employeeId },
    }
  } catch (error: any) {
    console.error("[ERROR] createStaff:", error)
    return {
      success: false,
      message: error.message || "Failed to create staff account",
    }
  }
}

// ============================================
// GET STAFF LIST (grouped by role)
// ============================================

export async function getStaffList() {
  await requireAuth()

  try {
    const employees = await prisma.staff.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            image: true,
            signatureUrl: true,
            permissions: true,
          },
        },
      },
      orderBy: [
        { department: "asc" },
        { user: { name: "asc" } },
      ],
    })

    // Group by role
    const grouped: Record<string, typeof employees> = {}
    for (const emp of employees) {
      const role = emp.user.role
      if (!grouped[role]) grouped[role] = []
      grouped[role].push(emp)
    }

    // Stats
    const totalActive = employees.filter((e) => e.user.isActive && !e.isOnLeave).length
    const totalInactive = employees.filter((e) => !e.user.isActive).length
    const totalOnLeave = employees.filter((e) => e.isOnLeave).length

    return {
      success: true,
      data: {
        all: employees,
        grouped,
        stats: {
          total: employees.length,
          active: totalActive,
          inactive: totalInactive,
          onLeave: totalOnLeave,
        },
      },
    }
  } catch (error: any) {
    console.error("[ERROR] getStaffList:", error)
    return { success: false, message: error.message || "Failed to fetch staff", data: null }
  }
}

// ============================================
// TOGGLE STAFF STATUS (Enable/Disable login)
// ============================================

export async function toggleStaffStatus(staffId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    })

    if (!staff) {
      return { success: false, message: "Staff member not found" }
    }

    const newStatus = !staff.user.isActive

    await prisma.user.update({
      where: { id: staff.userId },
      data: { isActive: newStatus },
    })

    console.log(`[STAFF] ${staff.user.name} is now ${newStatus ? "ACTIVE" : "INACTIVE"}`)

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Staff", recordId: staffId, changes: { name: staff.user.name, isActive: newStatus } })

    revalidatePath("/dashboard/hr/staff")
    revalidatePath("/dashboard/hr/roster")

    return {
      success: true,
      message: `${staff.user.name} has been ${newStatus ? "enabled" : "disabled"}`,
      isActive: newStatus,
    }
  } catch (error: any) {
    console.error("[ERROR] toggleStaffStatus:", error)
    return { success: false, message: error.message || "Failed to update staff status" }
  }
}

// ============================================
// UPDATE STAFF
// ============================================

export interface UpdateStaffInput {
  id: string
  name: string
  phone?: string
  role: string
  department: string
  designation?: string
  specialization?: string
  consultationFee?: number
  basicSalary?: number
  licenseNumber?: string
  permissions?: string[]
  password?: string
  image?: string
  idCardImage?: string
  signatureUrl?: string
}

export async function updateStaff(data: UpdateStaffInput) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.id || !data.name || !data.role || !data.department) {
      return { success: false, message: "ID, Name, role, and department are required" }
    }

    const staff = await prisma.staff.findUnique({
      where: { id: data.id },
      include: { user: true },
    })

    if (!staff) return { success: false, message: "Staff not found" }

    await prisma.$transaction(async (tx) => {
      // 1. Update User
      const userUpdateData: any = {
        name: data.name,
        role: data.role as Role,
        permissions: data.permissions || [],
        phone: data.phone || null,
      }

      if (data.image !== undefined) {
        userUpdateData.image = data.image || null
      }

      if (data.signatureUrl !== undefined) {
        userUpdateData.signatureUrl = data.signatureUrl || null
      }

      if (data.password && data.password.trim() !== "") {
        if (data.password.length < 6) throw new Error("Password must be at least 6 characters")
        userUpdateData.password = await bcrypt.hash(data.password, 10)
      }

      await tx.user.update({
        where: { id: staff.userId },
        data: userUpdateData,
      })

      // 2. Update Staff Profile
      const staffUpdateData: any = {
        department: data.department,
        designation: data.designation || null,
        specialization: data.specialization || null,
        consultationFee: data.consultationFee || 0,
        basicSalary: data.basicSalary || null,
        licenseNumber: data.licenseNumber || null,
        phone: data.phone || null,
      }

      if (data.idCardImage !== undefined) {
        staffUpdateData.idCardImage = data.idCardImage || null
      }

      if (data.signatureUrl !== undefined) {
        staffUpdateData.signatureUrl = data.signatureUrl || null
      }

      await tx.staff.update({
        where: { id: data.id },
        data: staffUpdateData,
      })
      
      // If there's a payroll employee record, try updating it too? Wait, the creation script creates one if they are payroll? Let's not touch employee unless needed, since payroll runs from employee table. Wait, let's just update the Employee basicSalary if it exists.
      const employee = await tx.employee.findUnique({
        where: { userId: staff.userId }
      })
      if (employee) {
        await tx.employee.update({
          where: { id: employee.id },
          data: {
            name: data.name,
            role: data.role,
            department: data.department,
            basicSalary: data.basicSalary || 0
          }
        })
      }
    })

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Staff", recordId: data.id, changes: { name: data.name, role: data.role, department: data.department } })

    revalidatePath("/", "layout")
    return { success: true, message: "Staff profile updated successfully" }
  } catch (error: any) {
    console.error("[ERROR] updateStaff:", error)
    return { success: false, message: error.message || "Failed to update staff" }
  }
}

// ============================================
// DELETE STAFF
// ============================================

export async function deleteStaff(staffId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    })

    if (!staff) {
      return { success: false, message: "Staff member not found" }
    }

    const staffName = staff.user.name || "Unknown"
    const userId = staff.userId

    // Use a transaction to delete all related records
    await prisma.$transaction(async (tx) => {
      // Delete temporary permissions
      await tx.temporaryPermission.deleteMany({
        where: { userId },
      })

      // Delete WhatsApp logs referencing this user (if any)
      // Delete sessions
      await tx.session.deleteMany({
        where: { userId },
      })

      // Delete accounts (OAuth)
      await tx.account.deleteMany({
        where: { userId },
      })

      // Delete the staff record
      await tx.staff.delete({
        where: { id: staffId },
      })

      // Delete the user account
      await tx.user.delete({
        where: { id: userId },
      })
    })

    console.log(`[STAFF] ⚠️ DELETED staff: ${staffName} (${staff.employeeId})`)

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "Staff", recordId: staffId, changes: { name: staffName, employeeId: staff.employeeId } })

    revalidatePath("/dashboard/hr/staff")
    revalidatePath("/dashboard/hr/roster")

    return {
      success: true,
      message: `${staffName} has been permanently deleted`,
    }
  } catch (error: any) {
    console.error("[ERROR] deleteStaff:", error)
    return { success: false, message: error.message || "Failed to delete staff member" }
  }
}

// ============================================
// HR DEPARTMENTS
// ============================================

const DEFAULT_DEPARTMENTS = [
  "General Medicine", "Surgery", "Orthopaedics", "Paediatrics", "Gynaecology",
  "ENT", "Ophthalmology", "Dermatology", "Cardiology", "Neurology",
  "Nursing", "Pharmacy", "Laboratory", "Radiology", "Emergency",
  "ICU", "OPD", "Administration", "Housekeeping", "Accounts",
]

export async function getHRDepartments() {
  try {
    // @ts-ignore
    const count = await prisma.hRDepartment.count()
    if (count === 0) {
      // Seed default departments
      // @ts-ignore
      await prisma.hRDepartment.createMany({
        data: DEFAULT_DEPARTMENTS.map(name => ({ name }))
      })
    }
    // @ts-ignore
    const depts = await prisma.hRDepartment.findMany({ orderBy: { name: 'asc' } })
    return { success: true, data: depts.map((d: any) => d.name) }
  } catch (error) {
    return { success: false, data: [] }
  }
}

export async function addHRDepartment(name: string) {
  const authResult = await requireAuthSafe(['SUPER_ADMIN'])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    // @ts-ignore
    await prisma.hRDepartment.create({ data: { name } })
    revalidatePath('/dashboard/hr/staff')
    return { success: true, message: 'Department added' }
  } catch (error) {
    return { success: false, message: 'Failed to add' }
  }
}

export async function renameHRDepartment(oldName: string, newName: string) {
  const authResult = await requireAuthSafe(['SUPER_ADMIN'])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    // @ts-ignore
    await prisma.hRDepartment.update({ where: { name: oldName }, data: { name: newName } })
    revalidatePath('/dashboard/hr/staff')
    return { success: true, message: 'Department renamed' }
  } catch (error) {
    return { success: false, message: 'Failed to rename' }
  }
}

export async function deleteHRDepartment(name: string) {
  const authResult = await requireAuthSafe(['SUPER_ADMIN'])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    // @ts-ignore
    await prisma.hRDepartment.delete({ where: { name } })
    revalidatePath('/dashboard/hr/staff')
    return { success: true, message: 'Department deleted' }
  } catch (error) {
    return { success: false, message: 'Failed to delete' }
  }
}

