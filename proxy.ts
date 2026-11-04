import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

// ============================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================
// SUPER_ADMIN bypasses all restrictions.
// PHARMACIST uses an ALLOW-list (can ONLY access specific paths).
// All other roles use a BLOCK-list (everything is open except listed paths).
// ============================================

/**
 * Paths a PHARMACIST is ALLOWED to access.
 * Everything else under /dashboard is blocked for them.
 */
const pharmacistAllowedPaths = [
  "/dashboard",                    // Main dashboard home (exact)
  "/dashboard/pharmacy",           // All pharmacy sub-pages
  "/dashboard/pharmacy/inventory", // Inventory
  "/dashboard/pharmacy/pos",       // POS & prescriptions
  "/dashboard/pharmacy/queue",     // Queue
  "/dashboard/pharmacy/bills",     // Bills listing + edit/refund
  "/dashboard/pharmacy/settings",  // Pharmacist settings page
  "/dashboard/finance/billing",    // View bill invoice (read-only)
  "/dashboard/profile",            // User profile page
]

const billingClerkAllowedPaths = [
  "/dashboard/billing-counter",
  // Legacy department screens are reached from Billing Counter but remain billing-only.
  "/dashboard/billing/diagnostics",
  "/dashboard/ambulance/billing",
  "/dashboard/profile",
]

/**
 * For roles that use a block-list, these are the path prefixes they CANNOT access.
 */
const roleBlockedPaths: Record<string, string[]> = {
  DOCTOR: [
    "/dashboard/admin",
    "/dashboard/finance",
    "/dashboard/inventory",
    "/dashboard/hr",
    "/dashboard/pharmacy/inventory",
    "/dashboard/pharmacy/pos/billing",
    "/dashboard/patient-portal",
  ],
  NURSE: [
    "/dashboard/admin",
    "/dashboard/finance",
    "/dashboard/settings",
    "/dashboard/inventory",
    "/dashboard/hr",
    "/dashboard/pharmacy/pos/billing",
    "/dashboard/pharmacy/inventory",
    "/dashboard/patient-portal",
  ],
  LAB_TECHNICIAN: [
    "/dashboard/admin",
    "/dashboard/finance",
    "/dashboard/hr",
    "/dashboard/inventory",
    "/dashboard/pharmacy",
    "/dashboard/ipd/admission",
    "/dashboard/ipd/discharge",
    "/dashboard/settings",
    "/dashboard/patient-portal",
  ],
  RECEPTIONIST: [
    "/dashboard/admin",
    "/dashboard/inventory",
    "/dashboard/pharmacy/pos/billing",
    "/dashboard/pharmacy/inventory",
    "/dashboard/hr",
    "/dashboard/settings",
    "/dashboard/patient-portal",
  ],
  ACCOUNTANT: [
    "/dashboard/admin",
    "/dashboard/inventory",
    "/dashboard/clinical/ot",
    "/dashboard/clinical/emr",
    "/dashboard/ipd/admission",
    "/dashboard/ipd/discharge",
    "/dashboard/hr",
    "/dashboard/settings",
    "/dashboard/lab",
    "/dashboard/radiology",
    "/dashboard/patient-portal",
  ],
  PATIENT: [
    "/dashboard/admin",
    "/dashboard/finance",
    "/dashboard/hr",
    "/dashboard/inventory",
    "/dashboard/pharmacy",
    "/dashboard/clinical",
    "/dashboard/ipd",
    "/dashboard/lab",
    "/dashboard/radiology",
    "/dashboard/settings",
  ],
}

function isPathBlocked(pathname: string, userRole: string): boolean {
  // SUPER_ADMIN can access everything
  if (userRole === "SUPER_ADMIN") return false

  // PATIENT: strict allow-list — can ONLY access /dashboard/patient-portal/*
  if (userRole === "PATIENT") {
    if (pathname === "/dashboard/patient-portal" || pathname.startsWith("/dashboard/patient-portal/")) {
      return false
    }
    return true
  }

  // Staff roles: block patient-portal access
  if (pathname.startsWith("/dashboard/patient-portal")) {
    return true
  }

  // PHARMACIST: allow-list approach — can ONLY access pharmacy & inventory
  if (userRole === "PHARMACIST") {
    if (pathname === "/dashboard") return false
    const isAllowed = pharmacistAllowedPaths.some(
      (allowed) => allowed !== "/dashboard" && pathname.startsWith(allowed)
    )
    return !isAllowed
  }

  // BILLING_CLERK: strict allow-list — only the counter workspace and profile.
  if (userRole === "BILLING_CLERK") {
    return !billingClerkAllowedPaths.some((allowed) => pathname.startsWith(allowed))
  }

  // All other roles: block-list approach
  const blocked = roleBlockedPaths[userRole]
  if (!blocked) return false

  return blocked.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Where to redirect a user when they hit a blocked page,
 * or as their default landing page after login.
 */
export function getRoleHomePage(role: string): string {
  switch (role) {
    case "DOCTOR":
      return "/dashboard/clinical/opd"
    case "PHARMACIST":
      return "/dashboard/pharmacy/pos"
    case "BILLING_CLERK":
      return "/dashboard/billing-counter"
    case "RECEPTIONIST":
      return "/dashboard"
    case "ACCOUNTANT":
      return "/dashboard/finance/billing"
    case "NURSE":
      return "/dashboard"
    case "LAB_TECHNICIAN":
      return "/dashboard/lab/queue"
    case "SUPER_ADMIN":
      return "/dashboard"
    case "PATIENT":
      return "/dashboard/patient-portal"
    default:
      return "/dashboard"
  }
}

// ============================================
// MIDDLEWARE
// ============================================

// Paths that must bypass ALL auth checks (Meta webhook verification, etc.)
const PUBLIC_API_PATHS = [
  "/api/whatsapp/webhook",
  "/api/auth",
  "/api/public",
]

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))
}

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl

  // ⚡ Fast-path: let whitelisted API paths through immediately — no auth check
  if (isPublicApiPath(pathname)) {
    return NextResponse.next()
  }

  const session = req.auth

  // 1. Unauthenticated user tries /dashboard → redirect to sign-in
  if (!session && pathname.startsWith("/dashboard")) {
    const signInUrl = new URL("/login", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return Response.redirect(signInUrl)
  }

  // 2. Unauthenticated user tries /api → 401
  if (!session && pathname.startsWith("/api")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 3. Authenticated user → enforce RBAC on /dashboard routes
  if (session && pathname.startsWith("/dashboard")) {
    const role = session.user?.role

    if (!role) {
      return Response.redirect(new URL("/login", req.url))
    }

    if (isPathBlocked(pathname, role)) {
      const homePage = getRoleHomePage(role)
      return Response.redirect(new URL(homePage, req.url))
    }
  }

  return undefined
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|auth|favicon.ico).*)"]}
