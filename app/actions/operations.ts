"use server"

import { prisma } from "@/lib/prisma"

export async function getPatientSurgeries(patientId: string) {
  try {
    const surgeries = await prisma.surgery.findMany({
      where: { patientId },
      include: {
        theater: {
          select: { name: true, type: true }
        },
        leadSurgeon: {
          include: { user: { select: { name: true } } }
        },
        staffAssignments: {
          select: { id: true, role: true }
        }
      },
      orderBy: { scheduledDate: "desc" }
    })

    return surgeries.map((s) => ({
      ...s,
      scheduledDate: s.scheduledDate.toISOString(),
      actualStartTime: s.actualStartTime?.toISOString() || null,
      actualEndTime: s.actualEndTime?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      pacCheckedAt: s.pacCheckedAt?.toISOString() || null,
    }))
  } catch (error) {
    console.error("Error fetching patient surgeries:", error)
    return []
  }
}
