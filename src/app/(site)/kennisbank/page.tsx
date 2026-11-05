import type { Metadata } from "next";
import Link from "next/link";
import { allArticles, CATEGORY_ORDER } from "@/lib/content/kennisbank";
import { CtaBand } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Kennisbank: alles over notaris, akten en huis kopen",
  description: "Heldere uitleg over de akte van levering, hypotheekakte, notariskosten, overdrachtsbelasting 2026, startersvrijstelling, volmacht en meer.",
  alternates: { canonical: "/kennisbank" },
};

export default function Page() {
  const arts = allArticles();
  return (
    <>
      <section className="border-b border-ink-100">
        <div className="container-page py-16 lg:py-20">
          <p className="eyebrow">Kennisbank</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">Snap precies wat er gebeurt als je een huis koopt</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">{arts.length} artikelen in gewone taal, geschreven voor kopers en verkopers. Bijgewerkt voor 2026.</p>
        </div>
      </section>
      <div className="container-page mt-12 space-y-14" data-tour="kb-list">
        {CATEGORY_ORDER.map((cat) => {
          const list = arts.filter((a) => a.category === cat);
          if (!list.length) return null;
          return (
            <section key={cat}>
              <h2 className="text-xl font-bold text-ink-900">{cat}</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((a) => (
                  <Link key={a.slug} href={`/kennisbank/${a.slug}`} className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
                    <p className="text-lg font-bold leading-snug text-ink-900 group-hover:text-brand-700">{a.title}</p>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm text-ink-600">{a.description}</p>
                    <p className="mt-4 text-xs text-ink-400">{a.readingTime} min lezen</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <CtaBand />
    </>
  );
}
