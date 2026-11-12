"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import {
  reformSignatureImage,
  saveSignatureToStorage,
  deleteSignatureFile,
} from "@/lib/signature-service"

export interface SignatureActionResponse {
  success: boolean
  message: string
  signatureUrl?: string
}

/**
 * Uploads an employee/user signature from any image format and resolution,
 * reforms it into a standardized professional PNG (max 450x150, trimmed, optimized),
 * stores it permanently in PostgreSQL and on server disk, and updates the profile.
 */
export async function uploadSignature(formData: FormData): Promise<SignatureActionResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, message: "You must be logged in to perform this action." }
  }

  const file = formData.get("file") as File | null
  const staffId = (formData.get("staffId") as string) || undefined
  const targetUserId = (formData.get("userId") as string) || undefined

  if (!file) {
    return { success: false, message: "No file was selected for upload." }
  }

  // Authorization: users can upload their own signature; admins & doctors can upload for any staff
  const isSelf = (!staffId && !targetUserId) || targetUserId === session.user.id
  if (!isSelf) {
    const isSuperAdmin =
      session.user.role === "SUPER_ADMIN" ||
      session.user.role === "ADMIN" ||
      session.user.role === "DOCTOR"
    if (!isSuperAdmin) {
      // Check if this staffId belongs to this user
      if (staffId) {
        const staffRec = await prisma.staff.findUnique({
          where: { id: staffId },
          select: { userId: true },
        })
        if (staffRec?.userId !== session.user.id) {
          return { success: false, message: "Unauthorized. Admin or Doctor privileges required to manage staff signatures." }
        }
      } else {
        return { success: false, message: "Unauthorized to update this user's signature." }
      }
    }
  }

  try {
    // Validate file is an image
    if (!file.type.startsWith("image/") && !file.name.match(/\.(png|jpe?g|webp|gif|svg|bmp|tiff|heic)$/i)) {
      return { success: false, message: "Invalid file format. Please upload an image file (PNG, JPG, WEBP, GIF, SVG, BMP)." }
    }

    const arrayBuffer = await file.arrayBuffer()
    const rawBuffer = Buffer.from(arrayBuffer)

    if (rawBuffer.length === 0) {
      return { success: false, message: "The selected file is empty." }
    }

    // Standardize and reform to professional PNG (trimmed, max 450x150)
    const { buffer: reformedPngBuffer, dataUrl } = await reformSignatureImage(rawBuffer)

    // Determine target identifiers
    let resolvedStaffId = staffId
    let resolvedUserId = targetUserId

    if (resolvedStaffId && !resolvedUserId) {
      const staffMember = await prisma.staff.findUnique({
        where: { id: resolvedStaffId },
        select: { userId: true, signatureUrl: true },
      })
      if (staffMember) {
        resolvedUserId = staffMember.userId
        // Delete previous disk file if present
        if (staffMember.signatureUrl) {
          await deleteSignatureFile(staffMember.signatureUrl)
        }
      }
    } else if (resolvedUserId && !resolvedStaffId) {
      const userMember = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { signatureUrl: true, staff: { select: { id: true } } },
      })
      if (userMember) {
        resolvedStaffId = userMember.staff?.id
        if (userMember.signatureUrl) {
          await deleteSignatureFile(userMember.signatureUrl)
        }
      }
    } else if (!resolvedStaffId && !resolvedUserId) {
      resolvedUserId = session.user.id
      const userMember = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { signatureUrl: true, staff: { select: { id: true } } },
      })
      resolvedStaffId = userMember?.staff?.id
      if (userMember?.signatureUrl) {
        await deleteSignatureFile(userMember.signatureUrl)
      }
    }

    const safeIdentifier = resolvedStaffId || resolvedUserId || session.user.id

    // Save to disk (for static serving) and get permanent dataUrl for DB
    const { fileUrl, permanentDataUrl } = await saveSignatureToStorage({
      buffer: reformedPngBuffer,
      dataUrl,
      identifier: safeIdentifier,
    })

    // Update in database (both Staff and User records where available)
    await prisma.$transaction(async (tx) => {
      if (resolvedStaffId) {
        await tx.staff.update({
          where: { id: resolvedStaffId },
          data: { signatureUrl: permanentDataUrl },
        })
      }

      if (resolvedUserId) {
        await tx.user.update({
          where: { id: resolvedUserId },
          data: { signatureUrl: permanentDataUrl },
        })

        // Also sync Employee payroll record if one exists
        const employeeRec = await tx.employee.findUnique({
          where: { userId: resolvedUserId },
        })
        if (employeeRec) {
          await tx.employee.update({
            where: { id: employeeRec.id },
            data: { signatureUrl: permanentDataUrl },
          })
        }
      }
    })

    writeAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      module: "EmployeeSignature",
      recordId: safeIdentifier,
      changes: {
        staffId: resolvedStaffId,
        userId: resolvedUserId,
        action: "SIGNATURE_UPLOADED",
        originalName: file.name,
      },
    })

    revalidatePath("/dashboard/profile")
    revalidatePath("/dashboard/hr/staff")
    revalidatePath("/dashboard/admin/users")
    revalidatePath("/dashboard/ipd/print/summary", "layout")
    revalidatePath("/dashboard/ipd/patient", "layout")

    return {
      success: true,
      message: "Signature successfully reformed to professional PNG and stored permanently.",
      signatureUrl: permanentDataUrl,
    }
  } catch (error: any) {
    console.error("[ERROR] uploadSignature:", error)
    return {
      success: false,
      message: error.message || "Failed to process and store signature.",
    }
  }
}

