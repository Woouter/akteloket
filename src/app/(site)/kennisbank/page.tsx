import type { Metadata } from "next";
import Link from "next/link";
import { allArticles, CATEGORY_ORDER } from "@/lib/content/kennisbank";
import { CtaBand } from "@/components/site/sections";
import { Band } from "@/components/site/band";

export const metadata: Metadata = {
  title: "Kennisbank: alles over notaris, akten en huis kopen",
  description: "Heldere uitleg over de akte van levering, hypotheekakte, notariskosten, overdrachtsbelasting 2026, startersvrijstelling, volmacht en meer.",
  alternates: { canonical: "/kennisbank" },
};

export default function Page() {
  const arts = allArticles();
  return (
    <>
      <section className="bg-white">
        <div className="container-page py-16 lg:py-20">
          <p className="eyebrow">Kennisbank</p>
          <h1 className="mt-3 max-w-3xl text-4xl text-ink-900 sm:text-5xl">Snap precies wat er gebeurt als je een huis koopt</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">{arts.length} artikelen in gewone taal, geschreven voor kopers en verkopers. Bijgewerkt voor 2026.</p>
        </div>
      </section>
      <div data-tour="kb-list">
        {CATEGORY_ORDER.filter((cat) => arts.some((a) => a.category === cat)).map((cat, ci) => {
          const list = arts.filter((a) => a.category === cat);
          return (
            <Band key={cat} tone={ci % 2 === 0 ? "paper" : "white"} pad="compact" inner="grid gap-8 lg:grid-cols-[0.55fr_1.45fr]">
              <h2 className="text-2xl text-ink-900">{cat}</h2>
              <div className="grid gap-x-10 border-t border-ink-300 sm:grid-cols-2">
                {list.map((a) => (
                  <Link key={a.slug} href={`/kennisbank/${a.slug}`} className="group flex flex-col border-b border-ink-300 py-6">
                    <p className="font-serif text-xl font-semibold leading-snug text-ink-900 group-hover:underline group-hover:decoration-brass-400 group-hover:underline-offset-4">{a.title}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-ink-600">{a.description}</p>
                    <p className="mt-auto pt-3 text-xs text-ink-500">{a.readingTime} min lezen</p>
                  </Link>
                ))}
              </div>
            </Band>
          );
        })}
      </div>
      <CtaBand />
    </>
  );
}
