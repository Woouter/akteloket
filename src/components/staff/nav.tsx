"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderOpen, Inbox, LayoutDashboard, MessageSquareText, Settings, Activity, Users } from "lucide-react";
import { cn } from "@/lib/util/format";

const NAV = {
  notaris: [{ href: "/notaris", label: "Werkvoorraad", icon: LayoutDashboard }, { href: "/notaris/dossiers", label: "Alle dossiers", icon: FolderOpen }, { href: "/notaris/agenda", label: "Agenda", icon: CalendarDays }, { href: "/notaris/instellingen", label: "Instellingen", icon: Settings }],
  beheer: [{ href: "/beheer", label: "Overzicht", icon: LayoutDashboard }, { href: "/beheer/dossiers", label: "Dossiers", icon: FolderOpen }, { href: "/beheer/automatisering", label: "Automatisering", icon: Activity }, { href: "/beheer/emails", label: "Uitgaande e-mail", icon: Inbox }, { href: "/beheer/leads", label: "Leads & partners", icon: Users }, { href: "/beheer/feedback", label: "Pilotfeedback", icon: MessageSquareText }],
};

export function StaffNav({ area }: { area: "notaris" | "beheer" }) {
  const p = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0" aria-label="Werkplekmenu">
      {NAV[area].map((n) => {
        const active = n.href === `/${area}` ? p === n.href : p.startsWith(n.href);
        return <Link key={n.href} href={n.href} className={cn("flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium", active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900")}><n.icon className="h-4 w-4" />{n.label}</Link>;
      })}
    </nav>
  );
}
