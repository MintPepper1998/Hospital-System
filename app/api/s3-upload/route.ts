import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const key = url.searchParams.get("key")
  if (!key) return NextResponse.json({ error: "Missing key parameter" }, { status: 400 })
  
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract folder from key (e.g. "aadhar-cards/123-abc.jpg" -> "aadhar-cards")
    const folder = key.includes("/") ? key.split("/")[0] : "misc"
    const fileName = path.basename(key)

    // Ensure the directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", folder)
    await fs.mkdir(uploadsDir, { recursive: true })

    // Save locally
    const filePath = path.join(uploadsDir, fileName)
    await fs.writeFile(filePath, buffer)
    
    // We return the local path instead of S3.
    const localUrl = `/uploads/${folder}/${fileName}`
    
    return NextResponse.json({ success: true, localUrl })
  } catch (error: any) {
    console.error("[UPLOAD_ERROR] Failed to upload via API route:", error)
    return NextResponse.json({ error: error.message || "Upload Failed" }, { status: 500 })
  }
}
