"use server"

import { requireAuthSafe } from "@/lib/auth-guard"
import { localStore } from "@/lib/db-local/store"
import { syncDatabaseToLocal } from "@/lib/db-local/sync"
import { migrateDatabaseData, MigrationOptions, MigrationReport } from "@/lib/db-local/migration"
import { writeAuditLog } from "@/lib/audit"
import { prisma } from "@/lib/prisma"
import { getAllPrismaModelNames } from "@/lib/db-local/sync"

/**
 * Get the current status and statistics of local database storage
 */
export async function getLocalDatabaseStatus() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return { success: false, error: auth.error, data: null }
  }

  try {
    const status = localStore.getStatus()
    return { success: true, data: status }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err), data: null }
  }
}

/**
 * Trigger full sync from live database to local storage
 */
export async function syncDatabaseToLocalAction(models?: string[]) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return { success: false, error: auth.error, data: null }
  }

  try {
    const result = await syncDatabaseToLocal({ models })
    writeAuditLog({
      userId: auth.session.userId,
      action: "PROCESS",
      module: "DatabaseSync",
      changes: {
        operation: "SYNC_DB_TO_LOCAL",
        totalModels: result.totalModels,
        totalRecords: result.totalRecords,
      },
    })
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err), data: null }
  }
}

/**
 * Trigger data migration (local-to-db, db-to-db, or db-to-local)
 */
export async function migrateDatabaseDataAction(options: {
  source: "local" | "database" | string
  target: "local" | "database" | string
  models?: string[]
  batchSize?: number
  dryRun?: boolean
  truncateTarget?: boolean
}): Promise<{ success: boolean; report?: MigrationReport; error?: string }> {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return { success: false, error: auth.error }
  }

  try {
    const report = await migrateDatabaseData(options)
    writeAuditLog({
      userId: auth.session.userId,
      action: "PROCESS",
      module: "DatabaseMigration",
      changes: {
        source: options.source === "local" ? "local" : "database",
        target: options.target === "local" ? "local" : "database",
        isDryRun: options.dryRun || false,
        totalRecordsMigrated: report.totalRecordsMigrated,
      },
    })
    return { success: report.success, report, error: report.error }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) }
  }
}

/**
 * Create a point-in-time timestamped backup archive of local database data
 */
export async function createLocalDatabaseBackupAction() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return { success: false, error: auth.error, data: null }
  }

  try {
    const archive = localStore.createLocalArchive()
    writeAuditLog({
      userId: auth.session.userId,
      action: "PROCESS",
      module: "DatabaseBackup",
      changes: { backupPath: archive.backupPath, timestamp: archive.timestamp },
    })
    return { success: true, data: archive }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err), data: null }
  }
}

/**
 * Compare live database record counts vs local storage counts to verify integrity
 */
export async function verifyDatabaseSyncAction() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return { success: false, error: auth.error, data: null }
  }

  try {
    const allModels = getAllPrismaModelNames()
    const status = localStore.getStatus()
    const localMap = new Map(status.models.map((m) => [m.model, m.count]))

    const comparison: Array<{
      model: string
      databaseCount: number
      localCount: number
      diff: number
      isSynced: boolean
    }> = []

    for (const model of allModels) {
      const delegateName = model.charAt(0).toLowerCase() + model.slice(1)
      const delegate = (prisma as any)[delegateName]
      let dbCount = 0
      if (delegate && typeof delegate.count === "function") {
        try {
          dbCount = await delegate.count()
        } catch (e) {}
      }

      const localCount = localMap.get(model) || 0
      comparison.push({
        model,
        databaseCount: dbCount,
        localCount,
        diff: dbCount - localCount,
        isSynced: dbCount === localCount,
      })
    }

    const fullySynced = comparison.every((c) => c.isSynced)
    return { success: true, fullySynced, data: comparison }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err), data: null }
  }
}

