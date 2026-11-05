import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { isDemo } from "@/lib/config";

export const dynamic = "force-dynamic";

const links = [
  { href: "/demo", label: "Tours" },
  { href: "/demo/uitleg", label: "Hoe alles werkt" },
  { href: "/demo/validatie", label: "Beoordelingskader" },
  { href: "/demo/mailbox", label: "Demo-mailbox" },
];

/** Demo-pagina's: eigen, rustige kop zonder de websitenavigatie (die is alleen via tours te bekijken). */
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!isDemo()) notFound();
  return (
    <>
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex h-16 items-center gap-6">
          <Logo href="/demo" />
          <span className="hidden h-5 w-px bg-ink-200 sm:block" />
          <span className="hidden text-sm font-medium text-ink-500 sm:block">Demo-omgeving</span>
          <nav className="ml-auto flex items-center gap-1 overflow-x-auto" aria-label="Demo">
            {links.map((l, i) => (
              <Link key={l.href} href={l.href} className={`shrink-0 rounded px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-900 ${i > 0 ? "hidden md:block" : ""}`}>{l.label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
