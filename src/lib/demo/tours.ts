/**
 * Uitlegtours voor de demo-omgeving. Elke stap verwijst naar een pagina en een
 * element met `data-tour="..."`. `{main}` wordt vervangen door het id van het
 * voorbeelddossier Bloesemlaan 14.
 *
 * De demo is alleen via tours te gebruiken: wie binnenkomt kiest eerst een tour
 * (op /demo). Na een tour mag de bezoeker het uitgelegde deel (`scope`) zelf verder
 * bekijken. Dit bestand is puur data, zodat proxy, server en browser het delen.
 */
export interface TourStep {
  path: string;
  target?: string;
  title: string;
  body: string;
  placement?: "bottom" | "top" | "left" | "right" | "center";
}
export interface Tour {
  key: string;
  title: string;
  audience: string;
  persona: "anoniem" | "koper" | "verkoper" | "notaris" | "beheer";
  minutes: number;
  description: string;
  /** Padvoorvoegsels die na (of tijdens) deze tour vrij te bekijken zijn. */
  scope: string[];
  /** Hoe dat deel heet ("… zelf bekijken"). */
  area: string;
  steps: TourStep[];
}

const SITE_PAGES = ["/", "/akte-van-levering", "/hypotheekakte", "/levering-en-hypotheekakte", "/koopovereenkomst-opstellen", "/kennisbank", "/hoe-werkt-het", "/tarieven", "/veelgestelde-vragen", "/over-ons", "/veiligheid", "/contact", "/voor-makelaars-en-adviseurs", "/privacy", "/voorwaarden"];

