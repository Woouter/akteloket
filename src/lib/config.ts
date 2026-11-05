/**
 * Centrale configuratie van Akteloket.
 *
 * Alles wat per pilot, per notaris of per kalenderjaar kan wijzigen staat hier
 * (of in de `settings`-tabel, die deze waarden kan overschrijven). Zie
 * docs/BESLISSINGEN.md voor de onderbouwing van iedere keuze.
 */

export const BRAND = {
  name: "Akteloket",
  domain: "akte-loket.nl",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://akte-loket.nl",
  demoUrl: "https://demo.akte-loket.nl",
  tagline: "Je notaris voor je woning, volledig online geregeld.",
  email: "hallo@akte-loket.nl",
  phone: "085 – 060 42 10",
  phoneHref: "tel:+31850604210",
  /** KvK-nummer; zet NEXT_PUBLIC_KVK zodra bekend (wordt anders niet getoond). */
  kvk: process.env.NEXT_PUBLIC_KVK ? `KvK ${process.env.NEXT_PUBLIC_KVK}` : "",
  address: "Online · werkzaam in heel Nederland",
} as const;

/** De aangesloten (pilot)notaris. In productie via env/settings te overschrijven. */
export const NOTARY_OFFICE = {
  officeName: process.env.NOTARY_OFFICE_NAME || "Notariskantoor Van Dam",
  notaryName: process.env.NOTARY_NAME || "mr. L.M. (Lotte) van Dam",
  notaryShort: process.env.NOTARY_SHORT || "mr. L.M. van Dam",
  city: process.env.NOTARY_CITY || "Amersfoort",
  address: process.env.NOTARY_ADDRESS || "Stationsplein 8, 3818 LE Amersfoort",
  /** Medewerkers die als gevolmachtigde de akten ondertekenen. */
  proxyHolders: ["iedere medewerker van het kantoor van de notaris"],
  kwaliteitsrekening: "NL00 DEMO 0000 0000 00 (kwaliteitsrekening notaris)",
};

export type AppMode = "demo" | "production";

/**
 * Modus van de applicatie.
 * - `demo`: demobalk, rollenwisselaar, tours, simulaties, resetknop, gesimuleerde koppelingen.
 * - `production`: echte koppelingen; demofuncties zijn uitgeschakeld.
 * Standaard `demo` zodat een verse checkout direct alles laat zien.
 */
export function appMode(): AppMode {
  return process.env.APP_MODE === "production" ? "production" : "demo";
}
export const isDemo = () => appMode() === "demo";

// ---------------------------------------------------------------------------
// Diensten en prijzen
// ---------------------------------------------------------------------------

export type ServiceKey = "beide" | "levering" | "hypotheek" | "koopovereenkomst";

export interface ServiceDef {
  key: ServiceKey;
  name: string;
  short: string;
  description: string;
  price: number; // all-in, incl. btw en kadasterinschrijving
  from?: boolean;
  includes: string[];
  slug: string;
}

export const SERVICES: Record<ServiceKey, ServiceDef> = {
  beide: {
    key: "beide",
    name: "Leveringsakte + hypotheekakte",
    short: "Levering + hypotheek",
    description: "Voor de meeste kopers: de overdracht van je woning én de hypotheekakte in één dossier.",
    price: 895,
    includes: [
      "Akte van levering en hypotheekakte",
      "Eén gecombineerde volmacht voor beide akten",
      "Kadasterinschrijving van beide akten",
      "Kadastrale recherche en concept-akten",
      "Nota van afrekening en afwikkeling geldstromen",
      "Persoonlijk portaal met live status",
    ],
    slug: "levering-en-hypotheekakte",
  },
  levering: {
    key: "levering",
    name: "Akte van levering",
    short: "Leveringsakte",
    description: "Je koopt zonder hypotheek, of je hypotheekakte loopt elders: alleen de eigendomsoverdracht.",
    price: 649,
    includes: [
      "Akte van levering (transportakte)",
      "Volmacht voor de levering",
      "Kadasterinschrijving",
      "Kadastrale recherche en concept-akte",
      "Nota van afrekening en afwikkeling geldstromen",
      "Persoonlijk portaal met live status",
    ],
    slug: "akte-van-levering",
  },
  hypotheek: {
    key: "hypotheek",
    name: "Hypotheekakte",
    short: "Hypotheekakte",
    description: "Alleen de hypotheekakte, bijvoorbeeld bij oversluiten of als de levering al geregeld is.",
    price: 449,
    includes: [
      "Hypotheekakte op basis van de bankinstructie",
      "Volmacht voor de hypotheekakte",
      "Kadasterinschrijving",
      "Controle bankinstructie en hypotheekgelden",
      "Nota van afrekening",
      "Persoonlijk portaal met live status",
    ],
    slug: "hypotheekakte",
  },
  koopovereenkomst: {
    key: "koopovereenkomst",
    name: "Koopovereenkomst opstellen",
    short: "Koopovereenkomst",
    description: "Zelf een huis verkocht of gekocht zonder makelaar? Wij stellen een sluitende koopovereenkomst op.",
    price: 395,
    includes: [
      "Begeleide online vragenlijst",
      "Koopovereenkomst volgens vaste structuur, juridisch gecontroleerd",
      "Ontbindende voorwaarden en waarborgsom goed geregeld",
      "Digitaal ondertekenen door koper en verkoper",
      "Bewaking bedenktijd en termijnen",
      "Met één klik door naar je akte van levering",
    ],
    slug: "koopovereenkomst-opstellen",
  },
};

