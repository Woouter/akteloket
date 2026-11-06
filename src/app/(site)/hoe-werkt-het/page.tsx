import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Band, Tick } from "@/components/site/band";
import { Glyph, type GlyphName } from "@/components/icons/glyphs";
import { SectionTitle } from "@/components/ui";
import { CtaBand } from "@/components/site/sections";
import { TERMS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Hoe werkt het? Je woning online overdragen in 12 stappen",
  description: "Precies uitgelegd hoe de online notariële afhandeling van je akte van levering en hypotheekakte werkt: wat jij doet, wat wij doen en wat de notaris controleert.",
  alternates: { canonical: "/hoe-werkt-het" },
};

const koper = [
  ["Aanmelden & akkoord", "Je kiest je dienst en accepteert digitaal de dienstverleningsovereenkomst met vaste prijs.", "We richten je dossier, portaal en termijnen in."],
  ["Koopovereenkomst uploaden", "Upload de getekende overeenkomst met bijlagen. Nog niet getekend? Dan wacht je dossier tot je hem uploadt.", "We lezen koopsom, object, leveringsdatum en partijen automatisch uit."],
  ["Gegevens controleren", "Je controleert de persoonsgegevens die we hebben uitgelezen en vult aan wat ontbreekt (bijv. burgerlijke staat).", "We vullen voor en bewaken of alles compleet is."],
  ["Woning & financiering", "Je bevestigt de woning en geeft aan of en bij wie je een hypotheek afsluit.", "We koppelen je geldverstrekker aan het dossier."],
  ["Startersvrijstelling", "Ben je jonger dan 35? Dan beantwoord je drie korte vragen en teken je zo nodig de verklaring.", "We toetsen automatisch per koper op leeftijd en woningwaardegrens."],
  ["Uitbetalingsrekening", "Je geeft een IBAN op voor een eventueel tegoed na de overdracht.", "We controleren het formaat en de tenaamstelling."],
  ["Herkomst eigen geld", "Breng je eigen geld in? Dan geef je per bron aan waar het vandaan komt en upload je direct het juiste bewijs.", "We vragen alleen de stukken die de notaris nodig heeft."],
  ["Digitaal identificeren", "Via iDIN met je eigen bank of met de chip van je paspoort.", "We verwerken de ID-check en leggen die vast."],
  ["Eén volmacht", "Je plant een korte video-afspraak (of op kantoor) en tekent één volmacht voor alle akten.", "We zetten de volmacht klaar en registreren de ondertekening."],
  ["Dossiervoorbereiding", "Niets, dit doen wij.", "We halen kadastrale stukken en de vorige akte op en maken de concept-leveringsakte."],
  ["Bankinstructie", "Niets. Je bank stuurt de instructie rechtstreeks aan de notaris.", "We bewaken de ontvangst en maken de concept-hypotheekakte."],
  ["Laatste check", `Circa ${TERMS.datumCheckDagenVooraf} dagen vooraf bevestig je de overdrachtsdatum en bekijk je de nota van afrekening.`, "We bewaken de termijnen en herinneren je vriendelijk."],
];

const verkoper = [
  ["Uitnodiging", "Na het akkoord van de koper en ontvangst van de koopovereenkomst krijg je een eigen portaal."],
  ["Gegevens controleren", "Ook van eventuele mede-eigenaren."],
  ["Identificeren", "Digitaal, net als de koper."],
  ["IBAN voor uitbetaling", "Waarop de notaris de netto verkoopopbrengst overmaakt."],
  ["Verkoopvolmacht", "Een eenvoudige volmacht voor de levering, zodat je niet langs hoeft te komen."],
  ["Bestaande hypotheek", "Je bevestigt je geldverstrekker en leningnummer; de notaris vraagt de aflosnota op."],
  ["Nota van afrekening", "Je ziet precies wat je ontvangt. Na de inschrijving wordt het uitbetaald."],
];

const notaris = ["Controleert de Wwft-uitvraag, de PEP-vraag en de identificatie", "Beoordeelt en accepteert de volmachten van koper en verkoper", "Controleert de concept-leveringsakte", "Controleert de concept-hypotheekakte en de bankinstructie", "Vraagt de aflosnota's op en regelt de doorhaling van bestaande hypotheken", "Stelt de nota's van afrekening vast", "Passeert de akten, laat ze inschrijven en wikkelt de transactie financieel af"];

