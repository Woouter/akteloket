import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { BRAND, NOTARY_OFFICE, type ServiceKey } from "@/lib/config";
import { DVO_CHECKS, dvoSections } from "@/lib/docgen/dvo";
import { dateTimeNl } from "@/lib/util/format";

/**
 * Dienstverleningsovereenkomst met het bewijs van digitaal akkoord als PDF (in plaats
 * van een kaal tekstbestand). Standaard-PDF-fonts kennen alleen WinAnsi; tekens daarbuiten
 * vervangen we.
 */
const A4: [number, number] = [595.28, 841.89];
const M = 56;
const INK = rgb(0.043, 0.122, 0.227);
const MUTED = rgb(0.35, 0.39, 0.45);
const BRASS = rgb(0.69, 0.553, 0.341);
const safe = (s: string) => s.replace(/[   ]/g, " ").replace(/[‐‑−]/g, "-").replace(/[^\x00-\xff€–—‘’“”•…]/g, "?");

export interface DvoAkkoord { version: string; signatureName: string; email: string; acceptedAt: string; ip?: string; checks: string[]; hash: string }

export async function dvoPdf(service: ServiceKey, akkoord: DvoAkkoord): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Dienstverleningsovereenkomst ${akkoord.version}`);
  doc.setProducer(BRAND.name);
  doc.setCreator(BRAND.name);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - M;
  let n = 1;
  const footer = () => page.drawText(safe(`Dienstverleningsovereenkomst ${akkoord.version}, pagina ${n}`), { x: M, y: 28, size: 8, font, color: MUTED });
  const ensure = (h: number) => { if (y - h < M) { footer(); page = doc.addPage(A4); n++; y = A4[1] - M; } };
  const text = (raw: string, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const size = o.size ?? 10;
    const f = o.f ?? font;
    const maxW = A4[0] - 2 * M - (o.indent ?? 0);
    const lines: string[] = [];
    for (const para of safe(raw).split("\n")) {
      let line = "";
      for (const w of para.split(" ")) {
        const t = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = w; } else line = t;
      }
      lines.push(line);
    }
    for (const l of lines) { ensure(size * 1.45); page.drawText(l, { x: M + (o.indent ?? 0), y: y - size, size, font: f, color: o.color ?? INK }); y -= size * 1.45; }
    y -= o.gap ?? 3;
  };

  text(BRAND.name.toUpperCase(), { size: 8, f: bold, color: BRASS, gap: 6 });
  text("Dienstverleningsovereenkomst", { size: 20, f: serif, gap: 2 });
  text(`${NOTARY_OFFICE.officeName}, ${NOTARY_OFFICE.city} (${akkoord.version})`, { size: 9, color: MUTED, gap: 14 });
  for (const s of dvoSections(service)) {
    ensure(40);
    text(s.title, { size: 11.5, f: bold, gap: 4 });
    for (const item of s.items) text(`• ${item}`, { indent: 8, gap: 4 });
    y -= 6;
  }

  ensure(150);
  y -= 6;
  page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.8, color: BRASS });
  y -= 14;
  text("Bewijs van digitaal akkoord", { size: 12, f: bold, gap: 6 });
  const rows: [string, string][] = [
    ["Ondertekend door", akkoord.signatureName],
    ["E-mailadres", akkoord.email],
    ["Tijdstip", dateTimeNl(akkoord.acceptedAt)],
    ["IP-adres", akkoord.ip ?? "-"],
    ["Hash van de DVO-tekst", akkoord.hash],
  ];
  for (const [k, v] of rows) {
    ensure(15);
    page.drawText(safe(k), { x: M, y: y - 10, size: 9.5, font, color: MUTED });
    text(v, { size: 9.5, f: bold, indent: 140, gap: 2 });
  }
  y -= 6;
  text("Aangevinkte bevestigingen:", { size: 9.5, color: MUTED, gap: 2 });
  for (const c of DVO_CHECKS) text(`${akkoord.checks.includes(c.key) ? "[x]" : "[ ]"} ${c.label}`, { size: 9.5, indent: 8, gap: 2 });
  footer();
  return Buffer.from(await doc.save());
}
