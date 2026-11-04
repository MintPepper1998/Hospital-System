"use server"

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"

// Resolve env vars — S3_ prefix for Amplify, AWS_ fallback for local dev
const S3_REGION = process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1"
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || ""
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || ""
const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || ""

// S3 Client Configuration
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
})

// Allowed file types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"]
const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, "application/pdf"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

/**
 * Generate a presigned URL for uploading a file directly to S3 from the browser.
 * 
 * @param fileName - Original file name
 * @param fileType - MIME type of the file
 * @param folder  - S3 folder prefix (e.g., "profile-photos", "aadhar-cards", "documents")
 * @returns Presigned PUT URL + the final S3 key
 */
export async function getPresignedUrl(
  fileName: string,
  fileType: string,
  folder: string = "uploads"
): Promise<{ url: string; key: string; publicUrl: string }> {
  await requireAuth()

  // Validate file type
  if (!ALLOWED_DOCUMENT_TYPES.includes(fileType)) {
    throw new Error(
      `Invalid file type: ${fileType}. Allowed: ${ALLOWED_DOCUMENT_TYPES.join(", ")}`
    )
  }

  // Sanitize filename and make unique
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
  const uniqueId = crypto.randomUUID()
  const key = `${folder}/${uniqueId}-${sanitizedName}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  })

  // Generate actual S3 presigned URL
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

  // Construct the public URL (assumes bucket has public read or CloudFront)
  const publicUrl = `https://${BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${key}`

  return { url, key, publicUrl }
}

/**
 * Delete a file from S3 by its key.
 */
export async function deleteS3File(key: string): Promise<void> {
  await requireAuth()

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })
  await s3Client.send(command)
}

/**
 * Update patient profile fields with uploaded file URLs.
 * Called after successful S3 uploads during admission.
 */
export async function updatePatientFiles(
  patientId: string,
  data: {
    profilePhotoUrl?: string
    aadharNumber?: string
    aadharCardUrl?: string
    bskyNumber?: string
    bskyCardUrl?: string
    pastMedicalHistory?: string
  }
) {
  await requireAuth()

  const updateData: Record<string, string | undefined> = {}

  if (data.profilePhotoUrl) updateData.profilePhotoUrl = data.profilePhotoUrl
  if (data.aadharNumber) updateData.aadharNumber = data.aadharNumber
  if (data.aadharCardUrl) updateData.aadharCardUrl = data.aadharCardUrl
  if (data.bskyNumber) updateData.bskyNumber = data.bskyNumber
  if (data.bskyCardUrl) updateData.bskyCardUrl = data.bskyCardUrl
  if (data.pastMedicalHistory) updateData.pastMedicalHistory = data.pastMedicalHistory

  if (Object.keys(updateData).length === 0) return

  await prisma.patient.update({
    where: { id: patientId },
    data: updateData,
  })

  revalidatePath("/dashboard/ipd")
  revalidatePath("/dashboard/ipd/admission")
}

/**
 * Save a patient document record after successful S3 upload.
 */
export async function savePatientDocument(data: {
  patientId: string
  title: string
  fileUrl: string
  fileType: string
}) {
  await requireAuth()

  const doc = await prisma.patientDocument.create({
    data: {
      patientId: data.patientId,
      title: data.title,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
    },
  })

  revalidatePath("/dashboard/ipd")
  return doc
}
