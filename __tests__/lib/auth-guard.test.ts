import { describe, it, expect, vi } from "vitest"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

describe("requireAuth", () => {
  it("should throw when no session exists", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue(null as any)

    const { requireAuth } = await import("@/lib/auth-guard")
    await expect(requireAuth()).rejects.toThrow("Unauthorized")
  })

  it("should return session when authenticated", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", role: "DOCTOR", name: "Dr. Test" },
      expires: new Date().toISOString(),
    } as any)

    const { requireAuth } = await import("@/lib/auth-guard")
    const session = await requireAuth()
    expect(session.userId).toBe("user-1")
    expect(session.role).toBe("DOCTOR")
  })

  it("should throw when role is not allowed", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", role: "NURSE", name: "Nurse Test" },
      expires: new Date().toISOString(),
    } as any)

    const { requireAuth } = await import("@/lib/auth-guard")
    await expect(requireAuth(["DOCTOR", "SUPER_ADMIN"])).rejects.toThrow("Forbidden")
  })

  it("should allow SUPER_ADMIN for any role restriction", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "SUPER_ADMIN", name: "Admin" },
      expires: new Date().toISOString(),
    } as any)

    const { requireAuth } = await import("@/lib/auth-guard")
    const session = await requireAuth(["DOCTOR"])
    expect(session.role).toBe("SUPER_ADMIN")
  })
})
