export const PH_CATEGORIES = [
  "PHARMACY_SALE",
  "CREDIT_COLLECTION",
  "IPD_SETTLEMENT",
  "SUPPLIER_REFUND",
  "SALES_REFUND",
  "SUPPLIER_PAYMENT",
  "PHARMACY_EXPENSE",
  "INTERNAL_TRANSFER_IN",
  "INTERNAL_TRANSFER_OUT",
  "INTER_DEPT_TRANSFER_IN",
  "INTER_DEPT_TRANSFER_OUT",
  "CASH_VARIANCE",
  "OPENING_BALANCE",
] as const

export const TRANSFER_CATEGORIES = [
  "INTERNAL_TRANSFER_IN",
  "INTERNAL_TRANSFER_OUT",
  "INTER_DEPT_TRANSFER_IN",
  "INTER_DEPT_TRANSFER_OUT",
]

export const NONCASH_LEGACY_CATEGORIES = [
  "STOCK_WRITE_OFF",
  "STOCK_ADJUSTMENT_GAIN",
  "PURCHASE_RETURN",
  "NONCASH_REVERSAL"
]

export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "Credit Payment Received": "CREDIT_COLLECTION",
  "Credit Payment Made": "SUPPLIER_PAYMENT",
}

export const EXPENSE_HEADS: Record<string, { label: string; accountGroupCode: string }> = {
  RENT: { label: "Rent", accountGroupCode: "5230" },
  ELECTRICITY: { label: "Electricity & Water", accountGroupCode: "5230" },
  SALARY: { label: "Staff Salary & Wages", accountGroupCode: "5210" },
  PACKAGING: { label: "Packaging & Carry Bags", accountGroupCode: "5120" },
  REPAIRS: { label: "Repairs & Maintenance", accountGroupCode: "5230" },
  LICENCE: { label: "Licences, Fees & Renewals", accountGroupCode: "5220" },
  TRANSPORT: { label: "Transport & Courier", accountGroupCode: "5220" },
  IT: { label: "Software, Internet & IT", accountGroupCode: "5240" },
  BANK_CHARGES: { label: "Bank / Card / UPI Charges", accountGroupCode: "5260" },
  MARKETING: { label: "Marketing & Discounts", accountGroupCode: "5250" },
  MISC: { label: "Miscellaneous", accountGroupCode: "5270" },
}

export const SALE_CHANNELS = ["OTC", "OPD", "IPD", "EMERGENCY", "CASUALTY", "CREDIT"] as const
export type SaleChannel = typeof SALE_CHANNELS[number]

export const VALID_SALE_STATUSES = ["PAID", "PARTIALLY_PAID", "PENDING", "PENDING_GOVERNMENT_PAYMENT"]

export const AGING_BUCKETS = [
  { label: "0-30", min: 0, max: 30 },
  { label: "31-60", min: 31, max: 60 },
  { label: "61-90", min: 61, max: 90 },
  { label: "90+", min: 91, max: Infinity },
]