export const TOURS: Tour[] = [
  {
    key: "website",
    title: "De website en de aanvraag",
    audience: "Hoe een consument ons vindt en in 2 minuten een aanvraag doet",
    persona: "anoniem",
    minutes: 2,
    description: "Homepage, landingspagina's per zoekwoord, kennisbank en de geïsoleerde aanvraagflow met de koopovereenkomst-scanner.",
    scope: [...SITE_PAGES, "/aanvraag", "/portaal"],
    area: "de website en de aanvraag",
    steps: [
      { path: "/", target: "home-hero", title: "Eén duidelijke belofte", body: "De homepage richt zich op kopers met een getekende koopovereenkomst. Er is één primaire actie: 'Start je aanvraag'. De vaste all-in prijzen staan direct in beeld, een offerte is niet nodig.", placement: "bottom" },
      { path: "/", target: "home-usp", title: "Waarom online?", body: "De klant hoeft bijna nooit langs: één volmacht (video of op kantoor) en wij bereiden alles voor. De notaris houdt de controlerende rol.", placement: "top" },
      { path: "/", target: "home-steps", title: "Het proces in gewone taal", body: "Dezelfde twaalf stappen als in het procesdiagram, maar uitgelegd voor consumenten. Zo weet de klant vooraf precies wat er gaat gebeuren.", placement: "top" },
      { path: "/", target: "home-prices", title: "Transparante prijzen", body: "Drie producten (levering, hypotheek, combinatie) plus het losse product 'koopovereenkomst opstellen'. Prijzen zijn all-in inclusief btw en kadasterinschrijving.", placement: "top" },
      { path: "/levering-en-hypotheekakte", target: "landing-hero", title: "Landingspagina per zoekintentie", body: "Voor elk belangrijk zoekwoord (akte van levering, hypotheekakte, levering + hypotheek, koopovereenkomst opstellen) is er een eigen landingspagina met uitleg, prijs, FAQ (met structured data voor Google) en een directe start.", placement: "bottom" },
      { path: "/kennisbank", target: "kb-list", title: "Kennisbank voor SEO en vertrouwen", body: "Twintig uitgebreide artikelen over o.a. transportakte, notariskosten, startersvrijstelling 2026, nota van afrekening en volmacht. Elk artikel linkt door naar de juiste dienst.", placement: "top" },
      { path: "/aanvraag", target: "aanvraag-dienst", title: "De aanvraag als aparte flow", body: "Geen menu, geen afleiding. Stap 1: kies de dienst (het formulier past zich aan). Komt de klant via een landingspagina, dan is de dienst al voorgeselecteerd.", placement: "bottom" },
      { path: "/aanvraag", target: "aanvraag-upload", title: "De scanner", body: "De klant uploadt de getekende koopovereenkomst. Wij lezen koopsom, object, kadastrale aanduiding, partijen, data, waarborgsom, voorbehouden en bijzondere bepalingen uit. In de demo kunt u de voorbeeld-koopovereenkomst gebruiken.", placement: "top" },
      { path: "/aanvraag", target: "aanvraag-demo-ko", title: "Probeer het zelf", body: "Klik op 'Gebruik de voorbeeld-koopovereenkomst' en zie welke velden automatisch worden herkend. De klant controleert, past aan en vult alleen aan wat ontbreekt. Daarna volgen contactgegevens en het digitale DVO-akkoord.", placement: "top" },
    ],
  },
  {
    key: "koper",
    title: "Klantportaal koper",
    audience: "De uitgebreide klantreis (12 stappen) door de ogen van Sanne",
    persona: "koper",
    minutes: 4,
    description: "Overzicht, volgende actie, gegevens, startersvrijstelling per koper, Wwft-tool met documentmatrix, volmachtafspraak en de 14-dagen-check.",
    scope: ["/portaal"],
    area: "het klantportaal van de koper",
    steps: [
      { path: "/portaal/{main}", target: "portal-header", title: "Het dossier van Sanne en Daan", body: "Bloesemlaan 14, Amersfoort. Bovenaan: adres, leveringsdatum, gekozen dienst en de voortgang. De klant ziet uitsluitend de eigen kant van de transactie.", placement: "bottom" },
      { path: "/portaal/{main}", target: "portal-next", title: "Altijd duidelijk wat de volgende stap is", body: "Het portaal toont alleen relevante acties. Hier: de overdrachtsdatum bevestigen (de 14-dagen-check uit het procesdocument).", placement: "bottom" },
      { path: "/portaal/{main}", target: "portal-steps", title: "De twaalf stappen", body: "Elke stap heeft de statussen uit het procesdocument (bijv. 'Wwft-informatie aangeleverd', 'Volmacht: gepland'). Per persoon ziet u wie nog iets moet doen.", placement: "top" },
      { path: "/portaal/{main}", target: "portal-platform", title: "Wat wij doen", body: "Per stap tonen we wat het platform automatisch doet. Zo begrijpt de klant waarom hij weinig hoeft te doen, en ziet hij dat er wél aan gewerkt wordt.", placement: "left" },
      { path: "/portaal/{main}/stap/gegevens", target: "step-form", title: "Gegevens: voorgevuld uit de koopovereenkomst", body: "Groen = uit de koopovereenkomst gehaald (met pagina-verwijzing). De klant bevestigt of corrigeert; wijzigingen worden gelogd met de oorspronkelijke waarde.", placement: "top" },
      { path: "/portaal/{main}/stap/starters", target: "starters-uitkomst", title: "Startersvrijstelling per koper", body: "Automatische toets op leeftijd op de leveringsdatum en de woningwaardegrens van dát jaar. Sanne (29) komt in aanmerking, Daan (36) niet. De fiscale behandeling verschilt dus per aandeel.", placement: "top" },
      { path: "/portaal/{main}/stap/wwft", target: "wwft-bronnen", title: "Wwft-uitvraag met documentmatrix", body: "Per geldbron dynamische vragen en direct de juiste bewijsstukken, volgens de matrix die de notaris goedkeurt. De status wordt 'aangeleverd', nooit 'goedgekeurd'.", placement: "top" },
      { path: "/portaal/{main}/stap/volmacht", target: "volmacht-status", title: "Eén volmacht, één afspraak", body: "Eén gecombineerde volmacht voor levering én hypotheek, per persoon gevolgd: te plannen → gepland → ondertekend → door notaris verwerkt.", placement: "top" },
      { path: "/portaal/{main}/stap/laatste_check", target: "datumcheck", title: "De 14-dagen-check", body: "Circa twee weken voor de overdracht: 'Is dit nog steeds de afgesproken datum?'. Bij een nieuwe datum wordt de oorspronkelijke bewaard en de notaris geïnformeerd.", placement: "top" },
      { path: "/portaal/{main}/documenten", target: "docs-list", title: "Alle documenten op één plek", body: "Koopovereenkomst, DVO-akkoordbewijs, volmacht, verklaring startersvrijstelling, kadastrale kaart en later de nota van afrekening. Versleuteld opgeslagen.", placement: "top" },
    ],
  },
  {
    key: "verkoper",
    title: "Verkopersportaal",
    audience: "De eenvoudige klantreis (A–G) door de ogen van Henk",
    persona: "verkoper",
    minutes: 2,
    description: "Uitnodiging, gegevens, ID-check, IBAN, verkoopvolmacht, bestaande hypotheken/aflosnota en nota van afrekening.",
    scope: ["/portaal"],
    area: "het verkopersportaal",
    steps: [
      { path: "/portaal/{main}", target: "portal-header", title: "Henk ziet alleen de verkoperskant", body: "Na het DVO-akkoord van de koper én ontvangst van de koopovereenkomst krijgt iedere verkoper automatisch een persoonlijke uitnodiging. Koper en verkoper zien elkaars gegevens niet.", placement: "bottom" },
      { path: "/portaal/{main}", target: "portal-steps", title: "Stappen A–G", body: "Kort en overzichtelijk: gegevens controleren, identificeren, IBAN, volmacht, bestaande hypotheken en de nota van afrekening.", placement: "top" },
      { path: "/portaal/{main}/stap/zekerheden", target: "zekerheden", title: "Bestaande hypotheek al voorgevuld", body: "Uit de kadastrale raadpleging weten we al dat er een hypotheek van Westbank is ingeschreven. Henk bevestigt het leningnummer en geeft toestemming; de notaris vraagt met één klik de aflosnota op.", placement: "top" },
      { path: "/portaal/{main}/stap/volmacht", target: "volmacht-status", title: "Eenvoudige verkoopvolmacht", body: "Ondertekenen tijdens een korte video-afspraak of, als de notaris dat vereist, met een gelegaliseerde handtekening. De status wordt per verkoper bewaakt.", placement: "top" },
      { path: "/portaal/{main}/stap/nota", target: "nota", title: "Nota van afrekening", body: "Verkoopprijs, aflossing, kosten doorhaling en verrekening OZB worden automatisch voorbereid en door de notaris vastgesteld. Het saldo wordt na inschrijving uitbetaald op het opgegeven IBAN.", placement: "top" },
    ],
  },
  {
    key: "notaris",
    title: "Werkomgeving notaris",
    audience: "Hoe u als notaris alles aangeleverd krijgt en alleen nog controleert",
    persona: "notaris",
    minutes: 4,
    description: "Dashboard, controlepaneel N1–N7, concept-akten met bronnen en controlepunten, aflosnota's, nota's, dossieroverdracht en instellingen.",
    scope: ["/notaris"],
    area: "de werkomgeving van de notaris",
    steps: [
      { path: "/notaris", target: "n-actions", title: "Uw werkvoorraad", body: "Bovenaan: wat vandaag uw aandacht vraagt. Alleen dossiers waarin iets te beoordelen is; de rest loopt automatisch.", placement: "bottom" },
      { path: "/notaris", target: "n-pipeline", title: "Alle dossiers per fase", body: "Van 'wacht op koopovereenkomst' tot 'afgewikkeld', gesorteerd op passeerdatum, met per dossier de stand van de controles.", placement: "top" },
      { path: "/notaris/dossiers/{main}", target: "n-summary", title: "Het dossier in één oogopslag", body: "Partijen, object, koopsom, data, financiering en signaleringen. Alles met bron: koopovereenkomst, kadaster, bankinstructie of klantopgave.", placement: "bottom" },
      { path: "/notaris/dossiers/{main}", target: "n-checks", title: "Uw zeven controlepunten (N1–N7)", body: "Precies de controlerende rol uit het procesdiagram. Per punt: is alles aangeleverd, welke signaleringen zijn er, en één klik voor 'Akkoord' of 'Vraag aanvulling'.", placement: "top" },
      { path: "/notaris/dossiers/{main}/akte/levering", target: "akte-doc", title: "Concept-leveringsakte", body: "Automatisch opgesteld uit koopovereenkomst, kadastrale stukken en de vorige akte. Groen gemarkeerd = overgenomen gegeven met bron; geel = controlepunt. Downloadbaar als Word-bestand.", placement: "right" },
      { path: "/notaris/dossiers/{main}/akte/levering", target: "akte-controlepunten", title: "Controlepunten en bronnen", body: "Bijvoorbeeld: het kettingbeding uit de akte van 2011, de bestaande hypotheek van Westbank en de startersvrijstelling van Sanne. Niets wordt aangenomen: ontbrekende gegevens worden expliciet gemarkeerd.", placement: "left" },
      { path: "/notaris/dossiers/{main}/akte/hypotheek", target: "akte-doc", title: "Concept-hypotheekakte", body: "Gegenereerd zodra u de bankinstructie veilig deelt. Bankteksten uitsluitend volgens de instructie; afwijkingen (bijv. passeerdatum, geldnemers) worden automatisch gesignaleerd.", placement: "right" },
      { path: "/notaris/dossiers/{main}/overdracht", target: "n-overdracht", title: "Gestructureerde dossieroverdracht", body: "Alle onderdelen uit hoofdstuk 11 van het procesdocument, met status en documenten. Overdracht 2 bevat de later ontvangen hypotheekstukken. Download alles als één ZIP.", placement: "top" },
      { path: "/notaris/instellingen", target: "n-matrix", title: "U bepaalt de regels", body: "De Wwft-documentmatrix (het belangrijkste validatiepunt), volmachtformaliteiten en agenda. Wijzigingen werken direct door in de klantvragen.", placement: "top" },
    ],
  },
  {
    key: "platform",
    title: "Wat het platform doet",
    audience: "Achter de schermen: automatisering, termijnen en ondersteuning",
    persona: "beheer",
    minutes: 2,
    description: "Live automatiseringslog, termijnbewaking, uitgaande e-mail en dossiers die aandacht nodig hebben.",
    scope: ["/beheer"],
    area: "het platformbeheer",
    steps: [
      { path: "/beheer", target: "b-kpis", title: "De pijplijn in cijfers", body: "Dossiers per fase, open acties per partij en wat er deze week passeert.", placement: "bottom" },
      { path: "/beheer", target: "b-attention", title: "Waar moeten wij iets doen?", body: "Dossiers waar een klant vastloopt, een gegeven onzeker is of een termijn dreigt te verlopen. Dit werk ligt bij ons, niet bij de notaris.", placement: "top" },
      { path: "/beheer", target: "b-stream", title: "Live automatiseringslog", body: "Elke automatische stap wordt gelogd: KO uitgelezen, kadaster opgehaald, startertoets, concept-akten, uitnodigingen, herinneringen en dossieroverdrachten.", placement: "top" },
      { path: "/beheer/emails", target: "b-emails", title: "Alle communicatie auditbaar", body: "Vriendelijke, specifieke berichten ('We missen nog je volmachtafspraak') in plaats van generieke herinneringen. In de demo worden e-mails gesimuleerd.", placement: "top" },
    ],
  },
];

