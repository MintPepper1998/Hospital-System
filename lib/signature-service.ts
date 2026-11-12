import sharp from "sharp"
import fs from "fs"
import path from "path"

export interface ProcessedSignature {
  buffer: Buffer
  dataUrl: string
  width: number
  height: number
  fileUrl: string
}

// Target bounds for professional digital signatures in medical/ERP records
export const SIGNATURE_MAX_WIDTH = 450
export const SIGNATURE_MAX_HEIGHT = 150

/**
 * Reforms any uploaded image (any format, any resolution, any aspect ratio)
 * into a standardized, high-quality professional PNG signature.
 * 
 * - Trims extraneous whitespace/borders automatically
 * - Retains proportional aspect ratio while fitting into 450x150
 * - Optimizes as a crisp, lossless PNG
 */
export async function reformSignatureImage(inputBuffer: Buffer): Promise<{
  buffer: Buffer
  dataUrl: string
  width: number
  height: number
}> {
  // Step 1: Base sharp instance with EXIF rotation
  let pipeline = sharp(inputBuffer, { failOnError: false }).rotate()

  // Step 2: Attempt auto-trimming of surrounding blank margins
  try {
    const trimmedBuffer = await pipeline.trim().toBuffer()
    pipeline = sharp(trimmedBuffer)
  } catch {
    // If trimming is not applicable (e.g. edge-to-edge transparent), proceed with original
  }

  // Step 3: Resize within standard signature bounding box (450px x 150px)
  const resizedBuffer = await pipeline
    .resize({
      width: SIGNATURE_MAX_WIDTH,
      height: SIGNATURE_MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png({
      quality: 95,
      compressionLevel: 9,
      effort: 7,
    })
    .toBuffer()

  const metadata = await sharp(resizedBuffer).metadata()
  const base64 = resizedBuffer.toString("base64")
  const dataUrl = `data:image/png;base64,${base64}`

  return {
    buffer: resizedBuffer,
    dataUrl,
    width: metadata.width || SIGNATURE_MAX_WIDTH,
    height: metadata.height || SIGNATURE_MAX_HEIGHT,
  }
}

/**
 * Persists the signature both to server disk storage (public/uploads/signatures)
 * and returns the permanent Data URL for PostgreSQL persistence.
 * 
 * Storing the dataUrl in Postgres guarantees the signature is permanent and
 * can NEVER be deleted by server reboots or container redeployments.
 */
export async function saveSignatureToStorage(options: {
  buffer: Buffer
  dataUrl: string
  identifier: string
}): Promise<{ fileUrl: string; permanentDataUrl: string }> {
  const { buffer, dataUrl, identifier } = options

  const safeId = identifier.replace(/[^a-zA-Z0-9_-]/g, "_")
  const fileName = `sig-${safeId}-${Date.now()}.png`

  let fileUrl = `/uploads/signatures/${fileName}`

  // Safe local disk storage (works in local dev / non-serverless; caught gracefully on read-only serverless/Amplify)
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "signatures")
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const filePath = path.join(uploadsDir, fileName)
    await fs.promises.writeFile(filePath, buffer)
  } catch (diskErr) {
    console.warn("[WARN] Could not write signature to local disk (expected on read-only serverless/Amplify):", diskErr)
  }

  // Safe S3 storage if AWS S3 bucket is configured
  const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME
  if (bucket) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")
      const region = process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1"
      const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || ""
      const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || ""
      if (accessKeyId && secretAccessKey) {
        const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
        const s3Key = `signatures/${fileName}`
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: "image/png",
          })
        )
        fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`
      }
    } catch (s3Err) {
      console.warn("[WARN] Could not upload signature to S3:", s3Err)
    }
  }

  return {
    fileUrl,
    permanentDataUrl: dataUrl,
  }
}

/**
 * Deletes any existing local signature file from disk.
 */
export async function deleteSignatureFile(urlOrPath: string | null | undefined): Promise<void> {
  if (!urlOrPath) return
  if (urlOrPath.startsWith("data:")) return // Base64 in DB, no file on disk

  try {
    let relPath = urlOrPath
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      const parsed = new URL(urlOrPath)
      relPath = parsed.pathname
    }

    if (relPath.startsWith("/uploads/signatures/")) {
      const diskPath = path.join(process.cwd(), "public", relPath.replace(/^\//, ""))
      if (fs.existsSync(diskPath)) {
        await fs.promises.unlink(diskPath)
      }
    }
  } catch (err) {
    console.warn("[WARN] Could not delete signature file from disk:", err)
  }
}

