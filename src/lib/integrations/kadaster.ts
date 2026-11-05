import "server-only";
import type { KadasterRegistratie, KadastraleAanduiding } from "@/lib/domain/types";
import { DEMO } from "@/lib/demo/scenario";
import { kadasterEigendomPdf, kadasterKaartPdf, vorigeAktePdf } from "@/lib/demo/pdfs";
import { dateNl, euro } from "@/lib/util/format";
import { shortId } from "@/lib/util/ids";

/**
 * Kadaster-koppeling.
 *
 * KADASTER_PROVIDER=mock (standaard in demo) → fictieve, realistische gegevens.
 * KADASTER_PROVIDER=http → jouw eigen Kadaster-API (KADASTER_API_URL + KADASTER_API_KEY).
 *   Verwacht JSON volgens `HttpKadasterResponse` hieronder; zie docs/INTEGRATIES.md.
 *   Pas `mapHttp()` aan als jouw API een andere structuur teruggeeft.
 */

export interface KadasterQuery {
  postcode?: string;
  huisnummer?: string;
  toevoeging?: string;
  aanduiding?: KadastraleAanduiding;
  /** Namen van verkopers uit de KO — alleen gebruikt door de mock om plausibele data te maken. */
  hintVerkopers?: { naam: string; geboortedatum?: string }[];
  hintKoopprijs?: number;
}

export interface KadasterDoc { kind: "kadaster_eigendom" | "kadaster_kaart" | "kadaster_akte" | "kadaster_hypotheken"; filename: string; mime: string; content: Buffer; kenmerk: string }

export interface KadasterResult {
  bron: string;
  kenmerk: string;
  aanduiding: KadastraleAanduiding;
  rechthebbenden: { naam: string; recht: string; aandeel?: string; geboortedatum?: string }[];
  registraties: KadasterRegistratie[];
  vorigeAkte?: { datum?: string; deel?: string; nummer?: string; notaris?: string; bepalingen?: { titel: string; tekst: string }[] };
  documents: KadasterDoc[];
}

export interface KadasterProvider {
  name: string;
  fetchObject(q: KadasterQuery): Promise<KadasterResult | null>;
}

const norm = (s?: string) => (s ?? "").replace(/\s+/g, "").toUpperCase();