export const tourByKey = (k: string | undefined | null) => (k ? TOURS.find((t) => t.key === k) : undefined);

// ---------------------------------------------------------------------------
// Toegang tot de demo
// ---------------------------------------------------------------------------

/** Cookie met de tour die nu loopt (gezet door /demo/start/<tour>). */
export const TOUR_COOKIE = "ak_tour";
/** Cookie met de tours die al bekeken zijn (komma-gescheiden). */
export const SEEN_COOKIE = "ak_seen";

/** Altijd bereikbaar: de tourkeuze, uitleg, beoordelingskader, mailbox en inloggen. */
export const ALWAYS_OPEN = ["/demo", "/inloggen", "/uitloggen", "/uitnodiging"];

const under = (path: string, prefix: string) => (prefix === "/" ? path === "/" : path === prefix || path.startsWith(prefix + "/"));

export function parseSeen(v: string | undefined | null): string[] {
  return (v ?? "").split(",").filter((k) => TOURS.some((t) => t.key === k));
}

/** De tour die een pad het meest specifiek uitlegt (voor de melding "kies eerst een tour"). */
export function tourForPath(path: string): Tour | undefined {
  const hits = TOURS.flatMap((t) => t.scope.filter((p) => under(path, p)).map((p) => ({ t, len: p.length + (t.key === "website" ? 0 : 0.5) })));
  return hits.sort((a, b) => b.len - a.len)[0]?.t;
}

/** Mag dit pad bekeken worden met de lopende tour en de al bekeken tours? */
export function demoPathAllowed(path: string, active: string | undefined | null, seen: string[]): boolean {
  if (ALWAYS_OPEN.some((p) => under(path, p))) return true;
  const keys = new Set([...(active ? [active] : []), ...seen]);
  return TOURS.some((t) => keys.has(t.key) && t.scope.some((p) => under(path, p)));
}
