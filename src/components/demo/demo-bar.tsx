import Link from "next/link";
import { ChevronDown, FlaskConical, Inbox, PlayCircle, UserRound, LayoutGrid } from "lucide-react";
import { getUser } from "@/lib/auth/session";
import { PERSONAS } from "@/lib/demo/personas";
import { TOURS } from "@/lib/demo/tours";

export async function DemoBar() {
  const user = await getUser();
  const persona = PERSONAS.find((p) => p.email === user?.email);
  return (
    <div className="no-print relative z-50 bg-ink-950 text-[13px] text-ink-200">
      <div className="container-page flex h-10 items-center gap-2 sm:gap-4">
        <Link href="/demo" className="flex shrink-0 items-center gap-1.5 font-semibold text-white">
          <span className="flex h-5 items-center gap-1 rounded-md bg-notaris-600 px-1.5 text-[11px] font-bold uppercase tracking-wider text-white"><FlaskConical className="h-3 w-3" />Demo</span>
          <span className="hidden md:inline">demo.akte-loket.nl · fictieve gegevens</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10" data-tour="demo-persona">
              <UserRound className="h-3.5 w-3.5" />
              <span className="max-w-[5.5rem] truncate sm:max-w-[9rem]">{persona ? `${persona.name} · ${persona.label}` : user ? user.name : "Niet ingelogd"}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </summary>
            <div className="absolute right-0 mt-1 w-72 rounded-xl bg-white p-1.5 text-ink-800 shadow-lift ring-1 ring-ink-900/10">
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Bekijk als…</p>
              {PERSONAS.map((p) => (
                <Link key={p.key} href={`/demo/als/${p.key}`} className="block rounded-lg px-2.5 py-2 hover:bg-ink-50">
                  <span className="block font-semibold text-ink-900">{p.name} <span className="font-normal text-ink-500">· {p.label}</span></span>
                  <span className="block text-xs text-ink-500">{p.description}</span>
                </Link>
              ))}
              <Link href="/demo/als/uit" className="block rounded-lg px-2.5 py-2 text-ink-600 hover:bg-ink-50">Uitloggen (bezoeker)</Link>
            </div>
          </details>
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10">
              <PlayCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Start tour</span><ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </summary>
            <div className="absolute right-0 mt-1 w-72 rounded-xl bg-white p-1.5 text-ink-800 shadow-lift ring-1 ring-ink-900/10">
              {TOURS.map((t) => (
                <Link key={t.key} href={`/demo/start/${t.key}`} prefetch={false} className="block rounded-lg px-2.5 py-2 hover:bg-ink-50">
                  <span className="block font-semibold text-ink-900">{t.title}</span>
                  <span className="block text-xs text-ink-500">{t.minutes} min · {t.audience}</span>
                </Link>
              ))}
            </div>
          </details>
          <Link href="/demo/mailbox" className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10"><Inbox className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mailbox</span></Link>
          <Link href="/demo" className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10"><LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline">Demo-hub</span></Link>
        </div>
      </div>
    </div>
  );
}
