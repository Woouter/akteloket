/**
 * Leesbare labels voor interne statuswaarden in de werkplek van notaris en platform.
 * Ruwe enum-waarden (bijv. "in_voorbereiding") horen nooit zichtbaar in de interface.
 */

type Map = Record<string, string>;

export const NOTA_STATUS: Map = { in_voorbereiding: "in voorbereiding", beschikbaar: "gedeeld met partijen (concept)", definitief: "definitief" };
export const BANK_STATUS: Map = { nog_niet_verwacht: "nog niet verwacht", verwacht: "verwacht", ontvangen: "ontvangen", in_behandeling: "in behandeling" };
export const FIN_STATUS: Map = { aanvraag_loopt: "aanvraag loopt", offerte_ontvangen: "offerte ontvangen", offerte_geaccepteerd: "offerte geaccepteerd", rond: "financiering rond", weet_niet: "status onbekend" };
export const KO_STATUS: Map = { ontbreekt: "ontbreekt", ontvangen: "ontvangen", verwerking_nodig: "verwerking nodig", verwerkt: "verwerkt" };
export const EXTRACTIE_METHODE: Map = { ai: "AI-extractie", regels: "regelgebaseerd uitgelezen", handmatig: "handmatig ingevoerd", demo: "demo-extractie" };
export const ID_STATUS: Map = { te_starten: "te starten", in_behandeling: "in behandeling", voltooid: "voltooid" };
export const ID_METHODE: Map = { idin: "iDIN", nfc_app: "NFC-ID-app" };
export const VOLMACHT_STATUS: Map = { te_plannen: "te plannen", gepland: "gepland", ondertekend: "ondertekend", verwerkt: "verwerkt" };
export const KADASTER_STATUS: Map = { op_te_halen: "op te halen", opgehaald: "opgehaald", nader_onderzoek: "nader onderzoek nodig" };
export const PAYOFF_STATUS: Map = { op_te_vragen: "op te vragen", aangevraagd: "aangevraagd", ontvangen: "ontvangen", gecontroleerd: "gecontroleerd" };
export const REQUEST_STATUS: Map = { open: "open", beantwoord: "beantwoord", afgehandeld: "afgehandeld" };
export const SIDE_LABEL: Map = { koper: "Koper", verkoper: "Verkoper" };

export const WWFT_BESCHIKBAAR: Map = { helemaal: "volledig beschikbaar", gedeeltelijk: "gedeeltelijk beschikbaar", nog_niet: "nog niet beschikbaar" };
export const WWFT_REKENING: Map = { eigen: "eigen rekening", gezamenlijk: "gezamenlijke rekening", onderneming: "ondernemingsrekening", iemand_anders: "rekening van een derde", anders: "andere rekening" };
export const WWFT_EIGENAAR: Map = { mij: "geld van koper", mij_en_partner: "geld van koper en partner", onderneming: "geld van onderneming", derde: "geld van een derde", anders: "eigenaar: anders" };
export const WWFT_DETAIL: Map = {
  opbouw: "Opbouw", bezit: "Verkocht bezit", afgerond: "Verkoop afgerond", van: "Van", relatie: "Relatie", ontvangen: "Ontvangen", voorwaarden: "Voorwaarden",
  schriftelijk: "Schriftelijke overeenkomst", afspraken: "Afspraken", uitgekeerd: "Uitgekeerd", verwacht: "Verwacht", onderneming: "Onderneming", hoe: "Wijze",
  prive: "Privé beschikbaar", welke: "Bezittingen", omschrijving: "Omschrijving",
};

/** Waarde uit een labelmap; onbekende waarden zonder underscores, ontbrekende als streepje. */
export function label(map: Map, v: string | undefined | null, fallback = "—"): string {
  if (!v) return fallback;
  return map[v] ?? v.replace(/_/g, " ");
}

const ALL: Map = { ...NOTA_STATUS, ...BANK_STATUS, ...FIN_STATUS, ...KO_STATUS, ...ID_STATUS, ...VOLMACHT_STATUS, ...KADASTER_STATUS, ...PAYOFF_STATUS, ...WWFT_BESCHIKBAAR, ...WWFT_REKENING, ...WWFT_EIGENAAR, rond: "rond" };

/**
 * Vervangt ruwe enum-tokens (snake_case) in vrije tekst door leesbare woorden, bijv. in
 * gelogde berichten of statusregels die elders worden opgebouwd.
 */
export function humanize(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (t) => ALL[t] ?? t.replace(/_/g, " "));
}

/** Eerste letter als hoofdletter. */
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