class MockKadaster implements KadasterProvider {
  name = "Kadaster (demo-koppeling, fictieve gegevens)";
  async fetchObject(q: KadasterQuery): Promise<KadasterResult | null> {
    const isDemo = norm(q.postcode) === norm(DEMO.property.postcode) && String(q.huisnummer) === DEMO.property.huisnummer;
    if (isDemo) {
      const k = DEMO.kadaster;
      const [eig, kaart, akte] = await Promise.all([kadasterEigendomPdf(), kadasterKaartPdf(), vorigeAktePdf()]);
      return {
        bron: this.name,
        kenmerk: k.kenmerk,
        aanduiding: DEMO.property.kadastraal,
        rechthebbenden: k.rechthebbenden,
        registraties: [
          { type: "hypotheek", omschrijving: `Recht van hypotheek ten behoeve van ${k.hypotheek.partij}`, partij: k.hypotheek.partij, bedrag: k.hypotheek.bedrag, deel: k.hypotheek.deel, nummer: k.hypotheek.nummer, datum: k.hypotheek.datum, bron: "Hyp4" },
          { type: "erfdienstbaarheid", omschrijving: k.erfdienstbaarheid, deel: k.vorigeAkte.deel, nummer: k.vorigeAkte.nummer, datum: k.vorigeAkte.datum, bron: "Vorige akte van levering" },
          { type: "kwalitatieve_verplichting", omschrijving: k.kwalitatief, deel: k.vorigeAkte.deel, nummer: k.vorigeAkte.nummer, datum: k.vorigeAkte.datum, bron: "Vorige akte van levering" },
        ],
        vorigeAkte: {
          ...k.vorigeAkte,
          bepalingen: [
            { titel: "Erfdienstbaarheid van overpad", tekst: "Erfdienstbaarheid van overpad ten laste van het verkochte en ten behoeve van de percelen K 4820 en K 4822, te voet en met de fiets, ter breedte van ten hoogste 1,20 meter." },
            { titel: "Kwalitatieve verplichting erfafscheiding (met kettingbeding)", tekst: "Verplichting tot onderhoud en instandhouding van de gemeenschappelijke erfafscheiding aan de achterzijde; kettingbeding op straffe van een boete van € 5.000,00." },
          ],
        },
        documents: [
          { kind: "kadaster_eigendom", filename: `eigendomsinformatie-${k.kenmerk}.pdf`, mime: "application/pdf", content: eig, kenmerk: k.kenmerk },
          { kind: "kadaster_kaart", filename: `kadastrale-kaart-${DEMO.property.kadastraal.perceel}.pdf`, mime: "application/pdf", content: kaart, kenmerk: k.kenmerk + "-K" },
          { kind: "kadaster_akte", filename: `akte-${k.vorigeAkte.deel}-${k.vorigeAkte.nummer}.pdf`, mime: "application/pdf", content: akte, kenmerk: `Hyp4 ${k.vorigeAkte.deel}/${k.vorigeAkte.nummer}` },
        ],
      };
    }
    // Generiek: maak plausibele, duidelijk fictieve gegevens op basis van de hints.
    const kenmerk = `DEMO-KAD-${new Date().getFullYear()}-${shortId().toUpperCase()}`;
    const aanduiding: KadastraleAanduiding = q.aanduiding?.perceel ? q.aanduiding : { gemeente: "Onbekend (demo)", sectie: "A", perceel: String(1000 + Math.floor(Math.random() * 8000)), grootte: "2 are en 10 centiare", grootteM2: 210 };
    const rechthebbenden = (q.hintVerkopers?.length ? q.hintVerkopers : [{ naam: "Onbekende eigenaar (demo)" }]).map((v) => ({ naam: v.naam, recht: "Eigendom (recht van)", aandeel: q.hintVerkopers && q.hintVerkopers.length > 1 ? `1/${q.hintVerkopers.length}` : "1/1", geboortedatum: v.geboortedatum }));
    const bedrag = Math.round(((q.hintKoopprijs ?? 400000) * 0.7) / 1000) * 1000;
    const deel = String(70000 + Math.floor(Math.random() * 9000));
    const registraties: KadasterRegistratie[] = [
      { type: "hypotheek", omschrijving: "Recht van hypotheek ten behoeve van Demo Hypotheekbank N.V. (fictief)", partij: "Demo Hypotheekbank N.V. (fictief)", bedrag, deel, nummer: "12", datum: "2016-03-15", bron: "Hyp4" },
    ];
    const eig = await kadasterEigendomPdf({
      kenmerk, aanduiding, locatie: `${q.postcode ?? ""} ${q.huisnummer ?? ""}`.trim(), rechthebbenden,
      verkrijging: `Akte van levering 15 maart 2016, Hyp4 deel ${deel} nummer 11 (fictief)`,
      registraties: [{ type: "Hypotheek", omschrijving: `${registraties[0].partij}, bedrag ${euro(bedrag)}, Hyp4 deel ${deel} nummer 12` }, { type: "Beslag", omschrijving: "Geen" }, { type: "Erfdienstbaarheden", omschrijving: "Geen bekend in registratie (demo)" }],
    });
    return {
      bron: this.name, kenmerk, aanduiding, rechthebbenden, registraties,
      vorigeAkte: { datum: "2016-03-15", deel, nummer: "11", notaris: "Demo-notaris (fictief)", bepalingen: [] },
      documents: [{ kind: "kadaster_eigendom", filename: `eigendomsinformatie-${kenmerk}.pdf`, mime: "application/pdf", content: eig, kenmerk }],
    };
  }
}

/** Verwachte responsstructuur van de eigen Kadaster-API (pas mapHttp aan indien nodig). */
interface HttpKadasterResponse {
  kenmerk: string;
  perceel: { gemeente: string; sectie: string; perceelnummer: string; appartementsindex?: string; grootteM2?: number };
  gerechtigden: { naam: string; geboortedatum?: string; recht: string; aandeel?: string }[];
  inschrijvingen: { soort: string; omschrijving: string; partij?: string; bedrag?: number; deel?: string; nummer?: string; datum?: string }[];
  verkrijgingsakte?: { datum?: string; deel?: string; nummer?: string; notaris?: string };
  documenten?: { soort: "eigendomsinformatie" | "kadastrale_kaart" | "akte" | "hypotheken"; bestandsnaam: string; mime: string; base64: string; kenmerk?: string }[];
}

