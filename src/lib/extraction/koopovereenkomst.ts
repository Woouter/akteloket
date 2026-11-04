import "server-only";
import { z } from "zod";
import { parseDateNl, parseEuro } from "@/lib/util/format";

/**
 * Scanner voor de koopovereenkomst.
 *
 * Volgorde:
 *  1. Tekstlaag uitlezen (unpdf). Controle op bestandstype, leesbaarheid en paginatal.
 *  2. Met ANTHROPIC_API_KEY: Claude leest de PDF zelf (ook scans/foto's) en geeft een
 *     gestructureerd resultaat met per gegeven pagina, citaat en zekerheid.
 *  3. Zonder sleutel of bij een fout: regelgebaseerde parser op de tekstlaag.
 * Onzekere of ontbrekende velden worden gemarkeerd — er wordt niets "aangenomen".
 * Handtekeningen worden niet automatisch als juridisch geldig beoordeeld.
 */

const Person = z.object({
  voornamen: z.string().nullable(),
  achternaam: z.string().nullable(),
  geboortedatum: z.string().nullable().describe("ISO yyyy-mm-dd"),
  geboorteplaats: z.string().nullable(),
  adres: z.string().nullable().describe("straat + huisnummer"),
  postcode: z.string().nullable(),
  woonplaats: z.string().nullable(),
  burgerlijkeStaat: z.enum(["ongehuwd", "gehuwd", "geregistreerd_partner", "gescheiden", "weduwe"]).nullable(),
  partnerNaam: z.string().nullable(),
  email: z.string().nullable(),
  telefoon: z.string().nullable(),
});

export const KoSchema = z.object({
  isKoopovereenkomst: z.boolean().describe("Is dit document een koopovereenkomst van onroerend goed?"),
  verkopers: z.array(Person),
  kopers: z.array(Person),
  object: z.object({
    straat: z.string().nullable(),
    huisnummer: z.string().nullable(),
    toevoeging: z.string().nullable(),
    postcode: z.string().nullable(),
    plaats: z.string().nullable(),
    soort: z.enum(["woning", "appartement", "bouwgrond", "overig"]).nullable(),
    omschrijving: z.string().nullable(),
    kadastraleGemeente: z.string().nullable(),
    sectie: z.string().nullable(),
    perceel: z.string().nullable(),
    appartementsindex: z.string().nullable(),
    grootte: z.string().nullable(),
  }),
  koopprijs: z.number().nullable().describe("koopprijs onroerende zaak in euro"),
  roerendeZaken: z.number().nullable(),
  datumOndertekening: z.string().nullable(),
  leveringsdatum: z.string().nullable(),
  eigendomsverhoudingKopers: z.string().nullable().describe("bijv. 'ieder 1/2' of percentages"),
  waarborgsom: z.object({ bedrag: z.number().nullable(), type: z.enum(["waarborgsom", "bankgarantie"]).nullable(), uiterlijk: z.string().nullable() }),
  financieringsvoorbehoud: z.object({ bedrag: z.number().nullable(), datum: z.string().nullable(), nhg: z.boolean().nullable() }),
  overigeVoorbehouden: z.array(z.object({ omschrijving: z.string(), datum: z.string().nullable() })),
  bedenktijdEinde: z.string().nullable(),
  notaris: z.string().nullable(),
  makelaarVerkoper: z.string().nullable(),
  makelaarKoper: z.string().nullable(),
  bijzondereBepalingen: z.array(z.object({ titel: z.string(), tekst: z.string(), pagina: z.number().nullable() })),
  bronnen: z.array(z.object({
    veld: z.string().describe("pad van het veld, bijv. 'koopprijs', 'kopers.0.geboortedatum', 'object.perceel'"),
    pagina: z.number().nullable(),
    citaat: z.string().describe("letterlijk fragment uit het document (max 160 tekens)"),
    zekerheid: z.number().describe("0..1"),
  })),
  documentControle: z.object({
    paginaNummeringCompleet: z.boolean().nullable(),
    handtekeningenZichtbaar: z.boolean().nullable(),
    bijlagenGenoemd: z.array(z.string()),
    opmerkingen: z.array(z.string()),
  }),
});
export type KoExtraction = z.infer<typeof KoSchema>;

