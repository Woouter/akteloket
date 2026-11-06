import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, FaqList, PriceCards } from "@/components/site/sections";
import { Band } from "@/components/site/band";
import { EXTRAS, TAX_YEARS } from "@/lib/config";
import { FAQ } from "@/lib/content/faq";

export const metadata: Metadata = {
  title: "Tarieven notaris: vaste all-in prijzen voor je woning",
  description: "Akte van levering € 995, hypotheekakte € 695, levering + hypotheek € 1.395. All-in inclusief btw en kadasterinschrijving. Bekijk ook overdrachtsbelasting 2026.",
  alternates: { canonical: "/tarieven" },
};

export default function Page() {
  return (
    <>
      <Band tone="paper" border={false}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-3">Tarieven</p>
          <h1 className="text-4xl leading-tight text-ink-900 sm:text-5xl">Vaste prijzen. Vooraf duidelijk.</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">Alle prijzen zijn all-in: inclusief btw en de inschrijving van de akte(n) in het Kadaster. Je betaalt niets vooraf; alles wordt verrekend via de nota van afrekening.</p>
        </div>
        <div className="mt-14"><PriceCards keys={["levering", "beide", "hypotheek", "koopovereenkomst"]} /></div>
      </Band>
      <Band tone="white" inner="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="border-t border-ink-900 pt-6">
          <h2 className="text-2xl text-ink-900">Optioneel</h2>
          <ul className="mt-4 divide-y divide-ink-100 text-sm">
            {EXTRAS.map((e) => <li key={e.key} className="flex justify-between gap-4 py-3"><span className="text-ink-700">{e.name}</span><span className="shrink-0 font-semibold text-ink-900 tabular">{e.price ? `€ ${e.price.toLocaleString("nl-NL")}` : "gratis"}</span></li>)}
          </ul>
          <p className="mt-4 text-xs text-ink-500">Annuleren is kosteloos zolang de concept-akte nog niet is opgesteld. Daarna € 295.</p>
        </div>
        <div className="border-t border-ink-900 pt-6">
          <h2 className="text-2xl text-ink-900">Niet inbegrepen: overdrachtsbelasting</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">Deze belasting betaal je via de notaris aan de Belastingdienst. Wij berekenen hem automatisch per koper.</p>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-ink-500"><th className="py-2 font-medium">Jaar levering</th><th className="font-medium">Zelf bewonen</th><th className="font-medium">Overige woning</th><th className="font-medium">Startersgrens</th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {TAX_YEARS.filter((t) => t.year >= 2026).map((t) => (
                <tr key={t.year}><td className="py-2.5 font-semibold text-ink-900">{t.year}{t.status === "onder voorbehoud" && <span className="ml-1 text-xs font-normal text-warn-700">*</span>}</td><td>{(t.tariefHoofdverblijf * 100).toFixed(0)}%</td><td>{(t.tariefOverigeWoning * 100).toFixed(1).replace(".0", "")}%</td><td className="tabular">€ {t.startersGrens.toLocaleString("nl-NL")}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-500">* 2027: woningwaardegrens vastgesteld; het tarief van 7% voor overige woningen is voorgesteld in het Belastingplan 2027 en nog niet definitief. Lees meer over de <Link href="/kennisbank/startersvrijstelling" className="underline">startersvrijstelling</Link> en <Link href="/kennisbank/overdrachtsbelasting-2026" className="underline">overdrachtsbelasting 2026</Link>.</p>
        </div>
      </Band>
      <Band tone="sand" inner="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div><p className="eyebrow">Veelgestelde vragen</p><h2 className="mt-3 text-3xl leading-tight text-ink-900 sm:text-[2.5rem]">Vragen over kosten</h2></div>
        <FaqList items={FAQ.filter((f) => f.tags.includes("kosten"))} />
      </Band>
      <CtaBand />
    </>
  );
}
