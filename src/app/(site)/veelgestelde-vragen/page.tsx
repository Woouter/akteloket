import type { Metadata } from "next";
import { CtaBand, FaqJsonLd, FaqList } from "@/components/site/sections";
import { Band } from "@/components/site/band";
import { FAQ } from "@/lib/content/faq";

export const metadata: Metadata = {
  title: "Veelgestelde vragen over online notaris en je woning",
  description: "Antwoorden op de meest gestelde vragen over de online akte van levering, hypotheekakte, volmacht, identificatie, kosten en veiligheid.",
  alternates: { canonical: "/veelgestelde-vragen" },
};

const groups: [string, string][] = [["algemeen", "Algemeen"], ["proces", "Het proces"], ["kosten", "Kosten"], ["hypotheek", "Hypotheek"], ["verkoper", "Voor verkopers"], ["koopovereenkomst", "Koopovereenkomst"], ["veiligheid", "Veiligheid en privacy"]];

export default function Page() {
  const seen = new Set<string>();
  return (
    <>
      <FaqJsonLd items={FAQ} />
      <section className="bg-white">
        <div className="container-page py-16 lg:py-20">
          <p className="eyebrow">Veelgestelde vragen</p>
          <h1 className="mt-3 text-4xl text-ink-900 sm:text-5xl">Alles wat je wilt weten</h1>
        </div>
      </section>
      {groups.map(([tag, label], gi) => {
        const items = FAQ.filter((f) => f.tags[0] === tag || (f.tags.includes(tag as never) && !seen.has(f.q))).filter((f) => !seen.has(f.q));
        items.forEach((f) => seen.add(f.q));
        if (!items.length) return null;
        return (
          <Band key={tag} tone={gi % 2 === 0 ? "paper" : "white"} pad="compact" inner="grid gap-8 lg:grid-cols-[0.6fr_1.4fr]">
            <h2 className="text-2xl text-ink-900">{label}</h2>
            <FaqList items={items} />
          </Band>
        );
      })}
      <CtaBand />
    </>
  );
}
