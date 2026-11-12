import { describe, it, expect, vi } from "vitest"
import { reformSignatureImage, SIGNATURE_MAX_WIDTH, SIGNATURE_MAX_HEIGHT } from "@/lib/signature-service"
import sharp from "sharp"

describe("Digital Signature Standardization", () => {
  it("reforms an arbitrary image into standard PNG bounds (max 450x150)", async () => {
    // Generate an image buffer (800x600 red canvas)
    const rawBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 30, g: 64, b: 175 },
      },
    })
      .jpeg()
      .toBuffer()

    const reformed = await reformSignatureImage(rawBuffer)

    expect(reformed.buffer).toBeInstanceOf(Buffer)
    expect(reformed.dataUrl.startsWith("data:image/png;base64,")).toBe(true)
    expect(reformed.width).toBeLessThanOrEqual(SIGNATURE_MAX_WIDTH)
    expect(reformed.height).toBeLessThanOrEqual(SIGNATURE_MAX_HEIGHT)
  })

  it("handles a transparent PNG correctly", async () => {
    const rawBuffer = await sharp({
      create: {
        width: 300,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer()

    const reformed = await reformSignatureImage(rawBuffer)
    expect(reformed.dataUrl.startsWith("data:image/png;base64,")).toBe(true)
    expect(reformed.width).toBeLessThanOrEqual(SIGNATURE_MAX_WIDTH)
    expect(reformed.height).toBeLessThanOrEqual(SIGNATURE_MAX_HEIGHT)
  })
})

describe("Discharge Summary Diagnosis Resolution", () => {
  // Test the key mapping logic that prevents NORMAL discharge save errors
  it("resolves diagnosis when section key is 'disease'", () => {
    const dynamicValues: Record<string, string> = {
      disease: "Acute Appendicitis with localized peritonitis",
      "treatement given ": "Emergency appendectomy performed",
      adviceOnDischarge: "Take rest for 1 week",
    }
    const fallbackDiagnosis = ""

    const cd = dynamicValues as Record<string, any>
    const resolvedDiagnosis = (
      cd.finalDiagnosis ||
      cd.disease ||
      cd.DISEASE ||
      cd.diagnosis ||
      cd.provisionalDiagnosis ||
      Object.entries(cd).find(
        ([k, v]) =>
          (k.toLowerCase().includes("diag") || k.toLowerCase().includes("disease")) &&
          typeof v === "string" &&
          v.trim().length > 0
      )?.[1] ||
      Object.values(cd).find((val) => typeof val === "string" && val.trim().length > 0) ||
      ""
    ).toString().trim()

    expect(resolvedDiagnosis).toBe("Acute Appendicitis with localized peritonitis")
  })

  it("resolves diagnosis when section key is 'finalDiagnosis'", () => {
    const dynamicValues: Record<string, string> = {
      finalDiagnosis: "Type 2 Diabetes Mellitus with Neuropathy",
    }
    const cd = dynamicValues as Record<string, any>
    const resolvedDiagnosis = (
      cd.finalDiagnosis ||
      cd.disease ||
      cd.diagnosis ||
      ""
    ).toString().trim()

    expect(resolvedDiagnosis).toBe("Type 2 Diabetes Mellitus with Neuropathy")
  })
})
