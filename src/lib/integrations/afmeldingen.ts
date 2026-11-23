import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { siteUrl } from "@/lib/util/site";

/**
 * Afmeldlijst voor e-mail.
 *
 * Een afgemeld adres krijgt geen e-mail meer van het platform (herinneringen,
 * uitnodigingen, meldingen). Alleen een inloglink die iemand zelf aanvraagt gaat
 * nog wel, anders kan iemand niet meer bij het eigen dossier.
 *
 * Bronnen: de instelling `mail_afmeldingen` (beheerd via Beheer → Uitgaande e-mail
 * en via de afmeldlink onderaan elke e-mail) en, voor noodgevallen, de variabele
 * MAIL_AFGEMELD (komma-gescheiden).
 */
const KEY = "mail_afmeldingen";

export interface Afmelding {
  email: string;
  op: string;
  door: "zelf" | "beheer";
  reden?: string;
}

const norm = (e: string) => e.trim().toLowerCase();

export async function listAfmeldingen(): Promise<Afmelding[]> {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY)).limit(1);
  return Array.isArray(row?.value) ? (row.value as Afmelding[]) : [];
}

async function save(list: Afmelding[]) {
  const db = await getDb();
  await db.insert(schema.settings).values({ key: KEY, value: list }).onConflictDoUpdate({ target: schema.settings.key, set: { value: list } });
}

export async function isAfgemeld(email: string): Promise<boolean> {
  const e = norm(email);
  const fromEnv = (process.env.MAIL_AFGEMELD ?? "").split(",").map(norm).filter(Boolean);
  if (fromEnv.includes(e)) return true;
  return (await listAfmeldingen()).some((a) => a.email === e);
}

export async function afmelden(email: string, door: Afmelding["door"], reden?: string): Promise<void> {
  const e = norm(email);
  if (!e.includes("@")) throw new Error("Ongeldig e-mailadres");
  const list = await listAfmeldingen();
  if (list.some((a) => a.email === e)) return;
  await save([{ email: e, op: new Date().toISOString(), door, reden: reden?.trim() || undefined }, ...list]);
}

export async function weerAanmelden(email: string): Promise<void> {
  const e = norm(email);
  await save((await listAfmeldingen()).filter((a) => a.email !== e));
}

// ---------------------------------------------------------------------------
// Ondertekende afmeldlink (zonder inloggen te gebruiken, niet te raden)
// ---------------------------------------------------------------------------

function secret(): string {
  return process.env.ENCRYPTION_KEY || process.env.CRON_SECRET || "akteloket-demo-afmelden";
}

export function afmeldToken(email: string): string {
  return createHmac("sha256", secret()).update(`afmelden:${norm(email)}`).digest("base64url").slice(0, 32);
}

export function checkAfmeldToken(email: string, token: string): boolean {
  const a = Buffer.from(afmeldToken(email));
  const b = Buffer.from(token ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Link naar de afmeldpagina (in de voettekst van elke e-mail). */
export function afmeldUrl(email: string): string {
  return `${siteUrl()}/afmelden?e=${encodeURIComponent(norm(email))}&t=${afmeldToken(email)}`;
}

/** One-click endpoint voor de List-Unsubscribe-header (RFC 8058, o.a. Gmail en Outlook). */
export function afmeldOneClickUrl(email: string): string {
  return `${siteUrl()}/api/afmelden?e=${encodeURIComponent(norm(email))}&t=${afmeldToken(email)}`;
}
