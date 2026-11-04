// Account Group Resolver — pure utility (not a server action)

/**
 * Account Group Resolver
 * 
 * Central mapping function that auto-assigns accountGroupCode to every transaction.
 * Uses the 1000-6000 standard COA numbering system.
 * 
 * This ensures every transaction flowing through the ledger gets tagged with
 * the correct account group for P&L / Balance Sheet report generation.
 */

/**
 * Resolves the account group code for a transaction based on its type, category, and billing context.
 * 
 * @param type - "INCOME" or "EXPENSE"
 * @param category - The transaction category (e.g., "OPD_BILLING", "BSKY_CLAIM_SETTLEMENT")
 * @param billingType - Optional billing type (e.g., "OPD", "IPD", "PHARMACY")
 * @param scope - Optional scope ("HOSPITAL" or "PHARMACY")
 * @returns The account group code (e.g., "4110") or null for internal transfers
 */
export function resolveAccountGroupCode(
  type: "INCOME" | "EXPENSE",
  category: string,
  billingType?: string | null,
  scope?: string | null
): string | null {
  const cat = (category || "").toUpperCase()
  const bt = (billingType || "").toUpperCase()

  // ──────────────────────────────────
  // INCOME / REVENUE mapping
  // ──────────────────────────────────
  if (type === "INCOME") {
    // Internal transfers have no P&L impact
    if (cat.includes("TRANSFER")) return null

    // Revenue by billing type (department)
    if (bt === "OPD" || bt === "CASUALTY" || bt === "EMERGENCY") return "4110"  // OPD Revenue
    if (bt === "IPD") return "4120"        // IPD Revenue
    if (bt === "OT") return "4130"         // Surgery/OT Revenue
    if (bt === "LABORATORY") return "4140" // Lab Revenue
    if (bt === "PHARMACY") return "4150"   // Pharmacy Revenue
    if (bt === "AMBULANCE") return "4170"  // Ambulance Revenue
    if (bt === "CANTEEN") return "4180"    // Canteen Revenue

    // Category-based fallbacks (when billingType is not available)
    if (cat.includes("BSKY") || cat.includes("PMJAY")) return "4110"  // Govt scheme → OPD Revenue
    if (cat.includes("OPD") || cat.includes("CONSULTATION")) return "4110"
    if (cat.includes("IPD")) return "4120"
    if (cat.includes("SURGERY") || cat.includes("OT_")) return "4130"
    if (cat.includes("LAB") || cat.includes("PATHOLOGY") || cat.includes("RADIOLOGY")) return "4140"
    if (cat.includes("PHARMACY") || cat.includes("MEDICINE")) return "4150"
    if (cat.includes("EMERGENCY") || cat.includes("CASUALTY")) return "4160"
    if (cat.includes("AMBULANCE")) return "4170"
    if (cat.includes("CANTEEN") || cat.includes("FOOD")) return "4180"

    // Interest, rental, etc.
    if (cat.includes("INTEREST")) return "4210"
    if (cat.includes("RENT") && type === "INCOME") return "4220"

    // Purchase return reversal (treated as expense reduction, not income)
    if (cat.includes("PURCHASE_RETURN")) return "6200"

    // Stock adjustment gains
    if (cat.includes("STOCK_ADJUSTMENT_GAIN")) return "4200"

    // Fallback: Indirect Income
    return "4200"
  }

  // ──────────────────────────────────
  // EXPENSE mapping
  // ──────────────────────────────────
  if (type === "EXPENSE") {
    // Internal transfers have no P&L impact
    if (cat.includes("TRANSFER")) return null

    // Sales returns & refunds (contra against revenue)
    if (cat.includes("SALES_REFUND") || cat.includes("SALES_RETURN")) return "6100"

    // Stock write-offs
    if (cat.includes("STOCK_WRITE_OFF") || cat.includes("STOCK_DAMAGE") || cat.includes("STOCK_EXPIRY")) return "5120"

    // Direct Expenses (Cost of Revenue)
    if (scope === "PHARMACY" && (cat.includes("PURCHASE") || cat.includes("SUPPLIER"))) return "5110"  // COGS
    if (cat.includes("MEDICINE") && cat.includes("PURCHASE")) return "5110"
    if (cat.includes("CONSUMABLE") || cat.includes("MEDICAL_SUPPLY")) return "5120"
    if (cat.includes("REAGENT") || cat.includes("LAB_SUPPLY")) return "5130"
    if (cat.includes("SURGICAL")) return "5140"

    // Indirect Expenses
    if (cat.includes("SALARY") || cat.includes("STAFF") || cat.includes("PAYROLL") || cat.includes("WAGE")) return "5210"
    if (cat.includes("EPF") || cat.includes("ESI") || cat.includes("PF_")) return "5210"
    if (cat.includes("CONSULTANT") || cat.includes("DOCTOR_FEE")) return "5210"

    if (cat.includes("STATIONERY") || cat.includes("OFFICE") || cat.includes("PRINTING")) return "5220"
    if (cat.includes("LEGAL") || cat.includes("AUDIT") || cat.includes("PROFESSIONAL")) return "5220"
    if (cat.includes("COMMUNICATION") || cat.includes("PHONE") || cat.includes("INTERNET")) return "5220"

    if (cat.includes("RENT") || cat.includes("LEASE")) return "5230"
    if (cat.includes("ELECTRIC") || cat.includes("POWER") || cat.includes("UTILITY")) return "5230"
    if (cat.includes("WATER")) return "5230"
    if (cat.includes("CLEANING") || cat.includes("HOUSEKEEP") || cat.includes("LAUNDRY")) return "5230"
    if (cat.includes("SECURITY")) return "5230"
    if (cat.includes("MAINTENANCE") || cat.includes("REPAIR")) return "5230"
    if (cat.includes("BIOMEDICAL_WASTE")) return "5230"

    if (cat.includes("EQUIPMENT") || cat.includes("AMC")) return "5240"
    if (cat.includes("IT_") || cat.includes("SOFTWARE") || cat.includes("SERVER")) return "5240"
    if (cat.includes("DEPRECIATION")) return "5240"

    if (cat.includes("MARKETING") || cat.includes("ADVERTIS") || cat.includes("DIGITAL")) return "5250"

    if (cat.includes("BANK_CHARGE") || cat.includes("GATEWAY")) return "5260"
    if (cat.includes("INTEREST") && type === "EXPENSE") return "5260"
    if (cat.includes("PENALTY") || cat.includes("LATE_FEE")) return "5260"

    if (cat.includes("TRAVEL") || cat.includes("CONVEYANCE")) return "5270"
    if (cat.includes("FOOD") || cat.includes("REFRESHMENT")) return "5270"

    // Fallback: Misc Expenses
    return "5270"
  }

  return null
}

/**
 * Resolves the billingType tag from a BillingType enum or category string.
 */
export function resolveBillingTypeTag(
  billingType?: string | null,
  category?: string | null
): string | null {
  if (billingType) return billingType.toUpperCase()

  const cat = (category || "").toUpperCase()
  if (cat.includes("OPD")) return "OPD"
  if (cat.includes("IPD")) return "IPD"
  if (cat.includes("PHARMACY") || cat.includes("MEDICINE")) return "PHARMACY"
  if (cat.includes("LAB") || cat.includes("PATHOLOGY")) return "LABORATORY"
  if (cat.includes("SURGERY") || cat.includes("OT_")) return "OT"
  if (cat.includes("AMBULANCE")) return "AMBULANCE"
  if (cat.includes("CANTEEN")) return "CANTEEN"
  if (cat.includes("CASUALTY")) return "CASUALTY"
  if (cat.includes("EMERGENCY")) return "EMERGENCY"

  return null
}
