import Link from "next/link";
import { Lock, ShieldCheck, Scale } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { BRAND, NOTARY_OFFICE } from "@/lib/config";

const cols = [
  { title: "Diensten", links: [["Levering + hypotheekakte", "/levering-en-hypotheekakte"], ["Akte van levering", "/akte-van-levering"], ["Hypotheekakte", "/hypotheekakte"], ["Koopovereenkomst opstellen", "/koopovereenkomst-opstellen"], ["Tarieven", "/tarieven"]] },
  { title: "Uitleg", links: [["Hoe werkt het", "/hoe-werkt-het"], ["Kennisbank", "/kennisbank"], ["Notariskosten 2026", "/kennisbank/notariskosten-huis-kopen"], ["Startersvrijstelling", "/kennisbank/startersvrijstelling"], ["Veelgestelde vragen", "/veelgestelde-vragen"]] },
  { title: "Akteloket", links: [["Over ons", "/over-ons"], ["Voor makelaars en adviseurs", "/voor-makelaars-en-adviseurs"], ["Veiligheid en privacy", "/veiligheid"], ["Contact", "/contact"], ["Inloggen", "/inloggen"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-200 bg-sand-100 text-ink-600">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">{BRAND.tagline} De notariële werkzaamheden worden uitgevoerd door {NOTARY_OFFICE.officeName}, een onafhankelijk notariskantoor.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="chip bg-white text-ink-700 ring-1 ring-ink-200"><Scale className="h-3.5 w-3.5" />Onafhankelijke notaris</span>
            <span className="chip bg-white text-ink-700 ring-1 ring-ink-200"><Lock className="h-3.5 w-3.5" />Versleutelde opslag</span>
            <span className="chip bg-white text-ink-700 ring-1 ring-ink-200"><ShieldCheck className="h-3.5 w-3.5" />AVG-proof</span>
          </div>
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
          <p>© {new Date().getFullYear()} {BRAND.name} · {BRAND.address}{BRAND.kvk ? ` · ${BRAND.kvk}` : ""}</p>
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
