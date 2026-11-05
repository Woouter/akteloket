import Link from "next/link";
import { ArrowRight, Video, Zap, Activity, Euro, Scale, BookOpen, Upload, UserCheck, PenLine, KeyRound, Map, FileText, Landmark, Mail, Receipt, BellRing, Check, X, Store } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import { CtaBand, FaqJsonLd, FaqList, JsonLd, PriceCards, ScanVisual, TrustStrip } from "@/components/site/sections";
import { FAQ } from "@/lib/content/faq";
import { allArticles } from "@/lib/content/kennisbank";
import { BRAND, NOTARY_OFFICE, SERVICES } from "@/lib/config";

const usps = [
  { icon: Video, title: "Bijna nooit langskomen", text: "Eén volmacht, getekend tijdens één korte video-afspraak. Daarna tekent een medewerker van de notaris de akten namens jou." },
  { icon: Zap, title: "Je koopovereenkomst is je intake", text: "Upload hem en we lezen adres, koopprijs, partijen, data en voorwaarden automatisch uit. Jij controleert alleen." },
  { icon: Activity, title: "Altijd weten waar je staat", text: "Je persoonlijke portaal laat per stap zien wat klaar is, wat wij doen en wat er nog van jou nodig is." },
  { icon: Euro, title: "Vaste all-in prijs", text: `Levering + hypotheekakte voor € ${SERVICES.beide.price}, inclusief btw en kadasterinschrijving. Geen verrassingen achteraf.` },
  { icon: Scale, title: "Een echte, onafhankelijke notaris", text: "Alle notariële controles, de akten en de geldstromen liggen bij een onafhankelijk notariskantoor. Wij nemen het voorwerk uit handen." },
  { icon: BookOpen, title: "Alles uitgelegd in gewone taal", text: "Van transportakte tot startersvrijstelling: bij elke stap leggen we uit wat het is en waarom het nodig is." },
];

const phases = [
  { nr: "01", title: "Aanmelden in 2 minuten", icon: Upload, steps: ["Kies je dienst", "Upload je getekende koopovereenkomst", "Controleer de gegevens die we hebben uitgelezen", "Accepteer digitaal de dienstverleningsovereenkomst"] },
  { nr: "02", title: "Aanvullen in je portaal", icon: UserCheck, steps: ["Persoonsgegevens en financiering bevestigen", "Automatische toets startersvrijstelling", "Herkomst eigen geld (met de juiste bewijsstukken)", "Digitaal identificeren"] },
  { nr: "03", title: "Volmacht en voorbereiding", icon: PenLine, steps: ["Eén volmacht voor levering én hypotheek", "Wij halen kadastrale stukken op", "Concept-akten worden klaargezet", "De notaris controleert alles"] },
  { nr: "04", title: "De overdracht", icon: KeyRound, steps: ["Twee weken vooraf: datum bevestigen", "Nota van afrekening in je portaal", "De notaris passeert en schrijft in", "Jij haalt de sleutels op"] },
];

const automation = [
  { icon: Map, text: "Kadastrale gegevens, kaart en de vorige leveringsakte ophalen" },
  { icon: FileText, text: "Concept-leveringsakte opstellen met bronverwijzingen" },
  { icon: Landmark, text: "De hypotheekinstructie van je bank bewaken en de hypotheekakte voorbereiden" },
  { icon: Mail, text: "De verkoper uitnodigen voor een eigen, eenvoudig portaal" },
  { icon: Receipt, text: "De nota van afrekening voorbereiden, inclusief overdrachtsbelasting per koper" },
  { icon: BellRing, text: "Termijnen bewaken en je vriendelijk herinneren als er iets ontbreekt" },
];

const compare: [string, string, string][] = [
  ["Intake", "Formulieren en kopieën mailen", "Koopovereenkomst uploaden — wij lezen hem uit"],
  ["Afspraken op kantoor", "Meestal één of twee", "Meestal geen: één volmacht via video"],
  ["Status van je dossier", "Bellen of mailen", "Live in je portaal, per stap"],
  ["Herkomst eigen geld", "Losse vragen per e-mail", "Slimme vragenlijst met direct de juiste stukken"],
  ["Prijs", "Vaak pas duidelijk op de nota", "Vast en all-in, vooraf bekend"],
];

