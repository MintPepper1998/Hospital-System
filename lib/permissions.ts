export interface PermissionSubModule {
  id: string
  label: string
}

export interface PermissionModule {
  id: string
  label: string
  subModules: PermissionSubModule[]
}

export const AVAILABLE_MODULES: PermissionModule[] = [
  {
    id: "BILLING_COUNTER",
    label: "Billing Counter",
    subModules: [
      { id: "BILLING_COUNTER_OPD", label: "OPD billing" },
      { id: "BILLING_COUNTER_IPD", label: "IPD billing" },
      { id: "BILLING_COUNTER_CASUALTY", label: "Casualty billing" },
      { id: "BILLING_COUNTER_ER", label: "Emergency billing" },
      { id: "BILLING_COUNTER_OT", label: "Surgery / OT billing" },
      { id: "BILLING_COUNTER_DIAGNOSTICS", label: "Diagnostics billing" },
      { id: "BILLING_COUNTER_AMBULANCE", label: "Ambulance billing" },
      { id: "BILLING_COUNTER_CANTEEN", label: "Canteen billing" },
      { id: "BILLING_COUNTER_CUSTOM", label: "Custom services" },
      { id: "BILLING_COUNTER_HISTORY", label: "Bill history" },
    ]
  },
  { 
    id: "CLINICAL", 
    label: "Clinical",
    subModules: [
      { id: "CLINICAL_OPD", label: "OPD / Queue" },
      { id: "CLINICAL_ER", label: "Emergency (ER) & Records" },
      { id: "CLINICAL_CASUALTY", label: "Casualty & Records" },
      { id: "CLINICAL_OT", label: "Operation Theatre" },
      { id: "CLINICAL_EMR", label: "Queue Patient (EMR)" },
    ]
  },
  { 
    id: "IPD", 
    label: "IPD & Beds",
    subModules: [
      { id: "IPD_BEDS", label: "Bed Map" },
      { id: "IPD_ADMISSION", label: "Admit Patient" },
      { id: "IPD_BILLING", label: "IPD Billing & Interim Invoices" },
      { id: "IPD_DISCHARGE", label: "Discharge & Clearance" },
      { id: "IPD_PAST_RECORDS", label: "Past Records & Archive" },
    ]
  },
  { 
    id: "PATHOLOGY", 
    label: "Pathology",
    subModules: [
      { id: "PATHOLOGY_QUEUE", label: "Collection Queue" },
      { id: "PATHOLOGY_REPORTS", label: "Reports" },
    ]
  },
  { 
    id: "RADIOLOGY", 
    label: "Radiology",
    subModules: [
      { id: "RADIOLOGY_QUEUE", label: "Imaging Queue" },
      { id: "RADIOLOGY_REPORTS", label: "Reports" },
    ]
  },
  { 
    id: "PHARMACY", 
    label: "Pharmacy",
    subModules: [
      { id: "PHARMACY_POS_BILLING", label: "POS Billing" },
      { id: "PHARMACY_BILLS", label: "Billing Pharmacy" },
      { id: "PHARMACY_PRESCRIPTIONS", label: "Prescriptions" },
      { id: "PHARMACY_CUSTOMER_RETURNS", label: "Customer Returns" },
      { id: "PHARMACY_INVENTORY", label: "Inventory" },
      { id: "PHARMACY_OT_MEDICINE", label: "OT Medicine" },
      { id: "PHARMACY_CHALLANS", label: "Challans" },
      { id: "PHARMACY_PURCHASE_INVOICES", label: "Purchase Invoices" },
      { id: "PHARMACY_PURCHASE_RETURNS", label: "Purchase Returns" },
      { id: "PHARMACY_SUPPLIERS", label: "Suppliers" },
      { id: "PHARMACY_MEDICINE_OUT", label: "Medicine Out" },
    ]
  },
  { 
    id: "PHARMACY_FINANCE", 
    label: "Pharmacy Finance",
    subModules: [
      { id: "PHARMACY_FINANCE_VIEW", label: "Overview & Reports" },
      { id: "PHARMACY_FINANCE_SALES", label: "Sales & Customer Returns" },
      { id: "PHARMACY_FINANCE_RECEIVABLES", label: "Receivables & Settlements" },
      { id: "PHARMACY_FINANCE_PAYABLES", label: "Payables & Purchase Register" },
      { id: "PHARMACY_FINANCE_MANAGE", label: "Expenses & Payments" },
      { id: "PHARMACY_FINANCE_VOUCHERS", label: "Voucher Entry" },
      { id: "PHARMACY_FINANCE_ACCOUNTS", label: "Cash & Bank Accounts" },
      { id: "PHARMACY_FINANCE_DAYCLOSE", label: "Day Close" },
      { id: "PHARMACY_FINANCE_REPORTS", label: "Profit & Loss / GST Summary" },
    ]
  },
  { 
    id: "FINANCE", 
    label: "Finance",
    subModules: [
      { id: "FINANCE_OVERVIEW", label: "Overview / Ledger" },
      { id: "FINANCE_ACCOUNTS", label: "Accounts & Cash Flow" },
      { id: "FINANCE_CREDIT", label: "Credit & Dues" },
      { id: "FINANCE_PURCHASES", label: "Purchases & Suppliers" },
      { id: "FINANCE_BILLING", label: "Billing" },
      { id: "FINANCE_DIAGNOSTIC", label: "Diagnostic Billing" },
      { id: "FINANCE_TAXES", label: "Tax & Reports" },
      { id: "FINANCE_GST", label: "GST Configuration" },
      { id: "FINANCE_INSURANCE", label: "Insurance / TPA" },
      { id: "FINANCE_BSKY", label: "BSKY Claims" },
    ]
  },
  {
    id: "MASTER_FINANCE",
    label: "Master Finance",
    subModules: [
      { id: "MASTER_FINANCE_DASHBOARD", label: "Overview Dashboard" },
      { id: "MASTER_FINANCE_COA", label: "Chart of Accounts" },
      { id: "MASTER_FINANCE_LEDGER", label: "General Ledger" },
      { id: "MASTER_FINANCE_DAYBOOK", label: "Day Book" },
      { id: "MASTER_FINANCE_DAYCLOSE", label: "Hospital Day Close" },
      { id: "MASTER_FINANCE_VOUCHERS", label: "Voucher Entry (JV / Receipts / Payments)" },
      { id: "MASTER_FINANCE_BILLING", label: "Billing Dashboard & Invoices" },
      { id: "MASTER_FINANCE_COLLECTIONS", label: "Collections & Refunds" },
      { id: "MASTER_FINANCE_RECEIVABLES", label: "Credit & Receivables (Patient/Insurance/Govt)" },
      { id: "MASTER_FINANCE_PAYABLES", label: "Purchase Invoices & Returns" },
      { id: "MASTER_FINANCE_SUPPLIERS", label: "Supplier Directory & Payments" },
      { id: "MASTER_FINANCE_CASH_BANK", label: "Cash & Bank Accounts / Reconciliation" },
      { id: "MASTER_FINANCE_PAYROLL", label: "Salary Processing & Payroll Journal" },
      { id: "MASTER_FINANCE_STATEMENTS", label: "Financial Statements (P&L, Balance Sheet, Cash Flow)" },
      { id: "MASTER_FINANCE_BUDGETING", label: "Budgeting & Cost Centers" },
      { id: "MASTER_FINANCE_EXPENSES", label: "Expense Approvals & Register" },
      { id: "MASTER_FINANCE_ANALYTICS", label: "Financial Analytics & KPIs" },
      { id: "MASTER_FINANCE_TAX", label: "Tax & Compliance (GST / Tally)" },
      { id: "MASTER_FINANCE_SETTINGS", label: "Settings & Fiscal Year" },
    ]
  },
  { 
    id: "INSURANCE", 
    label: "Insurance",
    subModules: [
      { id: "INSURANCE_VERIFY", label: "Verify & Register" },
      { id: "INSURANCE_POLICIES", label: "Active Policies" },
      { id: "INSURANCE_PREAUTH", label: "Pre-Authorization" },
      { id: "INSURANCE_ESTIMATE", label: "Cost Estimator" },
      { id: "INSURANCE_CASHLESS", label: "Cashless Claims" },
      { id: "INSURANCE_REIMBURSEMENT", label: "Reimbursement" },
      { id: "INSURANCE_PMJAY", label: "PMJAY Claims" },
      { id: "INSURANCE_TARIFF", label: "Tariff Master" },
      { id: "INSURANCE_ICD", label: "ICD-10 Codes" },
    ]
  },
  { 
    id: "CANTEEN", 
    label: "Canteen",
    subModules: [
      { id: "CANTEEN_DASHBOARD", label: "Dashboard" },
      { id: "CANTEEN_MENU", label: "Daily Menu" },
      { id: "CANTEEN_IPD_DIETS", label: "IPD Diet Plans" },
      { id: "CANTEEN_TOKENS", label: "Token Counter" },
      { id: "CANTEEN_INVENTORY", label: "Inventory" },
      { id: "CANTEEN_REPORTS", label: "Reports" },
    ]
  },
  {
    id: "AMBULANCE",
    label: "Ambulance",
    subModules: [
      { id: "AMBULANCE_DASHBOARD", label: "Dashboard" },
      { id: "AMBULANCE_FLEET", label: "Fleet" },
      { id: "AMBULANCE_TRIPS", label: "Trips" },
      { id: "AMBULANCE_STAFF", label: "Staff" },
      { id: "AMBULANCE_BILLING", label: "Billing" },
    ]
  },
  {
    id: "INVENTORY",
    label: "General Inventory",
    subModules: [
      { id: "INVENTORY_GENERAL", label: "Assets & Items" },
    ]
  },
  { 
    id: "REPORTS", 
    label: "Reports",
    subModules: [
      { id: "REPORTS_DASHBOARD", label: "Reports Overview" },
      { id: "REPORTS_PNL", label: "Hospital & Medicine P&L" },
      { id: "REPORTS_REVENUE", label: "OPD & IPD Revenue Reports" },
      { id: "REPORTS_DAYBOOK", label: "Hospital Day Book Report" },
      { id: "REPORTS_DOCTOR_PAYOUTS", label: "Doctor Payouts & Commission" },
      { id: "REPORTS_GST", label: "GST Reports (GSTR-1, 2B, 3B, 9)" },
      { id: "REPORTS_EXPENSES", label: "Operational Expense Reports" },
      { id: "REPORTS_OT", label: "Operation Theatre Logs" },
      { id: "REPORTS_BSKY", label: "BSKY & Govt Health Scheme Claims" },
    ]
  },
  { 
    id: "HR_STAFF", 
    label: "HR & Staff",
    subModules: [
      { id: "HR_STAFF_DIR", label: "Staff Directory" },
      { id: "HR_ATTENDANCE", label: "Attendance & Bio-Punch" },
      { id: "HR_ROSTER", label: "Shift Roster" },
      { id: "HR_PAYROLL", label: "Payroll" },
    ]
  },
  {
    id: "WHATSAPP",
    label: "WhatsApp Center",
    subModules: [
      { id: "WHATSAPP_INBOX", label: "Inbox (2-Way Chat)" },
      { id: "WHATSAPP_AUTOMATIONS", label: "Automated Triggers" },
      { id: "WHATSAPP_LOGS", label: "Message Logs" },
      { id: "WHATSAPP_TEMPLATES", label: "Message Templates" },
      { id: "WHATSAPP_CAMPAIGNS", label: "Broadcast Campaigns" },
    ]
  },
  { 
    id: "ADMIN", 
    label: "Admin Settings",
    subModules: [
      { id: "ADMIN_USERS", label: "Users" },
      { id: "ADMIN_ROLES", label: "Role Management" },
      { id: "ADMIN_FEES", label: "Fee Configuration" },
      { id: "ADMIN_LAB_TESTS", label: "Pathology Tests" },
      { id: "ADMIN_RADIOLOGY", label: "Radiology Tests" },
      { id: "ADMIN_BEDS", label: "Beds & Wards" },
      { id: "ADMIN_THEATERS", label: "OT Theaters" },
      { id: "ADMIN_SURGERY", label: "Surgery Procedures" },
      { id: "ADMIN_INVESTMENTS", label: "Investments & Capital" },
      { id: "ADMIN_INSURANCE_PROV", label: "Insurance Providers" },
      { id: "ADMIN_IPD_EQUIP", label: "IPD Equipment" },
      { id: "ADMIN_DISCHARGE_TYPES", label: "Discharge Types" },
      { id: "ADMIN_AUDIT", label: "Audit Logs" },
      { id: "ADMIN_CANTEEN_SETTING", label: "Canteen Settings" },
      { id: "ADMIN_HOSPITAL", label: "Hospital Settings" },
      { id: "ADMIN_WHATSAPP", label: "WhatsApp Configuration & Logs" },
      { id: "ADMIN_PRINT", label: "Print Settings" },
      { id: "ADMIN_GEOFENCING", label: "Geofencing Config" },
      { id: "ADMIN_COA", label: "Chart of Accounts Settings" },
    ]
  },
  { 
    id: "FEEDBACK", 
    label: "Patient Feedback",
    subModules: [
      { id: "FEEDBACK_COMPLAINTS", label: "Complaints & Suggestions" },
    ]
  },
]

