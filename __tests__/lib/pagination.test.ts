import { describe, it, expect } from "vitest"
import { getPaginationValues, paginatedResult } from "@/lib/pagination"

describe("getPaginationValues", () => {
  it("returns defaults when no params provided", () => {
    const result = getPaginationValues()
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 })
  })

  it("returns defaults when empty object provided", () => {
    const result = getPaginationValues({})
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 })
  })

  it("calculates skip correctly for page 2", () => {
    const result = getPaginationValues({ page: 2, limit: 10 })
    expect(result).toEqual({ page: 2, limit: 10, skip: 10 })
  })

  it("calculates skip correctly for page 5 with limit 25", () => {
    const result = getPaginationValues({ page: 5, limit: 25 })
    expect(result).toEqual({ page: 5, limit: 25, skip: 100 })
  })

  it("clamps page to minimum of 1", () => {
    const result = getPaginationValues({ page: 0 })
    expect(result.page).toBe(1)
    expect(result.skip).toBe(0)
  })

  it("clamps negative page to 1", () => {
    const result = getPaginationValues({ page: -5 })
    expect(result.page).toBe(1)
    expect(result.skip).toBe(0)
  })

  it("clamps limit to minimum of 1", () => {
    const result = getPaginationValues({ limit: 0 })
    expect(result.limit).toBe(1)
  })

  it("clamps negative limit to 1", () => {
    const result = getPaginationValues({ limit: -10 })
    expect(result.limit).toBe(1)
  })

  it("clamps limit to maximum of 100", () => {
    const result = getPaginationValues({ limit: 500 })
    expect(result.limit).toBe(100)
  })

  it("allows limit of exactly 100", () => {
    const result = getPaginationValues({ limit: 100 })
    expect(result.limit).toBe(100)
  })

  it("allows limit of exactly 1", () => {
    const result = getPaginationValues({ limit: 1 })
    expect(result.limit).toBe(1)
  })
})

describe("paginatedResult", () => {
  it("builds a correct paginated response", () => {
    const data = [{ id: 1 }, { id: 2 }]
    const result = paginatedResult(data, 50, 1, 20)

    expect(result).toEqual({
      data,
      total: 50,
      page: 1,
      limit: 20,
      totalPages: 3,
    })
  })

  it("calculates totalPages with exact division", () => {
    const result = paginatedResult([], 100, 1, 10)
    expect(result.totalPages).toBe(10)
  })

  it("rounds totalPages up for partial last page", () => {
    const result = paginatedResult([], 101, 1, 10)
    expect(result.totalPages).toBe(11)
  })

  it("returns totalPages of 0 when total is 0", () => {
    const result = paginatedResult([], 0, 1, 20)
    expect(result.totalPages).toBe(0)
  })

  it("returns totalPages of 1 when total equals limit", () => {
    const result = paginatedResult([], 20, 1, 20)
    expect(result.totalPages).toBe(1)
  })

  it("returns totalPages of 1 when total is less than limit", () => {
    const result = paginatedResult([], 5, 1, 20)
    expect(result.totalPages).toBe(1)
  })

  it("preserves the data array reference", () => {
    const data = [{ name: "Alice" }, { name: "Bob" }]
    const result = paginatedResult(data, 2, 1, 10)
    expect(result.data).toBe(data)
  })
})
