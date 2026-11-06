import { BRAND, DVO_VERSION, NOTARY_OFFICE, SERVICES, type ServiceKey } from "@/lib/config";

/**
 * Dienstverleningsovereenkomst (DVO). Eén bron voor de aanvraagflow, de publieke
 * pagina en het vastgelegde akkoordbewijs (versie + hash). Concepttekst ter
 * validatie door de notaris en een jurist vóór livegang.
 */
export interface DvoSection { title: string; items: string[] }

export function dvoSections(service: ServiceKey): DvoSection[] {
  const s = SERVICES[service];
  return [
    {
      title: "1. Partijen en rolverdeling",
      items: [
        `Deze overeenkomst wordt gesloten tussen jou (de klant) en ${NOTARY_OFFICE.officeName}, ${NOTARY_OFFICE.notaryShort}, notaris te ${NOTARY_OFFICE.city} (de notaris).`,
        `${BRAND.name} verzorgt in opdracht van de notaris het online klantportaal, het verzamelen en structureren van gegevens, het ophalen van kadastrale stukken en het voorbereiden van concept-documenten. ${BRAND.name} is geen notaris en geeft geen juridisch advies.`,
        "De notaris is en blijft verantwoordelijk voor de notariële werkzaamheden: identificatie en cliëntenonderzoek (Wwft), juridische controle, het vaststellen en passeren van de akten, de inschrijving in het Kadaster en de afwikkeling van de geldstromen via de kwaliteitsrekening.",
      ],
    },
    {
      title: "2. De opdracht",
      items: [
        `Je geeft opdracht tot: ${s.name}. ${s.description}`,
        "De opdracht heeft betrekking op de woning en de partijen die blijken uit de koopovereenkomst die je uploadt. De inhoudelijke behandeling start zodra de door alle partijen getekende koopovereenkomst is ontvangen.",
        "Uitzonderingsroutes (bijvoorbeeld aankoop via een onderneming, nieuwbouw, erfpacht of een splitsing) beoordeelt de notaris apart; daarvoor kan een aanvullende offerte gelden.",
      ],
    },
    {
      title: "3. Werkwijze",
      items: [
        "Gegevens uit de koopovereenkomst worden automatisch uitgelezen. Je controleert ze en vult alleen aan wat ontbreekt. Het originele document blijft leidend.",
        "Je identificeert je via de door de notaris gekozen digitale procedure en beantwoordt de vragen over de herkomst van je eigen geld. Dit is wettelijk verplicht (Wwft). Een volledig ingevuld formulier betekent dat de informatie is aangeleverd; de beoordeling ligt bij de notaris.",
        "Voor de afhandeling is een notariële volmacht verplicht. Je tekent één volmacht voor alle akten van deze opdracht, tijdens één korte afspraak (online via video of op kantoor). Een medewerker van de notaris ondertekent de akten vervolgens namens jou.",
        "De geldverstrekker stuurt de hypotheekinstructie rechtstreeks naar de notaris. Wij bewaken de ontvangst en houden je op de hoogte.",
        "Ongeveer twee weken voor de overdracht vragen we je de datum te bevestigen.",
      ],
    },
    {
      title: "4. Prijs en betaling",
      items: [
        `De vaste prijs bedraagt € ${s.price.toLocaleString("nl-NL")},- inclusief btw en inclusief de kosten van inschrijving van de akte(n) in het Kadaster.`,
        "Niet inbegrepen: overdrachtsbelasting, kosten van je geldverstrekker of adviseur, en kosten van derden die je zelf inschakelt (zoals legalisatie van een handtekening). Deze staan, voor zover via de notaris betaald, op de nota van afrekening.",
        "Je betaalt niet vooraf. Het bedrag wordt verrekend via de nota van afrekening en voldaan vóór het passeren.",
        "Gaat de koop niet door (bijvoorbeeld door een ontbindende voorwaarde of bedenktijd), dan betaal je niets zolang de concept-akte nog niet is opgesteld. Daarna is een vergoeding van € 295,- (incl. btw) verschuldigd.",
      ],
    },
    {
      title: "5. Jouw verplichtingen",
      items: [
        "Je verstrekt juiste en volledige informatie en meldt wijzigingen (zoals een nieuwe leveringsdatum) zo snel mogelijk via het portaal.",
        "Je reageert tijdig op verzoeken om aanvullende informatie of documenten, zodat de overdracht op de afgesproken datum kan plaatsvinden.",
        "Je maakt het saldo van de nota van afrekening tijdig over naar de kwaliteitsrekening van de notaris.",
      ],
    },
    {
      title: "6. Privacy en beveiliging",
      items: [
        "De notaris is verwerkingsverantwoordelijke voor de notariële dossiergegevens. Akteloket verwerkt deze gegevens als verwerker in opdracht van de notaris, op basis van een verwerkersovereenkomst.",
        "Documenten worden versleuteld opgeslagen; koper en verkoper zien elkaars persoonlijke en financiële gegevens niet. Toegang is beperkt per rol en wordt gelogd.",
        "We vragen alleen gegevens die nodig zijn (dataminimalisatie). Kopieën van identiteitsbewijzen worden alleen verwerkt via een door de notaris vastgesteld, beveiligd identificatieproces.",
        "De notaris bewaart de akten en het dossier volgens de wettelijke bewaarplichten. Lees de privacyverklaring voor details.",
      ],
    },
    {
      title: "7. Klachten en toepasselijk recht",
      items: [
        "Heb je een klacht, dan behandelen wij die volgens de klachtenregeling van de notaris. Kom je er samen niet uit, dan kun je je wenden tot de Geschillencommissie Notariaat.",
        "Op deze overeenkomst is Nederlands recht van toepassing.",
      ],
    },
  ];
}

export const DVO_CHECKS = [
  { key: "dvo", label: "Ik heb de dienstverleningsovereenkomst gelezen en ga ermee akkoord." },
  { key: "voorwaarden", label: "Ik ga akkoord met de algemene voorwaarden en heb de privacyverklaring gelezen." },
  { key: "volmacht", label: "Ik begrijp dat een notariële volmacht verplicht is en dat ik daarvoor één korte afspraak plan." },
  { key: "juist", label: "Ik bevestig dat de gegevens die ik heb gecontroleerd en ingevuld juist zijn." },
] as const;

export function dvoPlainText(service: ServiceKey): string {
  return [`Dienstverleningsovereenkomst ${DVO_VERSION}`, ...dvoSections(service).flatMap((s) => [s.title, ...s.items])].join("\n");
}
