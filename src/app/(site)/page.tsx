import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import { CtaBand, FaqJsonLd, FaqList, JsonLd, PriceCards, TrustStrip } from "@/components/site/sections";
import { Band, Tick } from "@/components/site/band";
import { HeroVisual } from "@/components/site/hero-visual";
import { Glyph, type GlyphName } from "@/components/icons/glyphs";
import { FAQ } from "@/lib/content/faq";
import { allArticles } from "@/lib/content/kennisbank";
import { BRAND, NOTARY_OFFICE, SERVICES } from "@/lib/config";

const usps = [
  { glyph: "video" as GlyphName, title: "Bijna nooit langskomen", text: "Eén volmacht, getekend tijdens één korte video-afspraak. Daarna tekent een medewerker van de notaris de akten namens jou." },
  { glyph: "scan" as GlyphName, title: "Je koopovereenkomst is je intake", text: "Upload hem en we lezen adres, koopprijs, partijen, data en voorwaarden automatisch uit. Jij controleert alleen." },
  { glyph: "route" as GlyphName, title: "Altijd weten waar je staat", text: "Je persoonlijke portaal laat per stap zien wat klaar is, wat wij doen en wat er nog van jou nodig is." },
  { glyph: "euro" as GlyphName, title: "Vaste all-in prijs", text: `Levering + hypotheekakte voor € ${SERVICES.beide.price.toLocaleString("nl-NL")}, inclusief btw en kadasterinschrijving. Geen verrassingen achteraf.` },
  { glyph: "scales" as GlyphName, title: "Een echte, onafhankelijke notaris", text: "Alle notariële controles, de akten en de geldstromen liggen bij een onafhankelijk notariskantoor. Wij nemen het voorwerk uit handen." },
  { glyph: "book" as GlyphName, title: "Alles uitgelegd in gewone taal", text: "Van transportakte tot startersvrijstelling: bij elke stap leggen we uit wat het is en waarom het nodig is." },
];

const phases = [
  { nr: "01", title: "Aanmelden in 2 minuten", glyph: "scan" as GlyphName, steps: ["Kies je dienst", "Upload je getekende koopovereenkomst", "Controleer de gegevens die we hebben uitgelezen", "Accepteer digitaal de dienstverleningsovereenkomst"] },
  { nr: "02", title: "Aanvullen in je portaal", glyph: "idcard" as GlyphName, steps: ["Persoonsgegevens en financiering bevestigen", "Automatische toets startersvrijstelling", "Herkomst eigen geld (met de juiste bewijsstukken)", "Digitaal identificeren"] },
  { nr: "03", title: "Volmacht en voorbereiding", glyph: "pen" as GlyphName, steps: ["Eén volmacht voor levering én hypotheek", "Wij halen kadastrale stukken op", "Concept-akten worden klaargezet", "De notaris controleert alles"] },
  { nr: "04", title: "De overdracht", glyph: "key" as GlyphName, steps: ["Twee weken vooraf: datum bevestigen", "Nota van afrekening in je portaal", "De notaris passeert en schrijft in", "Jij haalt de sleutels op"] },
];

const automation = [
  { glyph: "parcel" as GlyphName, text: "Kadastrale gegevens, kaart en de vorige leveringsakte ophalen" },
  { glyph: "deed" as GlyphName, text: "Concept-leveringsakte opstellen met bronverwijzingen" },
  { glyph: "bank" as GlyphName, text: "De hypotheekinstructie van je bank bewaken en de hypotheekakte voorbereiden" },
  { glyph: "mail" as GlyphName, text: "De verkoper uitnodigen voor een eigen, eenvoudig portaal" },
  { glyph: "stack" as GlyphName, text: "De nota van afrekening voorbereiden, inclusief overdrachtsbelasting per koper" },
  { glyph: "calendar" as GlyphName, text: "Termijnen bewaken en je vriendelijk herinneren als er iets ontbreekt" },
];

