import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, FaqList, PriceCards } from "@/components/site/sections";
import { EXTRAS, TAX_YEARS } from "@/lib/config";
import { FAQ } from "@/lib/content/faq";

export const metadata: Metadata = {
  title: "Tarieven notaris: vaste all-in prijzen voor je woning",
  description: "Akte van levering € 649, hypotheekakte € 449, levering + hypotheek € 895. All-in inclusief btw en kadasterinschrijving. Bekijk ook overdrachtsbelasting 2026.",
  alternates: { canonical: "/tarieven" },
};

export default function Page() {
  return (
    <>
      <section className="container-page py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-3">Tarieven</p>
          <h1 className="text-4xl leading-tight text-ink-900 sm:text-5xl">Vaste prijzen. Vooraf duidelijk.</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">Alle prijzen zijn all-in: inclusief btw en de inschrijving van de akte(n) in het Kadaster. Je betaalt niets vooraf; alles wordt verrekend via de nota van afrekening.</p>
        </div>
        <div className="mt-12"><PriceCards keys={["levering", "beide", "hypotheek", "koopovereenkomst"]} /></div>
      </section>
      <section className="container-page mt-8 grid gap-8 lg:grid-cols-2">
        <div className="card p-7">
          <h2 className="text-xl font-bold text-ink-900">Optioneel</h2>
          <ul className="mt-4 divide-y divide-ink-100 text-sm">
            {EXTRAS.map((e) => <li key={e.key} className="flex justify-between gap-4 py-3"><span className="text-ink-700">{e.name}</span><span className="shrink-0 font-semibold text-ink-900 tabular">{e.price ? `€ ${e.price}` : "gratis"}</span></li>)}
          </ul>
          <p className="mt-4 text-xs text-ink-500">Annuleren is kosteloos zolang de concept-akte nog niet is opgesteld. Daarna € 195.</p>
        </div>
        <div className="card p-7">
          <h2 className="text-xl font-bold text-ink-900">Niet inbegrepen: overdrachtsbelasting</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">Deze belasting betaal je via de notaris aan de Belastingdienst. Wij berekenen hem automatisch per koper.</p>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-ink-500"><th className="py-2 font-medium">Jaar levering</th><th className="font-medium">Zelf bewonen</th><th className="font-medium">Overige woning</th><th className="font-medium">Startersgrens</th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {TAX_YEARS.filter((t) => t.year >= 2026).map((t) => (
                <tr key={t.year}><td className="py-2.5 font-semibold text-ink-900">{t.year}{t.status === "onder voorbehoud" && <span className="ml-1 text-xs font-normal text-warn-700">*</span>}</td><td>{(t.tariefHoofdverblijf * 100).toFixed(0)}%</td><td>{(t.tariefOverigeWoning * 100).toFixed(1).replace(".0", "")}%</td><td className="tabular">€ {t.startersGrens.toLocaleString("nl-NL")}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-500">* 2027: woningwaardegrens vastgesteld; het tarief van 7% voor overige woningen is voorgesteld in het Belastingplan 2027 en nog niet definitief. Lees meer over de <Link href="/kennisbank/startersvrijstelling" className="underline">startersvrijstelling</Link> en <Link href="/kennisbank/overdrachtsbelasting-2026" className="underline">overdrachtsbelasting 2026</Link>.</p>
        </div>
      </section>
      <section className="container-page mt-20 max-w-3xl">
        <h2 className="text-2xl font-bold text-ink-900">Vragen over kosten</h2>
        <FaqList className="mt-6" items={FAQ.filter((f) => f.tags.includes("kosten"))} />
      </section>
      <CtaBand />
    </>
  );
}
