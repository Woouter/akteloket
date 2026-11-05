import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Scale, Cpu, User, Store, Check } from "lucide-react";
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
  ["Dossiervoorbereiding", "Niets — dit doen wij.", "We halen kadastrale stukken en de vorige akte op en maken de concept-leveringsakte."],
  ["Bankinstructie", "Niets — je bank stuurt de instructie rechtstreeks aan de notaris.", "We bewaken de ontvangst en maken de concept-hypotheekakte."],
  ["Laatste check", `Circa ${TERMS.datumCheckDagenVooraf} dagen vooraf bevestig je de overdrachtsdatum en bekijk je de nota van afrekening.`, "We bewaken de termijnen en herinneren je vriendelijk."],
];

const verkoper = [
  ["Uitnodiging", "Na het akkoord van de koper en ontvangst van de koopovereenkomst krijg je een eigen portaal."],
  ["Gegevens controleren", "Ook van eventuele mede-eigenaren."],
  ["Identificeren", "Digitaal, net als de koper."],
  ["IBAN voor uitbetaling", "Waarop de notaris de netto verkoopopbrengst overmaakt."],
  ["Verkoopvolmacht", "Een eenvoudige volmacht voor de levering — zo hoef je niet langs."],
  ["Bestaande hypotheek", "Je bevestigt je geldverstrekker en leningnummer; de notaris vraagt de aflosnota op."],
  ["Nota van afrekening", "Je ziet precies wat je ontvangt. Na de inschrijving wordt het uitbetaald."],
];

const notaris = ["Controleert de Wwft-uitvraag, de PEP-vraag en de identificatie", "Beoordeelt en accepteert de volmachten van koper en verkoper", "Controleert de concept-leveringsakte", "Controleert de concept-hypotheekakte en de bankinstructie", "Vraagt de aflosnota's op en regelt de doorhaling van bestaande hypotheken", "Stelt de nota's van afrekening vast", "Passeert de akten, laat ze inschrijven en wikkelt de transactie financieel af"];

export default function Page() {
  return (
    <>
      <section className="border-b border-ink-100">
        <div className="container-page py-16 lg:py-20">
          <p className="eyebrow">Hoe werkt het</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">Drie rollen, één dossier. Zo regelen we je overdracht online.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">Er lopen twee klantreizen naast elkaar: een uitgebreide voor de koper en een eenvoudige voor de verkoper. Wij automatiseren en bereiden voor. De notaris controleert, beslist en passeert.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[{ i: User, t: "Koper", d: "12 stappen, meeste in een paar minuten", c: "bg-koper-50 text-koper-600" }, { i: Store, t: "Verkoper", d: "7 korte stappen in een eigen portaal", c: "bg-verkoper-50 text-verkoper-700" }, { i: Cpu, t: "Akteloket", d: "Automatisering en documentvoorbereiding", c: "bg-platform-50 text-platform-600" }, { i: Scale, t: "Notaris", d: "Controleert, stelt vast en passeert", c: "bg-notaris-50 text-notaris-700" }].map((r) => (
              <div key={r.t} className="card flex items-center gap-4 p-5"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${r.c}`}><r.i className="h-5 w-5" /></span><span><span className="block font-bold text-ink-900">{r.t}</span><span className="block text-sm text-ink-500">{r.d}</span></span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionTitle eyebrow="De koper" title="Twaalf stappen — waarvan je er een paar niet eens merkt" />
        <ol className="mt-10 overflow-hidden rounded-3xl border border-ink-100 bg-white">
          {koper.map(([t, jij, wij], i) => (
            <li key={t} className="grid gap-4 border-b border-ink-100 p-5 last:border-0 md:grid-cols-[3rem_1fr_1.2fr_1.2fr] md:items-start md:gap-6 md:p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-koper-500 text-sm font-bold text-white">{i + 1}</span>
              <p className="font-bold text-ink-900">{t}</p>
              <p className="text-sm leading-relaxed text-ink-600"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-koper-600">Jij</span>{jij}</p>
              <p className="text-sm leading-relaxed text-ink-600"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-platform-600">Wij</span>{wij}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page mt-20 grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow="De verkoper" title="Een eigen, eenvoudig portaal" intro="Koper en verkoper zien elkaars persoonlijke en financiële gegevens niet." />
          <ol className="mt-8 space-y-3">
            {verkoper.map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-2xl border border-ink-100 bg-white p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-verkoper-600 text-sm font-bold text-white">{String.fromCharCode(65 + i)}</span>
                <span><span className="block font-semibold text-ink-900">{t}</span><span className="block text-sm text-ink-600">{d}</span></span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <SectionTitle eyebrow="De notaris" title="Controlerend, onafhankelijk en eindverantwoordelijk" intro="De notaris hoeft de akten niet vanaf nul op te stellen, maar controleert, corrigeert en stelt alles definitief vast." />
          <ul className="mt-8 space-y-3">
            {notaris.map((n) => <li key={n} className="flex gap-3 rounded-2xl border border-notaris-100 bg-notaris-50/50 p-4 text-ink-800"><Check className="mt-0.5 h-5 w-5 shrink-0 text-notaris-600" />{n}</li>)}
          </ul>
          <div className="mt-8 rounded-2xl bg-ink-900 p-6 text-ink-200">
            <p className="font-semibold text-white">Het resultaat</p>
            <p className="mt-2 text-sm leading-relaxed">Een compleet en compliant dossier, juiste Wwft-onderbouwing, geldige volmachten, gecontroleerde akten, een financieel correcte afwikkeling — en een snelle, foutarme overdracht.</p>
            <Link href="/aanvraag" className="btn btn-primary mt-5">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
