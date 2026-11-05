"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderOpen, Inbox, LayoutDashboard, MessageSquareText, Settings, Activity, Users } from "lucide-react";
import { cn } from "@/lib/util/format";

const NAV = {
  notaris: [{ href: "/notaris", label: "Werkvoorraad", icon: LayoutDashboard }, { href: "/notaris/dossiers", label: "Alle dossiers", icon: FolderOpen }, { href: "/notaris/agenda", label: "Agenda", icon: CalendarDays }, { href: "/notaris/instellingen", label: "Instellingen", icon: Settings }],
  beheer: [{ href: "/beheer", label: "Overzicht", icon: LayoutDashboard }, { href: "/beheer/dossiers", label: "Dossiers", icon: FolderOpen }, { href: "/beheer/automatisering", label: "Automatisering", icon: Activity }, { href: "/beheer/emails", label: "Uitgaande e-mail", icon: Inbox }, { href: "/beheer/leads", label: "Leads en partners", icon: Users }, { href: "/beheer/feedback", label: "Pilotfeedback", icon: MessageSquareText }],
};

export function StaffNav({ area }: { area: "notaris" | "beheer" }) {
  const p = usePathname();
  const ref = useRef<HTMLElement>(null);
  // Op kleine schermen scrolt het menu horizontaal: houd het actieve item in beeld.
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const x = active.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    nav.scrollTo({ left: Math.max(0, x - 16) });
  }, [p]);
  return (
    <nav ref={ref} className="flex gap-1 overflow-x-auto pb-3 pl-3 pr-8 lg:px-3 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] lg:flex-col lg:overflow-visible lg:pb-0 lg:[mask-image:none]" aria-label="Werkplekmenu">
      {NAV[area].map((n) => {
        const active = n.href === `/${area}` ? p === n.href : p.startsWith(n.href);
        return <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900")}><n.icon className="h-4 w-4" />{n.label}</Link>;
      })}
    </nav>
  );
}
