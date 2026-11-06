const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const eur0 = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const euro = (n: number | undefined | null) => (n == null || Number.isNaN(n) ? "–" : eur.format(n));
export const euro0 = (n: number | undefined | null) => (n == null || Number.isNaN(n) ? "–" : eur0.format(n));

export function parseEuro(input: string | number | undefined | null): number | undefined {
  if (input == null) return undefined;
  if (typeof input === "number") return input;
  const s = input.replace(/[€\s]/g, "").replace(/,-$/, "").replace(/\.-$/, "");
  if (!s) return undefined;
  // "485.000,00" -> 485000.00 ; "485000" -> 485000 ; "485,000.00" (zeldzaam) -> 485000
  let norm = s;
  if (/,\d{1,2}$/.test(s)) norm = s.replace(/\./g, "").replace(",", ".");
  else norm = s.replace(/[.,](?=\d{3}(\D|$))/g, "");
  const n = Number(norm);
  return Number.isFinite(n) ? n : undefined;
}

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** Alle datums en tijden tonen we in Nederlandse tijd, ongeacht de tijdzone van de server. */
export const TZ = "Europe/Amsterdam";

/** Datum-only ("2026-11-18") als 12:00 UTC: valt in elke tijdzone op dezelfde kalenderdag. */
const toDate = (iso: string | Date) => (typeof iso === "string" ? new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso) : iso);

export function dateNl(iso: string | Date | undefined | null, opts: { weekday?: boolean; short?: boolean } = {}): string {
  if (!iso) return "–";
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return "–";
  if (opts.short) return d.toLocaleDateString("nl-NL", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
  return d.toLocaleDateString("nl-NL", { timeZone: TZ, weekday: opts.weekday ? "long" : undefined, day: "numeric", month: "long", year: "numeric" });
}

export function dateTimeNl(iso: string | Date | undefined | null): string {
  if (!iso) return "–";
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleString("nl-NL", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Tijd ("09:30") in Nederlandse tijd. */
export function timeNl(iso: string | Date): string {
  return toDate(iso).toLocaleTimeString("nl-NL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

/** Kalenderdag (yyyy-mm-dd) in Nederlandse tijd, bijv. om afspraken per dag te groeperen. */
export function dayKeyNl(iso: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(toDate(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Uur van de dag (0–23) in Nederlandse tijd. */
export function hourNl(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(d));
}

/** Getal in Nederlandse notatie (1.234,5). */
export function numberNl(n: number, maxDecimals = 2): string {
  return n.toLocaleString("nl-NL", { maximumFractionDigits: maxDecimals });
}

/** Fractie als percentage in Nederlandse notatie: 0.104 → "10,4%". */
export function pctNl(fraction: number, maxDecimals = 1): string {
  return `${numberNl(Math.round(fraction * 100 * 10 ** maxDecimals) / 10 ** maxDecimals, maxDecimals)}%`;
}

export function timeAgo(iso: string | Date): string {
  const d = toDate(iso);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  // Tijdstip in de toekomst (bijv. klokverschil of geplande gebeurtenis): toon het tijdstip zelf.
  if (s < -60) return dateTimeNl(d);
  if (s < 60) return "zojuist";
  if (s < 3600) return `${Math.floor(s / 60)} min geleden`;
  if (s < 86400) return `${Math.floor(s / 3600)} uur geleden`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} dag${Math.floor(s / 86400) === 1 ? "" : "en"} geleden`;
  return dateNl(d, { short: true });
}

/** Parse Nederlandse datum ("12 maart 2026", "12-03-2026", "2026-03-12") naar ISO yyyy-mm-dd. */
export function parseDateNl(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const s = input.trim().toLowerCase();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (m) {
    const idx = MONTHS.findIndex((mm) => mm.startsWith(m![2].slice(0, 3)));
    if (idx >= 0) return `${m[3]}-${String(idx + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return undefined;
}

export function daysBetween(a: string | Date, b: string | Date): number {
  const da = new Date(typeof a === "string" && a.length === 10 ? a + "T12:00:00" : a);
  const db = new Date(typeof b === "string" && b.length === 10 ? b + "T12:00:00" : b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function addDays(iso: string | Date, days: number): string {
  const d = new Date(typeof iso === "string" && iso.length === 10 ? iso + "T12:00:00" : iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ageOn(birthIso: string, onIso: string): number {
  const b = new Date(birthIso + "T12:00:00");
  const o = new Date(onIso.length === 10 ? onIso + "T12:00:00" : onIso);
  let age = o.getFullYear() - b.getFullYear();
  const m = o.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && o.getDate() < b.getDate())) age--;
  return age;
}

/** De kalenderdatum van vandaag in Nederland (JJJJ-MM-DD), ongeacht de tijdzone van de server. */
export const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function personName(p: { voornamen?: string; achternaam?: string } | undefined): string {
  if (!p) return "";
  return [p.voornamen, p.achternaam].filter(Boolean).join(" ").trim();
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => c && c === c.toUpperCase()).slice(0, 2).join("") || "?";
}

export function propertyLine(p: { straat?: string; huisnummer?: string; toevoeging?: string; postcode?: string; plaats?: string } | undefined): string {
  if (!p) return "";
  const street = [p.straat, [p.huisnummer, p.toevoeging].filter(Boolean).join("")].filter(Boolean).join(" ");
  const city = [p.postcode, p.plaats].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ");
}

export function formatIban(iban: string | undefined): string {
  if (!iban) return "";
  return iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

export function maskIban(iban: string | undefined): string {
  const f = formatIban(iban);
  if (f.length < 8) return f;
  return f.slice(0, 7) + " •••• •••• " + f.slice(-2);
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