export interface ScanResult {
  extraction: KoExtraction;
  method: "ai" | "regels";
  pages: number;
  textChars: number;
  missing: string[];
  uncertain: string[];
  warnings: string[];
  fileCheck: { type: string; leesbaar: boolean; paginas: number; tekstlaag: boolean };
}

export async function pdfText(buf: Buffer): Promise<{ pages: string[]; total: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  return { pages: text as unknown as string[], total: totalPages };
}

export async function scanKoopovereenkomst(buf: Buffer, mime: string): Promise<ScanResult> {
  const warnings: string[] = [];
  let pages: string[] = [];
  let total = 0;
  const isPdf = mime === "application/pdf" || buf.subarray(0, 4).toString() === "%PDF";
  if (isPdf) {
    try {
      const t = await pdfText(buf);
      pages = t.pages;
      total = t.total;
    } catch {
      warnings.push("Het PDF-bestand kon niet worden gelezen. Upload een ander exemplaar of vul de gegevens handmatig in.");
    }
  }
  const textChars = pages.join("").replace(/\s/g, "").length;
  const tekstlaag = textChars > 200;
  if (isPdf && !tekstlaag) warnings.push("Het document lijkt een scan zonder tekstlaag; automatische herkenning vereist AI-verwerking.");

  let extraction: KoExtraction | null = null;
  let method: ScanResult["method"] = "regels";
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    try {
      extraction = await aiExtract(buf, isPdf ? "application/pdf" : mime);
      method = "ai";
    } catch (err) {
      warnings.push("AI-herkenning was niet beschikbaar; we hebben de regelgebaseerde scanner gebruikt.");
      console.error("[scanner] AI-extractie mislukt:", err);
    }
  }
  if (!extraction) extraction = ruleExtract(pages);

  if (!extraction.isKoopovereenkomst) warnings.push("Dit document lijkt geen koopovereenkomst te zijn. Controleer of je het juiste bestand hebt geüpload.");
  if (extraction.documentControle.paginaNummeringCompleet === false) warnings.push("Mogelijk ontbreken er pagina's. Upload de volledige overeenkomst inclusief bijlagen.");

  const { missing, uncertain } = assess(extraction);
  return {
    extraction, method, pages: total, textChars, missing, uncertain, warnings,
    fileCheck: { type: isPdf ? "PDF" : mime, leesbaar: tekstlaag || method === "ai", paginas: total, tekstlaag },
  };
}

const REQUIRED: [string, string][] = [
  ["object.straat", "Straat van de woning"],
  ["object.huisnummer", "Huisnummer"],
  ["object.postcode", "Postcode"],
  ["object.plaats", "Plaats"],
  ["koopprijs", "Koopprijs"],
  ["leveringsdatum", "Leveringsdatum"],
  ["kopers", "Koper(s)"],
  ["verkopers", "Verkoper(s)"],
  ["object.perceel", "Kadastrale aanduiding"],
  ["datumOndertekening", "Datum ondertekening"],
  ["notaris", "Gekozen notaris"],
];

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

function assess(x: KoExtraction) {
  const missing: string[] = [];
  for (const [p, label] of REQUIRED) {
    const v = get(x, p);
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) missing.push(label);
  }
  x.kopers.forEach((k, i) => { if (!k.geboortedatum) missing.push(`Geboortedatum koper ${i + 1}`); });
  x.verkopers.forEach((k, i) => { if (!k.geboortedatum) missing.push(`Geboortedatum verkoper ${i + 1}`); });
  const uncertain = x.bronnen.filter((b) => b.zekerheid < 0.75).map((b) => b.veld);
  return { missing, uncertain };
}

// ---------------------------------------------------------------------------
// AI-extractie (Claude, PDF-invoer + gestructureerde uitvoer)
// ---------------------------------------------------------------------------

