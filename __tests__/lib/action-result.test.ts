import { describe, it, expect } from "vitest"
import {
  actionSuccess,
  actionError,
  getErrorMessage,
  isPrismaUniqueError,
  isPrismaForeignKeyError,
} from "@/lib/action-result"

describe("actionSuccess", () => {
  it("returns success result without data", () => {
    const result = actionSuccess("Patient created")
    expect(result).toEqual({
      success: true,
      message: "Patient created",
      data: undefined,
    })
  })

  it("returns success result with data", () => {
    const data = { id: "abc-123", name: "John" }
    const result = actionSuccess("Patient found", data)
    expect(result).toEqual({
      success: true,
      message: "Patient found",
      data,
    })
  })

  it("preserves complex data objects", () => {
    const data = { items: [1, 2, 3], nested: { key: "value" } }
    const result = actionSuccess("OK", data)
    expect(result.data).toEqual(data)
  })
})

describe("actionError", () => {
  it("returns error result", () => {
    const result = actionError("Something went wrong")
    expect(result).toEqual({
      success: false,
      message: "Something went wrong",
    })
  })

  it("does not include data property", () => {
    const result = actionError("Fail")
    expect(result).not.toHaveProperty("data")
  })
})

describe("getErrorMessage", () => {
  it("extracts message from Error instance", () => {
    const err = new Error("Database timeout")
    expect(getErrorMessage(err)).toBe("Database timeout")
  })

  it("returns string errors as-is", () => {
    expect(getErrorMessage("connection refused")).toBe("connection refused")
  })

  it("returns fallback for null", () => {
    expect(getErrorMessage(null)).toBe("An unexpected error occurred")
  })

  it("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred")
  })

  it("returns fallback for number", () => {
    expect(getErrorMessage(42)).toBe("An unexpected error occurred")
  })

  it("returns fallback for plain object", () => {
    expect(getErrorMessage({ code: 500 })).toBe("An unexpected error occurred")
  })

  it("extracts message from Error subclass", () => {
    class CustomError extends Error {
      constructor(msg: string) {
        super(msg)
        this.name = "CustomError"
      }
    }
    expect(getErrorMessage(new CustomError("custom failure"))).toBe("custom failure")
  })
})

describe("isPrismaUniqueError", () => {
  it("returns true for P2002 error code", () => {
    expect(isPrismaUniqueError({ code: "P2002" })).toBe(true)
  })

  it("returns false for other Prisma error codes", () => {
    expect(isPrismaUniqueError({ code: "P2003" })).toBe(false)
    expect(isPrismaUniqueError({ code: "P2025" })).toBe(false)
  })

  it("returns false for null", () => {
    expect(isPrismaUniqueError(null)).toBe(false)
  })

  it("returns false for undefined", () => {
    expect(isPrismaUniqueError(undefined)).toBe(false)
  })

  it("returns false for a plain Error", () => {
    expect(isPrismaUniqueError(new Error("fail"))).toBe(false)
  })
})

describe("isPrismaForeignKeyError", () => {
  it("returns true for P2003 error code", () => {
    expect(isPrismaForeignKeyError({ code: "P2003" })).toBe(true)
  })

  it("returns false for P2002 error code", () => {
    expect(isPrismaForeignKeyError({ code: "P2002" })).toBe(false)
  })

  it("returns false for null", () => {
    expect(isPrismaForeignKeyError(null)).toBe(false)
  })

  it("returns false for undefined", () => {
    expect(isPrismaForeignKeyError(undefined)).toBe(false)
  })
})