export const EXTRAS = [
  { key: "spoed", name: "Spoedafhandeling (passeren binnen 10 werkdagen)", price: 195 },
  { key: "extra_hypotheek", name: "Tweede hypotheekakte (bijv. overbrugging of tweede geldverstrekker)", price: 225 },
  { key: "inschrijving_ko", name: "Inschrijving koopovereenkomst in het Kadaster", price: 125 },
  { key: "volmacht_kantoor", name: "Volmacht tekenen op kantoor i.p.v. video (geen meerprijs)", price: 0 },
];

// ---------------------------------------------------------------------------
// Fiscale tabellen (per kalenderjaar onderhouden — geen vaste bedragen in code)
// ---------------------------------------------------------------------------

export interface TaxYear {
  year: number;
  /** Woningwaardegrens startersvrijstelling (art. 15 lid 1 onderdeel p WBR). */
  startersGrens: number;
  tariefHoofdverblijf: number; // verlaagd tarief eigen bewoning
  tariefOverigeWoning: number; // niet-hoofdverblijf / belegging
  tariefNietWoning: number;
  status: "vastgesteld" | "onder voorbehoud";
  note?: string;
}

export const TAX_YEARS: TaxYear[] = [
  { year: 2025, startersGrens: 525_000, tariefHoofdverblijf: 0.02, tariefOverigeWoning: 0.104, tariefNietWoning: 0.104, status: "vastgesteld" },
  { year: 2026, startersGrens: 555_000, tariefHoofdverblijf: 0.02, tariefOverigeWoning: 0.08, tariefNietWoning: 0.104, status: "vastgesteld" },
  {
    year: 2027,
    startersGrens: 615_000,
    tariefHoofdverblijf: 0.02,
    tariefOverigeWoning: 0.07,
    tariefNietWoning: 0.104,
    status: "onder voorbehoud",
    note: "Woningwaardegrens 2027 vastgesteld via bijstellingsregeling; tarief 7% voor overige woningen volgt uit Belastingplan 2027 (nog parlementaire behandeling).",
  },
];

export function taxYearFor(date: Date | string | null | undefined): TaxYear {
  const y = date ? new Date(date).getFullYear() : new Date().getFullYear();
  return TAX_YEARS.find((t) => t.year === y) ?? TAX_YEARS[TAX_YEARS.length - 1];
}

/** Kosten die op de nota van afrekening (indicatief) worden doorgerekend. Instelbaar door notaris. */
export const COST_DEFAULTS = {
  doorhalingPerHypotheek: 95, // kosten royement/doorhaling, incl. kadaster, per inschrijving
  bankKosten: 0,
  vveVerrekenen: true,
  ozbVerrekenen: true,
};

export const TERMS = {
  /** Aantal dagen voor de leveringsdatum waarop we de datum laten bevestigen. */
  datumCheckDagenVooraf: 14,
  /** Herinnering bij geen reactie (dagen na datumcheck). */
  herinneringNaDagen: 3,
  /** Signaal aan notaris bij geen reactie (dagen na herinnering). */
  signaalNotarisNaDagen: 2,
  /** Hypotheekinstructie uiterlijk verwacht X dagen voor passeren. */
  bankinstructieUiterlijkDagenVooraf: 10,
  /** Concept-aanvragen zonder afronding worden na X dagen verwijderd (dataminimalisatie). */
  conceptBewaarDagen: 7,
};

export const DVO_VERSION = "v1.0";