const SYSTEM = `Je bent een nauwkeurige extractie-assistent voor een Nederlands notarieel dossierplatform.
Je leest een koopovereenkomst van een woning (inclusief bijlagen) en geeft uitsluitend gegevens terug die letterlijk of eenduidig in het document staan.
Regels:
- Verzin niets. Als een gegeven ontbreekt of onleesbaar is: null.
- Datums als ISO (yyyy-mm-dd). Bedragen als getal in euro's (zonder punten/komma's als duizendtal).
- Splits namen in voornamen en achternaam (tussenvoegsels zoals "de", "van der" horen bij de achternaam).
- Neem bij bijzondere bepalingen de titel en de kern van de tekst over, met paginanummer.
- Geef in 'bronnen' voor elk ingevuld kerngegeven de pagina, een kort letterlijk citaat en je zekerheid (0..1). Gebruik lagere zekerheid bij handschrift, slechte scans of tegenstrijdigheden.
- Beoordeel handtekeningen niet op juridische geldigheid; geef alleen aan of ze zichtbaar zijn.`;

async function aiExtract(buf: Buffer, mime: string): Promise<KoExtraction> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const { betaZodOutputFormat } = await import("@anthropic-ai/sdk/helpers/beta/zod");
  const client = new Anthropic();
  const isImage = mime.startsWith("image/");
  const source = isImage
    ? ({ type: "image", source: { type: "base64", media_type: mime as "image/jpeg" | "image/png" | "image/webp", data: buf.toString("base64") } } as const)
    : ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } } as const);

  const response = await client.beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: betaZodOutputFormat(KoSchema) },
    messages: [{ role: "user", content: [source, { type: "text", text: "Lees deze koopovereenkomst uit volgens het schema." }] }],
  });
  if (response.stop_reason === "refusal") throw new Error("Extractie geweigerd");
  if (!response.parsed_output) throw new Error("Geen gestructureerde uitvoer ontvangen");
  return response.parsed_output;
}

// ---------------------------------------------------------------------------
// Regelgebaseerde extractie (fallback, werkt op de tekstlaag)
// ---------------------------------------------------------------------------

const TUSSEN = new Set(["van", "de", "der", "den", "het", "ter", "ten", "te", "in", "'t", "op", "la", "le", "du", "el", "da", "di", "von", "vande", "vanden"]);

export function splitName(full: string): { voornamen: string; achternaam: string } {
  const words = full.replace(/^(de heer|mevrouw|dhr\.?|mw\.?)\s+/i, "").trim().split(/\s+/);
  if (words.length <= 1) return { voornamen: "", achternaam: words[0] ?? "" };
  let i = words.length - 1;
  while (i > 1 && TUSSEN.has(words[i - 1].toLowerCase())) i--;
  return { voornamen: words.slice(0, i).join(" "), achternaam: words.slice(i).join(" ") };
}

const DATE = String.raw`(\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})`;
const EUR = String.raw`€\s?([\d.]+(?:,\d{2})?)(?:,-)?`;

