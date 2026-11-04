import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSecureUrl } from "@/lib/s3-server"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const fileUrl = request.nextUrl.searchParams.get("fileUrl")
  if (!fileUrl) {
    return NextResponse.json({ error: "fileUrl parameter is required" }, { status: 400 })
  }

  const signedUrl = await getSecureUrl(fileUrl)
  if (!signedUrl) {
    return NextResponse.json({ error: "Unable to generate signed URL" }, { status: 404 })
  }

  return NextResponse.redirect(signedUrl)
}
