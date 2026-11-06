import type { Metadata } from "next";
import Link from "next/link";
import { Landing } from "@/components/site/landing";
import { SERVICES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Hypotheekakte online laten opstellen — vaste prijs € 695",
  description: `Hypotheekakte online geregeld voor € ${SERVICES.hypotheek.price.toLocaleString("nl-NL")} all-in. Wij bewaken de bankinstructie, zetten de concept-akte klaar en de notaris passeert. Ook bij oversluiten.`,
  alternates: { canonical: "/hypotheekakte" },
};

export default function Page() {
  return (
    <Landing
      path="/hypotheekakte"
      service="hypotheek"
      eyebrow="Hypotheekakte"
      h1={<>Je hypotheekakte <span className="italic text-brass-600">snel en online</span> geregeld</>}
      intro="Met de hypotheekakte krijgt je geldverstrekker zekerheid op je woning. Je bank stuurt de hypotheekinstructie rechtstreeks naar de notaris; wij bewaken dat die op tijd binnen is en zetten direct de concept-akte klaar. Jij tekent één volmacht en hoeft niet langs."
      heroPoints={["Vaste prijs, inclusief kadasterinschrijving", "Wij bewaken de bankinstructie", "Concept-akte direct na ontvangst instructie", "Ook voor oversluiten of verhogen"]}
      explainer={[
        { title: "Wat is een hypotheekakte?", body: <><p>De hypotheekakte is de notariële akte waarin jij erkent geld te hebben geleend en waarin je de geldverstrekker een <strong>recht van hypotheek</strong> op je woning geeft. Kun je de lening niet meer terugbetalen, dan mag de bank de woning laten verkopen. Het hypotheekrecht wordt ingeschreven in het Kadaster.</p><p>In de akte staan onder meer het geleende bedrag, het inschrijvingsbedrag, de rangorde en de voorwaarden van je geldverstrekker. Meer weten? Lees <Link href="/kennisbank/wat-is-een-hypotheekakte">Wat is een hypotheekakte?</Link></p></> },
        { title: "De rol van je bank en adviseur", body: <><p>Zodra je hypotheek rond is, stuurt je geldverstrekker een <strong>hypotheekinstructie</strong> naar de notaris. Daarin staat precies wat er in de akte moet komen. Je hoeft die zelf niet te uploaden. Geef je adviseur wel door dat Akteloket en onze notaris je dossier behandelen.</p><p>Wij volgen de status (‘verwacht’, ‘ontvangen’, ‘in behandeling’) en waarschuwen tijdig als de instructie uitblijft — zodat de notaris de hypotheekgelden op tijd kan opvragen.</p></> },
        { title: "Combineren met de akte van levering", body: <p>Koop je een woning met een hypotheek? Dan heb je beide akten nodig, op dezelfde dag. Met <Link href="/levering-en-hypotheekakte">levering + hypotheekakte</Link> betaal je € {SERVICES.beide.price.toLocaleString("nl-NL")} en teken je één gecombineerde volmacht voor beide akten.</p> },
      ]}
      steps={[
        { title: "Start je aanvraag", text: "Kies ‘Alleen hypotheekakte’ en vul je adres en geldverstrekker in." },
        { title: "Controleer je gegevens", text: "Persoonsgegevens, financiering en een rekening voor een eventueel tegoed." },
        { title: "Identificeer je digitaal", text: "Via iDIN of de chip van je paspoort." },
        { title: "Teken één volmacht", text: "Tijdens een korte video-afspraak met de notaris of een medewerker." },
        { title: "Bankinstructie en concept-akte", text: "Wij verwerken de instructie van je bank en zetten de concept-hypotheekakte klaar voor de notaris." },
        { title: "Passeren", text: "De notaris passeert, schrijft in en zorgt dat de hypotheekgelden goed terechtkomen." },
      ]}
      faqTags={["hypotheek"]}
      extraFaq={[{ q: "Moet ik mijn hypotheekofferte uploaden?", a: "Nee, dat hoeft niet bij de start. De geldverstrekker stuurt de hypotheekinstructie rechtstreeks aan de notaris. Wij bewaken de ontvangst." }]}
      articles={["wat-is-een-hypotheekakte", "notariskosten-huis-kopen", "nota-van-afrekening", "volmacht-notaris"]}
      priceKeys={["hypotheek", "beide"]}
    />
  );
}
