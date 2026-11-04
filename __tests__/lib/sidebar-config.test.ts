import { describe, it, expect } from "vitest"
import { getMenuItemsForRole } from "@/lib/sidebar-config"

describe("getMenuItemsForRole", () => {
  it("returns all menu items for SUPER_ADMIN", () => {
    const items = getMenuItemsForRole("SUPER_ADMIN")
    const titles = items.map((i) => i.title)

    expect(titles).toContain("Dashboard")
    expect(titles).toContain("Clinical")
    expect(titles).toContain("IPD")
    expect(titles).toContain("Pharmacy")
    expect(titles).toContain("Finance")
    expect(titles).toContain("HR & Staff")
    expect(titles).toContain("Admin")
    expect(titles).toContain("Patient Portal")
  })

  it("returns clinical sections for DOCTOR", () => {
    const items = getMenuItemsForRole("DOCTOR")
    const titles = items.map((i) => i.title)

    expect(titles).toContain("Dashboard")
    expect(titles).toContain("Clinical")
    expect(titles).toContain("IPD")
    expect(titles).toContain("Pathology")
    expect(titles).toContain("Radiology")
  })

  it("excludes admin and finance for DOCTOR", () => {
    const items = getMenuItemsForRole("DOCTOR")
    const titles = items.map((i) => i.title)

    expect(titles).not.toContain("Admin")
    expect(titles).not.toContain("Finance")
    expect(titles).not.toContain("Pharmacy")
    expect(titles).not.toContain("Patient Portal")
  })

  it("returns pharmacy section for PHARMACIST", () => {
    const items = getMenuItemsForRole("PHARMACIST")
    const titles = items.map((i) => i.title)

    expect(titles).toContain("Dashboard")
    expect(titles).toContain("Pharmacy")
  })

  it("excludes clinical and IPD for PHARMACIST", () => {
    const items = getMenuItemsForRole("PHARMACIST")
    const titles = items.map((i) => i.title)

    expect(titles).not.toContain("Clinical")
    expect(titles).not.toContain("IPD")
    expect(titles).not.toContain("Admin")
  })

  it("returns finance for ACCOUNTANT", () => {
    const items = getMenuItemsForRole("ACCOUNTANT")
    const titles = items.map((i) => i.title)

    expect(titles).toContain("Finance")
    expect(titles).toContain("Pharmacy")
    expect(titles).toContain("HR & Staff")
  })

  it("returns patient portal only for PATIENT", () => {
    const items = getMenuItemsForRole("PATIENT")
    const titles = items.map((i) => i.title)

    expect(titles).toContain("Dashboard")
    expect(titles).toContain("Patient Portal")
    expect(titles).not.toContain("Clinical")
    expect(titles).not.toContain("Admin")
    expect(titles).not.toContain("Finance")
  })

  it("always includes Dashboard for any role", () => {
    const roles = ["DOCTOR", "NURSE", "PHARMACIST", "ACCOUNTANT", "PATIENT", "LAB_TECHNICIAN", "RECEPTIONIST"]

    for (const role of roles) {
      const items = getMenuItemsForRole(role)
      const titles = items.map((i) => i.title)
      expect(titles).toContain("Dashboard")
    }
  })

  it("returns appropriate sections for NURSE", () => {
    const items = getMenuItemsForRole("NURSE")
    const titles = items.map((i) => i.title)

    expect(titles).toContain("Clinical")
    expect(titles).toContain("IPD")
    expect(titles).toContain("Pathology")
    expect(titles).toContain("Radiology")
    expect(titles).not.toContain("Admin")
    expect(titles).not.toContain("Finance")
    expect(titles).not.toContain("Pharmacy")
  })

  it("returns lab sections for LAB_TECHNICIAN", () => {
    const items = getMenuItemsForRole("LAB_TECHNICIAN")
    const titles = items.map((i) => i.title)

    expect(titles).toContain("Pathology")
    expect(titles).toContain("Radiology")
    expect(titles).not.toContain("Clinical")
    expect(titles).not.toContain("Admin")
  })

  it("returns only Dashboard for an unknown role", () => {
    const items = getMenuItemsForRole("JANITOR")
    const titles = items.map((i) => i.title)

    expect(titles).toEqual(["Dashboard"])
  })
})
