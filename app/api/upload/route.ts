import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Save to public/uploads/profiles
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "profiles")
    await fs.mkdir(uploadsDir, { recursive: true })

    // Use a unique name to avoid caching issues when updated
    const uniqueFileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadsDir, uniqueFileName)
    
    await fs.writeFile(filePath, buffer)
    
    // Return the local URL
    const url = `/uploads/profiles/${uniqueFileName}`
    
    return NextResponse.json({ success: true, url })
  } catch (error: any) {
    console.error("[UPLOAD_ERROR] Failed to upload via API route:", error)
    return NextResponse.json({ error: error.message || "Upload Failed" }, { status: 500 })
  }
}
