import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SERVICES, type ServiceKey } from "@/lib/config";
import { FAQ, type Faq } from "@/lib/content/faq";
import { allArticles } from "@/lib/content/kennisbank";
import { CtaBand, FaqJsonLd, FaqList, JsonLd, PriceCards, TrustStrip } from "./sections";
import { SectionTitle } from "@/components/ui";
import { Band, Tick } from "./band";
import { Glyph } from "@/components/icons/glyphs";
import { BRAND } from "@/lib/config";

export interface LandingProps {
  service: ServiceKey;
  eyebrow: string;
  h1: ReactNode;
  intro: string;
  heroPoints: string[];
  explainer: { title: string; body: ReactNode }[];
  steps: { title: string; text: string }[];
  faqTags: Faq["tags"][number][];
  extraFaq?: { q: string; a: string }[];
  articles: string[];
  priceKeys?: ServiceKey[];
  path: string;
  ctaLabel?: string;
}

export function Landing(p: LandingProps) {
  const s = SERVICES[p.service];
  const faq = [...(p.extraFaq ?? []), ...FAQ.filter((f) => f.tags.some((t) => p.faqTags.includes(t)) && !(p.service === "koopovereenkomst" && f.q.startsWith("Kunnen jullie ook de koopovereenkomst")))].slice(0, 8);
  const arts = p.articles.map((slug) => allArticles().find((a) => a.slug === slug)).filter(Boolean);
  const href = p.service === "koopovereenkomst" ? "/aanvraag/koopovereenkomst" : `/aanvraag?dienst=${p.service}`;
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Service", name: s.name, serviceType: s.name, provider: { "@type": "LegalService", name: BRAND.name, url: BRAND.url }, areaServed: "NL", url: `${BRAND.url}${p.path}`, offers: { "@type": "Offer", price: s.price, priceCurrency: "EUR", description: "All-in, inclusief btw en kadasterinschrijving" } }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: BRAND.url }, { "@type": "ListItem", position: 2, name: s.name, item: `${BRAND.url}${p.path}` }] }} />
      <FaqJsonLd items={faq} />

      <section className="relative overflow-hidden bg-white">
        <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[1.25fr_0.75fr] lg:py-20" data-tour="landing-hero">
          <div>
            <nav className="text-sm text-ink-500" aria-label="Kruimelpad"><Link href="/" className="hover:text-ink-900">Home</Link> <span className="mx-1.5">/</span> <span className="text-ink-700">{s.name}</span></nav>
            <p className="eyebrow mt-6">{p.eyebrow}</p>
            <h1 className="mt-3 text-4xl text-ink-900 sm:text-[3.3rem]">{p.h1}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">{p.intro}</p>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {p.heroPoints.map((h) => <li key={h} className="flex gap-2.5 text-ink-800"><Tick />{h}</li>)}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={href} className="btn btn-primary btn-lg">{p.ctaLabel ?? "Start je aanvraag"} <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/hoe-werkt-het" className="btn btn-secondary btn-lg">Hoe werkt het?</Link>
            </div>
            <TrustStrip className="mt-8" />
          </div>
          <aside className="self-start">
            <div className="border-t-[3px] border-brass-500 bg-paper p-7">
              <p className="eyebrow">{s.short}</p>
              <p className="mt-2 flex items-baseline gap-2"><span className="font-serif text-5xl font-semibold text-ink-900 tabular">€ {s.price.toLocaleString("nl-NL")}</span><span className="text-ink-500">all-in</span></p>
              <p className="text-sm text-ink-500">Inclusief btw{p.service !== "koopovereenkomst" ? " en kadasterinschrijving" : ""}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                {s.includes.map((i) => <li key={i} className="flex gap-2.5"><Tick />{i}</li>)}
              </ul>
              <Link href={href} className="btn btn-dark mt-7 w-full">{p.ctaLabel ?? "Start je aanvraag"} <ArrowRight className="h-4 w-4" /></Link>
              <p className="mt-3 text-center text-xs text-ink-500">{p.service === "koopovereenkomst" ? "Vragenlijst in ongeveer een kwartier" : "Aanvraag in ongeveer 2 minuten"}</p>
            </div>
          </aside>
        </div>
      </section>

      <Band tone="paper" inner="grid gap-14 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-12">
          {p.explainer.map((e) => (
            <div key={e.title}>
              <h2 className="text-2xl text-ink-900 sm:text-[2rem]">{e.title}</h2>
              <div className="prose-site mt-4">{e.body}</div>
            </div>
          ))}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border-t border-ink-900 pt-5">
            <p className="eyebrow">Lees ook</p>
            <ul className="mt-4 space-y-3">
              {arts.map((a) => a && (
                <li key={a.slug}><Link href={`/kennisbank/${a.slug}`} className="group flex gap-3 text-sm"><Glyph name="book" size={22} /><span className="font-medium text-ink-700 group-hover:text-ink-900 group-hover:underline group-hover:decoration-brass-400 group-hover:underline-offset-4">{a.title}</span></Link></li>
              ))}
            </ul>
          </div>
        </aside>
      </Band>

      <Band tone="white">
        <SectionTitle eyebrow="Zo gaat het" title={`${s.short} in ${p.steps.length} stappen`} />
        <ol className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {p.steps.map((st, i) => (
            <li key={st.title} className="border-t-2 border-brass-400 pt-5">
              <span className="font-serif text-4xl font-semibold leading-none text-ink-200">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-4 font-serif text-lg font-semibold text-ink-900">{st.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{st.text}</p>
            </li>
          ))}
        </ol>
      </Band>

      {p.priceKeys && (
        <Band tone="sand">
          <SectionTitle center eyebrow="Tarieven" title="Kies wat bij je past" />
          <div className="mt-12"><PriceCards keys={p.priceKeys} highlight={p.service} /></div>
        </Band>
      )}

      <Band tone={p.priceKeys ? "paper" : "sand"} inner="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]" data-tour="landing-faq">
        <SectionTitle eyebrow="Veelgestelde vragen" title={`Vragen over ${s.short.toLowerCase()}`} />
        <FaqList items={faq} />
      </Band>

      {p.service === "koopovereenkomst" ? (
        <CtaBand title="Je koopovereenkomst laten opstellen?" text="Beantwoord de vragen online. Wij stellen een sluitende koopovereenkomst op die koper en verkoper digitaal ondertekenen." href={href} note="Vaste prijs. Daarna ga je met één klik door naar je akte van levering." />
      ) : (
        <CtaBand service={p.service} />
      )}
    </>
  );
}
