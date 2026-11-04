import Link from "next/link";
import { ArrowRight, ChevronDown, FileSignature, Landmark, Layers, FilePen, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { SERVICES } from "@/lib/config";

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
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-paper/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hoofdmenu">
          <div className="group relative">
            <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-ink-700 hover:text-ink-900">
              Diensten <ChevronDown className="h-4 w-4 opacity-60 transition group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-0 top-full w-[26rem] translate-y-1 pt-2 opacity-0 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="card p-2">
                {services.map((s) => (
                  <Link key={s.href} href={s.href} className="flex items-start gap-3 rounded-xl p-3 hover:bg-ink-50">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><s.icon className="h-4.5 w-4.5" /></span>
                    <span><span className="block font-semibold text-ink-900">{s.title}</span><span className="block text-sm text-ink-500">{s.desc}</span></span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-ink-700 hover:text-ink-900">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/inloggen" className="btn btn-ghost hidden sm:inline-flex">Inloggen</Link>
          <Link href="/aanvraag" className="btn btn-primary hidden sm:inline-flex">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
          <details className="group lg:hidden">
            <summary className="btn btn-secondary btn-sm list-none" aria-label="Menu openen"><Menu className="h-5 w-5 group-open:hidden" /><X className="hidden h-5 w-5 group-open:block" /></summary>
            <div className="absolute inset-x-0 top-16 border-b border-ink-100 bg-white shadow-lift">
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
  );
}
