"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { Gender } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit"

export async function updatePatientDetails(data: {
  patientId: string
  name: string
  dateOfBirth?: string | null
  gender?: string | null
  bloodGroup?: string | null
  phone?: string | null
  emergencyContact?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  aadharNumber?: string | null
  image?: string | null
}) {
  try {
    const auth = await requireAuthSafe()
    if (!auth.ok) throw new Error("Unauthorized")

    // Find the patient and their associated user
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      include: { user: true },
    })

    if (!patient) {
      throw new Error("Patient not found")
    }

    // Update the User record (name, image, phone)
    await prisma.user.update({
      where: { id: patient.userId },
      data: {
        name: data.name,
        phone: data.phone || patient.user.phone,
        image: data.image || patient.user.image,
      },
    })

    // Update the Patient record
    const updatedPatient = await prisma.patient.update({
      where: { id: data.patientId },
      data: {
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender ? (data.gender as Gender) : null,
        bloodGroup: data.bloodGroup || null,
        phone: data.phone || null,
        emergencyContact: data.emergencyContact || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        aadharNumber: data.aadharNumber || null,
        profilePhotoUrl: data.image || patient.profilePhotoUrl,
      },
    })

    writeAuditLog({ userId: auth.session.userId, action: "UPDATE", module: "Patient", recordId: data.patientId, changes: { name: data.name, phone: data.phone } })

    revalidatePath("/dashboard/clinical/emergency")
    revalidatePath(`/dashboard/clinical/emergency/patient/${data.patientId}`)
    
    return { success: true, data: updatedPatient }
  } catch (error: any) {
    console.error("[updatePatientDetails]", error)
    return { success: false, message: error.message || "Failed to update patient details" }
  }
}

export async function addPatientDocument(data: {
  patientId: string
  title: string
  fileUrl: string
  fileType: string
}) {
  try {
    const auth = await requireAuthSafe()
    if (!auth.ok) throw new Error("Unauthorized")

    const document = await prisma.patientDocument.create({
      data: {
        patientId: data.patientId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
      },
    })

    writeAuditLog({ userId: auth.session.userId, action: "CREATE", module: "PatientDocument", recordId: document.id, changes: { title: data.title, patientId: data.patientId } })

    revalidatePath(`/dashboard/clinical/emergency/patient/${data.patientId}`)
    return { success: true, data: document }
  } catch (error: any) {
    console.error("[addPatientDocument]", error)
    return { success: false, message: error.message || "Failed to add document" }
  }
}

export async function deletePatientDocument(documentId: string, patientId: string) {
  try {
    const auth = await requireAuthSafe()
    if (!auth.ok) throw new Error("Unauthorized")

    await prisma.patientDocument.delete({
      where: { id: documentId },
    })

    writeAuditLog({ userId: auth.session.userId, action: "DELETE", module: "PatientDocument", recordId: documentId, changes: { patientId } })

    revalidatePath(`/dashboard/clinical/emergency/patient/${patientId}`)
    return { success: true }
  } catch (error: any) {
    console.error("[deletePatientDocument]", error)
    return { success: false, message: error.message || "Failed to delete document" }
  }
}
