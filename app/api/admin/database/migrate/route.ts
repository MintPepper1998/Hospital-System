import { NextResponse } from "next/server"
import { requireAuthSafe } from "@/lib/auth-guard"
import { migrateDatabaseData } from "@/lib/db-local/migration"

// POST /api/admin/database/migrate — Trigger database migration
export async function POST(request: Request) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    if (!body?.source || !body?.target) {
      return NextResponse.json(
        { error: "Both 'source' and 'target' are required (e.g. 'local', 'database', or a connection string)" },
        { status: 400 }
      )
    }

    const report = await migrateDatabaseData({
      source: body.source,
      target: body.target,
      models: body.models,
      batchSize: body.batchSize,
      dryRun: !!body.dryRun,
      truncateTarget: !!body.truncateTarget,
    })

    return NextResponse.json(report)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

