"use server"

import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

/**
 * Create a notification targeted at a specific role (broadcast)
 */
export async function createRoleNotification(data: {
  title: string
  message: string
  type?: string      // INFO, WARNING, ERROR, SUCCESS
  module: string     // IPD, PHARMACY, LAB, BILLING, AMBULANCE, CANTEEN, OT, CLINICAL
  link?: string
  referenceId?: string
  targetRole: Role
  createdById?: string
  createdByName?: string
}) {
  try {
    await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type || "INFO",
        module: data.module,
        link: data.link,
        referenceId: data.referenceId,
        targetRole: data.targetRole,
        createdById: data.createdById,
        createdByName: data.createdByName,
      },
    })
  } catch (error) {
    console.error("[NOTIFICATION] Failed to create role notification:", error)
  }
}

/**
 * Create a notification targeted at a specific user
 */
export async function createUserNotification(data: {
  title: string
  message: string
  type?: string
  module: string
  link?: string
  referenceId?: string
  targetUserId: string
  createdById?: string
  createdByName?: string
}) {
  try {
    await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type || "INFO",
        module: data.module,
        link: data.link,
        referenceId: data.referenceId,
        targetUserId: data.targetUserId,
        createdById: data.createdById,
        createdByName: data.createdByName,
      },
    })
  } catch (error) {
    console.error("[NOTIFICATION] Failed to create user notification:", error)
  }
}

/**
 * Create notifications targeted at multiple roles at once
 */
export async function createMultiRoleNotification(data: {
  title: string
  message: string
  type?: string
  module: string
  link?: string
  referenceId?: string
  targetRoles: Role[]
  createdById?: string
  createdByName?: string
}) {
  try {
    await prisma.notification.createMany({
      data: data.targetRoles.map((role) => ({
        title: data.title,
        message: data.message,
        type: data.type || "INFO",
        module: data.module,
        link: data.link,
        referenceId: data.referenceId,
        targetRole: role,
        createdById: data.createdById,
        createdByName: data.createdByName,
      })),
    })
  } catch (error) {
    console.error("[NOTIFICATION] Failed to create multi-role notification:", error)
  }
}

/**
 * Create a scheduled/reminder notification that appears after a delay.
 * @param delayMinutes - Number of minutes from now before the notification appears
 */
export async function createScheduledRoleNotification(data: {
  title: string
  message: string
  type?: string
  module: string
  link?: string
  referenceId?: string
  targetRoles: Role[]
  createdById?: string
  createdByName?: string
  delayMinutes: number
}) {
  try {
    const scheduledFor = new Date(Date.now() + data.delayMinutes * 60 * 1000)

    await prisma.notification.createMany({
      data: data.targetRoles.map((role) => ({
        title: data.title,
        message: data.message,
        type: data.type || "WARNING",
        module: data.module,
        link: data.link,
        referenceId: data.referenceId,
        targetRole: role,
        createdById: data.createdById,
        createdByName: data.createdByName,
        scheduledFor,
      })),
    })
  } catch (error) {
    console.error("[NOTIFICATION] Failed to create scheduled notification:", error)
  }
}
