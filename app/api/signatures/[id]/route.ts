import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return new NextResponse("Signature ID required", { status: 400 })
    }

    // Try finding by staffId, userId, or employeeId
    const staff = await prisma.staff.findFirst({
      where: {
        OR: [{ id }, { userId: id }, { employeeId: id }],
      },
      select: { signatureUrl: true, id: true, userId: true },
    })

    let sig = staff?.signatureUrl

    if (!sig) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { signatureUrl: true },
      })
      sig = user?.signatureUrl
    }

    if (!sig) {
      return new NextResponse("Signature not found", { status: 404 })
    }

    // If stored as Data URL (base64)
    if (sig.startsWith("data:image/")) {
      const matches = sig.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        const mimeType = matches[1]
        const buffer = Buffer.from(matches[2], "base64")

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      }
    }

    // If stored as local file path
    if (sig.startsWith("/uploads/signatures/")) {
      const diskPath = path.join(process.cwd(), "public", sig.replace(/^\//, ""))
      if (fs.existsSync(diskPath)) {
        const buffer = await fs.promises.readFile(diskPath)
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      }
    }

    // If external URL, redirect
    return NextResponse.redirect(sig)
  } catch (error: any) {
    console.error("[ERROR] Failed to serve signature:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

