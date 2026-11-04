"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updatePatientPhoto(patientId: string, url: string) {
  try {
    if (!patientId || !url) {
      throw new Error("Patient ID and URL are required")
    }

    await prisma.patient.update({
      where: { id: patientId },
      data: { profilePhotoUrl: url }
    })

    revalidatePath(`/dashboard/ipd/patient/${patientId}`)
    
    return { success: true }
  } catch (error: any) {
    console.error("[UPDATE_PATIENT_PHOTO]", error)
    return { success: false, message: error.message || "Failed to update profile photo" }
  }
}

export async function addPatientDocument(patientId: string, title: string, fileUrl: string, fileType: string) {
  try {
    if (!patientId || !title || !fileUrl) {
      throw new Error("Patient ID, Title, and URL are required")
    }

    const doc = await prisma.patientDocument.create({
      data: {
        patientId,
        title,
        fileUrl,
        fileType
      }
    })

    revalidatePath(`/dashboard/ipd/patient/[admissionId]`, 'page')
    
    return { success: true, document: doc }
  } catch (error: any) {
    console.error("[ADD_PATIENT_DOCUMENT]", error)
    return { success: false, message: error.message || "Failed to add document" }
  }
}

export async function deletePatientDocument(documentId: string) {
  try {
    if (!documentId) {
      throw new Error("Document ID is required")
    }

    await prisma.patientDocument.delete({
      where: { id: documentId }
    })

    revalidatePath(`/dashboard/ipd/patient/[admissionId]`, 'page')
    
    return { success: true }
  } catch (error: any) {
    console.error("[DELETE_PATIENT_DOCUMENT]", error)
    return { success: false, message: error.message || "Failed to delete document" }
  }
}
