import fs from "fs"
import path from "path"

export interface LocalSyncMetadata {
  lastUpdated: string
  lastFullSync?: string
  totalChangesRecorded: number
  models: Record<string, { count: number; lastModified: string; fileSize: number }>
}

export interface ChangelogEntry {
  timestamp: string
  model: string
  operation: string
  recordId?: string
  data?: any
}

export class LocalDatabaseStore {
  private baseDir: string
  private tablesDir: string
  private changelogDir: string
  private metadataDir: string
  private backupsDir: string
  private metadataPath: string
  private metadata: LocalSyncMetadata

  // In-memory debounce queue for table writes to prevent disk thrashing
  private writeQueues = new Map<string, Map<string, any>>()
  private flushTimers = new Map<string, NodeJS.Timeout>()
  private isFlushing = false

  constructor() {
    this.baseDir = process.env.LOCAL_DB_DIR || path.join(process.cwd(), "local_database")
    this.tablesDir = path.join(this.baseDir, "tables")
    this.changelogDir = path.join(this.baseDir, "changelog")
    this.metadataDir = path.join(this.baseDir, "metadata")
    this.backupsDir = path.join(this.baseDir, "backups")
    this.metadataPath = path.join(this.metadataDir, "sync-info.json")

    this.ensureDirectories()
    this.metadata = this.loadMetadata()
  }

