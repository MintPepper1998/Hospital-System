"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

import type { PrintTemplateSettingsData, TemplateType } from "@/lib/print-template-types"
import { TEMPLATE_TYPES } from "@/lib/print-template-types"

// ── Defaults inside the async functions ──

// ── Get single template settings ──
export async function getTemplateSettings(templateType: string): Promise<PrintTemplateSettingsData> {
  const getDefaults = (tType: string): Omit<PrintTemplateSettingsData, "id"> => ({
    templateType: tType, paperSize: null, orientation: null, themeColor: null, companyNameSize: null, invoiceTextSize: null,
    printHeaderRepeat: true, showEmergencyBanner: true, showQualityAccreditations: true, showSignature: true, signatureLabel: "Authorized Signatory",
    showTermsAndConditions: false, termsText: null, showPrintDescription: false, printDescriptionText: null, showVitals: true, showDiagnosis: true,
    showChiefComplaints: true, showMedicationTable: true, showLabTests: true, showDoctorAdvisory: true, showDosageSchedule: true, prescriptionLayout: "DETAILED",
    showReferenceRanges: true, showAbnormalFlags: true, showSampleInfo: true, showLabTechSignature: true, labReportLayout: "TABULAR",
    showTotalQuantity: true, showAmountDecimal: true, showReceivedAmount: true, showBalanceAmount: true, showTaxDetails: true, showDiscountDetails: true,
    printAmountGrouped: true, amountInWords: "Indian", billLayoutStrategy: "GROUPED_BY_CATEGORY", showItemizedBreakdown: true,
    showBatchNumber: true, showExpiryDate: true, showMRP: true, showPharmacistSign: true, medicineBillLayout: "ITEMIZED",
  })
  try {
    const settings = await prisma.printTemplateSettings.findUnique({
      where: { templateType },
    })
    if (settings) return settings as PrintTemplateSettingsData
    return { id: "", ...getDefaults(templateType) } as PrintTemplateSettingsData
  } catch (error) {
    console.error("[ERROR] getTemplateSettings:", error)
    return { id: "", ...getDefaults(templateType) } as PrintTemplateSettingsData
  }
}

// ── Get all 4 template settings at once ──
export async function getAllTemplateSettings(): Promise<Record<string, PrintTemplateSettingsData>> {
  const getDefaults = (tType: string): Omit<PrintTemplateSettingsData, "id"> => ({
    templateType: tType, paperSize: null, orientation: null, themeColor: null, companyNameSize: null, invoiceTextSize: null,
    printHeaderRepeat: true, showEmergencyBanner: true, showQualityAccreditations: true, showSignature: true, signatureLabel: "Authorized Signatory",
    showTermsAndConditions: false, termsText: null, showPrintDescription: false, printDescriptionText: null, showVitals: true, showDiagnosis: true,
    showChiefComplaints: true, showMedicationTable: true, showLabTests: true, showDoctorAdvisory: true, showDosageSchedule: true, prescriptionLayout: "DETAILED",
    showReferenceRanges: true, showAbnormalFlags: true, showSampleInfo: true, showLabTechSignature: true, labReportLayout: "TABULAR",
    showTotalQuantity: true, showAmountDecimal: true, showReceivedAmount: true, showBalanceAmount: true, showTaxDetails: true, showDiscountDetails: true,
    printAmountGrouped: true, amountInWords: "Indian", billLayoutStrategy: "GROUPED_BY_CATEGORY", showItemizedBreakdown: true,
    showBatchNumber: true, showExpiryDate: true, showMRP: true, showPharmacistSign: true, medicineBillLayout: "ITEMIZED",
  })
  try {
    const all = await prisma.printTemplateSettings.findMany()
    const map: Record<string, PrintTemplateSettingsData> = {}

    for (const type of TEMPLATE_TYPES) {
      const found = all.find((s) => s.templateType === type)
      map[type] = found
        ? (found as PrintTemplateSettingsData)
        : ({ id: "", ...getDefaults(type) } as PrintTemplateSettingsData)
    }
    return map
  } catch (error) {
    console.error("[ERROR] getAllTemplateSettings:", error)
    const map: Record<string, PrintTemplateSettingsData> = {}
    for (const type of TEMPLATE_TYPES) {
      map[type] = { id: "", ...getDefaults(type) } as PrintTemplateSettingsData
    }
    return map
  }
}

// ── Update template settings ──
export async function updateTemplateSettings(
  templateType: string,
  data: Partial<PrintTemplateSettingsData>
): Promise<{ success: boolean; message: string }> {
  const getDefaults = (tType: string): Omit<PrintTemplateSettingsData, "id"> => ({
    templateType: tType, paperSize: null, orientation: null, themeColor: null, companyNameSize: null, invoiceTextSize: null,
    printHeaderRepeat: true, showEmergencyBanner: true, showQualityAccreditations: true, showSignature: true, signatureLabel: "Authorized Signatory",
    showTermsAndConditions: false, termsText: null, showPrintDescription: false, printDescriptionText: null, showVitals: true, showDiagnosis: true,
    showChiefComplaints: true, showMedicationTable: true, showLabTests: true, showDoctorAdvisory: true, showDosageSchedule: true, prescriptionLayout: "DETAILED",
    showReferenceRanges: true, showAbnormalFlags: true, showSampleInfo: true, showLabTechSignature: true, labReportLayout: "TABULAR",
    showTotalQuantity: true, showAmountDecimal: true, showReceivedAmount: true, showBalanceAmount: true, showTaxDetails: true, showDiscountDetails: true,
    printAmountGrouped: true, amountInWords: "Indian", billLayoutStrategy: "GROUPED_BY_CATEGORY", showItemizedBreakdown: true,
    showBatchNumber: true, showExpiryDate: true, showMRP: true, showPharmacistSign: true, medicineBillLayout: "ITEMIZED",
  })
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    // Remove id from data — Prisma handles it
    const { id, ...updateData } = data

    await prisma.printTemplateSettings.upsert({
      where: { templateType },
      create: {
        ...getDefaults(templateType),
        ...updateData,
        templateType,
      },
      update: {
        ...updateData,
      },
    })

    revalidatePath("/dashboard/settings/print")
    revalidatePath("/dashboard/clinical/opd/print/[appointmentId]", "page")
    revalidatePath("/dashboard/clinical/emr/[appointmentId]/print", "page")
    revalidatePath("/dashboard/clinical/opd/bill/[billingId]", "page")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "PrintTemplateSettings",
      changes: { detail: `Updated ${templateType} template settings` },
    })

    const names: Record<string, string> = {
      OPD_PRESCRIPTION: "OPD Prescription",
      LAB_RESULTS: "Lab Results",
      PATIENT_BILLING: "Patient Billing",
      MEDICINE_BILL: "Medicine Bill",
    }
    const templateName = names[templateType] || templateType

    return { success: true, message: `${templateName} settings saved successfully` }
  } catch (error: any) {
    console.error("[ERROR] updateTemplateSettings:", error)
    return { success: false, message: error.message || "Failed to update template settings" }
  }
}

// Note: formatTemplateName was moved to a shared utils file because server actions must be async.
