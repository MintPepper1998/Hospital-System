"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Stethoscope,
  Bed,
  Microscope,
  Radiation,
  PillBottle,
  Users,
  Settings,
  Activity,
  HelpCircle,
  LogOut,
  ChevronRight,
  Scissors,
  FileText,
  DollarSign,
  ClipboardList,
  UserPlus,
  FlaskConical,
  ScanLine,
  ShoppingCart,
  Package,
  PackagePlus,
  CalendarDays,
  Building2,
  ShieldCheck,
  UtensilsCrossed,
  BarChart3,
  Siren,
  MessageCircle,
  Bandage,
  Receipt,
  BadgeIndianRupee,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { type LucideIcon } from "lucide-react"

interface DashboardSidebarProps {
  userRole: string
  userName: string
  userEmail: string
  hospitalLogoUrl?: string | null
  hospitalName?: string
  userPermissions?: string[]
}

interface SubItem {
  label: string
  href: string
  permissionId?: string
}

interface NavGroup {
  label: string
  href: string
  icon: LucideIcon
  subItems: SubItem[]
  roles?: string[]
  permissionId?: string
}

const navGroups: NavGroup[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    subItems: [],
  },
  {
    label: "Clinical",
    href: "/dashboard/clinical",
    icon: Stethoscope,
    permissionId: "CLINICAL",
    subItems: [
      { label: "OPD / Queue", href: "/dashboard/clinical/opd", permissionId: "CLINICAL_OPD" },
      { label: "Emergency (ER)", href: "/dashboard/clinical/emergency", permissionId: "CLINICAL_ER" },
      { label: "ER Records", href: "/dashboard/clinical/emergency/records", permissionId: "CLINICAL_ER" },
      { label: "Casualty", href: "/dashboard/casualty", permissionId: "CLINICAL_CASUALTY" },
      { label: "Casualty Records", href: "/dashboard/casualty/records", permissionId: "CLINICAL_CASUALTY" },
      { label: "Operation Theatre", href: "/dashboard/clinical/ot", permissionId: "CLINICAL_OT" },
      { label: "Queue Patient", href: "/dashboard/clinical/emr", permissionId: "CLINICAL_EMR" },
    ],
    roles: ["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"],
  },
  {
    label: "IPD & Beds",
    href: "/dashboard/ipd",
    icon: Bed,
    permissionId: "IPD",
    subItems: [
      { label: "Bed Map", href: "/dashboard/ipd", permissionId: "IPD_BEDS" },
      { label: "Admit Patient", href: "/dashboard/ipd/admission", permissionId: "IPD_ADMISSION" },
      { label: "Discharge", href: "/dashboard/ipd/discharge", permissionId: "IPD_DISCHARGE" },
      { label: "Past Records", href: "/dashboard/ipd/past-records", permissionId: "IPD_PAST_RECORDS" },
    ],
    roles: ["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"],
  },
  {
    label: "Billing Counter",
    href: "/dashboard/billing-counter",
    icon: Receipt,
    permissionId: "BILLING_COUNTER",
    subItems: [
      { label: "Dashboard", href: "/dashboard/billing-counter", permissionId: "BILLING_COUNTER" },
      { label: "OPD Billing", href: "/dashboard/billing-counter/opd", permissionId: "BILLING_COUNTER_OPD" },
      { label: "Casualty Billing", href: "/dashboard/billing-counter/casualty", permissionId: "BILLING_COUNTER_CASUALTY" },
      { label: "Emergency Billing", href: "/dashboard/billing-counter/emergency", permissionId: "BILLING_COUNTER_ER" },
      { label: "Surgery/OT Billing", href: "/dashboard/billing-counter/surgery", permissionId: "BILLING_COUNTER_OT" },
      { label: "IPD Billing", href: "/dashboard/billing-counter/ipd", permissionId: "BILLING_COUNTER_IPD" },
      { label: "Diagnostics Billing", href: "/dashboard/billing-counter/diagnostics", permissionId: "BILLING_COUNTER_DIAGNOSTICS" },
      { label: "Ambulance Billing", href: "/dashboard/billing-counter/ambulance", permissionId: "BILLING_COUNTER_AMBULANCE" },
      { label: "Custom Services", href: "/dashboard/billing-counter/custom", permissionId: "BILLING_COUNTER_CUSTOM" },
      { label: "Bill History", href: "/dashboard/billing-counter/history", permissionId: "BILLING_COUNTER_HISTORY" },
    ],
    roles: ["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST", "BILLING_CLERK"],
  },
  {
    label: "Pathology",
    href: "/dashboard/lab",
    icon: Microscope,
    permissionId: "PATHOLOGY",
    subItems: [
      { label: "Collection Queue", href: "/dashboard/lab/queue", permissionId: "PATHOLOGY_QUEUE" },
      { label: "Reports", href: "/dashboard/lab/reports", permissionId: "PATHOLOGY_REPORTS" },
    ],
    roles: ["SUPER_ADMIN", "DOCTOR", "LAB_TECHNICIAN"],
  },
  {
    label: "Radiology",
    href: "/dashboard/radiology",
    icon: Radiation,
    permissionId: "RADIOLOGY",
    subItems: [
      { label: "Imaging Queue", href: "/dashboard/radiology/queue", permissionId: "RADIOLOGY_QUEUE" },
      { label: "Reports", href: "/dashboard/radiology/reports", permissionId: "RADIOLOGY_REPORTS" },
    ],
    roles: ["SUPER_ADMIN", "DOCTOR", "LAB_TECHNICIAN"],
  },
  {
    label: "Pharmacy",
    href: "/dashboard/pharmacy",
    icon: PillBottle,
    permissionId: "PHARMACY",
    subItems: [
      { label: "Dashboard", href: "/dashboard/pharmacy", permissionId: "PHARMACY" },
      { label: "POS Billing", href: "/dashboard/pharmacy/pos/billing", permissionId: "PHARMACY_POS_BILLING" },
      { label: "Billing Pharmacy", href: "/dashboard/pharmacy/bills", permissionId: "PHARMACY_BILLS" },
      { label: "Medicine Out", href: "/dashboard/pharmacy/medicine-out", permissionId: "PHARMACY_MEDICINE_OUT" },
      { label: "Prescriptions", href: "/dashboard/pharmacy/pos", permissionId: "PHARMACY_PRESCRIPTIONS" },
      { label: "Customer Returns", href: "/dashboard/pharmacy/sales-returns", permissionId: "PHARMACY_CUSTOMER_RETURNS" },
      { label: "Inventory", href: "/dashboard/pharmacy/inventory", permissionId: "PHARMACY_INVENTORY" },
      { label: "OT Medicine", href: "/dashboard/pharmacy/ot-medicine", permissionId: "PHARMACY_OT_MEDICINE" },
      { label: "Challans", href: "/dashboard/pharmacy/challans", permissionId: "PHARMACY_CHALLANS" },
      { label: "Purchase Invoices", href: "/dashboard/pharmacy/purchase-invoices", permissionId: "PHARMACY_PURCHASE_INVOICES" },
      { label: "Purchase Returns", href: "/dashboard/pharmacy/purchase-returns", permissionId: "PHARMACY_PURCHASE_RETURNS" },
      { label: "Suppliers", href: "/dashboard/pharmacy/suppliers", permissionId: "PHARMACY_SUPPLIERS" },
    ],
    roles: ["SUPER_ADMIN", "PHARMACIST"],
  },
  {
    label: "Pharmacy Finance",
    href: "/dashboard/pharmacy-finance",
    icon: BadgeIndianRupee,
    permissionId: "PHARMACY_FINANCE",
    roles: ["SUPER_ADMIN", "PHARMACIST", "ACCOUNTANT"],
    subItems: [
      { label: "Overview",            href: "/dashboard/pharmacy-finance", permissionId: "PHARMACY_FINANCE_VIEW" },
      { label: "Sales Register",      href: "/dashboard/pharmacy-finance/sales", permissionId: "PHARMACY_FINANCE_SALES" },
      { label: "Returns & Refunds",   href: "/dashboard/pharmacy-finance/returns", permissionId: "PHARMACY_FINANCE_SALES" },
      { label: "Receivables",         href: "/dashboard/pharmacy-finance/receivables", permissionId: "PHARMACY_FINANCE_RECEIVABLES" },
      { label: "IPD Settlements",     href: "/dashboard/pharmacy-finance/ipd-settlements", permissionId: "PHARMACY_FINANCE_RECEIVABLES" },
      { label: "Payables",            href: "/dashboard/pharmacy-finance/payables", permissionId: "PHARMACY_FINANCE_PAYABLES" },
      { label: "Purchase Register",   href: "/dashboard/pharmacy-finance/purchases", permissionId: "PHARMACY_FINANCE_PAYABLES" },
      { label: "Expenses",            href: "/dashboard/pharmacy-finance/expenses", permissionId: "PHARMACY_FINANCE_MANAGE" },
      { label: "Chart of Accounts",   href: "/dashboard/pharmacy-finance/chart-of-accounts", permissionId: "PHARMACY_FINANCE_VIEW" },
      { label: "General Ledger",      href: "/dashboard/pharmacy-finance/general-ledger", permissionId: "PHARMACY_FINANCE_VIEW" },
      { label: "Voucher Entry",       href: "/dashboard/pharmacy-finance/vouchers", permissionId: "PHARMACY_FINANCE_VOUCHERS" },
      { label: "Cash & Bank",         href: "/dashboard/pharmacy-finance/accounts", permissionId: "PHARMACY_FINANCE_ACCOUNTS" },
      { label: "Day Close",           href: "/dashboard/pharmacy-finance/day-close", permissionId: "PHARMACY_FINANCE_DAYCLOSE" },
      { label: "Inventory Value",     href: "/dashboard/pharmacy-finance/inventory-value", permissionId: "PHARMACY_FINANCE_VIEW" },
      { label: "Profit & Loss",       href: "/dashboard/pharmacy-finance/pnl", permissionId: "PHARMACY_FINANCE_REPORTS" },
      { label: "GST Summary",         href: "/dashboard/pharmacy-finance/gst", permissionId: "PHARMACY_FINANCE_REPORTS" },
    ],
  },
  {
    label: "Canteen",
    href: "/dashboard/canteen",
    icon: UtensilsCrossed,
    permissionId: "CANTEEN",
    subItems: [
      { label: "Dashboard", href: "/dashboard/canteen", permissionId: "CANTEEN_DASHBOARD" },
      { label: "Daily Menu", href: "/dashboard/canteen/menu", permissionId: "CANTEEN_MENU" },
      { label: "IPD Diet Plans", href: "/dashboard/canteen/ipd-diets", permissionId: "CANTEEN_IPD_DIETS" },
      { label: "Token Counter", href: "/dashboard/canteen/tokens", permissionId: "CANTEEN_TOKENS" },
      { label: "Inventory", href: "/dashboard/canteen/inventory", permissionId: "CANTEEN_INVENTORY" },
      { label: "Reports", href: "/dashboard/canteen/reports", permissionId: "CANTEEN_REPORTS" },
    ],
    roles: ["SUPER_ADMIN", "CANTEEN_STAFF", "NURSE", "RECEPTIONIST"],
  },
  {
    label: "Ambulance",
    href: "/dashboard/ambulance",
    icon: Siren,
    permissionId: "AMBULANCE",
    subItems: [
      { label: "Dashboard", href: "/dashboard/ambulance", permissionId: "AMBULANCE_DASHBOARD" },
      { label: "Fleet", href: "/dashboard/ambulance/fleet", permissionId: "AMBULANCE_FLEET" },
      { label: "Trips", href: "/dashboard/ambulance/trips", permissionId: "AMBULANCE_TRIPS" },
      { label: "Staff", href: "/dashboard/ambulance/staff", permissionId: "AMBULANCE_STAFF" },
      { label: "Billing", href: "/dashboard/ambulance/billing", permissionId: "AMBULANCE_BILLING" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN", "AMBULANCE_DRIVER", "NURSE", "RECEPTIONIST"],
  },
  {
    label: "General Inventory",
    href: "/dashboard/inventory/general",
    icon: Package,
    permissionId: "INVENTORY",
    subItems: [
      { label: "Assets & Items", href: "/dashboard/inventory/general", permissionId: "INVENTORY_GENERAL" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: DollarSign,
    permissionId: "FINANCE",
    subItems: [
      { label: "Overview / Ledger", href: "/dashboard/finance", permissionId: "FINANCE_OVERVIEW" },
      { label: "Accounts", href: "/dashboard/finance/accounts", permissionId: "FINANCE_ACCOUNTS" },
      { label: "Credit / Dues", href: "/dashboard/finance/credit", permissionId: "FINANCE_CREDIT" },
      { label: "Purchases & Suppliers", href: "/dashboard/finance/purchases", permissionId: "FINANCE_PURCHASES" },
      { label: "Billing", href: "/dashboard/finance/billing", permissionId: "FINANCE_BILLING" },
      { label: "Diagnostic Billing", href: "/dashboard/billing/diagnostics", permissionId: "FINANCE_DIAGNOSTIC" },
      { label: "Tax & Reports", href: "/dashboard/finance/taxes", permissionId: "FINANCE_TAXES" },
      { label: "Insurance / TPA", href: "/dashboard/finance/insurance-tpa", permissionId: "FINANCE_INSURANCE" },
      { label: "BSKY Claims", href: "/dashboard/finance/bsky-claims", permissionId: "FINANCE_BSKY" },
    ],
    roles: ["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"],
  },
  {
    label: "Insurance",
    href: "/dashboard/insurance",
    icon: ShieldCheck,
    permissionId: "INSURANCE",
    subItems: [
      { label: "Verify & Register", href: "/dashboard/insurance/verify", permissionId: "INSURANCE_VERIFY" },
      { label: "Active Policies", href: "/dashboard/insurance/policies", permissionId: "INSURANCE_POLICIES" },
      { label: "Pre-Authorization", href: "/dashboard/insurance/pre-auth", permissionId: "INSURANCE_PREAUTH" },
      { label: "Cost Estimator", href: "/dashboard/insurance/estimate", permissionId: "INSURANCE_ESTIMATE" },
      { label: "Cashless Claims", href: "/dashboard/insurance/claims/cashless", permissionId: "INSURANCE_CASHLESS" },
      { label: "Reimbursement", href: "/dashboard/insurance/claims/reimbursement", permissionId: "INSURANCE_REIMBURSEMENT" },
      { label: "PMJAY Claims", href: "/dashboard/finance/pmjay-claims", permissionId: "INSURANCE_PMJAY" },
      { label: "Tariff Master", href: "/dashboard/insurance/tariff", permissionId: "INSURANCE_TARIFF" },
      { label: "ICD-10 Codes", href: "/dashboard/insurance/icd-codes", permissionId: "INSURANCE_ICD" },
    ],
    roles: ["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"],
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    permissionId: "REPORTS",
    subItems: [
      { label: "Overview", href: "/dashboard/reports", permissionId: "REPORTS_DASHBOARD" },
      { label: "Hospital P&L", href: "/dashboard/reports/hospital-pnl", permissionId: "REPORTS_PNL" },
      { label: "Medicine P&L", href: "/dashboard/reports/medicine-pnl", permissionId: "REPORTS_PNL" },
      { label: "Combined P&L", href: "/dashboard/reports/combined-pnl", permissionId: "REPORTS_PNL" },
      { label: "Day Book", href: "/dashboard/reports/day-book", permissionId: "REPORTS_DAYBOOK" },
      { label: "OPD/IPD Revenue", href: "/dashboard/reports/opd-ipd-revenue", permissionId: "REPORTS_REVENUE" },
      { label: "Doctor Payouts", href: "/dashboard/reports/doctor-payouts", permissionId: "REPORTS_DOCTOR_PAYOUTS" },
      { label: "GST Reports", href: "/dashboard/reports/gstr-3b", permissionId: "REPORTS_GST" },
      { label: "OT Logs", href: "/dashboard/reports/ot-logs", permissionId: "REPORTS_OT" },
      { label: "BSKY Claims", href: "/dashboard/reports/bsky-claims", permissionId: "REPORTS_BSKY" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    label: "Master Finance",
    href: "/dashboard/master-finance",
    icon: BadgeIndianRupee,
    permissionId: "MASTER_FINANCE",
    subItems: [
      { label: "Overview", href: "/dashboard/master-finance", permissionId: "MASTER_FINANCE_DASHBOARD" },
      { label: "Chart of Accounts", href: "/dashboard/master-finance/chart-of-accounts", permissionId: "MASTER_FINANCE_COA" },
      { label: "General Ledger", href: "/dashboard/master-finance/general-ledger", permissionId: "MASTER_FINANCE_LEDGER" },
      { label: "Day Book", href: "/dashboard/master-finance/day-book", permissionId: "MASTER_FINANCE_DAYBOOK" },
      { label: "Day Close", href: "/dashboard/master-finance/day-close", permissionId: "MASTER_FINANCE_DAYCLOSE" },
      { label: "Voucher Entry", href: "/dashboard/master-finance/vouchers", permissionId: "MASTER_FINANCE_VOUCHERS" },
      { label: "Billing & Invoices", href: "/dashboard/master-finance/billing", permissionId: "MASTER_FINANCE_BILLING" },
      { label: "Credit & Receivables", href: "/dashboard/master-finance/receivables/patient-dues", permissionId: "MASTER_FINANCE_RECEIVABLES" },
      { label: "Purchases & Payables", href: "/dashboard/master-finance/payables/invoices", permissionId: "MASTER_FINANCE_PAYABLES" },
      { label: "Supplier Directory", href: "/dashboard/master-finance/payables/suppliers", permissionId: "MASTER_FINANCE_SUPPLIERS" },
      { label: "Cash & Bank", href: "/dashboard/master-finance/cash-bank/accounts", permissionId: "MASTER_FINANCE_CASH_BANK" },
      { label: "Payroll", href: "/dashboard/master-finance/payroll", permissionId: "MASTER_FINANCE_PAYROLL" },
      { label: "Statements", href: "/dashboard/master-finance/statements/pnl", permissionId: "MASTER_FINANCE_STATEMENTS" },
    ],
    roles: ["SUPER_ADMIN", "ACCOUNTANT"],
  },
  {
    label: "HR & Staff",
    href: "/dashboard/hr",
    icon: Users,
    permissionId: "HR_STAFF",
    subItems: [
      { label: "Staff Directory", href: "/dashboard/hr/staff", permissionId: "HR_STAFF_DIR" },
      { label: "Attendance", href: "/dashboard/hr/attendance", permissionId: "HR_ATTENDANCE" },
      { label: "Shift Roster", href: "/dashboard/hr/roster", permissionId: "HR_ROSTER" },
      { label: "Payroll", href: "/dashboard/hr/payroll", permissionId: "HR_PAYROLL" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    label: "Patient Feedback",
    href: "/dashboard/feedback",
    icon: HelpCircle,
    permissionId: "FEEDBACK",
    subItems: [
      { label: "Complaints & Suggestions", href: "/dashboard/feedback", permissionId: "FEEDBACK_COMPLAINTS" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN", "RECEPTIONIST"],
  },
  {
    label: "WhatsApp Center",
    href: "/dashboard/whatsapp",
    icon: MessageCircle,
    permissionId: "WHATSAPP",
    subItems: [
      { label: "Inbox (2-Way)", href: "/dashboard/whatsapp/inbox", permissionId: "WHATSAPP_INBOX" },
      { label: "Automations", href: "/dashboard/whatsapp/automations", permissionId: "WHATSAPP_AUTOMATIONS" },
      { label: "Logs", href: "/dashboard/whatsapp/logs", permissionId: "WHATSAPP_LOGS" },
      { label: "Templates", href: "/dashboard/whatsapp/templates", permissionId: "WHATSAPP_TEMPLATES" },
      { label: "Campaigns", href: "/dashboard/whatsapp/campaigns", permissionId: "WHATSAPP_CAMPAIGNS" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN", "RECEPTIONIST"],
  },
  {
    label: "Admin",
    href: "/dashboard/admin",
    icon: Settings,
    permissionId: "ADMIN",
    subItems: [
      { label: "Users", href: "/dashboard/admin/users", permissionId: "ADMIN_USERS" },
      { label: "Role Management", href: "/dashboard/admin/roles", permissionId: "ADMIN_ROLES" },
      { label: "Fee Configuration", href: "/dashboard/admin/fees", permissionId: "ADMIN_FEES" },
      { label: "Pathology Tests", href: "/dashboard/admin/settings/lab-tests", permissionId: "ADMIN_LAB_TESTS" },
      { label: "Radiology Tests", href: "/dashboard/admin/settings/radiology", permissionId: "ADMIN_RADIOLOGY" },
      { label: "Beds & Wards", href: "/dashboard/admin/beds", permissionId: "ADMIN_BEDS" },
      { label: "OT Theaters", href: "/dashboard/admin/theaters", permissionId: "ADMIN_THEATERS" },
      { label: "Surgery Procedures", href: "/dashboard/admin/surgery-procedures", permissionId: "ADMIN_SURGERY" },
      { label: "Investments & Capital", href: "/dashboard/admin/investments", permissionId: "ADMIN_INVESTMENTS" },
      { label: "Insurance Providers", href: "/dashboard/admin/insurance-providers", permissionId: "ADMIN_INSURANCE_PROV" },
      { label: "IPD Equipment", href: "/dashboard/admin/ipd-equipment", permissionId: "ADMIN_IPD_EQUIP" },
      { label: "Discharge Types", href: "/dashboard/admin/discharge-types", permissionId: "ADMIN_DISCHARGE_TYPES" },
      { label: "Audit Logs", href: "/dashboard/admin/audit-logs", permissionId: "ADMIN_AUDIT" },
      { label: "Canteen Settings", href: "/dashboard/admin/settings/canteen", permissionId: "ADMIN_CANTEEN_SETTING" },
      { label: "Canteen Menu", href: "/dashboard/canteen/menu", permissionId: "CANTEEN_MENU" },
      { label: "Canteen Reports", href: "/dashboard/canteen/reports", permissionId: "CANTEEN_REPORTS" },
      { label: "Hospital Settings", href: "/dashboard/settings/hospital", permissionId: "ADMIN_HOSPITAL" },
      { label: "WhatsApp Logs", href: "/dashboard/admin/whatsapp-logs", permissionId: "ADMIN_WHATSAPP" },
      { label: "Print Settings", href: "/dashboard/settings/print", permissionId: "ADMIN_PRINT" },
      { label: "Geofencing Config", href: "/dashboard/admin/geofencing-config", permissionId: "ADMIN_GEOFENCING" },
      { label: "Chart of Accounts", href: "/dashboard/settings/chart-of-accounts", permissionId: "ADMIN_COA" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
]

export function DashboardSidebar({ userRole, userName, userEmail, hospitalLogoUrl, hospitalName, userPermissions = [] }: DashboardSidebarProps) {
  const pathname = usePathname()

  // Filter nav groups based on user role and permissions
  const visibleGroups = navGroups.map(group => {
    // Determine if the parent group is accessible
    let isParentAccessible = false
    
    if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") {
      isParentAccessible = true
    } else if (group.permissionId && userPermissions.length > 0) {
      // Check if user has explicit parent module permission OR if they have legacy access
      isParentAccessible = userPermissions.includes(group.permissionId)
    } else if (group.roles) {
      isParentAccessible = group.roles.includes(userRole)
    } else {
      isParentAccessible = true // e.g., Dashboard
    }

    // Filter sub-items based on permissions
    const filteredSubItems = group.subItems.filter(sub => {
      if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true
      if (!sub.permissionId) return true // No sub-permission required
      
      // If user has the sub-permission explicitly OR has parent module permission
      if (userPermissions.includes(sub.permissionId)) return true
      if (sub.permissionId === "BILLING_COUNTER_IPD" && userPermissions.includes("IPD_BILLING")) return true
      if (group.permissionId && userPermissions.includes(group.permissionId)) return true

      return false
    })

    return {
      ...group,
      subItems: filteredSubItems,
      isParentAccessible
    }
  }).filter(group => {
    if (!group.isParentAccessible) return false
    // Hide parent if it has sub-items defined but all were filtered out
    if (group.subItems.length === 0 && (navGroups.find(g => g.label === group.label)?.subItems.length ?? 0) > 0) {
      return false
    }
    return true
  })

  // Check if a group is expanded (current path starts with group's href)
  const isGroupExpanded = (group: NavGroup) => {
    if (group.href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === group.href || pathname.startsWith(group.href + "/") ||
      group.subItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href + "/"))
  }

  // Collect all sub-item hrefs for precise active detection
  const allSubHrefs = visibleGroups.flatMap(g => g.subItems.map(s => s.href))

  // Check if a link is active (exact match preferred, startsWith only if no sibling is more specific)
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    // Exact match always wins
    if (pathname === href) return true
    // startsWith match — but only if no other sub-item is a more specific match
    if (pathname.startsWith(href + "/")) {
      const hasMoreSpecificSibling = allSubHrefs.some(
        other => other !== href && other.startsWith(href + "/") && pathname.startsWith(other)
      )
      return !hasMoreSpecificSibling
    }
    return false
  }

  // Check if any sub-item is active, or the group's own href matches
  const hasActiveSubItem = (group: NavGroup) => {
    // If we're on the group's own page (e.g., /dashboard/pharmacy), count as active
    if (pathname === group.href) return true
    return group.subItems.some(sub => isActive(sub.href))
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-4 flex items-center justify-center min-h-[100px] border-b border-white/10">
        <Link href="/dashboard" className="w-full flex items-center justify-center" aria-label="Dashboard Home">
          <div className="bg-card border border-border rounded-[1.5rem] p-3 flex items-center justify-center shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={hospitalLogoUrl || "/shree-kamal-logo.png"} 
              alt={`${hospitalName || "Hospital"} Logo`} 
              className="w-auto h-auto max-w-[140px] max-h-[70px] object-contain drop-shadow-sm"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = "true";
                  target.src = "/shree-kamal-logo.png";
                }
              }}
            />
          </div>
        </Link>
      </div>

      {/* Menu Label */}
      <div className="px-6 pt-6 pb-2">
        <span className="text-[10px] font-black text-blue-200 uppercase tracking-wider">Menu</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto scrollbar-hide py-2">
        <ul className="space-y-2">
          {visibleGroups.map((group) => {
            const expanded = isGroupExpanded(group)
            const groupActive = group.subItems.length === 0
              ? isActive(group.href)
              : hasActiveSubItem(group)

            return (
              <li key={group.href}>
                {/* Parent Link */}
                <Link
                  href={group.subItems.length > 0 ? group.subItems[0].href : group.href}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200",
                    groupActive || expanded
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <group.icon className={cn(
                      "h-5 w-5",
                      groupActive || expanded ? "text-white" : "text-blue-200"
                    )} />
                    <span>{group.label}</span>
                  </div>
                  {group.subItems.length > 0 && (
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      expanded ? "rotate-90" : "",
                      groupActive || expanded ? "text-white" : "text-blue-200"
                    )} />
                  )}
                </Link>

                {/* Sub Items - Only show when expanded */}
                {expanded && group.subItems.length > 0 && (
                  <ul className="mt-2 ml-6 pl-4 border-l border-white/20 space-y-1.5">
                    {group.subItems.map((subItem) => {
                      const subActive = isActive(subItem.href)
                      return (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={cn(
                              "block px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                              subActive
                                ? "text-sidebar-accent-foreground bg-sidebar-accent"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            {subItem.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/10 space-y-3 pb-6">
        <Link
          href="/dashboard/updates"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-sidebar-foreground/70 hover:bg-sidebar-accent transition-all"
        >
          <Activity className="h-5 w-5 text-blue-200" />
          <span>Updates</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 bg-sidebar-accent/50 hover:bg-sidebar-accent transition-all"
        >
          <LogOut className="h-5 w-5 text-red-400" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
