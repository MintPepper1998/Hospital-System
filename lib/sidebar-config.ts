import {
  Activity,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Home,
  PillBottle,
  Settings,
  Stethoscope,
  Users,
  Microscope,
  ShieldCheck,
  UserCircle,
  ShoppingCart,
  Package,
  Bed,
  UserPlus,
  FlaskConical,
  Scissors,
  Radiation,
  ScanLine,
  Receipt,
  CalendarDays,
  UserCog,
  LogOut,
  ClipboardCheck,
  Calculator,
  CreditCard,
  BookOpen,
  IndianRupee,
  FileCheck,
  UserCheck,
  UtensilsCrossed,
  Coffee,
  Salad,
  Ticket,
  BarChart3,
  Siren,
  Truck,
  MapPin,
  History,
  ClipboardList,
  type LucideIcon,
} from "lucide-react"

export interface MenuItem {
  title: string
  icon: LucideIcon
  url?: string
  items: Array<{
    title: string
    icon: LucideIcon
    url: string
  }>
  roles?: string[] // If specified, only these roles can see this menu
}

// ============================================
// SIDEBAR MENU ITEMS WITH ROLE-BASED VISIBILITY
// ============================================
// roles[] = which roles CAN see this section.
// If roles is omitted/empty, everyone sees it.
// SUPER_ADMIN is included everywhere by default via getMenuItemsForRole().
// ============================================

