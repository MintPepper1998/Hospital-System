"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

// Define the interface that matches the PrintSettings schema
export interface PrintSettingsData {
  id: number

  // Basic Printer
  paperSize: string
  orientation: string
  themeColor: string

  // Header Info
  printHeaderRepeat: boolean
  companyNameSize: string
  invoiceTextSize: string

  // Overrides
  useCustomCompanyInfo: boolean
  customName: string | null
  customAddress: string | null
  customPhone: string | null
  customEmail: string | null
  customGstin: string | null

  // Invoice Table Columns
  showTotalQuantity: boolean
  showAmountDecimal: boolean
  showReceivedAmount: boolean
  showBalanceAmount: boolean
  showTaxDetails: boolean
  showDiscountDetails: boolean
  printAmountGrouped: boolean

  amountInWords: string

  // Industry Standard
  showEmergencyBanner: boolean
  emergencyContactText: string | null
  showQualityAccreditations: boolean
  accreditationText: string | null
  ipdBillLayoutStrategy: string
  showItemizedBreakdown: boolean

  // Footer
  showPrintDescription: boolean
  printDescriptionText: string | null
  showTermsAndConditions: boolean
  termsText: string | null
  showSignature: boolean
  signatureLabel: string
}

// Default fallback
const DEFAULTS: PrintSettingsData = {
  id: 1,
  paperSize: "A4",
  orientation: "Portrait",
  themeColor: "#0066CC",
  printHeaderRepeat: true,
  companyNameSize: "Large",
  invoiceTextSize: "Medium",
  useCustomCompanyInfo: false,
  customName: null,
  customAddress: null,
  customPhone: null,
  customEmail: null,
  customGstin: null,
  showTotalQuantity: true,
  showAmountDecimal: true,
  showReceivedAmount: true,
  showBalanceAmount: true,
  showTaxDetails: true,
  showDiscountDetails: true,
  printAmountGrouped: true,
  amountInWords: "Indian",
  showEmergencyBanner: true,
  emergencyContactText: "EMERGENCY 1066",
  showQualityAccreditations: true,
  accreditationText: "NABH Accredited Hospital",
  ipdBillLayoutStrategy: "GROUPED_BY_CATEGORY",
  showItemizedBreakdown: true,
  showPrintDescription: false,
  printDescriptionText: "",
  showTermsAndConditions: true,
  termsText: "Thanks for doing business with us!",
  showSignature: true,
  signatureLabel: "Authorized Signatory",
}

export async function getPrintSettings(): Promise<PrintSettingsData> {
  try {
    const settings = await prisma.printSettings.findUnique({
      where: { id: 1 },
    })
    if (!settings) {
      return DEFAULTS
    }
    return settings
  } catch (error) {
    console.error("[ERROR] getPrintSettings:", error)
    return DEFAULTS
  }
}

export async function updatePrintSettings(data: Partial<PrintSettingsData>): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.printSettings.upsert({
      where: { id: 1 },
      create: {
        ...DEFAULTS,
        ...data,
      },
      update: {
        ...data,
      },
    })

    revalidatePath("/dashboard/settings/print")
    
    // Also revalidate wherever prints might occur
    revalidatePath("/dashboard/finance/billing/[billId]", "page")
    revalidatePath("/dashboard/clinical/opd/print/[appointmentId]", "page")

    writeAuditLog({ 
      userId: authResult.session.userId, 
      action: "UPDATE", 
      module: "PrintSettings", 
      changes: { detail: "Updated printer settings configuration" } 
    })

    return { success: true, message: "Print settings updated securely" }
  } catch (error: any) {
    console.error("[ERROR] updatePrintSettings:", error)
    return { success: false, message: error.message || "Failed to update settings" }
  }
}
