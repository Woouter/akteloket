import Link from "next/link";
import { ArrowUpRight, FlaskConical, LayoutGrid, UserRound } from "lucide-react";
import { getUser } from "@/lib/auth/session";
import { PERSONAS } from "@/lib/demo/personas";
import { BRAND } from "@/lib/config";

/**
 * Balk boven elke demo-pagina. Bewust zonder rollenwisselaar of vrije navigatie:
 * de demo wordt via tours gebruikt (zie src/proxy.ts). Wie vrij wil rondkijken,
 * gaat naar de echte website.
 */
export async function DemoBar() {
  const user = await getUser();
  const persona = PERSONAS.find((p) => p.email === user?.email);
  const who = persona ? `${persona.label}: ${persona.name}` : user ? user.name : null;
  return (
    <div className="no-print relative z-50 bg-ink-950 text-[13px] text-ink-200">
      <div className="container-page flex h-10 items-center gap-3">
        <Link href="/demo" className="flex min-w-0 items-center gap-2 font-semibold text-white">
          <span className="flex h-5 shrink-0 items-center gap-1 rounded bg-notaris-600 px-1.5 text-[11px] font-bold uppercase tracking-wider text-white"><FlaskConical className="h-3 w-3" />Demo</span>
          <span className="hidden truncate md:inline">Fictieve gegevens, alleen voor rondleidingen</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {who && <span className="hidden items-center gap-1.5 px-2 text-ink-300 lg:flex" title="Ingelogd als"><UserRound className="h-3.5 w-3.5" />{who}</span>}
          <Link href="/demo" className="flex items-center gap-1.5 rounded px-2 py-1 font-medium text-white hover:bg-white/10"><LayoutGrid className="h-3.5 w-3.5" />Alle tours</Link>
          <a href={`https://${BRAND.domain}`} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10">
            <span className="hidden sm:inline">Naar de echte website</span><span className="sm:hidden">Website</span><ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