const allMenuItems: MenuItem[] = [
  // ── Dashboard ────────────────────────────
  {
    title: "Dashboard",
    icon: Home,
    url: "/dashboard",
    items: [],
    // Visible to everyone
  },

  // ── Clinical (OPD, OT, EMR) ──────────────
  {
    title: "Clinical",
    icon: Stethoscope,
    items: [
      { title: "OPD", icon: Activity, url: "/dashboard/clinical/opd" },
      { title: "Operation Theatre", icon: Scissors, url: "/dashboard/clinical/ot" },
      { title: "Queue Patient", icon: FileText, url: "/dashboard/clinical/emr" },
    ],
    roles: ["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"],
  },

  // ── IPD (Bed Map, Admission, Discharge) ──
  {
    title: "IPD",
    icon: Building2,
    items: [
      { title: "Bed Map", icon: Bed, url: "/dashboard/ipd" },
      { title: "Admit Patient", icon: UserPlus, url: "/dashboard/ipd/admission" },
      { title: "Discharge", icon: LogOut, url: "/dashboard/ipd/discharge" },
      { title: "Past Records", icon: History, url: "/dashboard/ipd/past-records" },
    ],
    roles: ["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"],
  },

  // ── Pathology ────────────────────────────
  {
    title: "Pathology",
    icon: Microscope,
    items: [
      { title: "Queue", icon: FlaskConical, url: "/dashboard/lab/queue" },
      { title: "Reports", icon: FileText, url: "/dashboard/lab/reports" },
    ],
    roles: ["SUPER_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "NURSE", "RECEPTIONIST"],
  },

  // ── Radiology ────────────────────────────
  {
    title: "Radiology",
    icon: Radiation,
    items: [
      { title: "Queue", icon: ScanLine, url: "/dashboard/radiology/queue" },
      { title: "Reports", icon: FileText, url: "/dashboard/radiology/reports" },
    ],
    roles: ["SUPER_ADMIN", "DOCTOR", "LAB_TECHNICIAN", "NURSE", "RECEPTIONIST"],
  },

  // ── Pharmacy ─────────────────────────────
  {
    title: "Pharmacy",
    icon: PillBottle,
    items: [
      { title: "POS Billing", icon: ShoppingCart, url: "/dashboard/pharmacy/pos/billing" },
      { title: "Prescriptions", icon: FileText, url: "/dashboard/pharmacy/pos" },
      { title: "Queue (Table)", icon: Activity, url: "/dashboard/pharmacy/queue" },
      { title: "Inventory", icon: Package, url: "/dashboard/pharmacy/inventory" },
      { title: "OT Medicine", icon: Scissors, url: "/dashboard/pharmacy/ot-medicine" },
      { title: "Challans", icon: ClipboardList, url: "/dashboard/pharmacy/challans" },
    ],
    roles: ["SUPER_ADMIN", "PHARMACIST", "ACCOUNTANT"],
  },

  // ── Canteen ───────────────────────────────
  {
    title: "Canteen",
    icon: UtensilsCrossed,
    items: [
      { title: "Dashboard", icon: Coffee, url: "/dashboard/canteen" },
      { title: "Daily Menu", icon: Salad, url: "/dashboard/canteen/menu" },
      { title: "IPD Diet Plans", icon: ClipboardCheck, url: "/dashboard/canteen/ipd-diets" },
      { title: "Token Counter", icon: Ticket, url: "/dashboard/canteen/tokens" },
      { title: "Inventory", icon: Package, url: "/dashboard/canteen/inventory" },
      { title: "Reports", icon: BarChart3, url: "/dashboard/canteen/reports" },
    ],
    roles: ["SUPER_ADMIN", "CANTEEN_STAFF", "NURSE", "RECEPTIONIST"],
  },

  // ── Ambulance ──────────────────────────────
  {
    title: "Ambulance",
    icon: Siren,
    items: [
      { title: "Dashboard", icon: Activity, url: "/dashboard/ambulance" },
      { title: "Fleet", icon: Truck, url: "/dashboard/ambulance/fleet" },
      { title: "Trips", icon: MapPin, url: "/dashboard/ambulance/trips" },
      { title: "Staff", icon: Users, url: "/dashboard/ambulance/staff" },
      { title: "Billing", icon: Receipt, url: "/dashboard/ambulance/billing" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN", "AMBULANCE_DRIVER", "NURSE", "RECEPTIONIST"],
  },

  // ── Finance ──────────────────────────────
  {
    title: "Finance",
    icon: DollarSign,
    items: [
      { title: "Overview / Ledger", icon: DollarSign, url: "/dashboard/finance" },
      { title: "Billing", icon: FileText, url: "/dashboard/finance/billing" },
      { title: "Diagnostic Billing", icon: Receipt, url: "/dashboard/billing/diagnostics" },
      { title: "Tax & Reports", icon: CalendarDays, url: "/dashboard/finance/taxes" },
      { title: "Insurance/TPA", icon: ShieldCheck, url: "/dashboard/finance/insurance-tpa" },
      { title: "BSKY Claims", icon: ShieldCheck, url: "/dashboard/finance/bsky-claims" },
      { title: "GST Configuration", icon: Settings, url: "/dashboard/finance/gst" },
    ],
    roles: ["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"],
  },

  // ── Insurance ─────────────────────────────
  {
    title: "Insurance",
    icon: ShieldCheck,
    items: [
      { title: "Verify & Register", icon: UserCheck, url: "/dashboard/insurance/verify" },
      { title: "Active Policies", icon: FileCheck, url: "/dashboard/insurance/policies" },
      { title: "Pre-Authorization", icon: ClipboardCheck, url: "/dashboard/insurance/pre-auth" },
      { title: "Cost Estimator", icon: Calculator, url: "/dashboard/insurance/estimate" },
      { title: "Cashless Claims", icon: CreditCard, url: "/dashboard/insurance/claims/cashless" },
      { title: "Reimbursement", icon: Receipt, url: "/dashboard/insurance/claims/reimbursement" },
      { title: "PMJAY Claims", icon: Building2, url: "/dashboard/finance/pmjay-claims" },
      { title: "BSKY Claims", icon: ShieldCheck, url: "/dashboard/finance/bsky-claims" },
      { title: "Tariff Master", icon: IndianRupee, url: "/dashboard/insurance/tariff" },
      { title: "ICD-10 Codes", icon: BookOpen, url: "/dashboard/insurance/icd-codes" },
    ],
    roles: ["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"],
  },

  // ── Reports ──────────────────────────────
  {
    title: "Reports",
    icon: FileText,
    url: "/dashboard/reports",
    items: [],
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },

  // ── HR & Staff ───────────────────────────
  {
    title: "HR & Staff",
    icon: UserCog,
    items: [
      { title: "Staff Directory", icon: Users, url: "/dashboard/hr/staff" },
      { title: "Shift Roster", icon: CalendarDays, url: "/dashboard/hr/roster" },
      { title: "Payroll", icon: Receipt, url: "/dashboard/hr/payroll" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },

  // ── Admin ────────────────────────────────
  {
    title: "Admin",
    icon: Settings,
    items: [
      { title: "Users", icon: Users, url: "/dashboard/admin/users" },
      { title: "Pathology Tests", icon: Microscope, url: "/dashboard/admin/settings/lab-tests" },
      { title: "Radiology Tests", icon: Radiation, url: "/dashboard/admin/settings/radiology" },
      { title: "Beds & Wards", icon: Bed, url: "/dashboard/admin/beds" },
      { title: "Theaters", icon: Building2, url: "/dashboard/admin/theaters" },
      { title: "Audit Logs", icon: FileText, url: "/dashboard/admin/audit-logs" },
      { title: "Geofencing Config", icon: ShieldCheck, url: "/dashboard/admin/geofencing-config" },
      { title: "Investments & Capital", icon: DollarSign, url: "/dashboard/admin/investments" },
      { title: "Hospital Settings", icon: Building2, url: "/dashboard/settings/hospital" },
      // Canteen Admin
      { title: "Canteen Settings", icon: UtensilsCrossed, url: "/dashboard/admin/settings/canteen" },
      { title: "Canteen Menu", icon: Salad, url: "/dashboard/canteen/menu" },
      { title: "Canteen Diet Plans", icon: ClipboardCheck, url: "/dashboard/canteen/ipd-diets" },
      { title: "Canteen Reports", icon: BarChart3, url: "/dashboard/canteen/reports" },
    ],
    roles: ["SUPER_ADMIN", "ADMIN"],
  },

  // ── Patient Portal ───────────────────────
  {
    title: "Patient Portal",
    icon: UserCircle,
    url: "/dashboard/patient-portal",
    items: [],
    roles: ["SUPER_ADMIN", "PATIENT"],
  },
]

// ============================================
// FILTER FUNCTION
// ============================================

export function getMenuItemsForRole(userRole: string): MenuItem[] {
  return allMenuItems.filter((item) => {
    // No roles specified → visible to everyone
    if (!item.roles || item.roles.length === 0) {
      return true
    }
    // SUPER_ADMIN always sees everything (safety net)
    if (userRole === "SUPER_ADMIN") {
      return true
    }
    // Check if the user's role is in the allowed list
    return item.roles.includes(userRole)
  })
}
