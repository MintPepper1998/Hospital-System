import type { HospitalSettingsData } from "@/app/actions/settings"

/**
 * Reusable print footer for all printed pages.
 *
 * Usage (Server Component):
 *   import { getHospitalSettings } from "@/app/actions/settings"
 *   import { PrintFooter } from "@/components/print/print-footer"
 *
 *   const settings = await getHospitalSettings()
 *   <PrintFooter settings={settings} />
 *
 * Logic:
 *   - If letterheadFooterUrl exists → renders the full-width footer banner image
 *   - Otherwise → shows a simple text footer with hospital name and "Electronically generated"
 */

interface PrintFooterProps {
  settings: HospitalSettingsData
  doctorName?: string
  showElectronic?: boolean // Show "Electronically Generated" disclaimer
}

export function PrintFooter({
  settings,
  doctorName,
  showElectronic = true,
}: PrintFooterProps) {
  // ── IMAGE-BASED FOOTER ──────────────────────
  if (settings.letterheadFooterUrl) {
    return (
      <div className="print-footer-image" style={{ marginTop: "auto" }}>
        {/* Doctor signature line (optional) */}
        {doctorName && (
          <div style={{
            textAlign: "right",
            fontSize: "11px",
            marginBottom: "12px",
            paddingRight: "20px",
          }}>
            <div style={{ fontWeight: 600 }}>Treating Doctor</div>
            <div>{doctorName}</div>
          </div>
        )}
        <img
          src={settings.letterheadFooterUrl}
          alt={settings.name}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </div>
    )
  }

  // ── TEXT-BASED FOOTER (Fallback) ────────────
  return (
    <div
      style={{
        borderTop: "2px solid #000",
        paddingTop: "8px",
        marginTop: "auto",
        fontSize: "10px",
        color: "#666",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          {showElectronic && (
            <p style={{ margin: 0, fontStyle: "italic" }}>
              This is an electronically generated document.
            </p>
          )}
          <p style={{ margin: "2px 0 0" }}>
            {settings.name}
            {settings.phone && ` | ${settings.phone}`}
            {settings.website && ` | ${settings.website}`}
          </p>
        </div>
        {doctorName && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, color: "#333" }}>Treating Doctor</div>
            <div style={{ color: "#333" }}>{doctorName}</div>
          </div>
        )}
      </div>
    </div>
  )
}
