"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { type PaginationParams, getPaginationValues, paginatedResult } from "@/lib/pagination"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// EMPLOYEE / STAFF MANAGEMENT
// ============================================

/**
 * Get all employees/staff with their user info
 */
export async function getEmployees(filters?: {
  department?: string
  isActive?: boolean
  search?: string
  pagination?: PaginationParams
}) {
  await requireAuth()
  try {
    const { page, limit, skip } = getPaginationValues(filters?.pagination)

    const where = {
      ...(filters?.department && { department: filters.department }),
      ...(filters?.search && {
        OR: [
          { user: { name: { contains: filters.search, mode: "insensitive" as const } } },
          { employeeId: { contains: filters.search, mode: "insensitive" as const } },
          { phone: { contains: filters.search } },
        ],
      }),
      user: {
        isActive: filters?.isActive ?? true,
      },
    }

    const [employees, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: [
          { department: "asc" },
          { user: { name: "asc" } },
        ],
        skip,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ])

    return {
      success: true,
      ...paginatedResult(employees, total, page, limit),
    }
  } catch (error: unknown) {
    console.error("[ERROR] getEmployees:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch employees",
    }
  }
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(staffId: string) {
  await requireAuth()
  try {
    const employee = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        user: true,
        rosters: {
          include: {
            shift: true,
          },
          orderBy: { date: "desc" },
          take: 30, // Last 30 roster entries
        },
      },
    })

    if (!employee) {
      return {
        success: false,
        message: "Employee not found",
      }
    }

    return {
      success: true,
      data: employee,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getEmployeeById:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch employee",
    }
  }
}

/**
 * Create a new employee
 */
export async function createEmployee(data: {
  name: string
  email: string
  role: string
  department: string
  designation: string
  phone?: string
  basicSalary?: number
  joiningDate?: Date
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
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

    const result = await prisma.$transaction(async (tx) => {
      // Create user first
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          role: data.role as Role,
          isActive: true,
        },
      })

      // Create staff record
      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          employeeId,
          department: data.department,
          designation: data.designation,
          phone: data.phone,
          basicSalary: data.basicSalary,
          joiningDate: data.joiningDate || new Date(),
        },
        include: {
          user: true,
        },
      })

      return staff
    })

    revalidatePath("/dashboard/hr/staff")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Employee", changes: { name: data.name, department: data.department } })

    return {
      success: true,
      data: result,
      message: "Employee created successfully",
    }
  } catch (error: unknown) {
    console.error("[ERROR] createEmployee:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create employee",
    }
  }
}

/**
 * Update employee details
 */
export async function updateEmployee(
  staffId: string,
  data: {
    department?: string
    designation?: string
    phone?: string
    basicSalary?: number
    isOnLeave?: boolean
    leaveReason?: string
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const employee = await prisma.staff.update({
      where: { id: staffId },
      data: {
        ...(data.department && { department: data.department }),
        ...(data.designation && { designation: data.designation }),
        ...(data.phone && { phone: data.phone }),
        ...(data.basicSalary !== undefined && { basicSalary: data.basicSalary }),
        ...(data.isOnLeave !== undefined && { isOnLeave: data.isOnLeave }),
        ...(data.leaveReason !== undefined && { leaveReason: data.leaveReason }),
      },
      include: {
        user: true,
      },
    })

    revalidatePath("/dashboard/hr/staff")
    revalidatePath("/dashboard/hr/roster")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Employee", recordId: staffId, changes: {} })

    return {
      success: true,
      data: employee,
      message: "Employee updated successfully",
    }
  } catch (error: unknown) {
    console.error("[ERROR] updateEmployee:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update employee",
    }
  }
}

/**
 * Toggle employee leave status
 */
export async function toggleEmployeeLeave(staffId: string, isOnLeave: boolean, reason?: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        isOnLeave,
        leaveReason: isOnLeave ? reason : null,
      },
    })

    revalidatePath("/dashboard/hr/staff")
    revalidatePath("/dashboard/hr/roster")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "EmployeeLeave", recordId: staffId, changes: { isOnLeave } })

    return {
      success: true,
      message: isOnLeave ? "Employee marked as on leave" : "Employee marked as active",
    }
  } catch (error: unknown) {
    console.error("[ERROR] toggleEmployeeLeave:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update leave status",
    }
  }
}

