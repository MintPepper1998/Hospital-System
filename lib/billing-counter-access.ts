import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const BILLING_COUNTER_PERMISSIONS = {
  parent: "BILLING_COUNTER",
  opd: "BILLING_COUNTER_OPD",
  ipd: "BILLING_COUNTER_IPD",
  casualty: "BILLING_COUNTER_CASUALTY",
  emergency: "BILLING_COUNTER_ER",
  ot: "BILLING_COUNTER_OT",
  diagnostics: "BILLING_COUNTER_DIAGNOSTICS",
  ambulance: "BILLING_COUNTER_AMBULANCE",
  canteen: "BILLING_COUNTER_CANTEEN",
  custom: "BILLING_COUNTER_CUSTOM",
  history: "BILLING_COUNTER_HISTORY",
} as const

type BillingCounterPermission = typeof BILLING_COUNTER_PERMISSIONS[keyof typeof BILLING_COUNTER_PERMISSIONS]

export async function requireBillingCounterAccess(permission: BillingCounterPermission = BILLING_COUNTER_PERMISSIONS.parent) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    throw new Error("Unauthorized: You must be signed in to use Billing Counter")
  }

  const role = String(session.user.role || "")
  if (role === "SUPER_ADMIN" || role === "ADMIN") return session

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, role: true, permissions: true },
  })
  if (!user?.isActive) throw new Error("Your account is inactive")

  const isBillingClerk = String(user.role) === "BILLING_CLERK"
  const hasPermission = user.permissions.includes(permission) || user.permissions.includes(BILLING_COUNTER_PERMISSIONS.parent)
  if (!isBillingClerk && !hasPermission) {
    throw new Error("Forbidden: Billing Counter access is required")
  }

  return session
}

export async function requireBillingCounterAccessSafe(permission: BillingCounterPermission = BILLING_COUNTER_PERMISSIONS.parent) {
  try {
    const session = await requireBillingCounterAccess(permission)
    return { ok: true as const, session }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Forbidden" }
  }
}
