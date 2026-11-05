import Link from "next/link";
import { ArrowRight, ChevronDown, FileSignature, Landmark, Layers, FilePen, Menu, X, Phone, Scale } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { BRAND, SERVICES } from "@/lib/config";

const services = [
  { href: "/levering-en-hypotheekakte", title: "Levering + hypotheekakte", desc: `Voor de meeste kopers · € ${SERVICES.beide.price}`, icon: Layers },
  { href: "/akte-van-levering", title: "Akte van levering", desc: `Kopen zonder hypotheek · € ${SERVICES.levering.price}`, icon: FileSignature },
  { href: "/hypotheekakte", title: "Hypotheekakte", desc: `Bijv. bij oversluiten · € ${SERVICES.hypotheek.price}`, icon: Landmark },
  { href: "/koopovereenkomst-opstellen", title: "Koopovereenkomst opstellen", desc: `Zonder makelaar · € ${SERVICES.koopovereenkomst.price}`, icon: FilePen },
];

const nav = [
  { href: "/hoe-werkt-het", label: "Hoe werkt het" },
  { href: "/tarieven", label: "Tarieven" },
  { href: "/kennisbank", label: "Kennisbank" },
  { href: "/voor-makelaars-en-adviseurs", label: "Voor makelaars" },
];

export function SiteHeader() {
  return (
    <>
    <div className="bg-ink-900 text-[13px] text-ink-200">
      <div className="container-page flex h-9 items-center justify-between gap-4">
        <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />Vragen? Bel <a href={BRAND.phoneHref} className="whitespace-nowrap font-semibold text-white underline decoration-white/40 underline-offset-2">{BRAND.phone}</a><span className="hidden whitespace-nowrap sm:inline">(ma t/m vr 08:30 – 18:00)</span></p>
        <p className="hidden items-center gap-2 lg:flex"><Scale className="h-3.5 w-3.5 text-brass-400" />Akten opgesteld en gepasseerd door een onafhankelijke notaris</p>
      </div>
    </div>
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur-md">
      <div className="container-page flex h-[4.5rem] items-center gap-6 xl:gap-8">
        <Logo />
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Hoofdmenu">
          <div className="group relative" data-menu>
            <button className="flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-ink-700 hover:text-ink-900" aria-haspopup="true">
              Diensten <ChevronDown className="h-4 w-4 opacity-60 transition group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-0 top-full w-[26rem] translate-y-1 pt-2 opacity-0 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="card p-2">
                {services.map((s) => (
                  <Link key={s.href} href={s.href} className="flex items-start gap-3 rounded-md p-3 hover:bg-ink-50">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brass-50 text-brass-700 ring-1 ring-brass-200"><s.icon className="h-4.5 w-4.5" /></span>
                    <span><span className="block font-serif text-[1.05rem] font-semibold text-ink-900">{s.title}</span><span className="block text-sm text-ink-500">{s.desc}</span></span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-ink-700 hover:text-ink-900">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/inloggen" className="btn btn-ghost hidden sm:inline-flex">Inloggen</Link>
          <Link href="/aanvraag" className="btn btn-primary hidden sm:inline-flex">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
          <details className="group xl:hidden" data-menu>
            <summary className="btn btn-secondary btn-sm h-11 w-11 list-none justify-center px-0" aria-label="Menu openen"><Menu className="h-5 w-5 group-open:hidden" /><X className="hidden h-5 w-5 group-open:block" /></summary>
            <div data-menu-close aria-hidden className="fixed inset-0 -z-10 bg-ink-950/30" />
            <div className="absolute inset-x-0 top-[4.5rem] max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-ink-200 bg-white shadow-lift">
              <div className="container-page grid gap-1 py-4">
                {services.map((s) => <Link key={s.href} href={s.href} className="rounded-lg px-3 py-2.5 font-medium text-ink-800 hover:bg-ink-50">{s.title}</Link>)}
                <div className="my-2 h-px bg-ink-100" />
                {nav.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 font-medium text-ink-800 hover:bg-ink-50">{n.label}</Link>)}
                <Link href="/inloggen" className="rounded-lg px-3 py-2.5 font-medium text-ink-800 hover:bg-ink-50">Inloggen</Link>
                <Link href="/aanvraag" className="btn btn-primary mt-2">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
    </>
  );
}
