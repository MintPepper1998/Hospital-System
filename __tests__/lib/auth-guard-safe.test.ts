import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

describe("requireAuthSafe", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("returns ok: true with session when authenticated", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", email: "doc@hospital.com", role: "DOCTOR", name: "Dr. Smith" },
      expires: new Date().toISOString(),
    } as any)

    const { requireAuthSafe } = await import("@/lib/auth-guard")
    const result = await requireAuthSafe()

    expect(result).toEqual({
      ok: true,
      session: {
        userId: "u1",
        email: "doc@hospital.com",
        role: "DOCTOR",
        name: "Dr. Smith",
      },
    })
  })

  it("returns ok: false when no session exists", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue(null as any)

    const { requireAuthSafe } = await import("@/lib/auth-guard")
    const result = await requireAuthSafe()

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("Unauthorized"),
    })
  })

  it("returns ok: false when role is not allowed", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u2", email: "nurse@hospital.com", role: "NURSE", name: "Nurse Jane" },
      expires: new Date().toISOString(),
    } as any)

    const { requireAuthSafe } = await import("@/lib/auth-guard")
    const result = await requireAuthSafe(["DOCTOR", "ACCOUNTANT"])

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("Forbidden"),
    })
  })

  it("returns ok: true for SUPER_ADMIN regardless of allowed roles", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "sa1", email: "admin@hospital.com", role: "SUPER_ADMIN", name: "Admin" },
      expires: new Date().toISOString(),
    } as any)

    const { requireAuthSafe } = await import("@/lib/auth-guard")
    const result = await requireAuthSafe(["PHARMACIST"])

    expect(result).toEqual({
      ok: true,
      session: {
        userId: "sa1",
        email: "admin@hospital.com",
        role: "SUPER_ADMIN",
        name: "Admin",
      },
    })
  })

  it("returns ok: false when user has no email", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u3", email: null, role: "DOCTOR", name: "Dr. No Email" },
      expires: new Date().toISOString(),
    } as any)

    const { requireAuthSafe } = await import("@/lib/auth-guard")
    const result = await requireAuthSafe()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("Unauthorized")
    }
  })

  it("sets name to null when session user has no name", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u4", email: "anon@hospital.com", role: "RECEPTIONIST" },
      expires: new Date().toISOString(),
    } as any)

    const { requireAuthSafe } = await import("@/lib/auth-guard")
    const result = await requireAuthSafe()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.session.name).toBeNull()
    }
  })
})