export default function HomePage() {
  const articles = allArticles();
  const featured = ["wat-is-een-akte-van-levering", "notariskosten-huis-kopen", "startersvrijstelling", "volmacht-notaris", "nota-van-afrekening", "herkomst-eigen-geld-notaris"].map((s) => articles.find((a) => a.slug === s)).filter(Boolean);
  const faq = FAQ.filter((f) => f.tags.includes("algemeen")).slice(0, 6);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "LegalService", name: BRAND.name, url: BRAND.url, description: "Online notariële afhandeling van de akte van levering en hypotheekakte bij aankoop van een woning.", areaServed: "NL", priceRange: `€${SERVICES.hypotheek.price}–€${SERVICES.beide.price}`, provider: { "@type": "Organization", name: NOTARY_OFFICE.officeName } }} />
      <FaqJsonLd items={faq} />

      <section className="relative overflow-hidden border-b border-ink-200 bg-white">
        <div className="container-page relative grid items-center gap-14 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div data-tour="home-hero">
            <p className="eyebrow">Notariële akten voor je woning · volledig online</p>
            <h1 className="mt-5 text-[2.6rem] text-ink-900 sm:text-[3.6rem]">
              Je akte van levering en hypotheekakte, <span className="italic text-brass-600">volledig online</span> geregeld
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600 sm:text-xl">
              Upload je getekende koopovereenkomst. Wij lezen alles uit, regelen de stukken met het Kadaster en je bank, en de notaris controleert en passeert. Jij hoeft bijna nergens heen.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/aanvraag" className="btn btn-primary btn-lg">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/hoe-werkt-het" className="btn btn-secondary btn-lg">Bekijk hoe het werkt</Link>
            </div>
            <p className="mt-4 text-sm text-ink-500">Levering + hypotheekakte <strong className="text-ink-900">€ {SERVICES.beide.price} all-in</strong> · geen betaling vooraf</p>
            <TrustStrip className="mt-8" />
          </div>
          <ScanVisual />
        </div>
      </section>

      <section className="container-page mt-24" data-tour="home-usp">
        <SectionTitle eyebrow="Waarom Akteloket" title="Notarieel net zo zorgvuldig. Voor jou een stuk eenvoudiger." intro="De notaris blijft verantwoordelijk voor alles wat juridisch telt. Wij zorgen dat al het voorwerk al gedaan is — snel, digitaal en duidelijk." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {usps.map((u) => (
            <div key={u.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brass-50 text-brass-700 ring-1 ring-brass-200"><u.icon className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-bold text-ink-900">{u.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-600">{u.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-28" data-tour="home-steps">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionTitle eyebrow="Zo werkt het" title="Van koopovereenkomst tot sleutel in vier fases" />
          <Link href="/hoe-werkt-het" className="btn btn-secondary shrink-0">Alle 12 stappen uitgelegd <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {phases.map((p) => (
            <div key={p.nr} className="relative rounded-3xl border border-ink-100 bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ink-900 text-white"><p.icon className="h-5 w-5" /></span>
                <span className="font-serif text-2xl font-semibold text-brass-500">{p.nr}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-ink-900">{p.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                {p.steps.map((s) => <li key={s} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" />{s}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-28 bg-white py-24">
        <div className="container-page grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionTitle eyebrow="Wat wij voor je regelen" title="Jij doet een paar dingen. Wij doen de rest." intro="Achter de schermen zetten we alles klaar, zodat de notaris alleen nog hoeft te controleren. Dat scheelt tijd — voor jou én voor de notaris." />
            <Link href="/aanvraag" className="btn btn-primary mt-8">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {automation.map((a) => (
              <li key={a.text} className="flex gap-3 rounded-2xl border border-ink-100 bg-paper p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink-900 text-brass-300"><a.icon className="h-4.5 w-4.5" /></span>
                <span className="text-sm font-medium leading-snug text-ink-800">{a.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page mt-24" data-tour="home-prices">
        <SectionTitle center eyebrow="Tarieven" title="Vaste prijzen. Alles inbegrepen." intro="Inclusief btw en de inschrijving van de akte(n) in het Kadaster. Je betaalt pas via de nota van afrekening." />
        <div className="mt-12"><PriceCards /></div>
        <p className="mt-6 text-center text-sm text-ink-500">Zelf een koper of verkoper gevonden? <Link href="/koopovereenkomst-opstellen" className="font-semibold text-brand-700 underline underline-offset-4">Laat je koopovereenkomst opstellen voor € {SERVICES.koopovereenkomst.price}</Link>.</p>
      </section>

      <section className="container-page mt-28">
        <SectionTitle center eyebrow="Het verschil" title="Hetzelfde notariële werk, een andere ervaring" />
        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-3xl border border-ink-100 bg-white">
          <div className="grid grid-cols-[1fr_1fr_1.2fr] border-b border-ink-100 bg-ink-50/60 text-sm font-semibold text-ink-600">
            <div className="p-4" /><div className="p-4">Traditioneel</div><div className="p-4 text-brand-700">Met Akteloket</div>
          </div>
          {compare.map(([k, a, b]) => (
            <div key={k} className="grid grid-cols-[1fr_1fr_1.2fr] border-b border-ink-100 text-sm last:border-0">
              <div className="p-4 font-semibold text-ink-900">{k}</div>
              <div className="flex gap-2 p-4 text-ink-500"><X className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />{a}</div>
              <div className="flex gap-2 p-4 font-medium text-ink-800"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" />{b}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-28 grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl bg-verkoper-50 p-8 ring-1 ring-verkoper-600/10">
          <p className="eyebrow !text-verkoper-700">Voor verkopers</p>
          <h3 className="mt-2 text-2xl font-bold text-ink-900">Jouw kant is in een kwartier klaar</h3>
          <p className="mt-3 leading-relaxed text-ink-600">Als verkoper krijg je automatisch een eigen portaal: gegevens bevestigen, identificeren, rekeningnummer opgeven en een eenvoudige volmacht tekenen. De notaris regelt de aflossing van je hypotheek.</p>
        </div>
        <div className="rounded-3xl bg-ink-900 p-8 text-white">
          <p className="eyebrow !text-brass-300">Voor makelaars en hypotheekadviseurs</p>
          <h3 className="mt-2 text-2xl font-bold">Minder bellen, meer zekerheid voor je klant</h3>
          <p className="mt-3 leading-relaxed text-ink-300">Verwijs je klant door en volg met toestemming de status mee. Geen losse e-mails meer over waar de hypotheekinstructie blijft.</p>
          <Link href="/voor-makelaars-en-adviseurs" className="btn mt-6 bg-white text-ink-900 hover:bg-ink-100"><Store className="h-4 w-4" />Word partner</Link>
        </div>
      </section>

      <section className="container-page mt-28 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionTitle eyebrow="Veelgestelde vragen" title="Goed om te weten" intro={<>Staat je vraag er niet bij? Bekijk <Link href="/veelgestelde-vragen" className="text-brand-700 underline underline-offset-4">alle vragen</Link> of neem <Link href="/contact" className="text-brand-700 underline underline-offset-4">contact</Link> op.</>} />
        <FaqList items={faq} />
      </section>

      <section className="container-page mt-28">
        <div className="flex items-end justify-between gap-6">
          <SectionTitle eyebrow="Kennisbank" title="Snap precies wat er gebeurt" />
          <Link href="/kennisbank" className="hidden shrink-0 text-sm font-semibold text-brand-700 sm:block">Alle artikelen →</Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((a) => a && (
            <Link key={a.slug} href={`/kennisbank/${a.slug}`} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
              <p className="eyebrow">{a.category}</p>
              <p className="mt-2 text-lg font-bold leading-snug text-ink-900 group-hover:text-brand-700">{a.title}</p>
              <p className="mt-2 line-clamp-2 text-sm text-ink-600">{a.description}</p>
              <p className="mt-4 text-xs text-ink-400">{a.readingTime} min lezen</p>
            </Link>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
