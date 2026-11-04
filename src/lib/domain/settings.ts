import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { WwftBronType } from "./types";

/**
 * Instellingen die de notaris tijdens de pilot zelf kan aanpassen (Notaris → Instellingen).
 * De Wwft-documentmatrix is volgens het procesdocument "het belangrijkste inhoudelijke
 * validatiepunt": zonder goedgekeurde matrix kan de tool niet betrouwbaar stukken opvragen.
 */

export interface WwftRule {
  type: WwftBronType;
  label: string;
  documenten: string[];
  drempel?: number; // bedrag waarboven aanvullende onderbouwing wordt gevraagd
  aanvullend?: string;
  status: "voorlopig" | "goedgekeurd";
}

export const DEFAULT_WWFT_MATRIX: WwftRule[] = [
  { type: "spaargeld", label: "Spaargeld", documenten: ["Rekeningafschrift(en) waarop saldo en rekeninghouder zichtbaar zijn"], drempel: 50000, aanvullend: "Boven de drempel: onderbouwing van de opbouw (bijv. afschriften over een langere periode of inkomensstukken)", status: "voorlopig" },
  { type: "verkoop_woning", label: "Verkoop woning of ander bezit", documenten: ["Notariële afrekening van de verkoop", "Rekeningafschrift van ontvangst (indien al ontvangen)"], status: "voorlopig" },
  { type: "schenking", label: "Schenking", documenten: ["Schenkingsovereenkomst of schriftelijke verklaring", "Bewijs van ontvangst (rekeningafschrift)"], drempel: 25000, aanvullend: "Boven de drempel: onderbouwing herkomst bij de schenker", status: "voorlopig" },
  { type: "lening", label: "Lening van familie of derde", documenten: ["Getekende leningsovereenkomst", "Bewijs van ontvangst (rekeningafschrift)"], drempel: 25000, aanvullend: "Boven de drempel: herkomstonderbouwing bij de uitlener", status: "voorlopig" },
  { type: "erfenis", label: "Erfenis", documenten: ["Relevante notariële/boedelstukken (bijv. verklaring van erfrecht)", "Bewijs van uitbetaling of beschikbaarheid"], status: "voorlopig" },
  { type: "onderneming", label: "Geld uit onderneming", documenten: ["Dividendbesluit, loon-/bonusdocumentatie of andere rechtsgrond", "Bewijs van overboeking naar privé"], aanvullend: "Indien vereist: aanvullende financiële onderbouwing (jaarcijfers)", status: "voorlopig" },
  { type: "beleggingen", label: "Beleggingen of verkoop daarvan", documenten: ["Verkoop- of transactieoverzicht", "Bewijs van ontvangst"], status: "voorlopig" },
  { type: "anders", label: "Anders", documenten: ["Bronstuk waaruit de herkomst blijkt", "Bewijs van ontvangst"], status: "voorlopig" },
];

export interface OfficeSettings {
  volmachtModes: ("video" | "kantoor")[];
  verkoperLegalisatie: "niet_vereist" | "keuze" | "altijd";
  slotStart: string; // "09:00"
  slotEnd: string;
  slotMinutes: number;
  idMethods: ("idin" | "nfc_app")[];
}

export const DEFAULT_OFFICE: OfficeSettings = {
  volmachtModes: ["video", "kantoor"],
  verkoperLegalisatie: "keuze",
  slotStart: "09:00",
  slotEnd: "17:00",
  slotMinutes: 15,
  idMethods: ["idin", "nfc_app"],
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
  return (row?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown, by?: string) {
  const db = await getDb();
  await db.insert(schema.settings).values({ key, value, updatedBy: by ?? null }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date(), updatedBy: by ?? null } });
}

export const getWwftMatrix = () => getSetting<WwftRule[]>("wwft_matrix", DEFAULT_WWFT_MATRIX);
export const getOffice = () => getSetting<OfficeSettings>("office", DEFAULT_OFFICE);

/** Beschikbare afspraakmomenten (volmacht) voor de komende werkdagen. */
export function slots(office: OfficeSettings, taken: Date[], days = 10): Date[] {
  const out: Date[] = [];
  const [sh, sm] = office.slotStart.split(":").map(Number);
  const [eh, em] = office.slotEnd.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    added++;
    for (let m = sh * 60 + sm; m + office.slotMinutes <= eh * 60 + em; m += office.slotMinutes * 2) {
      const s = new Date(d);
      s.setHours(Math.floor(m / 60), m % 60, 0, 0);
      // spreiding: niet elk slot beschikbaar (simuleert een agenda)
      if ((s.getDate() + m) % 3 === 0) continue;
      if (taken.some((t) => Math.abs(t.getTime() - s.getTime()) < office.slotMinutes * 60000)) continue;
      out.push(s);
    }
  }
  return out;
}
