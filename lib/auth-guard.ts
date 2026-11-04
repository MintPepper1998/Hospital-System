import { auth } from "@/auth"
import type { Role } from "@prisma/client"

export interface AuthSession {
  userId: string
  email: string
  role: Role
  name: string | null
}

/**
 * Verifies the user is authenticated and optionally has one of the allowed roles.
 * Throws if unauthenticated or unauthorized.
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<AuthSession> {
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    throw new Error("Unauthorized: You must be signed in to perform this action")
  }

  const role = session.user.role as Role

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role) && role !== "SUPER_ADMIN" && role !== "ADMIN") {
      throw new Error(`Forbidden: You need one of the following roles: ${allowedRoles.join(", ")}`)
    }
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    role,
    name: session.user.name ?? null,
  }
}

/**
 * Safe version that returns { success: false } instead of throwing.
 * Use in server actions that return { success, message } objects.
 */
export async function requireAuthSafe(
  allowedRoles?: Role[]
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  try {
    const session = await requireAuth(allowedRoles)
    return { ok: true, session }
  } catch (e: any) {
    return { ok: false, error: e.message || "Unauthorized" }
  }
}
