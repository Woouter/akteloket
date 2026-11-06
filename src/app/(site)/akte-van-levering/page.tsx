import type { Metadata } from "next";
import Link from "next/link";
import { Landing } from "@/components/site/landing";
import { SERVICES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Akte van levering online regelen, vaste prijs € 995",
  description: `Akte van levering (transportakte) volledig online geregeld voor € ${SERVICES.levering.price.toLocaleString("nl-NL")} all-in. Upload je koopovereenkomst, één volmacht via video, onafhankelijke notaris.`,
  alternates: { canonical: "/akte-van-levering" },
};

export default function Page() {
  return (
    <Landing
      path="/akte-van-levering"
      service="levering"
      eyebrow="Akte van levering (transportakte)"
      h1={<>Akte van levering, <span className="italic text-brass-600">zonder gedoe</span> online geregeld</>}
      intro="Koop je een woning? Dan wordt de eigendom pas van jou als de notaris de akte van levering heeft gepasseerd en ingeschreven in het Kadaster. Wij regelen het volledig online: jij uploadt je koopovereenkomst, wij zetten alles klaar, de notaris controleert en passeert."
      heroPoints={["Vaste prijs, inclusief kadasterinschrijving", "Koopovereenkomst wordt automatisch uitgelezen", "Eén volmacht via video, zonder langs te komen", "Live status in je eigen portaal"]}
      explainer={[
        { title: "Wat is een akte van levering?", body: <><p>De akte van levering (ook wel <strong>transportakte</strong> of leveringsakte genoemd) is de notariële akte waarmee de woning officieel van de verkoper naar jou overgaat. In de koopovereenkomst spreken jullie af <em>dat</em> de woning wordt verkocht; met de akte van levering wordt die afspraak uitgevoerd.</p><p>Pas als de notaris de akte heeft ingeschreven in de openbare registers van het Kadaster, ben je juridisch eigenaar. Daarom controleert de notaris vlak voor en na het passeren of er geen beslagen of nieuwe inschrijvingen zijn, en betaalt hij de verkoper pas daarna uit.</p><p>Lees meer in ons artikel <Link href="/kennisbank/wat-is-een-akte-van-levering">Wat is een akte van levering?</Link></p></> },
        { title: "Wat staat er in de akte?", body: <ul><li>De gegevens van koper(s) en verkoper(s) en hoe jullie de woning gaan delen (bijvoorbeeld ieder de helft).</li><li>De omschrijving van de woning met de kadastrale aanduiding.</li><li>De koopprijs en de kwijting voor de betaling.</li><li>Lasten en beperkingen, zoals een <Link href="/kennisbank/erfdienstbaarheid">erfdienstbaarheid</Link> of kwalitatieve verplichting uit eerdere akten.</li><li>Afspraken uit de koopovereenkomst die na de levering blijven gelden.</li><li>De overdrachtsbelasting en een eventueel beroep op de <Link href="/kennisbank/startersvrijstelling">startersvrijstelling</Link>.</li></ul> },
        { title: "Hoe wij het je makkelijk maken", body: <><p>Wij halen de kadastrale gegevens, de kadastrale kaart en de vorige leveringsakte automatisch op. Op basis daarvan en je koopovereenkomst stellen we een concept-akte op met bronverwijzingen. De notaris hoeft niet bij nul te beginnen, maar controleert, corrigeert en stelt de definitieve akte vast.</p><p>Jij beantwoordt alleen wat we nog niet weten. Je identificeert je digitaal, beantwoordt de wettelijk verplichte vragen over de <Link href="/kennisbank/herkomst-eigen-geld-notaris">herkomst van je eigen geld</Link> en tekent één <Link href="/kennisbank/volmacht-notaris">volmacht</Link>.</p></> },
        { title: "Wat kost een akte van levering?", body: <><p>Bij Akteloket betaal je € {SERVICES.levering.price.toLocaleString("nl-NL")} all-in, inclusief btw en de inschrijving in het Kadaster. Daarnaast betaal je overdrachtsbelasting (meestal 2% als je er zelf gaat wonen, 0% met de startersvrijstelling). Heb je ook een hypotheek? Dan is <Link href="/levering-en-hypotheekakte">levering + hypotheekakte</Link> voor € {SERVICES.beide.price.toLocaleString("nl-NL")} voordeliger. Zie ook <Link href="/kennisbank/notariskosten-huis-kopen">notariskosten bij het kopen van een huis</Link>.</p></> },
      ]}
      steps={[
        { title: "Upload je koopovereenkomst", text: "We lezen koopprijs, partijen, adres, kadastrale aanduiding, data en voorwaarden automatisch uit." },
        { title: "Controleer en vul aan", text: "In je portaal bevestig je je gegevens en beantwoord je de vragen die de notaris verplicht moet stellen." },
        { title: "Identificeer je digitaal", text: "Via iDIN of de chip van je paspoort. Geen kopieën mailen." },
        { title: "Teken één volmacht", text: "Tijdens een korte video-afspraak. Daarna tekent een medewerker van de notaris de akte namens jou." },
        { title: "Wij bereiden alles voor", text: "Kadastrale stukken, concept-akte, nota van afrekening en de afstemming met de verkoper." },
        { title: "Overdracht", text: "De notaris passeert, schrijft in en betaalt uit. Jij haalt de sleutels op." },
      ]}
      faqTags={["levering", "proces"]}
      extraFaq={[{ q: "Wat is het verschil tussen een akte van levering en een transportakte?", a: "Er is geen verschil: het zijn twee namen voor dezelfde notariële akte waarmee de eigendom van de woning overgaat." }]}
      articles={["wat-is-een-akte-van-levering", "transportakte", "passeren-en-sleuteloverdracht", "erfdienstbaarheid", "eigendomsbewijs-huis"]}
      priceKeys={["levering", "beide"]}
    />
  );
}