function ruleExtract(pages: string[]): KoExtraction {
  const norm = (s: string) => s.replace(/ /g, " ").replace(/-\n(?=[a-z])/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
  const pageTexts = pages.map(norm);
  const text = pageTexts.join(" \f ");
  const bronnen: KoExtraction["bronnen"] = [];
  const pageOf = (snippet: string) => {
    const i = pageTexts.findIndex((p) => p.includes(snippet.slice(0, 40)));
    return i >= 0 ? i + 1 : null;
  };
  const src = (veld: string, m: RegExpMatchArray | null, zekerheid = 0.92) => {
    if (m) bronnen.push({ veld, pagina: pageOf(m[0]), citaat: m[0].slice(0, 160), zekerheid });
  };

  const isKo = /koopovereenkomst|koopakte|verkoopt aan/i.test(text);

  // Partijen
  const vkStart = text.search(/ondergetekenden/i);
  const vkEnd = text.search(/te noemen:?\s*["“']?verkoper/i);
  const kpEnd = text.search(/te noemen:?\s*["“']?koper/i);
  const parseStrict = (segment: string, side: "verkopers" | "kopers") => {
    const re = new RegExp(String.raw`(?:\d\.\s*)?(?:de heer |mevrouw )?([A-ZÀ-Ý][\p{L}'.\- ]+?),\s*geboren te ([\p{L}'\- ]+?) op ${DATE},\s*wonende te (\d{4}\s?[A-Z]{2})\s+([\p{L}'\- ]+?),\s*([^,;]+?),\s*([^;]*?);`, "giu");
    const res: KoExtraction["kopers"] = [];
    for (const m of segment.matchAll(re)) {
      const n = splitName(m[1].trim());
      const staatTxt = m[7].toLowerCase();
      const staat = /ongehuwd/.test(staatTxt) ? "ongehuwd" : /geregistreerd/.test(staatTxt) && !/niet geregistreerd/.test(staatTxt) ? "geregistreerd_partner" : /gehuwd/.test(staatTxt) ? "gehuwd" : /gescheiden/.test(staatTxt) ? "gescheiden" : /weduw/.test(staatTxt) ? "weduwe" : null;
      const partner = staatTxt.match(/gehuwd met ([\p{L}'.\- ]+)/iu)?.[1]?.trim();
      res.push({
        voornamen: n.voornamen, achternaam: n.achternaam,
        geboortedatum: parseDateNl(m[3]) ?? null, geboorteplaats: m[2].trim(),
        postcode: m[4].replace(/\s+/, " ").toUpperCase(), woonplaats: m[5].trim(), adres: m[6].trim(),
        burgerlijkeStaat: staat as KoExtraction["kopers"][number]["burgerlijkeStaat"],
        partnerNaam: partner ? partner.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : null,
        email: null, telefoon: null,
      });
      const i = res.length - 1;
      bronnen.push({ veld: `${side}.${i}.naam`, pagina: pageOf(m[0]), citaat: m[0].slice(0, 160), zekerheid: 0.9 });
      bronnen.push({ veld: `${side}.${i}.geboortedatum`, pagina: pageOf(m[0]), citaat: `geboren te ${m[2]} op ${m[3]}`, zekerheid: 0.93 });
    }
    return res;
  };
  const verkopers = vkStart >= 0 && vkEnd > vkStart ? parseStrict(text.slice(vkStart, vkEnd + 40), "verkopers") : [];
  const kopers = vkEnd >= 0 && kpEnd > vkEnd ? parseStrict(text.slice(vkEnd, kpEnd + 40), "kopers") : [];

  // Contactgegevens
  const contact = (label: string) => text.match(new RegExp(`Contactgegevens ${label}:([^\\f]*?)(?:Contactgegevens|\\f|$)`, "i"))?.[1] ?? "";
  const assign = (list: KoExtraction["kopers"], seg: string) => {
    const emails = seg.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
    const phones = seg.match(/0[1-9][\d\s-]{8,11}\d/g) ?? [];
    list.forEach((p, i) => { p.email = emails[i]?.replace(/[.,]$/, "") ?? null; p.telefoon = phones[i]?.trim() ?? null; });
  };
  assign(verkopers, contact("verkoper"));
  assign(kopers, contact("koper"));

  // Object
  const objM = text.match(/plaatselijk bekend (?:als|onder) ([^,]+?)\s(\d+)\s?([A-Za-z]{0,2}(?:-\w+)?)?,\s*(\d{4}\s?[A-Z]{2})\s+([\p{L}'\- ]+?)[,.]/u);
  src("object.adres", objM, 0.95);
  const kadM = text.match(/kadastraal bekend (?:als )?gemeente ([\p{L}'\- ]+?),?\s*sectie ([A-Z]{1,2}),?\s*(?:nummer|perceel|nr\.?)\s*(\d+)(?:,?\s*(?:appartementsindex|index)\s*([A-Z0-9]+))?(?:,?\s*groot ([^,"“]+?))?[,.]/u);
  src("object.perceel", kadM, 0.95);
  const soort = /appartementsrecht|appartement/i.test(text.slice(0, 3000)) ? "appartement" : /woning|woonhuis/i.test(text) ? "woning" : null;
  const omschrijving = text.match(/verkoopt aan koper, die van verkoper koopt:?\s*(?:de |het )?(.{5,140}?),\s*plaatselijk/i)?.[1] ?? null;

  // Bedragen
  const prijsM = text.match(new RegExp(String.raw`koop(?:prijs|som) van de onroerende zaak bedraagt ${EUR}`, "i")) ?? text.match(new RegExp(String.raw`koop(?:prijs|som)[^€]{0,80}${EUR}`, "i"));
  src("koopprijs", prijsM, 0.95);
  const roerendM = text.match(new RegExp(String.raw`(?:prijs|koopprijs|koopsom) van de roerende zaken bedraagt ${EUR}`, "i"));
  src("roerendeZaken", roerendM, 0.9);
  const waarbM = text.match(new RegExp(String.raw`uiterlijk op ${DATE}[^€]{0,160}(waarborgsom|bankgarantie)[^€]{0,80}${EUR}`, "i")) ?? text.match(new RegExp(String.raw`(waarborgsom|bankgarantie)[^€]{0,160}${EUR}`, "i"));
  src("waarborgsom.bedrag", waarbM, 0.85);
  const waarbBedrag = waarbM ? parseEuro(waarbM[waarbM.length - 1]) ?? null : null;
  const waarbDatum = waarbM && waarbM.length === 4 ? parseDateNl(waarbM[1]) ?? null : null;

  // Datums
  const levM = text.match(new RegExp(String.raw`levering zal plaatsvinden op ${DATE}`, "i")) ?? text.match(new RegExp(String.raw`(?:datum van levering|leveringsdatum|transportdatum)[:\s]+(?:op\s+)?${DATE}`, "i")) ?? text.match(new RegExp(String.raw`akte van levering zal (?:worden verleden|plaatsvinden) op ${DATE}`, "i"));
  src("leveringsdatum", levM, 0.93);
  const ondM = text.match(new RegExp(String.raw`(?:opgemaakt en )?ondertekend te [\p{L}'\- ]+? op ${DATE}`, "iu"));
  src("datumOndertekening", ondM, 0.88);
  const finM = text.match(new RegExp(String.raw`uiterlijk op ${DATE}[^.]{0,220}?(?:bedrag van|ter hoogte van) ${EUR}[^.]{0,80}(?:hypothe|geldlening|financiering)`, "i"));
  src("financieringsvoorbehoud.datum", finM, 0.88);
  const nhg = /nationale hypotheek garantie|\bNHG\b/i.test(text) ? (/zonder (?:nationale hypotheek garantie|NHG)/i.test(text) ? false : true) : null;
  const keurM = text.match(new RegExp(String.raw`bouwkundige keuring[^.]{0,140}?uiterlijk op ${DATE}`, "i"));
  const bedM = text.match(new RegExp(String.raw`bedenktijd eindigt op ${DATE}`, "i"));
  src("bedenktijdEinde", bedM, 0.9);

  // Notaris en makelaar
  const notM = text.match(/ten overstaan van ((?:mr\.?\s)?[^,]+?,\s*(?:kandidaat-)?notaris te [\p{L}'\- ]+?)(?:,|\.| of)/iu) ?? text.match(/notaris(?:\s*:)?\s+((?:mr\.?\s)?[A-Z][^,]+?) te ([\p{L}'\- ]+)/u);
  src("notaris", notM, 0.9);
  const makM = text.match(/bemiddeling van ([^,]+?),\s*makelaar van verkoper/i);

  // Eigendomsverhouding
  const helft = /ieder voor (?:de )?(?:onverdeelde )?helft|ieder voor 1\/2/i.test(text) ? "ieder 1/2" : (text.match(/ieder voor (?:een )?(?:onverdeeld )?(\d+\/\d+|\d+%)/i)?.[1] ?? null);

  // Bijzondere bepalingen
  const bijz: KoExtraction["bijzondereBepalingen"] = [];
  let bijzStart = text.search(/Artikel \d+\s*[—–-]\s*Bijzondere bepalingen/i);
  if (bijzStart < 0) bijzStart = text.search(/\bBijzondere bepalingen\b(?!\s+vermeld)/i);
  if (bijzStart >= 0) {
    const seg = text.slice(bijzStart + 20, bijzStart + 8000).split(/Artikel \d+\s*[—–-]|Ondertekening/i)[0] + " ";
    const segWithBreak = seg.split("\f").join(" ");
    for (const m of segWithBreak.matchAll(/\d+\.\d+\s+([A-ZÀ-Ý][\p{L} '\-]{2,60}?):\s+(.+?)(?=\s\d+\.\d+\s+[A-ZÀ-Ý]|\s*$)/gu)) {
      bijz.push({ titel: m[1].trim(), tekst: m[2].trim(), pagina: pageOf(m[2].slice(0, 40)) });
    }
  }

  // Document-controle
  const pageNums = [...text.matchAll(/Pagina (\d+)/g)].map((m) => Number(m[1]));
  const compleet = pageNums.length ? pageNums.every((n, i) => n === i + 1) : null;
  const bijlagen = [...text.matchAll(/Bijlage\s*[—:-]\s*([^\f.()]{3,40})/gi)].map((m) => m[1].trim());

  return {
    isKoopovereenkomst: isKo,
    verkopers,
    kopers,
    object: {
      straat: objM?.[1]?.trim() ?? null,
      huisnummer: objM?.[2] ?? null,
      toevoeging: objM?.[3]?.trim() || null,
      postcode: objM?.[4]?.replace(/\s+/, " ").toUpperCase() ?? null,
      plaats: objM?.[5]?.trim() ?? null,
      soort,
      omschrijving: omschrijving?.trim() ?? null,
      kadastraleGemeente: kadM?.[1]?.trim() ?? null,
      sectie: kadM?.[2] ?? null,
      perceel: kadM?.[3] ?? null,
      appartementsindex: kadM?.[4] ?? null,
      grootte: kadM?.[5]?.trim() ?? null,
    },
    koopprijs: prijsM ? parseEuro(prijsM[1]) ?? null : null,
    roerendeZaken: roerendM ? parseEuro(roerendM[1]) ?? null : null,
    datumOndertekening: ondM ? parseDateNl(ondM[1]) ?? null : null,
    leveringsdatum: levM ? parseDateNl(levM[1]) ?? null : null,
    eigendomsverhoudingKopers: helft,
    waarborgsom: { bedrag: waarbBedrag, type: waarbM ? (/bankgarantie/i.test(waarbM[0]) && !/waarborgsom/i.test(waarbM[0]) ? "bankgarantie" : "waarborgsom") : null, uiterlijk: waarbDatum },
    financieringsvoorbehoud: { bedrag: finM ? parseEuro(finM[2]) ?? null : null, datum: finM ? parseDateNl(finM[1]) ?? null : null, nhg },
    overigeVoorbehouden: keurM ? [{ omschrijving: "Bouwkundige keuring", datum: parseDateNl(keurM[1]) ?? null }] : [],
    bedenktijdEinde: bedM ? parseDateNl(bedM[1]) ?? null : null,
    notaris: notM ? (notM[2] ? `${notM[1]}, notaris te ${notM[2]}` : notM[1]).trim() : null,
    makelaarVerkoper: makM?.[1]?.trim() ?? null,
    makelaarKoper: null,
    bijzondereBepalingen: bijz,
    bronnen,
    documentControle: {
      paginaNummeringCompleet: compleet,
      handtekeningenZichtbaar: /ondertekend|handtekening/i.test(text) ? null : false,
      bijlagenGenoemd: bijlagen,
      opmerkingen: [],
    },
  };
}
