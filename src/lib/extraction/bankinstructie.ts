import "server-only";
import { z } from "zod";
import { parseDateNl, parseEuro } from "@/lib/util/format";
import { pdfText } from "./koopovereenkomst";
import type { BankinstructieData } from "@/lib/domain/types";

/**
 * Leest een hypotheekinstructie (bankinstructie) uit. De notaris deelt de instructie
 * die hij rechtstreeks van de geldverstrekker ontvangt via een beveiligde upload.
 * Verplichte bankteksten worden NIET verzonnen: alleen wat in de instructie staat.
 */

export const BankSchema = z.object({
  geldverstrekker: z.string().nullable(),
  kenmerk: z.string().nullable(),
  geldnemers: z.array(z.string()),
  hypotheekgevers: z.array(z.string()),
  onderpand: z.string().nullable(),
  hypotheekbedrag: z.number().nullable(),
  inschrijvingsbedrag: z.number().nullable(),
  leningdelen: z.array(z.object({ soort: z.string(), bedrag: z.number() })),
  rang: z.string().nullable(),
  nhg: z.boolean().nullable(),
  bouwdepot: z.number().nullable(),
  algemeneVoorwaarden: z.string().nullable(),
  bijzondereVoorwaarden: z.array(z.string()),
  passeerdatum: z.string().nullable(),
});
export type BankExtraction = z.infer<typeof BankSchema>;

export async function scanBankinstructie(buf: Buffer): Promise<{ data: BankinstructieData; method: "ai" | "regels" }> {
  let x: BankExtraction | null = null;
  let method: "ai" | "regels" = "regels";
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    try {
      x = await ai(buf);
      method = "ai";
    } catch (e) {
      console.error("[bankinstructie] AI mislukt", e);
    }
  }
  if (!x) x = rules((await pdfText(buf)).pages.join("\n"));
  const controlepunten: string[] = [];
  if (!x.hypotheekbedrag) controlepunten.push("Hoofdsom niet gevonden in de instructie.");
  if (!x.inschrijvingsbedrag) controlepunten.push("Inschrijvingsbedrag niet gevonden — controleer instructie.");
  if (!x.algemeneVoorwaarden) controlepunten.push("Toepasselijke algemene voorwaarden van de geldverstrekker niet gevonden.");
  if (x.leningdelen.length && x.hypotheekbedrag && Math.abs(x.leningdelen.reduce((s, l) => s + l.bedrag, 0) - x.hypotheekbedrag) > 1) controlepunten.push("Som van de leningdelen wijkt af van de hoofdsom.");
  return {
    method,
    data: {
      geldverstrekker: x.geldverstrekker ?? undefined,
      kenmerk: x.kenmerk ?? undefined,
      hypotheekbedrag: x.hypotheekbedrag ?? undefined,
      inschrijvingsbedrag: x.inschrijvingsbedrag ?? undefined,
      leningdelen: x.leningdelen,
      geldnemers: x.geldnemers,
      hypotheekgevers: x.hypotheekgevers,
      rang: x.rang ?? undefined,
      nhg: x.nhg ?? undefined,
      algemeneVoorwaarden: x.algemeneVoorwaarden ?? undefined,
      bijzondereVoorwaarden: x.bijzondereVoorwaarden,
      bouwdepot: x.bouwdepot ?? undefined,
      uitbetalingsdatum: x.passeerdatum ?? undefined,
      controlepunten,
    },
  };
}

async function ai(buf: Buffer): Promise<BankExtraction> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const { betaZodOutputFormat } = await import("@anthropic-ai/sdk/helpers/beta/zod");
  const client = new Anthropic();
  const res = await client.beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: "Je leest een Nederlandse hypotheekinstructie van een geldverstrekker aan een notaris uit. Geef alleen wat er letterlijk staat; ontbrekende gegevens zijn null. Bijzondere voorwaarden neem je letterlijk over. Bedragen als getal in euro, datums als yyyy-mm-dd.",
    output_config: { effort: "medium", format: betaZodOutputFormat(BankSchema) },
    messages: [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } }, { type: "text", text: "Lees deze hypotheekinstructie uit." }] }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("Geen uitvoer");
  return res.parsed_output;
}

function rules(raw: string): BankExtraction {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const after = (label: RegExp) => {
    const l = lines.find((x) => label.test(x));
    return l ? l.replace(label, "").trim() : null;
  };
  const eur = (s: string | null) => (s ? parseEuro(s.match(/€\s?([\d.]+,\d{2})/)?.[1] ?? "") ?? null : null);
  const geldnemers = lines.filter((l) => /^Geldnemer \d/.test(l)).map((l) => l.replace(/^Geldnemer \d\s*/, "").split(",")[0].trim());
  const leningdelen = lines.filter((l) => /^Leningdeel \d/.test(l)).map((l) => {
    const body = l.replace(/^Leningdeel \d\s*/, "");
    return { soort: body.split(":")[0].trim(), bedrag: eur(body) ?? 0 };
  });
  const bijzStart = lines.findIndex((l) => /^Bijzondere voorwaarden/i.test(l));
  const bijz: string[] = [];
  if (bijzStart >= 0) {
    let cur = "";
    for (const l of lines.slice(bijzStart + 1)) {
      if (/^Deze instructie|^Pagina|^DEMO/.test(l)) break;
      if (/^\d+\.\s/.test(l)) { if (cur) bijz.push(cur); cur = l.replace(/^\d+\.\s/, ""); } else cur += " " + l;
    }
    if (cur) bijz.push(cur.trim());
  }
  const head = lines.find((l) => /N\.V\.|B\.V\.|Bank|Hypotheken/i.test(l) && !/^DEMO/.test(l));
  return {
    geldverstrekker: head ?? null,
    kenmerk: after(/^Ons kenmerk\s*/i),
    geldnemers,
    hypotheekgevers: geldnemers,
    onderpand: after(/^Onderpand\s*/i),
    hypotheekbedrag: eur(after(/^Hoofdsom lening\s*/i)),
    inschrijvingsbedrag: eur(after(/^Inschrijvingsbedrag\s*/i)),
    leningdelen,
    rang: after(/^Rangorde\s*/i),
    nhg: (() => { const v = after(/^Nationale Hypotheek Garantie\s*/i); return v == null ? null : /^ja/i.test(v); })(),
    bouwdepot: (() => { const v = after(/^Bouwdepot\s*/i); return v && /€/.test(v) ? eur(v) : 0; })(),
    algemeneVoorwaarden: after(/^Toepasselijke voorwaarden\s*/i),
    bijzondereVoorwaarden: bijz,
    passeerdatum: parseDateNl(after(/^Geplande passeerdatum\s*/i) ?? "") ?? null,
  };
}
