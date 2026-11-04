import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, Clock, FileText } from "lucide-react";
import { SERVICES, type ServiceKey } from "@/lib/config";
import { FAQ, type Faq } from "@/lib/content/faq";
import { allArticles } from "@/lib/content/kennisbank";
import { CtaBand, FaqJsonLd, FaqList, JsonLd, PriceCards, TrustStrip } from "./sections";
import { SectionTitle } from "@/components/ui";
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
  const faq = [...(p.extraFaq ?? []), ...FAQ.filter((f) => f.tags.some((t) => p.faqTags.includes(t)))].slice(0, 8);
  const arts = p.articles.map((slug) => allArticles().find((a) => a.slug === slug)).filter(Boolean);
  const href = p.service === "koopovereenkomst" ? "/aanvraag/koopovereenkomst" : `/aanvraag?dienst=${p.service}`;
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Service", name: s.name, serviceType: s.name, provider: { "@type": "LegalService", name: BRAND.name, url: BRAND.url }, areaServed: "NL", url: `${BRAND.url}${p.path}`, offers: { "@type": "Offer", price: s.price, priceCurrency: "EUR", description: "All-in, inclusief btw en kadasterinschrijving" } }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: BRAND.url }, { "@type": "ListItem", position: 2, name: s.name, item: `${BRAND.url}${p.path}` }] }} />
      <FaqJsonLd items={faq} />

      <section className="relative overflow-hidden border-b border-ink-100">
        <div className="pointer-events-none absolute inset-0 bg-grid mask-fade-b" />
        <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[1.25fr_0.75fr] lg:py-20" data-tour="landing-hero">
          <div>
            <nav className="text-sm text-ink-500" aria-label="Kruimelpad"><Link href="/" className="hover:text-ink-900">Home</Link> <span className="mx-1.5">/</span> <span className="text-ink-700">{s.name}</span></nav>
            <p className="mt-6 text-sm font-semibold text-brand-600">{p.eyebrow}</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-[3.4rem]">{p.h1}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">{p.intro}</p>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {p.heroPoints.map((h) => <li key={h} className="flex gap-2.5 text-ink-800"><Check className="mt-0.5 h-5 w-5 shrink-0 text-ok-600" />{h}</li>)}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={href} className="btn btn-primary btn-lg">{p.ctaLabel ?? "Start je aanvraag"} <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/hoe-werkt-het" className="btn btn-secondary btn-lg">Hoe werkt het?</Link>
            </div>
            <TrustStrip className="mt-8" />
          </div>
          <aside className="self-start">
            <div className="card p-7 shadow-lift">
              <p className="text-sm font-semibold text-brand-600">{s.short}</p>
              <p className="mt-1 flex items-baseline gap-2"><span className="text-5xl font-extrabold tracking-tight text-ink-900 tabular">€ {s.price}</span><span className="text-ink-500">all-in</span></p>
              <p className="text-sm text-ink-500">Inclusief btw{p.service !== "koopovereenkomst" ? " en kadasterinschrijving" : ""}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                {s.includes.map((i) => <li key={i} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" />{i}</li>)}
              </ul>
              <Link href={href} className="btn btn-dark mt-7 w-full">{p.ctaLabel ?? "Start je aanvraag"} <ArrowRight className="h-4 w-4" /></Link>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500"><Clock className="h-3.5 w-3.5" />Klaar in ongeveer 2 minuten</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="container-page mt-20 grid gap-14 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-12">
          {p.explainer.map((e) => (
            <div key={e.title}>
              <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{e.title}</h2>
              <div className="prose-site mt-4">{e.body}</div>
            </div>
          ))}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <p className="text-sm font-semibold text-ink-900">Lees ook</p>
            <ul className="mt-4 space-y-3">
              {arts.map((a) => a && (
                <li key={a.slug}><Link href={`/kennisbank/${a.slug}`} className="group flex gap-3 text-sm"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /><span className="font-medium text-ink-700 group-hover:text-brand-700">{a.title}</span></Link></li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className="mt-24 bg-white py-20">
        <div className="container-page">
          <SectionTitle eyebrow="Zo gaat het" title={`${s.short} in ${p.steps.length} stappen`} />
          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {p.steps.map((st, i) => (
              <li key={st.title} className="rounded-2xl border border-ink-100 bg-paper p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <p className="mt-4 font-bold text-ink-900">{st.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{st.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {p.priceKeys && (
        <section className="container-page mt-24">
          <SectionTitle center eyebrow="Tarieven" title="Kies wat bij je past" />
          <div className="mt-10"><PriceCards keys={p.priceKeys} highlight={p.service} /></div>
        </section>
      )}

      <section className="container-page mt-24 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]" data-tour="landing-faq">
        <SectionTitle eyebrow="Veelgestelde vragen" title={`Vragen over ${s.short.toLowerCase()}`} />
        <FaqList items={faq} />
      </section>

      <CtaBand service={p.service === "koopovereenkomst" ? undefined : p.service} />
    </>
  );
}
