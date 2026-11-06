import Link from "next/link";
import { Glyph } from "@/components/icons/glyphs";
import { Logo } from "@/components/ui/logo";
import { BRAND, NOTARY_OFFICE } from "@/lib/config";

const cols = [
  { title: "Diensten", links: [["Levering + hypotheekakte", "/levering-en-hypotheekakte"], ["Akte van levering", "/akte-van-levering"], ["Hypotheekakte", "/hypotheekakte"], ["Koopovereenkomst opstellen", "/koopovereenkomst-opstellen"], ["Tarieven", "/tarieven"]] },
  { title: "Uitleg", links: [["Hoe werkt het", "/hoe-werkt-het"], ["Kennisbank", "/kennisbank"], ["Notariskosten 2026", "/kennisbank/notariskosten-huis-kopen"], ["Startersvrijstelling", "/kennisbank/startersvrijstelling"], ["Veelgestelde vragen", "/veelgestelde-vragen"]] },
  { title: "Akteloket", links: [["Over ons", "/over-ons"], ["Voor makelaars en adviseurs", "/voor-makelaars-en-adviseurs"], ["Veiligheid en privacy", "/veiligheid"], ["Contact", "/contact"], ["Inloggen", "/inloggen"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-sand-100 text-ink-600">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">{BRAND.tagline} De notariële werkzaamheden worden uitgevoerd door {NOTARY_OFFICE.officeName}, een onafhankelijk notariskantoor.</p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
            <li className="flex items-center gap-2.5"><Glyph name="scales" size={22} />Onafhankelijke notaris</li>
            <li className="flex items-center gap-2.5"><Glyph name="lock" size={22} />Versleutelde opslag</li>
            <li className="flex items-center gap-2.5"><Glyph name="shield" size={22} />Werkt volgens de AVG</li>
          </ul>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="eyebrow">{c.title}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {c.links.map(([l, h]) => <li key={h}><Link href={h} className="inline-block py-1 hover:text-ink-900">{l}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-200">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap gap-x-4 gap-y-1"><span>© {new Date().getFullYear()} {BRAND.name}</span><span>{BRAND.address}</span>{BRAND.kvk && <span>{BRAND.kvk}</span>}</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="inline-block py-1.5 hover:text-ink-900">Privacy</Link>
            <Link href="/voorwaarden" className="inline-block py-1.5 hover:text-ink-900">Voorwaarden</Link>
            <Link href="/dienstverleningsovereenkomst" className="inline-block py-1.5 hover:text-ink-900">Dienstverleningsovereenkomst</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