// Helper to expand parent modules to include all their sub-modules
function expandPermissions(parentModules: string[]): string[] {
  const expanded = new Set<string>()
  parentModules.forEach(moduleId => {
    expanded.add(moduleId)
    const mod = AVAILABLE_MODULES.find(m => m.id === moduleId)
    if (mod) {
      mod.subModules.forEach(sub => expanded.add(sub.id))
    }
  })
  return Array.from(expanded)
}

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: expandPermissions([
    "BILLING_COUNTER", "CLINICAL", "IPD", "PATHOLOGY", "RADIOLOGY", 
    "PHARMACY", "PHARMACY_FINANCE", "FINANCE", "MASTER_FINANCE", 
    "INSURANCE", "CANTEEN", "AMBULANCE", "INVENTORY", "REPORTS", 
    "HR_STAFF", "WHATSAPP", "ADMIN", "FEEDBACK"
  ]),
  ADMIN: expandPermissions([
    "BILLING_COUNTER", "CLINICAL", "IPD", "PATHOLOGY", "RADIOLOGY", 
    "PHARMACY", "PHARMACY_FINANCE", "FINANCE", "MASTER_FINANCE", 
    "INSURANCE", "CANTEEN", "AMBULANCE", "INVENTORY", "REPORTS", 
    "HR_STAFF", "WHATSAPP", "ADMIN", "FEEDBACK"
  ]),
  DOCTOR: expandPermissions(["CLINICAL", "IPD", "PATHOLOGY", "RADIOLOGY", "FEEDBACK"]),
  NURSE: expandPermissions(["CLINICAL", "IPD", "PATHOLOGY", "RADIOLOGY", "CANTEEN", "AMBULANCE"]),
  RECEPTIONIST: expandPermissions([
    "BILLING_COUNTER", "CLINICAL", "IPD", "FINANCE", "INSURANCE", 
    "PATHOLOGY", "RADIOLOGY", "CANTEEN", "AMBULANCE", "WHATSAPP", "FEEDBACK"
  ]),
  PHARMACIST: expandPermissions(["PHARMACY", "PHARMACY_FINANCE"]),
  LAB_TECHNICIAN: expandPermissions(["PATHOLOGY", "RADIOLOGY"]),
  ACCOUNTANT: expandPermissions([
    "BILLING_COUNTER", "PHARMACY_FINANCE", "FINANCE", "MASTER_FINANCE", 
    "INSURANCE", "REPORTS", "HR_STAFF", "INVENTORY"
  ]),
  BILLING_CLERK: expandPermissions(["BILLING_COUNTER"]),
  CANTEEN_STAFF: expandPermissions(["CANTEEN"]),
  AMBULANCE_DRIVER: expandPermissions(["AMBULANCE"]),
  PATIENT: []
}
