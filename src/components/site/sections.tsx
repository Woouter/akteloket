import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ShieldCheck, Lock, Scale, Clock, ScanLine, FileCheck2, CheckCircle2 } from "lucide-react";
import { SERVICES, type ServiceKey } from "@/lib/config";
import { cn } from "@/lib/util/format";
import type { Faq } from "@/lib/content/faq";

export function TrustStrip({ className }: { className?: string }) {
  const items = [
    { icon: Scale, text: "Onafhankelijke notaris" },
    { icon: Clock, text: "Start binnen 2 minuten" },
    { icon: ShieldCheck, text: "Wettelijk verplichte controles" },
    { icon: Lock, text: "Versleuteld en AVG-proof" },
  ];
  return (
    <div className={cn("flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600", className)}>
      {items.map((i) => <span key={i.text} className="inline-flex items-center gap-2"><i.icon className="h-4 w-4 text-brass-500" />{i.text}</span>)}
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
            {k === "beide" && <span className={cn("absolute -top-3 left-6 chip xl:left-7", hi ? "bg-brass-500 text-ink-950" : "bg-ink-900 text-white")}>Meest gekozen</span>}
            <p className={cn("eyebrow", hi && "!text-brass-300")}>{s.short}</p>
            <p className={cn("mt-2 font-serif text-xl font-semibold", hi ? "text-white" : "text-ink-900")}>{s.name}</p>
            <p className={cn("mt-2 text-sm leading-relaxed", hi ? "text-ink-300" : "text-ink-600")}>{s.description}</p>
            <p className="mt-6 flex items-baseline gap-1.5">
              <span className={cn("font-serif text-[2.6rem] font-semibold leading-none tabular", hi ? "text-white" : "text-ink-900")}>€ {s.price}</span>
              <span className={cn("text-sm", hi ? "text-ink-300" : "text-ink-500")}>all-in</span>
            </p>
            <p className={cn("mt-1 text-xs", hi ? "text-ink-400" : "text-ink-500")}>{k === "koopovereenkomst" ? "incl. btw" : "incl. btw en kadasterinschrijving"}</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {s.includes.map((i) => <li key={i} className="flex gap-2.5"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", hi ? "text-brass-300" : "text-brass-500")} />{i}</li>)}
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

export function CtaBand({ title = "Klaar om te beginnen?", text = "Upload je koopovereenkomst en zie binnen een minuut welke gegevens we al voor je hebben ingevuld.", service, href, note = "Geen betaling vooraf · Nog geen koopovereenkomst? Je kunt toch al starten." }: { title?: string; text?: string; service?: ServiceKey; href?: string; note?: string }) {
  return (
    <section className="container-page mt-24">
      <div className="relative overflow-hidden rounded-xl bg-ink-900 px-6 py-14 text-center sm:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass-400/70 to-transparent" />
        <div className="relative mx-auto max-w-2xl">
          <p className="eyebrow !text-brass-300">Persoonlijk en online</p>
          <h2 className="mt-3 text-3xl text-white sm:text-[2.6rem]">{title}</h2>
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

/** Illustratie: koopovereenkomst die wordt uitgelezen. */
export function ScanVisual() {
  const fields = [
    ["Adres", "Bloesemlaan 14, Amersfoort"],
    ["Kadastraal", "Amersfoort K 4821"],
    ["Koopprijs", "€ 485.000,00"],
    ["Kopers", "S.M. de Vries · D.P. Bakker"],
    ["Verkopers", "H.J. Jansen · M.E. Visser"],
    ["Leveringsdatum", "Over 13 dagen"],
    ["Waarborgsom", "€ 48.500 (10%)"],
    ["Financieringsvoorbehoud", "€ 440.000"],
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-xl bg-gradient-to-br from-brass-100 via-paper to-brand-50 blur-xl" />
      <div className="card overflow-hidden p-0 shadow-lift">
        <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
          <span className="eyebrow">Stap 1 · Koopovereenkomst uitlezen</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-500"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-ok-600" />Live herkenning</span>
        </div>
        <div className="grid gap-0 sm:grid-cols-[0.8fr_1.2fr]">
          <div className="relative hidden border-r border-ink-100 bg-paper p-5 sm:block">
            <div className="relative mx-auto aspect-[1/1.35] w-full max-w-[11rem] overflow-hidden rounded-md bg-white p-3 shadow-card ring-1 ring-ink-100">
              <p className="text-[7px] font-bold text-ink-900">KOOPOVEREENKOMST WOONHUIS</p>
              {Array.from({ length: 16 }).map((_, i) => <div key={i} className="mt-1.5 h-[3px] rounded bg-ink-100" style={{ width: `${60 + ((i * 37) % 40)}%` }} />)}
              <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-brand-400/25 to-brand-500/40" />
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-500"><ScanLine className="h-3.5 w-3.5 text-brass-500" />4 pagina's herkend</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="space-y-2">
              {fields.map(([k, v], i) => (
                <div key={k} className="flex animate-fade-up items-center justify-between gap-3 rounded-lg bg-ok-50/70 px-3 py-2 ring-1 ring-ok-600/10" style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
                  <span className="text-xs text-ink-500">{k}</span>
                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-900">{v}<CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok-600" /></span>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-ink-500"><FileCheck2 className="h-4 w-4 text-brass-500" />Jij controleert alleen nog — en vult aan wat ontbreekt.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
