/**
 * Het fictieve voorbeelddossier "Bloesemlaan 14, Amersfoort".
 * ALLE namen, adressen, bedragen, banken en kenmerken zijn verzonnen.
 * Datums zijn relatief t.o.v. vandaag zodat de demo altijd "actueel" is.
 */
import { addDays, todayIso } from "@/lib/util/format";
import { NOTARY_OFFICE } from "@/lib/config";

/** Eerstvolgende werkdag: er wordt niet gepasseerd in het weekend. */
function werkdag(iso: string): string {
  let d = iso;
  for (let i = 0; i < 3; i++) { const wd = new Date(d + "T12:00:00Z").getUTCDay(); if (wd !== 0 && wd !== 6) break; d = addDays(d, 1); }
  return d;
}

export function demoDates(base = todayIso()) {
  return {
    ondertekening: addDays(base, -34),
    terhandstelling: addDays(base, -33),
    bedenktijdEinde: addDays(base, -30),
    keuring: addDays(base, -20),
    waarborgsomUiterlijk: addDays(base, -6),
    financiering: addDays(base, -2),
    levering: werkdag(addDays(base, 13)),
    vorigeLevering: "2011-06-30",
    vorigeHypotheek: "2011-06-30",
  };
}

export const DEMO = {
  reference: "AK-2026-4821",
  property: {
    straat: "Bloesemlaan",
    huisnummer: "14",
    postcode: "3816 XK",
    plaats: "Amersfoort",
    soort: "woning" as const,
    omschrijving: "eengezinswoning (tussenwoning) met tuin en berging",
    kadastraal: { gemeente: "Amersfoort", sectie: "K", perceel: "4821", grootte: "1 are en 68 centiare", grootteM2: 168 },
    bouwjaar: 1987,
    oppervlakte: 118,
    bagId: "0307010000482114",
    wozWaarde: 471000,
  },
  koopprijs: 485000,
  roerendeZaken: 4500,
  waarborgsom: 48500,
  financieringBedrag: 440000,
  ozbJaar: 612,
  waterschapJaar: 98,
  kopers: [
    {
      key: "sanne",
      voornamen: "Sanne Marieke",
      achternaam: "de Vries",
      roepnaam: "Sanne",
      geboortedatum: "1997-02-14",
      geboorteplaats: "Groningen",
      nationaliteit: "Nederlandse",
      adres: "Molenstraat 33",
      postcode: "3811 TB",
      woonplaats: "Amersfoort",
      burgerlijkeStaat: "ongehuwd" as const,
      beroep: "UX-onderzoeker",
      email: "sanne.devries@example.com",
      phone: "06 1234 5678",
      aandeel: "1/2",
    },
    {
      key: "daan",
      voornamen: "Daan Pieter",
      achternaam: "Bakker",
      roepnaam: "Daan",
      geboortedatum: "1990-03-08",
      geboorteplaats: "Amersfoort",
      nationaliteit: "Nederlandse",
      adres: "Molenstraat 33",
      postcode: "3811 TB",
      woonplaats: "Amersfoort",
      burgerlijkeStaat: "ongehuwd" as const,
      beroep: "installatiemonteur",
      email: "daan.bakker@example.com",
      phone: "06 8765 4321",
      aandeel: "1/2",
    },
  ],
  verkopers: [
    {
      key: "henk",
      voornamen: "Hendrikus Johannes",
      achternaam: "Jansen",
      roepnaam: "Henk",
      geboortedatum: "1961-05-12",
      geboorteplaats: "Utrecht",
      nationaliteit: "Nederlandse",
      adres: "Bloesemlaan 14",
      postcode: "3816 XK",
      woonplaats: "Amersfoort",
      burgerlijkeStaat: "gehuwd" as const,
      partnerNaam: "Maria Elisabeth Visser",
      partnerDatum: "1986-08-22",
      email: "henk.jansen@example.com",
      phone: "06 2468 1357",
    },
    {
      key: "marijke",
      voornamen: "Maria Elisabeth",
      achternaam: "Visser",
      roepnaam: "Marijke",
      geboortedatum: "1963-09-03",
      geboorteplaats: "Zeist",
      nationaliteit: "Nederlandse",
      adres: "Bloesemlaan 14",
      postcode: "3816 XK",
      woonplaats: "Amersfoort",
      burgerlijkeStaat: "gehuwd" as const,
      partnerNaam: "Hendrikus Johannes Jansen",
      partnerDatum: "1986-08-22",
      email: "marijke.visser@example.com",
      phone: "06 1357 2468",
    },
  ],
  makelaarVerkoper: "Eemland Makelaardij (fictief)",
  notarisInKo: `${NOTARY_OFFICE.notaryShort}, notaris te ${NOTARY_OFFICE.city}`,
  bijzondereBepalingen: [
    { titel: "Ouderdomsclausule", tekst: "Koper is ermee bekend dat de woning omstreeks 1987 is gebouwd, zodat de eisen die aan de bouwkwaliteit en installaties worden gesteld lager liggen dan bij een nieuwe woning. Verkoper staat er niet voor in dat de woning voldoet aan de eisen die aan nieuwbouw worden gesteld.", page: 3 },
    { titel: "Asbestclausule", tekst: "In de woning kunnen asbesthoudende materialen zijn verwerkt. Koper vrijwaart verkoper voor alle aansprakelijkheid ter zake van de eventuele aanwezigheid van asbest.", page: 3 },
    { titel: "Erfdienstbaarheid van overpad", tekst: "Ten laste van het verkochte en ten behoeve van de percelen Bloesemlaan 12 en 16 is bij akte van 30 juni 2011 een erfdienstbaarheid van overpad gevestigd over het achterpad, zoals nader omschreven in die akte. Koper aanvaardt deze erfdienstbaarheid.", page: 3 },
    { titel: "Zonnepanelen", tekst: "De op het dak aanwezige tien zonnepanelen met omvormer zijn begrepen in de koop en gaan zonder bijbetaling over op koper. Verkoper zal de registratie bij de netbeheerder in overleg met koper overdragen.", page: 4 },
  ],
  kadaster: {
    kenmerk: "DEMO-KAD-2026-18733",
    rechthebbenden: [
      { naam: "Hendrikus Johannes Jansen", recht: "Eigendom (recht van)", aandeel: "1/2 (gemeenschap van goederen)", geboortedatum: "1961-05-12" },
      { naam: "Maria Elisabeth Visser", recht: "Eigendom (recht van)", aandeel: "1/2 (gemeenschap van goederen)", geboortedatum: "1963-09-03" },
    ],
    hypotheek: { partij: "Westbank Hypotheken N.V. (fictief)", bedrag: 260000, deel: "61234", nummer: "87", datum: "2011-06-30" },
    vorigeAkte: { datum: "2011-06-30", deel: "61234", nummer: "86", notaris: "mr. P. de Groot, destijds notaris te Amersfoort (fictief)" },
    erfdienstbaarheid: "Erfdienstbaarheid van overpad ten laste van dit perceel en ten behoeve van de percelen Amersfoort K 4820 (Bloesemlaan 12) en K 4822 (Bloesemlaan 16), gevestigd bij akte van levering d.d. 30 juni 2011, deel 61234 nummer 86.",
    kwalitatief: "Kwalitatieve verplichting tot instandhouding en onderhoud van de gemeenschappelijke erfafscheiding aan de achterzijde, opgenomen in akte d.d. 30 juni 2011, deel 61234 nummer 86 (met kettingbeding).",
  },
  bank: {
    naam: "Noorderlicht Hypotheken N.V. (fictief)",
    kenmerk: "NLH-2026-0091827",
    hypotheekbedrag: 440000,
    inschrijving: 550000,
    leningdelen: [
      { soort: "Annuïteitenlening, 30 jaar vast", bedrag: 340000 },
      { soort: "Lineaire lening, 20 jaar vast", bedrag: 100000 },
    ],
    voorwaarden: "Algemene Voorwaarden voor Hypothecaire Geldleningen Noorderlicht Hypotheken 2025 (fictief)",
    afsluitkosten: 0,
  },
  adviseur: { naam: "Joris Kok", kantoor: "Hypotheekhuis Eemland (fictief)", email: "joris@example.com", telefoon: "033 123 45 67" },
  aflosnota: { leningnummer: "7700 1234 56", bedrag: 168420.13, boete: 0 },
  wwft: [
    { type: "spaargeld" as const, bedrag: 35000, opbouw: "Loon of regulier inkomen" },
    { type: "schenking" as const, bedrag: 25000, van: "Ouders van Sanne (A. de Vries en J. de Vries-Mulder)", relatie: "Ouders" },
  ],
};

export type DemoScenario = typeof DEMO;
