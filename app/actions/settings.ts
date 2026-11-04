"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSecureUrl } from "@/lib/s3-server"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// TYPES
// ============================================

export interface HospitalSettingsData {
  id: number
  name: string
  address: string
  phone: string
  email: string
  website: string
  gstNo: string | null
  logoUrl: string | null
  letterheadHeaderUrl: string | null
  letterheadFooterUrl: string | null
  labTechnicianSignature: string | null
  pathologistSignature: string | null
  // WhatsApp Integration
  whatsappEnabled: boolean
  whatsappAuthKey: string | null
  whatsappBusinessNumber: string | null
  whatsappDefaultLang: string
}

// Default fallback when no record exists yet
const DEFAULTS: HospitalSettingsData = {
  id: 1,
  name: "Shree Kamal Hospital",
  address: "At/PO - Jagatpur, Cuttack, Odisha - 754021",
  phone: "+91 671 230 1234",
  email: "info@shreekamal.com",
  website: "www.shreekamal.com",
  gstNo: null,
  logoUrl: null,
  letterheadHeaderUrl: null,
  letterheadFooterUrl: null,
  labTechnicianSignature: null,
  pathologistSignature: null,
  whatsappEnabled: false,
  whatsappAuthKey: null,
  whatsappBusinessNumber: null,
  whatsappDefaultLang: "en",
}

// ============================================
// GET SETTINGS (singleton)
// ============================================

export async function getHospitalSettings(): Promise<HospitalSettingsData> {
  await requireAuth()

  try {
    const settings = await prisma.hospitalSettings.findUnique({
      where: { id: 1 },
    })

    if (!settings) {
      return DEFAULTS
    }

    // Sign S3 URLs so the browser can display them
    const [signedLogo, signedHeader, signedFooter, signedLabTech, signedPathologist] = await Promise.all([
      settings.logoUrl ? getSecureUrl(settings.logoUrl) : null,
      settings.letterheadHeaderUrl ? getSecureUrl(settings.letterheadHeaderUrl) : null,
      settings.letterheadFooterUrl ? getSecureUrl(settings.letterheadFooterUrl) : null,
      settings.labTechnicianSignature ? getSecureUrl(settings.labTechnicianSignature) : null,
      settings.pathologistSignature ? getSecureUrl(settings.pathologistSignature) : null,
    ])

    return {
      id: settings.id,
      name: settings.name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      gstNo: settings.gstNo,
      logoUrl: signedLogo,
      letterheadHeaderUrl: signedHeader,
      letterheadFooterUrl: signedFooter,
      labTechnicianSignature: signedLabTech,
      pathologistSignature: signedPathologist,
      whatsappEnabled: settings.whatsappEnabled,
      whatsappAuthKey: settings.whatsappAuthKey,
      whatsappBusinessNumber: settings.whatsappBusinessNumber,
      whatsappDefaultLang: settings.whatsappDefaultLang,
    }
  } catch (error: any) {
    console.error("[ERROR] getHospitalSettings:", error)
    return DEFAULTS
  }
}

// ============================================
// UPSERT SETTINGS (Create or Update)
// ============================================

export async function updateHospitalSettings(data: {
  name: string
  address: string
  phone: string
  email: string
  website?: string
  gstNo?: string
  logoUrl?: string | null
  letterheadHeaderUrl?: string | null
  letterheadFooterUrl?: string | null
  labTechnicianSignature?: string | null
  pathologistSignature?: string | null
  // WhatsApp
  whatsappEnabled?: boolean
  whatsappAuthKey?: string | null
  whatsappBusinessNumber?: string | null
  whatsappDefaultLang?: string
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.name || !data.address || !data.phone || !data.email) {
      return { success: false, message: "Name, address, phone, and email are required" }
    }

    await prisma.hospitalSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        name: data.name.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        website: data.website?.trim() || "",
        gstNo: data.gstNo?.trim() || null,
        logoUrl: data.logoUrl ?? null,
        letterheadHeaderUrl: data.letterheadHeaderUrl ?? null,
        letterheadFooterUrl: data.letterheadFooterUrl ?? null,
        labTechnicianSignature: data.labTechnicianSignature ?? null,
        pathologistSignature: data.pathologistSignature ?? null,
        whatsappEnabled: data.whatsappEnabled ?? false,
        whatsappAuthKey: data.whatsappAuthKey ?? null,
        whatsappBusinessNumber: data.whatsappBusinessNumber ?? null,
        whatsappDefaultLang: data.whatsappDefaultLang || "en",
      },
      update: {
        name: data.name.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        website: data.website?.trim() || "",
        gstNo: data.gstNo?.trim() || null,
        logoUrl: data.logoUrl ?? null,
        letterheadHeaderUrl: data.letterheadHeaderUrl ?? null,
        letterheadFooterUrl: data.letterheadFooterUrl ?? null,
        labTechnicianSignature: data.labTechnicianSignature ?? null,
        pathologistSignature: data.pathologistSignature ?? null,
        whatsappEnabled: data.whatsappEnabled ?? false,
        whatsappAuthKey: data.whatsappAuthKey ?? null,
        whatsappBusinessNumber: data.whatsappBusinessNumber ?? null,
        whatsappDefaultLang: data.whatsappDefaultLang || "en",
      },
    })

    revalidatePath("/dashboard/settings/hospital")
    revalidatePath("/dashboard/admin/settings/lab-tests")
    revalidatePath("/dashboard", "layout") // Revalidate layout (sidebar logo)
    revalidatePath("/dashboard") // Revalidate dashboard page

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "HospitalSettings", changes: { name: data.name, email: data.email, phone: data.phone } })

    return { success: true, message: "Hospital settings saved successfully" }
  } catch (error: any) {
    console.error("[ERROR] updateHospitalSettings:", error)
    return { success: false, message: error.message || "Failed to save settings" }
  }
}