class HttpKadaster implements KadasterProvider {
  name = "Kadaster (eigen API-koppeling)";
  async fetchObject(q: KadasterQuery): Promise<KadasterResult | null> {
    const base = process.env.KADASTER_API_URL;
    if (!base) throw new Error("KADASTER_API_URL ontbreekt");
    const params = new URLSearchParams();
    if (q.aanduiding?.perceel) {
      params.set("gemeente", q.aanduiding.gemeente ?? "");
      params.set("sectie", q.aanduiding.sectie ?? "");
      params.set("perceel", q.aanduiding.perceel);
      if (q.aanduiding.appartementsindex) params.set("index", q.aanduiding.appartementsindex);
    } else {
      params.set("postcode", norm(q.postcode));
      params.set("huisnummer", q.huisnummer ?? "");
      if (q.toevoeging) params.set("toevoeging", q.toevoeging);
    }
    params.set("documenten", "eigendomsinformatie,kadastrale_kaart,akte");
    const res = await fetch(`${base.replace(/\/$/, "")}/objecten?${params}`, { headers: { authorization: `Bearer ${process.env.KADASTER_API_KEY ?? ""}`, accept: "application/json" } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Kadaster-API ${res.status}`);
    return mapHttp((await res.json()) as HttpKadasterResponse, this.name);
  }
}

function mapHttp(r: HttpKadasterResponse, bron: string): KadasterResult {
  const typeMap: Record<string, KadasterRegistratie["type"]> = { hypotheek: "hypotheek", beslag: "beslag", erfdienstbaarheid: "erfdienstbaarheid", kwalitatieve_verplichting: "kwalitatieve_verplichting", voorkeursrecht: "voorkeursrecht", aantekening: "aantekening" };
  const kindMap = { eigendomsinformatie: "kadaster_eigendom", kadastrale_kaart: "kadaster_kaart", akte: "kadaster_akte", hypotheken: "kadaster_hypotheken" } as const;
  return {
    bron,
    kenmerk: r.kenmerk,
    aanduiding: { gemeente: r.perceel.gemeente, sectie: r.perceel.sectie, perceel: r.perceel.perceelnummer, appartementsindex: r.perceel.appartementsindex, grootteM2: r.perceel.grootteM2 },
    rechthebbenden: r.gerechtigden.map((g) => ({ naam: g.naam, recht: g.recht, aandeel: g.aandeel, geboortedatum: g.geboortedatum })),
    registraties: r.inschrijvingen.map((i) => ({ type: typeMap[i.soort] ?? "overig", omschrijving: i.omschrijving, partij: i.partij, bedrag: i.bedrag, deel: i.deel, nummer: i.nummer, datum: i.datum, bron: "Kadaster" })),
    vorigeAkte: r.verkrijgingsakte,
    documents: (r.documenten ?? []).map((d) => ({ kind: kindMap[d.soort], filename: d.bestandsnaam, mime: d.mime, content: Buffer.from(d.base64, "base64"), kenmerk: d.kenmerk ?? r.kenmerk })),
  };
}

export function kadasterProvider(): KadasterProvider {
  const p = process.env.KADASTER_PROVIDER || (process.env.KADASTER_API_URL ? "http" : "mock");
  return p === "http" ? new HttpKadaster() : new MockKadaster();
}

/** Vergelijk rechthebbenden met de verkopers uit de koopovereenkomst. */
export function compareOwners(rechthebbenden: { naam: string }[], verkopers: string[]): string[] {
  const simple = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const out: string[] = [];
  for (const v of verkopers) if (!rechthebbenden.some((r) => simple(r.naam) === simple(v))) out.push(`Verkoper "${v}" komt niet voor als rechthebbende in de kadastrale registratie.`);
  for (const r of rechthebbenden) if (!verkopers.some((v) => simple(v) === simple(r.naam))) out.push(`Rechthebbende "${r.naam}" staat niet als verkoper in de koopovereenkomst.`);
  return out;
}

export const describeRegistratie = (r: KadasterRegistratie) =>
  `${r.omschrijving}${r.deel ? ` (Hyp4 deel ${r.deel} nummer ${r.nummer})` : ""}${r.datum ? `, ${dateNl(r.datum)}` : ""}`;
