import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { User } from "@/lib/db/schema";
import { StaffNav } from "./nav";

export function StaffShell({ user, area, children }: { user: User; area: "notaris" | "beheer"; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50/60 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-ink-100 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5 lg:h-auto lg:flex-col lg:items-start lg:gap-1 lg:py-6">
          <Logo href={`/${area}`} />
          <div className="flex items-center gap-1.5">
            <span className={`chip mt-0 lg:mt-2 ${area === "notaris" ? "bg-notaris-100 text-notaris-700" : "bg-platform-100 text-platform-600"}`}>{area === "notaris" ? "Notariswerkplek" : "Platformbeheer"}</span>
            {/* Op kleine schermen staat de gebruikersbalk niet onderaan: uitloggen via een compacte knop. */}
            <form action="/uitloggen" method="post" className="lg:hidden"><button className="btn btn-ghost btn-sm px-2" title={`Uitloggen (${user.name})`} aria-label={`Uitloggen (${user.name})`}><LogOut className="h-4 w-4" /></button></form>
          </div>
        </div>
        <StaffNav area={area} />
        {/* Sticky onderaan: blijft zichtbaar, ook als de zijbalk door de demobalk iets onder de vouw begint. */}
        <div className="hidden border-t border-ink-100 bg-white p-5 lg:sticky lg:bottom-0 lg:mt-auto lg:block">
          <p className="text-sm font-semibold text-ink-900">{user.name}</p>
          <p className="truncate text-xs text-ink-500">{user.email}</p>
          <form action="/uitloggen" method="post" className="mt-3"><button className="btn btn-ghost btn-sm -ml-2"><LogOut className="h-4 w-4" />Uitloggen</button></form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, sub, actions, back }: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {back}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><h1 className="font-serif text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>{sub && <div className="mt-1 text-sm text-ink-600">{sub}</div>}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export { Link };
