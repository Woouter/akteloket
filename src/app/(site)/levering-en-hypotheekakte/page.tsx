import type { Metadata } from "next";
import Link from "next/link";
import { Landing } from "@/components/site/landing";
import { SERVICES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Notaris huis kopen: levering + hypotheekakte voor € 1.395",
  description: `Notaris voor je huis online geregeld: akte van levering én hypotheekakte voor € ${SERVICES.beide.price.toLocaleString("nl-NL")} all-in. Eén volmacht, geen afspraken op kantoor, live status.`,
  alternates: { canonical: "/levering-en-hypotheekakte" },
};

export default function Page() {
  return (
    <Landing
      path="/levering-en-hypotheekakte"
      service="beide"
      eyebrow="Notaris voor je nieuwe huis: levering en hypotheek"
      h1={<>Huis gekocht? Wij regelen <span className="italic text-brass-600">beide akten</span> in één keer</>}
      intro="Koop je een woning met een hypotheek, dan heb je twee akten nodig: de akte van levering en de hypotheekakte. Bij Akteloket regel je ze samen, volledig online, met één volmacht voor beide akten en één vaste prijs."
      heroPoints={[`€ ${SERVICES.beide.price.toLocaleString("nl-NL")} all-in voor beide akten`, "Eén volmacht voor levering én hypotheek", "Automatische toets startersvrijstelling", "Verkoper krijgt een eigen portaal"]}
      explainer={[
        { title: "Wat regelt de notaris als je een huis koopt?", body: <><p>De notaris zorgt dat de woning juridisch van jou wordt en dat je geldverstrekker zekerheid krijgt. Daarvoor controleert hij de koopovereenkomst, de kadastrale registratie en eerdere akten, doet hij het wettelijk verplichte cliëntenonderzoek, stelt hij de nota van afrekening op en regelt hij alle geldstromen via zijn kwaliteitsrekening.</p><p>Op de dag van de overdracht passeert de notaris eerst de akte van levering en direct daarna de hypotheekakte. Lees het hele verhaal in <Link href="/kennisbank/wat-doet-de-notaris-bij-aankoop-huis">Wat doet de notaris bij de aankoop van een huis?</Link></p></> },
        { title: "Waarom online?", body: <><p>Het meeste werk van een notariskantoor bij een woningaankoop is verzamelen en controleren: gegevens, stukken, bevestigingen. Dat doen wij digitaal en grotendeels automatisch. Jouw koopovereenkomst is je intake; de kadastrale stukken halen wij zelf op; de verkoper krijgt automatisch een uitnodiging.</p><p>Het resultaat: minder vragen, geen afspraken op kantoor en een notaris die zich kan richten op wat er juridisch toe doet.</p></> },
        { title: "Wat je betaalt", body: <><p>€ {SERVICES.beide.price.toLocaleString("nl-NL")} all-in, inclusief btw en de inschrijving van beide akten in het Kadaster. Overdrachtsbelasting betaal je apart: 2% als je er zelf gaat wonen, of 0% als je in aanmerking komt voor de <Link href="/kennisbank/startersvrijstelling">startersvrijstelling</Link>. Koop je samen, dan toetsen we dat per koper. Een overzicht van alle kosten vind je in <Link href="/kennisbank/kosten-koper">kosten koper 2026</Link>.</p></> },
      ]}
      steps={[
        { title: "Upload je koopovereenkomst", text: "Wij lezen alle kerngegevens uit; jij controleert en vult aan." },
        { title: "Accepteer digitaal", text: "De dienstverleningsovereenkomst met vaste prijs. Geen betaling vooraf." },
        { title: "Rond je stappen af", text: "Gegevens, financiering, startersvrijstelling, IBAN, herkomst eigen geld en ID-check." },
        { title: "Eén volmacht", text: "Voor levering én hypotheek tegelijk, tijdens één korte afspraak." },
        { title: "Wij en de notaris", text: "Kadastrale stukken, concept-akten, bankinstructie, aflosnota's van de verkoper en de nota van afrekening." },
        { title: "Sleutels!", text: "De notaris passeert beide akten en schrijft ze in. De woning is van jou." },
      ]}
      faqTags={["algemeen", "hypotheek", "kosten"]}
      articles={["notariskosten-huis-kopen", "kosten-koper", "startersvrijstelling", "nota-van-afrekening", "wat-doet-de-notaris-bij-aankoop-huis"]}
      priceKeys={["levering", "beide", "hypotheek"]}
    />
  );
}
