import type { Metadata } from "next";
import { Activity, BellRing, FileCheck2, Handshake, Link2, ShieldCheck } from "lucide-react";
import { LeadForm } from "@/components/site/lead-form";

export const metadata: Metadata = {
  title: "Voor makelaars en hypotheekadviseurs",
  description: "Verwijs klanten door naar een online notaris met vaste prijs en live status. Minder bellen over de hypotheekinstructie, meer zekerheid voor je klant.",
  alternates: { canonical: "/voor-makelaars-en-adviseurs" },
};

const items = [
  { icon: Activity, t: "Live status met toestemming van je klant", d: "Je klant kan je een meekijklink geven: je ziet de fase van het dossier, nooit de persoonlijke of financiële details." },
  { icon: BellRing, t: "Geen gebel meer over de instructie", d: "We bewaken de hypotheekinstructie en signaleren tijdig als die uitblijft — met de geplande passeerdatum erbij." },
  { icon: FileCheck2, t: "Koopovereenkomst = intake", d: "De koopovereenkomst van je klant wordt automatisch uitgelezen. Niemand hoeft iets dubbel in te vullen." },
  { icon: ShieldCheck, t: "Een onafhankelijke notaris", d: "De notariële controles, de akten en de geldstromen liggen bij een onafhankelijk notariskantoor." },
  { icon: Link2, t: "Eigen doorverwijslink", d: "Met een persoonlijke link start je klant direct met de juiste dienst. Wij melden je wanneer het dossier is gestart." },
  { icon: Handshake, t: "Geen afhankelijkheid", d: "Je klant blijft vrij in de keuze van de notaris. Wij maken de keuze voor online alleen makkelijker." },
];

export default function Page() {
  return (
    <section className="container-page grid gap-14 pt-16 lg:grid-cols-[1.2fr_0.8fr] lg:pt-20">
      <div>
        <p className="eyebrow">Partners</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">Voor makelaars en hypotheekadviseurs</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">Je klant wil snel en zonder gedoe de sleutel. Jij wilt zekerheid dat de overdracht op tijd en foutloos verloopt. Daar is Akteloket voor gebouwd.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {items.map((i) => (
            <div key={i.t} className="card p-6"><span className="flex h-11 w-11 items-center justify-center rounded-md bg-brass-50 text-brass-700 ring-1 ring-brass-200"><i.icon className="h-5 w-5" /></span><p className="mt-4 font-serif text-lg font-semibold text-ink-900">{i.t}</p><p className="mt-1.5 text-sm leading-relaxed text-ink-600">{i.d}</p></div>
          ))}
        </div>
        <p className="mt-8 text-sm text-ink-500">Wij betalen en ontvangen geen doorverwijsvergoedingen: zo blijft het advies aan je klant onafhankelijk.</p>
      </div>
      <div className="card self-start p-7">
        <h2 className="text-xl font-bold text-ink-900">Word partner</h2>
        <p className="mt-1 text-sm text-ink-600">We nemen binnen één werkdag contact op en sturen je je persoonlijke doorverwijslink.</p>
        <div className="mt-6"><LeadForm kind="partner" fields={["name", "company", "email", "phone", "message"]} submitLabel="Aanmelden als partner" /></div>
      </div>
    </section>
  );
}