const ROLES: { glyph: GlyphName; t: string; d: string }[] = [
  { glyph: "person", t: "Koper", d: "12 stappen, meeste in een paar minuten" },
  { glyph: "house", t: "Verkoper", d: "7 korte stappen in een eigen portaal" },
  { glyph: "cog", t: "Akteloket", d: "Automatisering en documentvoorbereiding" },
  { glyph: "scales", t: "Notaris", d: "Controleert, stelt vast en passeert" },
];

export default function Page() {
  return (
    <>
      <section className="bg-white">
        <div className="container-page py-16 lg:py-20">
          <p className="eyebrow">Hoe werkt het</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-ink-900 sm:text-5xl">Drie rollen, één dossier. Zo regelen we je overdracht online.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">Er lopen twee klantreizen naast elkaar: een uitgebreide voor de koper en een eenvoudige voor de verkoper. Wij automatiseren en bereiden voor. De notaris controleert, beslist en passeert.</p>
          <div className="mt-12 grid gap-px border-y border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.t} className="flex items-start gap-4 bg-white py-6 sm:px-6">
                <Glyph name={r.glyph} size={40} />
                <span><span className="block font-serif text-lg font-semibold text-ink-900">{r.t}</span><span className="block text-sm text-ink-600">{r.d}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Band tone="paper">
        <SectionTitle eyebrow="De koper" title="Twaalf stappen, waarvan je er een paar niet eens merkt" />
        <ol className="mt-12 border-t border-ink-900">
          {koper.map(([t, jij, wij], i) => (
            <li key={t} className="grid gap-3 border-b border-ink-200 py-6 md:grid-cols-[4rem_1fr_1.2fr_1.2fr] md:items-start md:gap-8">
              <span className="font-serif text-3xl font-semibold leading-none text-ink-300">{String(i + 1).padStart(2, "0")}</span>
              <p className="font-serif text-lg font-semibold leading-snug text-ink-900">{t}</p>
              <p className="text-sm leading-relaxed text-ink-600"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-brass-700">Jij</span>{jij}</p>
              <p className="text-sm leading-relaxed text-ink-600"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">Wij</span>{wij}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band tone="white" inner="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionTitle eyebrow="De verkoper" title="Een eigen, eenvoudig portaal" intro="Koper en verkoper zien elkaars persoonlijke en financiële gegevens niet." />
        <ol className="border-t border-ink-900">
          {verkoper.map(([t, d], i) => (
            <li key={t} className="flex gap-5 border-b border-ink-200 py-4">
              <span className="w-6 shrink-0 font-serif text-xl font-semibold leading-tight text-brass-600">{String.fromCharCode(65 + i)}</span>
              <span><span className="block font-semibold text-ink-900">{t}</span><span className="block text-sm text-ink-600">{d}</span></span>
            </li>
          ))}
        </ol>
      </Band>

      <Band tone="sand" inner="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow">De notaris</p>
          <h2 className="mt-3 text-3xl leading-tight text-ink-900 sm:text-[2.5rem]">Controlerend, onafhankelijk en eindverantwoordelijk</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">De notaris hoeft de akten niet vanaf nul op te stellen, maar controleert, corrigeert en stelt alles definitief vast.</p>
          <div className="mt-10 border-l-[3px] border-brass-500 pl-5">
            <p className="font-serif text-lg font-semibold text-ink-900">Het resultaat</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">Een compleet dossier met een juiste Wwft-onderbouwing, geldige volmachten, gecontroleerde akten en een financieel correcte afwikkeling. Zo verloopt de overdracht snel en zonder fouten.</p>
            <Link href="/aanvraag" className="btn btn-brass mt-5">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <ul className="border-t border-ink-900">
          {notaris.map((n) => <li key={n} className="flex gap-3 border-b border-ink-300 py-4 text-ink-800"><Tick />{n}</li>)}
        </ul>
      </Band>

      <CtaBand />
    </>
  );
}
