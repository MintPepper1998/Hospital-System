import { describe, it, expect } from "vitest"

describe("Environment validation", () => {
  it("should export an env object", async () => {
    const { env } = await import("@/lib/env")
    expect(env).toBeDefined()
    expect(typeof env.NODE_ENV).toBe("string")
  })
})
