"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Role } from "@prisma/client"

export type NotificationItem = {
  id: string
  title: string
  message: string
  link: string
  time: Date
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS"
  module?: string
  isRead?: boolean
  isPersistent?: boolean // true = from DB, false = dynamic insight
  createdByName?: string | null
}

/**
 * Fetch all notifications for the current user:
 * 1. Persistent event-driven notifications from the DB (targeted by userId or role)
 * 2. Live dynamic insights (computed on the fly based on role)
 */
export async function getDashboardNotifications(): Promise<NotificationItem[]> {
  const session = await auth()
  if (!session?.user?.email) return []

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) return []

  const notifications: NotificationItem[] = []
  const role = user.role

  // ═══════════════════════════════════════════
  // PART 1: Persistent DB Notifications
  // Fetch unread notifications targeted at this user or their role
  // ═══════════════════════════════════════════
  try {
    const dbNotifications = await prisma.notification.findMany({
      where: {
        AND: [
          {
            OR: [
              { targetUserId: user.id },
              { targetRole: role },
            ],
          },
          {
            OR: [
              { scheduledFor: null },
              { scheduledFor: { lte: new Date() } },
            ],
          },
        ],
        isRead: false,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    for (const n of dbNotifications) {
      notifications.push({
        id: n.id,
        title: n.title,
        message: n.message,
        link: n.link || "/dashboard",
        time: n.createdAt,
        type: n.type as NotificationItem["type"],
        module: n.module,
        isRead: n.isRead,
        isPersistent: true,
        createdByName: n.createdByName,
      })
    }
  } catch {
    // If the notification table doesn't exist yet (before migration), just skip
    console.warn("[NOTIFICATIONS] Could not fetch DB notifications — table may not exist yet")
  }

  // ═══════════════════════════════════════════
  // PART 2: Dynamic Live Insights (computed)
  // These act as a live to-do list that auto-resolves
  // ═══════════════════════════════════════════

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  try {
    // 1. DOCTOR: Pending Appointments Today
    if (role === Role.DOCTOR) {
      const staff = await prisma.staff.findUnique({ where: { userId: user.id } })
      if (staff) {
        const aptCount = await prisma.appointment.count({
          where: {
            doctorId: staff.id,
            appointmentDate: { gte: today, lt: tomorrow },
            status: "PENDING",
          },
        })
        if (aptCount > 0) {
          notifications.push({
            id: "live-doc-apt",
            title: "Pending Appointments",
            message: `You have ${aptCount} pending appointment${aptCount > 1 ? "s" : ""} scheduled for today.`,
            link: "/dashboard/clinical/appointments",
            time: new Date(),
            type: "INFO",
            module: "CLINICAL",
            isPersistent: false,
          })
        }
      }
    }

    // 2. RECEPTIONIST / SUPER_ADMIN: Pending Appointments Today
    if (role === Role.RECEPTIONIST || role === Role.SUPER_ADMIN) {
      const aptCount = await prisma.appointment.count({
        where: {
          appointmentDate: { gte: today, lt: tomorrow },
          status: "PENDING",
        },
      })
      if (aptCount > 0) {
        notifications.push({
          id: "live-rec-apt",
          title: "Today's Appointments",
          message: `There are ${aptCount} pending appointments requiring attention today.`,
          link: "/dashboard/admin/appointments",
          time: new Date(),
          type: "INFO",
          module: "CLINICAL",
          isPersistent: false,
        })
      }
    }

    // 3. ACCOUNTANT / SUPER_ADMIN: Pending Bills
    if (role === Role.ACCOUNTANT || role === Role.SUPER_ADMIN) {
      const unpaidBills = await prisma.billing.count({
        where: { status: "PENDING" },
      })
      if (unpaidBills > 0) {
        notifications.push({
          id: "live-acc-bills",
          title: "Unpaid Bills",
          message: `There are ${unpaidBills} pending bills waiting for payment collection.`,
          link: "/dashboard/finance/billing",
          time: new Date(),
          type: "WARNING",
          module: "BILLING",
          isPersistent: false,
        })
      }
    }

    // 4. PHARMACIST / SUPER_ADMIN: Low Stock Alert
    if (role === Role.PHARMACIST || role === Role.SUPER_ADMIN) {
      const lowStockCount = await prisma.medicine.count({
        where: {
          inventoryBatches: { some: { quantity: { lte: 20 } } },
        },
      })
      if (lowStockCount > 0) {
        notifications.push({
          id: "live-pharm-stock",
          title: "Low Stock Alert",
          message: `${lowStockCount} medicine${lowStockCount > 1 ? "s are" : " is"} running critically low on stock.`,
          link: "/dashboard/pharmacy/inventory",
          time: new Date(),
          type: "ERROR",
          module: "PHARMACY",
          isPersistent: false,
        })
      }
    }

    // 5. LAB_TECHNICIAN / SUPER_ADMIN: Pending Lab Requests
    if (role === Role.LAB_TECHNICIAN || role === Role.SUPER_ADMIN) {
      const pendingLabs = await prisma.labRequest.count({
        where: { status: { in: ["PAID_PENDING_SAMPLE", "SAMPLE_COLLECTED"] } },
      })
      if (pendingLabs > 0) {
        notifications.push({
          id: "live-lab-req",
          title: "Pending Lab Requests",
          message: `${pendingLabs} lab request${pendingLabs > 1 ? "s" : ""} waiting to be processed.`,
          link: "/dashboard/pathology/requests",
          time: new Date(),
          type: "INFO",
          module: "LAB",
          isPersistent: false,
        })
      }
    }

    // 6. AMBULANCE_DRIVER / SUPER_ADMIN: Requested Trips
    if (role === Role.AMBULANCE_DRIVER || role === Role.SUPER_ADMIN) {
      const requestedTrips = await prisma.ambulanceTrip.count({
        where: { status: "REQUESTED" },
      })
      if (requestedTrips > 0) {
        notifications.push({
          id: "live-amb-trip",
          title: "New Ambulance Requests",
          message: `There are ${requestedTrips} new ambulance trip request${requestedTrips > 1 ? "s" : ""}.`,
          link: "/dashboard/ambulance/trips",
          time: new Date(),
          type: "WARNING",
          module: "AMBULANCE",
          isPersistent: false,
        })
      }
    }

    // 7. CANTEEN_STAFF / SUPER_ADMIN: Pending Meal Orders
    if (role === Role.CANTEEN_STAFF || role === Role.SUPER_ADMIN) {
      const pendingMeals = await prisma.canteenMealOrder.count({
        where: { status: "PENDING" },
      })
      if (pendingMeals > 0) {
        notifications.push({
          id: "live-canteen-meals",
          title: "Pending Meal Orders",
          message: `There are ${pendingMeals} pending meal order${pendingMeals > 1 ? "s" : ""} to prepare.`,
          link: "/dashboard/canteen",
          time: new Date(),
          type: "INFO",
          module: "CANTEEN",
          isPersistent: false,
        })
      }
    }

    // 8. NURSE / SUPER_ADMIN: Active IPD Patients & Pending Prescriptions
    if (role === Role.NURSE || role === Role.SUPER_ADMIN) {
      const activeAdmissions = await prisma.iPDAdmission.count({
        where: { status: "ADMITTED" },
      })
      if (activeAdmissions > 0) {
        notifications.push({
          id: "live-nurse-admissions",
          title: "Active IPD Patients",
          message: `${activeAdmissions} patient${activeAdmissions > 1 ? "s" : ""} currently admitted in IPD.`,
          link: "/dashboard/ipd",
          time: new Date(),
          type: "INFO",
          module: "IPD",
          isPersistent: false,
        })
      }

      // Pending pharmacy dispensals for IPD
      const pendingDispensals = await prisma.iPDPrescription.count({
        where: { status: "ACTIVE", pharmacyStatus: "PENDING" },
      })
      if (pendingDispensals > 0) {
        notifications.push({
          id: "live-nurse-meds",
          title: "Medications Pending Dispensal",
          message: `${pendingDispensals} IPD prescription${pendingDispensals > 1 ? "s" : ""} awaiting pharmacy dispensal.`,
          link: "/dashboard/ipd",
          time: new Date(),
          type: "WARNING",
          module: "IPD",
          isPersistent: false,
        })
      }
    }
  } catch (error) {
    console.error("[NOTIFICATIONS] Error computing live insights:", error)
  }

  // Sort: persistent (event) notifications first by time, then live insights
  // Within each group, sort by severity (ERROR > WARNING > INFO > SUCCESS)
  const typeWeight: Record<string, number> = { ERROR: 3, WARNING: 2, INFO: 1, SUCCESS: 0 }
  return notifications.sort((a, b) => {
    // Persistent notifications come first
    if (a.isPersistent && !b.isPersistent) return -1
    if (!a.isPersistent && b.isPersistent) return 1
    // Then by severity
    return (typeWeight[b.type] || 0) - (typeWeight[a.type] || 0)
  })
}

/**
 * Mark a specific notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const session = await auth()
  if (!session?.user?.email) return

  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    })
  } catch (error) {
    console.error("[NOTIFICATIONS] Failed to mark notification as read:", error)
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead() {
  const session = await auth()
  if (!session?.user?.email) return

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) return

  try {
    await prisma.notification.updateMany({
      where: {
        OR: [
          { targetUserId: user.id },
          { targetRole: user.role },
        ],
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    })
  } catch (error) {
    console.error("[NOTIFICATIONS] Failed to mark all as read:", error)
  }
}
