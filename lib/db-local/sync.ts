import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { localStore } from "./store"

export interface SyncOptions {
  models?: string[]
  batchSize?: number
  onProgress?: (progress: {
    model: string
    current: number
    total: number
    recordsInModel: number
  }) => void
}

export interface SyncResult {
  success: boolean
  totalModels: number
  totalRecords: number
  durationMs: number
  models: Record<string, number>
  error?: string
}

/**
 * Returns model names sorted in safe dependency order
 */
export function getAllPrismaModelNames(): string[] {
  try {
    return Prisma.dmmf.datamodel.models.map((m) => m.name)
  } catch (e) {
    return []
  }
}

/**
 * Pulls all records from the database and saves them to the local database store
 */
export async function syncDatabaseToLocal(options: SyncOptions = {}): Promise<SyncResult> {
  const startTime = Date.now()
  const allModels = getAllPrismaModelNames()
  const targetModels = options.models && options.models.length > 0
    ? options.models.filter((m) => allModels.includes(m))
    : allModels

  const batchSize = options.batchSize || 1000
  const modelStats: Record<string, number> = {}
  let totalRecords = 0

  console.log(`[LocalDBSync] Starting full database sync to local (${targetModels.length} models)...`)

  for (let i = 0; i < targetModels.length; i++) {
    const modelName = targetModels[i]
    // Prisma delegates use lowerCamelCase: User -> user, IPDAdmission -> iPDAdmission, etc.
    const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1)
    const delegate = (prisma as any)[delegateName]

    if (!delegate || typeof delegate.findMany !== "function") {
      console.warn(`[LocalDBSync] No delegate found on prisma client for ${modelName} (${delegateName})`)
      continue
    }

    try {
      // Count total records in this model
      const count = typeof delegate.count === "function" ? await delegate.count() : 0
      const records: any[] = []

      if (count > 0) {
        let skip = 0
        while (skip < count) {
          const chunk = await delegate.findMany({
            skip,
            take: batchSize,
          })
          records.push(...chunk)
          skip += chunk.length
          if (chunk.length === 0) break
        }
      }

      // Save to local store
      localStore.saveFullTable(modelName, records)
      modelStats[modelName] = records.length
      totalRecords += records.length

      if (options.onProgress) {
        options.onProgress({
          model: modelName,
          current: i + 1,
          total: targetModels.length,
          recordsInModel: records.length,
        })
      }
    } catch (err: any) {
      console.error(`[LocalDBSync] Error syncing model ${modelName}:`, err?.message || err)
      modelStats[modelName] = -1 // indicates error
    }
  }

  localStore.setLastFullSyncTime()
  const durationMs = Date.now() - startTime

  console.log(`[LocalDBSync] Completed sync: ${totalRecords} records across ${targetModels.length} models in ${(durationMs / 1000).toFixed(2)}s`)

  return {
    success: true,
    totalModels: targetModels.length,
    totalRecords,
    durationMs,
    models: modelStats,
  }
}

