import "dotenv/config"
import { migrateDatabaseData, MigrationOptions } from "../lib/db-local/migration"

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    source: "local",
    target: "database",
    dryRun: false,
  }

  for (const arg of args) {
    if (arg.startsWith("--source=")) {
      options.source = arg.replace("--source=", "").trim()
    } else if (arg.startsWith("--target=")) {
      options.target = arg.replace("--target=", "").trim()
    } else if (arg === "--dry-run") {
      options.dryRun = true
    } else if (arg === "--truncate") {
      options.truncateTarget = true
    } else if (arg.startsWith("--models=")) {
      options.models = arg.replace("--models=", "").split(",").map((s) => s.trim())
    } else if (arg.startsWith("--batch-size=")) {
      options.batchSize = parseInt(arg.replace("--batch-size=", ""), 10) || 200
    }
  }

  return options
}

async function main() {
  const options = parseArgs()

  console.log("==========================================")
  console.log("       DATABASE DATA MIGRATION TOOL       ")
  console.log("==========================================")
  console.log(`Source: ${options.source}`)
  console.log(`Target: ${options.target}`)
  console.log(`Dry Run: ${options.dryRun ? "YES (Preview Only)" : "NO (Live Insertion)"}`)
  console.log(`Truncate Target: ${options.truncateTarget ? "YES" : "NO"}`)
  if (options.models) {
    console.log(`Selected Models: ${options.models.join(", ")}`)
  }
  console.log("==========================================\n")

  const report = await migrateDatabaseData({
    ...options,
    onProgress: (p) => {
      console.log(`[${p.current}/${p.total}] ${p.model}: ${p.recordsProcessed} records (${p.status})`)
    },
  })

  console.log("\n==========================================")
  console.log("           MIGRATION SUMMARY              ")
  console.log("==========================================")
  console.log(`Success: ${report.success ? "YES" : "NO"}`)
  console.log(`Total Models Processed: ${report.totalModelsProcessed}`)
  console.log(`Total Records Migrated: ${report.totalRecordsMigrated}`)
  console.log(`Duration: ${(report.durationMs / 1000).toFixed(2)}s`)

  console.log("\nModel Results:")
  const summaryTable = Object.entries(report.results).map(([model, res]) => ({
    Model: model,
    "Source Count": res.sourceCount,
    "Target Migrated": res.targetCount,
    Status: res.status,
    Error: res.error || "-",
  }))
  console.table(summaryTable)

  if (!report.success && report.error) {
    console.error("\nMigration Error:", report.error)
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error("Migration execution failed:", err)
  process.exit(1)
})

