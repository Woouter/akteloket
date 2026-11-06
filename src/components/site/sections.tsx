import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Glyph, type GlyphName } from "@/components/icons/glyphs";
import { Tick } from "./band";
import { SERVICES, type ServiceKey } from "@/lib/config";
import { cn } from "@/lib/util/format";
import type { Faq } from "@/lib/content/faq";

export function TrustStrip({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const items: { glyph: GlyphName; text: string }[] = [
    { glyph: "scales", text: "Onafhankelijke notaris" },
    { glyph: "clock", text: "Start binnen 2 minuten" },
    { glyph: "shield", text: "Wettelijk verplichte controles" },
    { glyph: "lock", text: "Versleuteld en AVG-proof" },
  ];
  return (
    <div className={cn("flex flex-wrap gap-x-7 gap-y-3 text-sm", tone === "dark" ? "text-ink-200" : "text-ink-700", className)}>
      {items.map((i) => <span key={i.text} className="inline-flex items-center gap-2.5"><Glyph name={i.glyph} size={22} tone={tone} />{i.text}</span>)}
    </div>
  );
}

export function PriceCards({ highlight = "beide", keys = ["levering", "beide", "hypotheek"] as ServiceKey[], cta = true }: { highlight?: ServiceKey; keys?: ServiceKey[]; cta?: boolean }) {
  return (
    // Subgrid: titel, prijs, lijst en knop staan in alle kaarten op dezelfde hoogte.
    <div className={cn("grid gap-x-5", keys.length === 3 ? "mx-auto max-w-xl lg:max-w-none lg:grid-cols-3" : keys.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2")}>
      {keys.map((k) => {
        const s = SERVICES[k];
        const hi = k === highlight;
        const href = k === "koopovereenkomst" ? "/aanvraag/koopovereenkomst" : `/aanvraag?dienst=${k}`;
        return (
          <div key={k} className={cn("relative row-span-7 mb-5 grid grid-rows-subgrid rounded-lg p-6 xl:p-7", hi ? "bg-ink-900 text-white shadow-lift ring-1 ring-ink-900" : "card")}>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className={cn("eyebrow", hi && "!text-brass-300")}>{s.short}</span>
              {k === "beide" && <span className={cn("chip", hi ? "text-brass-300" : "text-brass-700")}>Meest gekozen</span>}
            </p>
            <p className={cn("mt-2 font-serif text-xl font-semibold", hi ? "text-white" : "text-ink-900")}>{s.name}</p>
            <p className={cn("mt-2 text-sm leading-relaxed", hi ? "text-ink-300" : "text-ink-600")}>{s.description}</p>
            <p className="mt-6 flex items-baseline gap-1.5">
              <span className={cn("font-serif text-[2.6rem] font-semibold leading-none tabular", hi ? "text-white" : "text-ink-900")}>€ {s.price.toLocaleString("nl-NL")}</span>
              <span className={cn("text-sm", hi ? "text-ink-300" : "text-ink-500")}>all-in</span>
            </p>
            <p className={cn("mt-1 text-xs", hi ? "text-ink-400" : "text-ink-500")}>{k === "koopovereenkomst" ? "incl. btw" : "incl. btw en kadasterinschrijving"}</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {s.includes.map((i) => <li key={i} className="flex gap-2.5"><Tick tone={hi ? "dark" : "light"} />{i}</li>)}
            </ul>
            {cta ? <Link href={href} className={cn("btn mt-8 self-end", hi ? "btn-brass" : "btn-secondary")}>Start aanvraag <ArrowRight className="h-4 w-4" /></Link> : <span />}
          </div>
        );
      })}
    </div>
  );
}

export function FaqList({ items, className }: { items: Faq[] | { q: string; a: string }[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-ink-200 rounded-lg border border-ink-200 bg-white", className)}>
      {items.map((f) => (
        <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-start justify-between gap-4 font-serif text-[1.08rem] font-semibold text-ink-900">
            {f.q}
            <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-ink-400 transition group-open:rotate-180" />
          </summary>
          <p className="mt-3 leading-relaxed text-ink-600">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  const json = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />;
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function CtaBand({ title = "Klaar om te beginnen?", text = "Upload je koopovereenkomst en zie binnen een minuut welke gegevens we al voor je hebben ingevuld.", service, href, note = "Geen betaling vooraf. Nog geen koopovereenkomst? Je kunt toch al starten.", className }: { title?: string; text?: string; service?: ServiceKey; href?: string; note?: string; className?: string }) {
  return (
    <section className={cn("relative overflow-hidden bg-ink-900 py-20 text-center text-white lg:py-24", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass-400/70 to-transparent" />
      <div className="container-page relative">
        <div className="mx-auto max-w-2xl">
          <Glyph name="key" size={44} tone="dark" className="mx-auto" />
          <h2 className="mt-5 text-3xl text-white sm:text-[2.6rem]">{title}</h2>
          <p className="mt-4 text-lg text-ink-300">{text}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={href ?? `/aanvraag${service ? `?dienst=${service}` : ""}`} className="btn btn-brass btn-lg">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/hoe-werkt-het" className="btn btn-lg border-white/40 text-white hover:bg-white/10">Bekijk hoe het werkt</Link>
          </div>
          <p className="mt-5 text-sm text-ink-400">{note}</p>
        </div>
      </div>
    </section>
  );
}
