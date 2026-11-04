// ── Template Types ──
export const TEMPLATE_TYPES = [
  "OPD_PRESCRIPTION",
  "LAB_RESULTS",
  "PATIENT_BILLING",
  "MEDICINE_BILL",
] as const

export type TemplateType = (typeof TEMPLATE_TYPES)[number]

// ── Full interface ──
export interface PrintTemplateSettingsData {
  id: string
  templateType: string

  // Per-template overrides (null = use global)
  paperSize: string | null
  orientation: string | null
  themeColor: string | null
  companyNameSize: string | null
  invoiceTextSize: string | null

  // Shared layout toggles
  printHeaderRepeat: boolean
  showEmergencyBanner: boolean
  showQualityAccreditations: boolean
  showSignature: boolean
  signatureLabel: string
  showTermsAndConditions: boolean
  termsText: string | null
  showPrintDescription: boolean
  printDescriptionText: string | null

  // OPD Prescription specific
  showVitals: boolean
  showDiagnosis: boolean
  showChiefComplaints: boolean
  showMedicationTable: boolean
  showLabTests: boolean
  showDoctorAdvisory: boolean
  showDosageSchedule: boolean
  prescriptionLayout: string

  // Lab Results specific
  showReferenceRanges: boolean
  showAbnormalFlags: boolean
  showSampleInfo: boolean
  showLabTechSignature: boolean
  labReportLayout: string

  // Patient Billing specific
  showTotalQuantity: boolean
  showAmountDecimal: boolean
  showReceivedAmount: boolean
  showBalanceAmount: boolean
  showTaxDetails: boolean
  showDiscountDetails: boolean
  printAmountGrouped: boolean
  amountInWords: string
  billLayoutStrategy: string
  showItemizedBreakdown: boolean

  // Medicine Bill specific
  showBatchNumber: boolean
  showExpiryDate: boolean
  showMRP: boolean
  showPharmacistSign: boolean
  medicineBillLayout: string
}
