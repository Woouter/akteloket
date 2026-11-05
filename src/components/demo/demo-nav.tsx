"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/util/format";

const LINKS = [
  { href: "/demo", label: "Tours" },
  { href: "/demo/uitleg", label: "Hoe alles werkt" },
  { href: "/demo/validatie", label: "Beoordelingskader" },
  { href: "/demo/mailbox", label: "Demo-mailbox" },
];

/** Navigatie van de demo-pagina's; op mobiel als scrollbare rij onder het logo. */
export function DemoNav() {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex w-full items-center gap-1 overflow-x-auto pb-2 md:mx-0 md:ml-auto md:w-auto md:pb-0" aria-label="Demo">
      {LINKS.map((l) => {
        const active = path === l.href;
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={cn("shrink-0 rounded px-3 py-2 text-sm font-medium transition", active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-50 hover:text-ink-900")}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
