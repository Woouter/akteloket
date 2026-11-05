import { ImageResponse } from "next/og";

export const alt = "Akteloket — je akte van levering en hypotheekakte, volledig online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Deelafbeelding (WhatsApp, LinkedIn, e-mail) in de huisstijl. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b1f3a", padding: "72px 80px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 44, fontWeight: 600 }}>
          Akteloket<span style={{ color: "#b08d57" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#c6a676" }}>Notariële akten voor je woning</div>
          <div style={{ marginTop: 20, fontSize: 64, lineHeight: 1.1, fontWeight: 600, maxWidth: 900 }}>Je akte van levering en hypotheekakte, volledig online geregeld</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#bdb7ab" }}>Vaste all-in prijs · onafhankelijke notaris · akte-loket.nl</div>
      </div>
    ),
    size,
  );
}
