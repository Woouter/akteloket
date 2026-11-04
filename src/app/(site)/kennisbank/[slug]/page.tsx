import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { allArticles, getArticle } from "@/lib/content/kennisbank";
import { FaqJsonLd, FaqList, JsonLd } from "@/components/site/sections";
import { BRAND, SERVICES } from "@/lib/config";
import { dateNl } from "@/lib/util/format";

export function generateStaticParams() {
  return allArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArticle((await params).slug);
  if (!a) return {};
  return { title: a.title, description: a.description, alternates: { canonical: `/kennisbank/${a.slug}` }, openGraph: { type: "article", title: a.title, description: a.description } };
}

const ctaMap = { levering: "levering", hypotheek: "hypotheek", beide: "beide", koopovereenkomst: "koopovereenkomst" } as const;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  const s = SERVICES[ctaMap[a.cta] ?? "beide"];
  const href = a.cta === "koopovereenkomst" ? "/koopovereenkomst-opstellen" : `/${s.slug}`;
  const related = a.related.map((r) => getArticle(r)).filter(Boolean);
  return (
    <article>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.description, dateModified: a.updated, author: { "@type": "Organization", name: BRAND.name }, publisher: { "@type": "Organization", name: BRAND.name }, mainEntityOfPage: `${BRAND.url}/kennisbank/${a.slug}` }} />
      {a.faq.length > 0 && <FaqJsonLd items={a.faq} />}
      <header className="border-b border-ink-100">
        <div className="container-page max-w-4xl py-14">
          <nav className="text-sm text-ink-500"><Link href="/kennisbank" className="hover:text-ink-900">Kennisbank</Link> <span className="mx-1.5">/</span> {a.category}</nav>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">{a.title}</h1>
          <p className="mt-5 text-lg text-ink-600">{a.description}</p>
          <p className="mt-5 flex items-center gap-4 text-sm text-ink-500"><span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{a.readingTime} min lezen</span><span>Bijgewerkt {dateNl(a.updated)}</span></p>
        </div>
      </header>
      <div className="container-page mt-12 grid max-w-6xl gap-12 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <div className="prose-site" dangerouslySetInnerHTML={{ __html: a.html }} />
          {a.faq.length > 0 && (
            <section className="mt-14">
              <h2 className="text-2xl font-bold text-ink-900">Veelgestelde vragen</h2>
              <FaqList className="mt-5" items={a.faq} />
            </section>
          )}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {a.headings.length > 2 && (
            <nav className="rounded-2xl border border-ink-100 bg-white p-5 text-sm">
              <p className="font-semibold text-ink-900">In dit artikel</p>
              <ul className="mt-3 space-y-2">{a.headings.map((h) => <li key={h.id}><a href={`#${h.id}`} className="text-ink-600 hover:text-brand-700">{h.text}</a></li>)}</ul>
            </nav>
          )}
          <div className="rounded-2xl bg-ink-900 p-6 text-white">
            <p className="text-sm font-semibold text-brand-300">{s.name}</p>
            <p className="mt-1 text-3xl font-extrabold">€ {s.price}<span className="ml-1 text-sm font-normal text-ink-300">all-in</span></p>
            <p className="mt-2 text-sm text-ink-300">{s.description}</p>
            <Link href={href} className="btn btn-primary mt-5 w-full">Meer over {s.short.toLowerCase()} <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {related.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 text-sm">
              <p className="font-semibold text-ink-900">Gerelateerd</p>
              <ul className="mt-3 space-y-2.5">{related.map((r) => r && <li key={r.slug}><Link href={`/kennisbank/${r.slug}`} className="font-medium text-ink-700 hover:text-brand-700">{r.title}</Link></li>)}</ul>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