  private ensureDirectories() {
    try {
      if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true })
      if (!fs.existsSync(this.tablesDir)) fs.mkdirSync(this.tablesDir, { recursive: true })
      if (!fs.existsSync(this.changelogDir)) fs.mkdirSync(this.changelogDir, { recursive: true })
      if (!fs.existsSync(this.metadataDir)) fs.mkdirSync(this.metadataDir, { recursive: true })
      if (!fs.existsSync(this.backupsDir)) fs.mkdirSync(this.backupsDir, { recursive: true })
    } catch (err) {
      console.error("[LocalDatabaseStore] Error creating directories:", err)
    }
  }

  private loadMetadata(): LocalSyncMetadata {
    try {
      if (fs.existsSync(this.metadataPath)) {
        const raw = fs.readFileSync(this.metadataPath, "utf-8")
        return JSON.parse(raw)
      }
    } catch (e) {
      // Ignore and use default
    }
    return {
      lastUpdated: new Date().toISOString(),
      totalChangesRecorded: 0,
      models: {},
    }
  }

  private saveMetadata() {
    try {
      this.metadata.lastUpdated = new Date().toISOString()
      fs.writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2), "utf-8")
    } catch (err) {
      console.error("[LocalDatabaseStore] Failed to save metadata:", err)
    }
  }

  /**
   * Append an event to the daily changelog file (JSONL format)
   */
  public appendToChangelog(entry: ChangelogEntry) {
    try {
      const today = new Date().toISOString().split("T")[0]
      const changelogPath = path.join(this.changelogDir, `${today}.jsonl`)
      const line = JSON.stringify(entry) + "\n"
      fs.appendFileSync(changelogPath, line, "utf-8")
      this.metadata.totalChangesRecorded = (this.metadata.totalChangesRecorded || 0) + 1
    } catch (err) {
      console.error("[LocalDatabaseStore] Failed to append changelog:", err)
    }
  }

  /**
   * Record a single live change from Prisma write operations
   */
  public recordChange(model: string, operation: string, resultData: any, inputArgs?: any) {
    try {
      // 1. Append to changelog
      const recordId = resultData?.id || inputArgs?.where?.id || undefined
      this.appendToChangelog({
        timestamp: new Date().toISOString(),
        model,
        operation,
        recordId,
        data: resultData || inputArgs?.data || inputArgs,
      })

      // 2. Queue table snapshot update
      this.queueTableUpdate(model, operation, resultData, inputArgs)
    } catch (err) {
      // Never let local backup errors bubble up to break application requests
      console.warn(`[LocalDatabaseStore] Error recording change for ${model}:`, err)
    }
  }

  /**
   * Queue updates to the model's table JSON file with debounced disk write
   */
  private queueTableUpdate(model: string, operation: string, resultData: any, inputArgs?: any) {
    let queue = this.writeQueues.get(model)
    if (!queue) {
      queue = new Map<string, any>()
      this.writeQueues.set(model, queue)
    }

    if (operation === "delete" || operation === "deleteMany") {
      const id = resultData?.id || inputArgs?.where?.id
      if (id) {
        queue.set(id, { _deleted: true, id })
      }
    } else if (Array.isArray(resultData)) {
      for (const item of resultData) {
        if (item && item.id) queue.set(item.id, item)
      }
    } else if (resultData && typeof resultData === "object") {
      const id = resultData.id || inputArgs?.where?.id || (inputArgs?.data && inputArgs.data.id)
      if (id) {
        queue.set(id, { ...(inputArgs?.data || {}), ...resultData, id })
      }
    }

    // Debounce flush by 500ms
    const existingTimer = this.flushTimers.get(model)
    if (existingTimer) clearTimeout(existingTimer)

    const timer = setTimeout(() => {
      this.flushModelQueue(model)
    }, 500)
    this.flushTimers.set(model, timer)
  }

  /**
   * Flush queued changes for a specific model to its table JSON file
   */
  public flushModelQueue(model: string) {
    const queue = this.writeQueues.get(model)
    if (!queue || queue.size === 0) return

    const filePath = path.join(this.tablesDir, `${model}.json`)
    let existingRecords: Record<string, any> = {}

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8")
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.id) existingRecords[item.id] = item
          }
        } else if (typeof parsed === "object") {
          existingRecords = parsed
        }
      }

      // Apply queued mutations
      for (const [id, item] of queue.entries()) {
        if (item._deleted) {
          delete existingRecords[id]
        } else {
          existingRecords[id] = { ...(existingRecords[id] || {}), ...item }
        }
      }

      // Convert to array and save
      const recordArray = Object.values(existingRecords)
      fs.writeFileSync(filePath, JSON.stringify(recordArray, null, 2), "utf-8")

      // Update metadata
      const stats = fs.statSync(filePath)
      this.metadata.models[model] = {
        count: recordArray.length,
        lastModified: new Date().toISOString(),
        fileSize: stats.size,
      }
      this.saveMetadata()

      // Clear processed queue
      queue.clear()
    } catch (err) {
      console.error(`[LocalDatabaseStore] Error flushing ${model} to disk:`, err)
    }
  }

  /**
   * Save a full table dump (used during full sync)
   */
  public saveFullTable(model: string, records: any[]) {
    try {
      this.ensureDirectories()
      const filePath = path.join(this.tablesDir, `${model}.json`)
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf-8")

      const stats = fs.statSync(filePath)
      this.metadata.models[model] = {
        count: records.length,
        lastModified: new Date().toISOString(),
        fileSize: stats.size,
      }
      this.saveMetadata()
    } catch (err) {
      console.error(`[LocalDatabaseStore] Error saving full table for ${model}:`, err)
      throw err
    }
  }

  /**
   * Read all records stored locally for a model
   */
  public getLocalModelRecords(model: string): any[] {
    try {
      const filePath = path.join(this.tablesDir, `${model}.json`)
      if (!fs.existsSync(filePath)) return []
      const raw = fs.readFileSync(filePath, "utf-8")
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : Object.values(parsed)
    } catch (err) {
      console.error(`[LocalDatabaseStore] Error reading local records for ${model}:`, err)
      return []
    }
  }

  /**
   * Get list of all models saved locally
   */
  public getSavedModels(): string[] {
    try {
      this.ensureDirectories()
      return fs.readdirSync(this.tablesDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(/\.json$/, ""))
    } catch (e) {
      return []
    }
  }

  /**
   * Get overall status summary
   */
  public getStatus() {
    this.ensureDirectories()
    const savedModels = this.getSavedModels()
    let totalRecords = 0
    let totalSize = 0

    const modelSummaries = savedModels.map((m) => {
      const filePath = path.join(this.tablesDir, `${m}.json`)
      let count = 0
      let size = 0
      try {
        const stats = fs.statSync(filePath)
        size = stats.size
        count = this.metadata.models[m]?.count ?? 0
        if (count === 0 && size > 2) {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"))
          count = Array.isArray(content) ? content.length : Object.keys(content).length
        }
      } catch (e) {}
      totalRecords += count
      totalSize += size
      return {
        model: m,
        count,
        fileSize: size,
        lastModified: this.metadata.models[m]?.lastModified || null,
      }
    })

    return {
      baseDir: this.baseDir,
      totalModels: savedModels.length,
      totalRecords,
      totalSizeInBytes: totalSize,
      totalSizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
      lastUpdated: this.metadata.lastUpdated,
      lastFullSync: this.metadata.lastFullSync || null,
      totalChangesRecorded: this.metadata.totalChangesRecorded || 0,
      models: modelSummaries,
    }
  }

  /**
   * Create a timestamped backup archive of the current local database
   */
  public createLocalArchive(): { backupPath: string; timestamp: string } {
    this.ensureDirectories()
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupDir = path.join(this.backupsDir, `backup-${timestamp}`)
    fs.mkdirSync(backupDir, { recursive: true })

    const models = this.getSavedModels()
    for (const m of models) {
      const src = path.join(this.tablesDir, `${m}.json`)
      const dest = path.join(backupDir, `${m}.json`)
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest)
      }
    }

    if (fs.existsSync(this.metadataPath)) {
      fs.copyFileSync(this.metadataPath, path.join(backupDir, "sync-info.json"))
    }

    return { backupPath: backupDir, timestamp }
  }

  public setLastFullSyncTime() {
    this.metadata.lastFullSync = new Date().toISOString()
    this.saveMetadata()
  }
}

// Global singleton instance
export const localStore = new LocalDatabaseStore()