// ============================================
// SHIFT MANAGEMENT
// ============================================

/**
 * Get all shifts
 */
export async function getShifts() {
  await requireAuth()
  try {
    const shifts = await prisma.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    })

    return {
      success: true,
      data: shifts,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getShifts:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch shifts",
    }
  }
}

/**
 * Create a new shift
 */
export async function createShift(data: {
  name: string
  code: string
  startTime: string
  endTime: string
  color?: string
  icon?: string
  description?: string
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const shift = await prisma.shift.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color,
        icon: data.icon,
        description: data.description,
      },
    })

    revalidatePath("/dashboard/hr/roster")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Shift", recordId: shift.id, changes: { name: data.name } })

    return {
      success: true,
      data: shift,
      message: "Shift created successfully",
    }
  } catch (error: unknown) {
    console.error("[ERROR] createShift:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create shift",
    }
  }
}

/**
 * Seed default shifts
 */
export async function seedDefaultShifts() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const existingShifts = await prisma.shift.count()
    if (existingShifts > 0) {
      return {
        success: false,
        message: "Shifts already exist",
      }
    }

    const defaultShifts = [
      {
        name: "Morning",
        code: "MOR",
        startTime: "06:00",
        endTime: "14:00",
        color: "#FFD700",
        icon: "🌞",
        description: "Morning shift (6 AM - 2 PM)",
      },
      {
        name: "Afternoon",
        code: "AFT",
        startTime: "14:00",
        endTime: "22:00",
        color: "#FF8C00",
        icon: "🌅",
        description: "Afternoon/Evening shift (2 PM - 10 PM)",
      },
      {
        name: "Night",
        code: "NIG",
        startTime: "22:00",
        endTime: "06:00",
        color: "#4B0082",
        icon: "🌙",
        description: "Night shift (10 PM - 6 AM)",
      },
      {
        name: "General",
        code: "GEN",
        startTime: "09:00",
        endTime: "17:00",
        color: "#4CAF50",
        icon: "⏰",
        description: "General duty (9 AM - 5 PM)",
      },
      {
        name: "On Call",
        code: "ONC",
        startTime: "00:00",
        endTime: "23:59",
        color: "#9C27B0",
        icon: "📞",
        description: "On-call duty (24 hours)",
      },
    ]

    await prisma.shift.createMany({
      data: defaultShifts,
    })

    revalidatePath("/dashboard/hr/roster")

    return {
      success: true,
      message: `Created ${defaultShifts.length} default shifts`,
    }
  } catch (error: unknown) {
    console.error("[ERROR] seedDefaultShifts:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to seed shifts",
    }
  }
}

// ============================================
// ROSTER MANAGEMENT
// ============================================

/**
 * Assign a shift to an employee for a specific date
 */
export async function assignShift(data: {
  staffId: string
  shiftId: string
  dateString: string // YYYY-MM-DD format to avoid timezone issues
  notes?: string
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    // Parse the date string and set to noon to avoid timezone boundary issues
    const [year, month, day] = data.dateString.split("-").map(Number)
    const date = new Date(year, month - 1, day, 12, 0, 0, 0) // Set to noon

    // Upsert - create or update the roster entry
    const roster = await prisma.roster.upsert({
      where: {
        staffId_date: {
          staffId: data.staffId,
          date: date,
        },
      },
      create: {
        staffId: data.staffId,
        shiftId: data.shiftId,
        date: date,
        notes: data.notes,
      },
      update: {
        shiftId: data.shiftId,
        notes: data.notes,
      },
      include: {
        staff: {
          include: { user: true },
        },
        shift: true,
      },
    })

    revalidatePath("/dashboard/hr/roster")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "ShiftAssignment", changes: { staffId: data.staffId, shiftId: data.shiftId } })

    return {
      success: true,
      data: roster,
      message: "Shift assigned successfully",
    }
  } catch (error: unknown) {
    console.error("[ERROR] assignShift:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to assign shift",
    }
  }
}

/**
 * Remove a shift assignment
 */
