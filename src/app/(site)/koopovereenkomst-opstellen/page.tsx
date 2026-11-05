import type { Metadata } from "next";
import Link from "next/link";
import { Landing } from "@/components/site/landing";
import { SERVICES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Koopovereenkomst opstellen zonder makelaar — € 395",
  description: `Koopovereenkomst laten opstellen voor je huis, zonder makelaar. Begeleide vragenlijst, juridisch gecontroleerd, digitaal tekenen. € ${SERVICES.koopovereenkomst.price} all-in.`,
  alternates: { canonical: "/koopovereenkomst-opstellen" },
};

export default function Page() {
  return (
    <Landing
      path="/koopovereenkomst-opstellen"
      service="koopovereenkomst"
      ctaLabel="Stel je koopovereenkomst op"
      eyebrow="Koopovereenkomst opstellen · huis kopen of verkopen zonder makelaar"
      h1={<>Een <span className="italic text-brass-600">sluitende koopovereenkomst</span>, ook zonder makelaar</>}
      intro="Heb je zelf een koper of verkoper gevonden? Dan moet de koop schriftelijk worden vastgelegd. Een fout in de ontbindende voorwaarden of de waarborgsom kan je duizenden euro's kosten. Met onze begeleide vragenlijst stel je in een kwartier een complete koopovereenkomst op, die juridisch wordt gecontroleerd."
      heroPoints={["Begeleide vragenlijst in gewone taal", "Ontbindende voorwaarden goed geregeld", "Digitaal tekenen door koper en verkoper", "Met één klik door naar de akte van levering"]}
      explainer={[
        { title: "Wanneer heb je een koopovereenkomst nodig?", body: <><p>Bij de koop van een woning door een particulier is een schriftelijke koopovereenkomst verplicht. Hierin leggen koper en verkoper alle afspraken vast: de prijs, de leveringsdatum, wat er wel en niet achterblijft, de waarborgsom en de voorwaarden waaronder de koper kan afzien van de koop (bijvoorbeeld als de financiering niet rondkomt).</p><p>Als koper heb je na ondertekening drie dagen <Link href="/kennisbank/bedenktijd-koopovereenkomst">bedenktijd</Link>. Lees meer in <Link href="/kennisbank/koopovereenkomst-huis">De koopovereenkomst voor een huis</Link>.</p></> },
        { title: "Wat wij voor je regelen", body: <ul><li>Een duidelijke vragenlijst over de woning, de partijen en jullie afspraken.</li><li>Een koopovereenkomst volgens de gangbare indeling, met de bepalingen die bij jullie situatie passen.</li><li>Juridische controle voordat jullie tekenen.</li><li>Digitale ondertekening en bewaking van de bedenktijd en de termijnen van de ontbindende voorwaarden.</li><li>Desgewenst inschrijving van de koopovereenkomst in het Kadaster.</li></ul> },
        { title: "En daarna?", body: <p>Zodra de koopovereenkomst is getekend, staan alle gegevens al in je dossier. Met één klik start je de <Link href="/akte-van-levering">akte van levering</Link> of <Link href="/levering-en-hypotheekakte">levering + hypotheekakte</Link>, zonder iets opnieuw in te vullen.</p> },
      ]}
      steps={[
        { title: "Vul de vragenlijst in", text: "Woning, koper(s), verkoper(s), prijs, datum en voorwaarden." },
        { title: "Wij stellen op", text: "Je ontvangt een concept dat juridisch is gecontroleerd." },
        { title: "Samen tekenen", text: "Koper en verkoper tekenen digitaal. De bedenktijd gaat lopen." },
        { title: "Termijnen bewaakt", text: "We herinneren je aan de datum van de waarborgsom en de ontbindende voorwaarden." },
        { title: "Door naar de notaris", text: "Start met één klik de akte van levering; je gegevens staan al klaar." },
      ]}
      faqTags={["koopovereenkomst"]}
      articles={["koopovereenkomst-huis", "bedenktijd-koopovereenkomst", "huis-kopen-zonder-makelaar", "waarborgsom-of-bankgarantie"]}
    />
  );
}
