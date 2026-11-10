import { NextResponse } from "next/server"
import { requireAuthSafe } from "@/lib/auth-guard"
import { localStore } from "@/lib/db-local/store"
import { syncDatabaseToLocal } from "@/lib/db-local/sync"

// GET /api/admin/database/sync — Get local database status
export async function GET() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const status = localStore.getStatus()
    return NextResponse.json(status)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

// POST /api/admin/database/sync — Trigger database to local sync
export async function POST(request: Request) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const result = await syncDatabaseToLocal({
      models: body?.models,
      batchSize: body?.batchSize,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

