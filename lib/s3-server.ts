import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Resolve env vars — S3_ prefix for Amplify, AWS_ fallback for local dev
const S3_REGION = process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1"
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || ""
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || ""
const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || ""

// S3 Client — server-side only (never import this in client components)
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
})

const S3_HOSTNAME = `${BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com`

/**
 * Convert a raw S3 public URL into a time-limited signed URL.
 *
 * - If the URL is null/undefined/empty, returns null.
 * - If the URL does NOT belong to our S3 bucket, returns it unchanged.
 * - Otherwise, extracts the object key and returns a signed GET URL
 *   valid for 1 hour (3600 seconds).
 */
export async function getSecureUrl(
  fullUrl: string | null | undefined
): Promise<string | null> {
  if (!fullUrl) return null

  // Extract the key from the URL
  const key = extractKeyFromUrl(fullUrl)
  if (!key) {
    // Not our S3 URL — return as-is
    return fullUrl
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return signedUrl
}

/**
 * Sign multiple URLs in parallel for performance.
 */
export async function getSecureUrls(
  urls: (string | null | undefined)[]
): Promise<(string | null)[]> {
  return Promise.all(urls.map((url) => getSecureUrl(url)))
}

/**
 * Extract the S3 object key from a full URL.
 * Returns null if the URL is not from our bucket.
 *
 * Supports both formats:
 *   - Virtual-hosted: https://bucket.s3.region.amazonaws.com/key
 *   - Path-style:     https://s3.region.amazonaws.com/bucket/key
 */
function extractKeyFromUrl(fullUrl: string): string | null {
  try {
    const url = new URL(fullUrl)

    // Format 1: Virtual-hosted style — bucket.s3.region.amazonaws.com/key
    if (url.hostname === S3_HOSTNAME) {
      // pathname starts with "/" so we strip it
      return decodeURIComponent(url.pathname.slice(1))
    }

    // Also match without region in hostname (bucket.s3.amazonaws.com)
    if (url.hostname === `${BUCKET_NAME}.s3.amazonaws.com`) {
      return decodeURIComponent(url.pathname.slice(1))
    }

    // Format 2: Path-style — s3.region.amazonaws.com/bucket/key
    if (url.hostname === `s3.${S3_REGION}.amazonaws.com`) {
      const pathParts = url.pathname.split("/")
      // pathParts[0] is "", pathParts[1] is bucket, rest is the key
      if (pathParts[1] === BUCKET_NAME) {
        return decodeURIComponent(pathParts.slice(2).join("/"))
      }
    }

    // Not our bucket
    return null
  } catch {
    // Invalid URL
    return null
  }
}
