import "dotenv/config"
import { localStore } from "../lib/db-local/store"
import { syncDatabaseToLocal } from "../lib/db-local/sync"

async function main() {
  const args = process.argv.slice(2)
  const isStatusOnly = args.includes("--status")
  const isBackupOnly = args.includes("--backup")

  if (isStatusOnly) {
    console.log("=== LOCAL DATABASE STORAGE STATUS ===")
    const status = localStore.getStatus()
    console.log(`Directory: ${status.baseDir}`)
    console.log(`Total Models: ${status.totalModels}`)
    console.log(`Total Records: ${status.totalRecords.toLocaleString()}`)
    console.log(`Total Size: ${status.totalSizeFormatted}`)
    console.log(`Last Updated: ${status.lastUpdated}`)
    console.log(`Last Full Sync: ${status.lastFullSync || "Never"}`)
    console.log(`Total Changes Recorded: ${status.totalChangesRecorded}`)
    console.log("\nModels Breakdown:")
    console.table(
      status.models.map((m) => ({
        Model: m.model,
        Records: m.count,
        Size: `${(m.fileSize / 1024).toFixed(1)} KB`,
        "Last Modified": m.lastModified ? m.lastModified.split("T")[0] : "-",
      }))
    )
    process.exit(0)
  }

  if (isBackupOnly) {
    console.log("Creating local database archive...")
    const archive = localStore.createLocalArchive()
    console.log(`Backup created successfully at: ${archive.backupPath}`)
    process.exit(0)
  }

  console.log("=== STARTING FULL DATABASE SYNC TO LOCAL ===")
  const result = await syncDatabaseToLocal({
    onProgress: (p) => {
      console.log(`[${p.current}/${p.total}] Synced ${p.model}: ${p.recordsInModel} records`)
    },
  })

  console.log("\n=== SYNC COMPLETE ===")
  console.log(`Total Models Synced: ${result.totalModels}`)
  console.log(`Total Records: ${result.totalRecords}`)
  console.log(`Duration: ${(result.durationMs / 1000).toFixed(2)}s`)
  process.exit(0)
}

main().catch((err) => {
  console.error("Sync failed:", err)
  process.exit(1)
})

