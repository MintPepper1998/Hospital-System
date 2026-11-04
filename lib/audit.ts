import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "LOGIN" | "LOGOUT" | "PROCESS"

interface AuditEntry {
  userId: string
  action: AuditAction
  module: string
  recordId?: string
  changes?: Record<string, unknown>
}

/**
 * Fire-and-forget audit log writer. Does not throw on failure so it
 * never breaks the calling action — audit failures are logged to stderr.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    // Guard: skip if no userId provided
    if (!entry.userId) {
      console.warn("[AUDIT] Skipped: no userId provided for", entry.module, entry.action)
      return
    }

    // Verify the user exists to avoid FK constraint violation
    const userExists = await prisma.user.findUnique({
      where: { id: entry.userId },
      select: { id: true },
    })
    if (!userExists) {
      console.warn("[AUDIT] Skipped: userId", entry.userId, "not found in users table")
      return
    }

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        module: entry.module,
        recordId: entry.recordId ?? null,
        changes: entry.changes
          ? (entry.changes as Prisma.InputJsonValue)
          : Prisma.DbNull,
        timestamp: new Date(),
      },
    })
  } catch (err) {
    console.error("[AUDIT] Failed to write audit log:", err instanceof Error ? err.message : err)
  }
}