/**
 * Removes an employee's signature from the database and cleans up disk files.
 */
export async function removeSignature(params: {
  staffId?: string
  userId?: string
}): Promise<SignatureActionResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, message: "You must be logged in to perform this action." }
  }

  const { staffId, userId } = params

  const isSelf = (!staffId && !userId) || userId === session.user.id
  if (!isSelf) {
    const isSuperAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN"
    if (!isSuperAdmin) {
      if (staffId) {
        const staffRec = await prisma.staff.findUnique({
          where: { id: staffId },
          select: { userId: true },
        })
        if (staffRec?.userId !== session.user.id) {
          return { success: false, message: "Unauthorized to remove this staff signature." }
        }
      } else {
        return { success: false, message: "Unauthorized to remove this signature." }
      }
    }
  }

  try {
    let resolvedStaffId = staffId
    let resolvedUserId = userId
    let existingSigUrl: string | null = null

    if (resolvedStaffId) {
      const staffMember = await prisma.staff.findUnique({
        where: { id: resolvedStaffId },
        select: { userId: true, signatureUrl: true },
      })
      if (staffMember) {
        resolvedUserId = staffMember.userId
        existingSigUrl = staffMember.signatureUrl
      }
    } else if (resolvedUserId) {
      const userMember = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { signatureUrl: true, staff: { select: { id: true } } },
      })
      if (userMember) {
        resolvedStaffId = userMember.staff?.id
        existingSigUrl = userMember.signatureUrl
      }
    } else {
      resolvedUserId = session.user.id
      const userMember = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { signatureUrl: true, staff: { select: { id: true } } },
      })
      resolvedStaffId = userMember?.staff?.id
      existingSigUrl = userMember?.signatureUrl || null
    }

    if (existingSigUrl) {
      await deleteSignatureFile(existingSigUrl)
    }

    await prisma.$transaction(async (tx) => {
      if (resolvedStaffId) {
        await tx.staff.update({
          where: { id: resolvedStaffId },
          data: { signatureUrl: null },
        })
      }

      if (resolvedUserId) {
        await tx.user.update({
          where: { id: resolvedUserId },
          data: { signatureUrl: null },
        })

        const employeeRec = await tx.employee.findUnique({
          where: { userId: resolvedUserId },
        })
        if (employeeRec) {
          await tx.employee.update({
            where: { id: employeeRec.id },
            data: { signatureUrl: null },
          })
        }
      }
    })

    writeAuditLog({
      userId: session.user.id,
      action: "DELETE",
      module: "EmployeeSignature",
      recordId: resolvedStaffId || resolvedUserId || session.user.id,
      changes: {
        staffId: resolvedStaffId,
        userId: resolvedUserId,
        action: "SIGNATURE_REMOVED",
      },
    })

    revalidatePath("/dashboard/profile")
    revalidatePath("/dashboard/hr/staff")
    revalidatePath("/dashboard/admin/users")
    revalidatePath("/dashboard/ipd/print/summary", "layout")
    revalidatePath("/dashboard/ipd/patient", "layout")

    return {
      success: true,
      message: "Signature successfully removed.",
    }
  } catch (error: any) {
    console.error("[ERROR] removeSignature:", error)
    return {
      success: false,
      message: error.message || "Failed to remove signature.",
    }
  }
}

