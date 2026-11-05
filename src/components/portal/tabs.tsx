"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/util/format";

export function PortalTabs({ base }: { base: string }) {
  const p = usePathname();
  const tabs = [{ href: base, label: "Overzicht", active: p === base || p.startsWith(base + "/stap") || p.startsWith(base + "/idcheck") }, { href: `${base}/documenten`, label: "Documenten", active: p.startsWith(base + "/document") }, { href: `${base}/activiteit`, label: "Activiteit", active: p.startsWith(base + "/activiteit") }];
  return (
    <nav className="-mb-7 mt-6 flex gap-1 overflow-x-auto" aria-label="Dossiermenu">
      {tabs.map((t) => <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined} className={cn("border-b-2 px-3 pb-3 pt-1 text-sm font-semibold whitespace-nowrap", t.active ? "border-brand-600 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800")}>{t.label}</Link>)}
    </nav>
  );
}
