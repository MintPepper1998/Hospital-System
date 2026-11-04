import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * GET /api/version
 * Returns the current application version from package.json.
 * Used by the UpdateSoftwareButton to display the current version.
 */
export async function GET() {
  try {
    const pkgPath = join(process.cwd(), "package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
    return NextResponse.json({
      version: pkg.version || "1.0.0",
      name: pkg.name || "hospital-erp",
    })
  } catch {
    return NextResponse.json({
      version: "1.0.0",
      name: "hospital-erp",
    })
  }
}