export async function removeShiftAssignment(staffId: string, dateString: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    // Parse the date string and set to noon to avoid timezone boundary issues
    const [year, month, day] = dateString.split("-").map(Number)
    const date = new Date(year, month - 1, day, 12, 0, 0, 0) // Set to noon

    await prisma.roster.delete({
      where: {
        staffId_date: {
          staffId,
          date,
        },
      },
    })

    revalidatePath("/dashboard/hr/roster")

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "ShiftAssignment", recordId: staffId, changes: { dateString } })

    return {
      success: true,
      message: "Shift assignment removed",
    }
  } catch (error: unknown) {
    console.error("[ERROR] removeShiftAssignment:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to remove shift assignment",
    }
  }
}

/**
 * Bulk assign shifts for a week
 */
export async function bulkAssignShifts(
  staffId: string,
  shiftId: string,
  dates: Date[]
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const results = await prisma.$transaction(
      dates.map((date) =>
        prisma.roster.upsert({
          where: {
            staffId_date: {
              staffId,
              date,
            },
          },
          create: {
            staffId,
            shiftId,
            date,
          },
          update: {
            shiftId,
          },
        })
      )
    )

    revalidatePath("/dashboard/hr/roster")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "BulkShiftAssignment", changes: {} })

    return {
      success: true,
      message: `Assigned ${results.length} shifts successfully`,
    }
  } catch (error: unknown) {
    console.error("[ERROR] bulkAssignShifts:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to bulk assign shifts",
    }
  }
}

/**
 * Get monthly roster for all employees
 */
export async function getMonthlyRoster(month: number, year: number) {
  await requireAuth()
  try {
    // Calculate start and end of the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of month

    // Fetch all roster entries for the month
    const rosters = await prisma.roster.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        staff: {
          include: { user: true },
        },
        shift: true,
      },
      orderBy: [
        { date: "asc" },
        { staff: { department: "asc" } },
      ],
    })

    // Fetch all active employees
    const employees = await prisma.staff.findMany({
      where: {
        user: { isActive: true },
      },
      include: {
        user: true,
      },
      orderBy: [
        { department: "asc" },
        { user: { name: "asc" } },
      ],
    })

    return {
      success: true,
      data: {
        rosters,
        employees,
        month,
        year,
        startDate,
        endDate,
        daysInMonth: endDate.getDate(),
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] getMonthlyRoster:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch monthly roster",
    }
  }
}

/**
 * Get weekly roster
 */
export async function getWeeklyRoster(startDate: Date) {
  await requireAuth()
  try {
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6) // 7 days

    const rosters = await prisma.roster.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        staff: {
          include: { user: true },
        },
        shift: true,
      },
      orderBy: [
        { staff: { department: "asc" } },
        { date: "asc" },
      ],
    })

    const employees = await prisma.staff.findMany({
      where: {
        user: { isActive: true },
      },
      include: {
        user: true,
      },
      orderBy: [
        { department: "asc" },
        { user: { name: "asc" } },
      ],
    })

    return {
      success: true,
      data: {
        rosters,
        employees,
        startDate,
        endDate,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] getWeeklyRoster:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch weekly roster",
    }
  }
}

/**
 * Get roster by department for a specific date
 */
export async function getRosterByDepartment(department: string, date: Date) {
  await requireAuth()
  try {
    const rosters = await prisma.roster.findMany({
      where: {
        date,
        staff: {
          department,
        },
      },
      include: {
        staff: {
          include: { user: true },
        },
        shift: true,
      },
      orderBy: {
        shift: { startTime: "asc" },
      },
    })

    return {
      success: true,
      data: rosters,
    }
  } catch (error: unknown) {
    console.error("[ERROR] getRosterByDepartment:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch roster by department",
    }
  }
}

/**
 * Get all departments
 */
export async function getDepartments() {
  await requireAuth()
  try {
    const departments = await prisma.staff.groupBy({
      by: ["department"],
      where: {
        department: { not: null },
      },
      _count: true,
    })

    return {
      success: true,
      data: departments.filter((d) => d.department).map((d) => ({
        name: d.department!,
        count: d._count,
      })),
    }
  } catch (error: unknown) {
    console.error("[ERROR] getDepartments:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch departments",
    }
  }
}
