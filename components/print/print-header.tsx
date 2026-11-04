import type { HospitalSettingsData } from "@/app/actions/settings"

/**
 * Reusable print header for all printed pages (invoices, discharge summaries, prescriptions, etc.)
 *
 * Usage (Server Component):
 *   import { getHospitalSettings } from "@/app/actions/settings"
 *   import { PrintHeader } from "@/components/print/print-header"
 *
 *   const settings = await getHospitalSettings()
 *   <PrintHeader settings={settings} title="DISCHARGE SUMMARY" />
 *
 * Logic:
 *   - If letterheadHeaderUrl exists → renders the full-width banner image
 *   - Otherwise → falls back to a text layout with logo + name + address
 */

interface PrintHeaderProps {
  settings: HospitalSettingsData
  title?: string // e.g., "DISCHARGE SUMMARY", "INVOICE"
}

export function PrintHeader({ settings, title }: PrintHeaderProps) {
  // ── IMAGE-BASED HEADER ──────────────────────
  if (settings.letterheadHeaderUrl) {
    return (
      <div className="print-header-image">
        <img
          src={settings.letterheadHeaderUrl}
          alt={settings.name}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />
        {title && (
          <div style={{
            textAlign: "center",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "2px",
            textTransform: "uppercase",
            borderBottom: "2px solid #000",
            paddingBottom: "6px",
            marginTop: "8px",
          }}>
            {title}
          </div>
        )}
      </div>
    )
  }

  // ── TEXT-BASED HEADER (Fallback) ────────────
  return (
    <div style={{ borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Logo (h-20 w-20 = 80px) */}
        {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt="Logo"
            style={{
              width: "80px",
              height: "80px",
              objectFit: "contain",
              borderRadius: "4px",
              flexShrink: 0,
            }}
          />
        ) : (
          // Placeholder square when no logo is set
          <div style={{
            width: "80px",
            height: "80px",
            backgroundColor: "#f0f0f0",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            fontWeight: 800,
            color: "#999",
            flexShrink: 0,
          }}>
            {settings.name.charAt(0)}
          </div>
        )}

        {/* Hospital Name & Details */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{
            fontSize: "24px",
            fontWeight: 800,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
          }}>
            {settings.name}
          </h1>
          {settings.address && (
            <p style={{ fontSize: "11px", margin: "4px 0 0", color: "#333" }}>
              {settings.address}
            </p>
          )}
          <p style={{ fontSize: "10px", margin: "3px 0 0", color: "#555" }}>
            {[
              settings.phone && `Phone: ${settings.phone}`,
              settings.email && `Email: ${settings.email}`,
              settings.website && settings.website,
            ]
              .filter(Boolean)
              .join("  |  ")}
          </p>
          {settings.gstNo && (
            <p style={{ fontSize: "9px", margin: "2px 0 0", color: "#777" }}>
              GST: {settings.gstNo}
            </p>
          )}
        </div>
      </div>

      {/* Title (e.g., DISCHARGE SUMMARY) */}
      {title && (
        <div style={{
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginTop: "10px",
          borderTop: "1px solid #ccc",
          paddingTop: "6px",
        }}>
          {title}
        </div>
      )}
    </div>
  )
}