const compare: [string, string, string][] = [
  ["Intake", "Formulieren en kopieën mailen", "Koopovereenkomst uploaden, wij lezen hem uit"],
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

      <section className="relative overflow-hidden bg-white">
        <div className="container-page relative grid items-center gap-14 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div data-tour="home-hero">
            <p className="eyebrow">Notariële akten voor je woning</p>
            <h1 className="mt-5 text-[2.6rem] text-ink-900 sm:text-[3.6rem]">
              Je akte van levering en hypotheekakte, <span className="italic text-brass-600">volledig online</span> geregeld
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600 sm:text-xl">
              Van je getekende koopovereenkomst tot de sleutel: je regelt alles vanuit één persoonlijk dossier. Wij bereiden de akten voor, de notaris controleert en passeert. Langskomen is bijna nooit nodig.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/aanvraag" className="btn btn-primary btn-lg">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/hoe-werkt-het" className="btn btn-secondary btn-lg">Bekijk hoe het werkt</Link>
            </div>
            <p className="mt-4 text-sm text-ink-500">Levering en hypotheekakte samen voor <strong className="text-ink-900">€ {SERVICES.beide.price.toLocaleString("nl-NL")} all-in</strong>, zonder betaling vooraf</p>
            <TrustStrip className="mt-8" />
          </div>
          <HeroVisual />
        </div>
      </section>

      <Band tone="paper" data-tour="home-usp">
        <SectionTitle eyebrow="Waarom Akteloket" title="Notarieel net zo zorgvuldig. Voor jou een stuk eenvoudiger." intro="De notaris blijft verantwoordelijk voor alles wat juridisch telt. Wij zorgen dat het voorwerk al gedaan is." />
        <div className="mt-14 grid gap-x-14 border-t border-ink-200 md:grid-cols-2 lg:grid-cols-3">
          {usps.map((u) => (
            <div key={u.title} className="flex gap-5 border-b border-ink-200 py-8">
              <Glyph name={u.glyph} size={44} />
              <div>
                <h3 className="text-lg text-ink-900">{u.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-600">{u.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Band>

      <Band tone="white" data-tour="home-steps">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionTitle eyebrow="Zo werkt het" title="Van koopovereenkomst tot sleutel in vier fases" />
          <Link href="/hoe-werkt-het" className="btn btn-secondary shrink-0">Alle 12 stappen uitgelegd <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <ol className="mt-14 grid gap-10 md:grid-cols-2 xl:grid-cols-4 xl:gap-8">
          {phases.map((p) => (
            <li key={p.nr} className="border-t-2 border-brass-400 pt-6">
              <div className="flex items-start justify-between gap-4">
                <span className="font-serif text-5xl font-semibold leading-none text-ink-200">{p.nr}</span>
                <Glyph name={p.glyph} size={40} />
              </div>
              <h3 className="mt-5 text-xl text-ink-900">{p.title}</h3>
              <ul className="mt-4 space-y-2.5 text-[0.95rem] text-ink-600">
                {p.steps.map((s) => <li key={s} className="flex gap-2.5"><Tick />{s}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </Band>

      <Band tone="navy" inner="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="eyebrow !text-brass-300">Wat wij voor je regelen</p>
          <h2 className="mt-3 text-3xl leading-tight text-white sm:text-[2.5rem]">Jij doet een paar dingen. Wij doen de rest.</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-300">Achter de schermen zetten we alles klaar, zodat de notaris alleen nog hoeft te controleren. Dat scheelt tijd, voor jou en voor de notaris.</p>
          <Link href="/aanvraag" className="btn btn-brass mt-8">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {automation.map((a) => (
            <li key={a.text} className="flex items-start gap-4 border-b border-white/15 py-5">
              <Glyph name={a.glyph} size={34} tone="dark" />
              <span className="text-[0.95rem] leading-snug text-ink-100">{a.text}</span>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="sand" data-tour="home-prices">
        <SectionTitle center eyebrow="Tarieven" title="Vaste prijzen. Alles inbegrepen." intro="Inclusief btw en de inschrijving van de akte(n) in het Kadaster. Je betaalt pas via de nota van afrekening." />
        <div className="mt-14"><PriceCards /></div>
        <p className="mt-4 text-center text-sm text-ink-600">Zelf een koper of verkoper gevonden? <Link href="/koopovereenkomst-opstellen" className="font-semibold text-ink-900 underline decoration-brass-400 underline-offset-4">Laat je koopovereenkomst opstellen voor € {SERVICES.koopovereenkomst.price.toLocaleString("nl-NL")}</Link>.</p>
      </Band>

      <Band tone="white">
        <SectionTitle center eyebrow="Het verschil" title="Hetzelfde notariële werk, een andere ervaring" />
        <div className="mx-auto mt-12 max-w-4xl border-y border-ink-900">
          <div className="hidden grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)] border-b border-ink-200 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 sm:grid">
            <div className="py-3" /><div className="py-3 pr-4">Traditioneel</div><div className="py-3 text-brass-700">Met Akteloket</div>
          </div>
          {compare.map(([k, a, b]) => (
            <div key={k} className="grid gap-1.5 border-b border-ink-200 py-4 text-sm last:border-0 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-0">
              <div className="font-serif text-base font-semibold text-ink-900 sm:pr-4">{k}</div>
              <div className="flex gap-2 text-ink-500 sm:pr-4"><X className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" /><span><span className="font-medium sm:hidden">Traditioneel: </span>{a}</span></div>
              <div className="flex gap-2 font-medium text-ink-800"><Tick /><span><span className="sm:hidden">Akteloket: </span>{b}</span></div>
            </div>
          ))}
        </div>
      </Band>

      <Band tone="paper" inner="grid gap-12 md:grid-cols-2 md:gap-16">
        <div className="flex gap-5">
          <Glyph name="house" size={44} />
          <div>
            <p className="eyebrow">Voor verkopers</p>
            <h3 className="mt-2 text-2xl text-ink-900">Jouw kant is in een kwartier klaar</h3>
            <p className="mt-3 leading-relaxed text-ink-600">Als verkoper krijg je automatisch een eigen portaal: gegevens bevestigen, identificeren, rekeningnummer opgeven en een eenvoudige volmacht tekenen. De notaris regelt de aflossing van je hypotheek.</p>
          </div>
        </div>
        <div className="flex gap-5">
          <Glyph name="pair" size={44} />
          <div>
            <p className="eyebrow">Voor makelaars en hypotheekadviseurs</p>
            <h3 className="mt-2 text-2xl text-ink-900">Minder bellen, meer zekerheid voor je klant</h3>
            <p className="mt-3 leading-relaxed text-ink-600">Verwijs je klant door en volg met toestemming de status mee. Geen losse e-mails meer over waar de hypotheekinstructie blijft.</p>
            <Link href="/voor-makelaars-en-adviseurs" className="btn btn-secondary mt-6">Word partner <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </Band>

      <Band tone="white" inner="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionTitle eyebrow="Veelgestelde vragen" title="Goed om te weten" intro={<>Staat je vraag er niet bij? Bekijk <Link href="/veelgestelde-vragen" className="text-ink-900 underline decoration-brass-400 underline-offset-4">alle vragen</Link> of neem <Link href="/contact" className="text-ink-900 underline decoration-brass-400 underline-offset-4">contact</Link> op.</>} />
        <FaqList items={faq} />
      </Band>

      <Band tone="sand">
        <div className="flex items-end justify-between gap-6">
          <SectionTitle eyebrow="Kennisbank" title="Snap precies wat er gebeurt" />
          <Link href="/kennisbank" className="shrink-0 whitespace-nowrap text-sm font-semibold text-ink-900 underline decoration-brass-400 underline-offset-4">Alle artikelen</Link>
        </div>
        <div className="mt-12 grid gap-x-10 border-t border-ink-300 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((a) => a && (
            <Link key={a.slug} href={`/kennisbank/${a.slug}`} className="group block border-b border-ink-300 py-7">
              <p className="eyebrow">{a.category}</p>
              <p className="mt-2 font-serif text-xl font-semibold leading-snug text-ink-900 group-hover:underline group-hover:decoration-brass-400 group-hover:underline-offset-4">{a.title}</p>
              <p className="mt-2 line-clamp-2 text-sm text-ink-600">{a.description}</p>
              <p className="mt-3 text-xs text-ink-500">{a.readingTime} min lezen</p>
            </Link>
          ))}
        </div>
      </Band>

      <CtaBand />
    </>
  );
}
