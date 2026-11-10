import { NextResponse } from "next/server"
import { requireAuthSafe } from "@/lib/auth-guard"
import { localStore } from "@/lib/db-local/store"
import fs from "fs"
import path from "path"

// GET /api/admin/database/backup — List backup archives
export async function GET() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const backupsDir = path.join(process.cwd(), "local_database", "backups")
    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] })
    }

    const entries = fs.readdirSync(backupsDir, { withFileTypes: true })
    const backups = entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const dirPath = path.join(backupsDir, e.name)
        const stats = fs.statSync(dirPath)
        const files = fs.readdirSync(dirPath)
        return {
          name: e.name,
          createdAt: stats.birthtime.toISOString(),
          tablesCount: files.filter((f) => f.endsWith(".json")).length,
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return NextResponse.json({ backups })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

// POST /api/admin/database/backup — Create new point-in-time backup archive
export async function POST() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const archive = localStore.createLocalArchive()
    return NextResponse.json({ success: true, ...archive })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

