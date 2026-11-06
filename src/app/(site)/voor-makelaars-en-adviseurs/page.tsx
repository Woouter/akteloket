import type { Metadata } from "next";
import { Band } from "@/components/site/band";
import { Glyph, type GlyphName } from "@/components/icons/glyphs";
import { LeadForm } from "@/components/site/lead-form";

export const metadata: Metadata = {
  title: "Voor makelaars en hypotheekadviseurs",
  description: "Verwijs klanten door naar een online notaris met vaste prijs en live status. Minder bellen over de hypotheekinstructie, meer zekerheid voor je klant.",
  alternates: { canonical: "/voor-makelaars-en-adviseurs" },
};

const items = [
  { glyph: "route" as GlyphName, t: "Live status met toestemming van je klant", d: "Je klant kan je een meekijklink geven: je ziet de fase van het dossier, nooit de persoonlijke of financiële details." },
  { glyph: "calendar" as GlyphName, t: "Geen gebel meer over de instructie", d: "We bewaken de hypotheekinstructie en signaleren tijdig als die uitblijft, met de geplande passeerdatum erbij." },
  { glyph: "scan" as GlyphName, t: "Koopovereenkomst = intake", d: "De koopovereenkomst van je klant wordt automatisch uitgelezen. Niemand hoeft iets dubbel in te vullen." },
  { glyph: "scales" as GlyphName, t: "Een onafhankelijke notaris", d: "De notariële controles, de akten en de geldstromen liggen bij een onafhankelijk notariskantoor." },
  { glyph: "mail" as GlyphName, t: "Eigen doorverwijslink", d: "Met een persoonlijke link start je klant direct met de juiste dienst. Wij melden je wanneer het dossier is gestart." },
  { glyph: "pair" as GlyphName, t: "Geen afhankelijkheid", d: "Je klant blijft vrij in de keuze van de notaris. Wij maken de keuze voor online alleen makkelijker." },
];

export default function Page() {
  return (
    <>
      <section className="bg-white">
        <div className="container-page py-16 lg:py-20">
          <p className="eyebrow">Partners</p>
          <h1 className="mt-3 text-4xl leading-tight text-ink-900 sm:text-5xl">Voor makelaars en hypotheekadviseurs</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">Je klant wil snel en zonder gedoe de sleutel. Jij wilt zekerheid dat de overdracht op tijd en foutloos verloopt. Daar is Akteloket voor gebouwd.</p>
        </div>
      </section>
      <Band tone="paper">
        <div className="grid gap-x-14 border-t border-ink-200 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.t} className="flex gap-5 border-b border-ink-200 py-8">
              <Glyph name={i.glyph} size={42} />
              <div><p className="font-serif text-lg font-semibold text-ink-900">{i.t}</p><p className="mt-1.5 text-sm leading-relaxed text-ink-600">{i.d}</p></div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-ink-500">Wij betalen en ontvangen geen doorverwijsvergoedingen: zo blijft het advies aan je klant onafhankelijk.</p>
      </Band>
      <Band tone="sand" inner="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Aanmelden</p>
          <h2 className="mt-3 text-3xl leading-tight text-ink-900 sm:text-[2.5rem]">Word partner</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">We nemen binnen één werkdag contact op en sturen je je persoonlijke doorverwijslink.</p>
        </div>
        <div className="border-t-[3px] border-brass-500 bg-white p-7"><LeadForm kind="partner" fields={["name", "company", "email", "phone", "message"]} submitLabel="Aanmelden als partner" /></div>
      </Band>
    </>
  );
}
