import Link from "next/link";
import { CalendarDays, Home, LogOut, MapPin } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Badge, ProgressBar } from "@/components/ui";
import type { User } from "@/lib/db/schema";
import type { DossierView } from "@/lib/domain/dossier";
import type { Side } from "@/lib/domain/types";
import { SERVICES } from "@/lib/config";
import { dateNl, daysBetween, propertyLine, todayIso } from "@/lib/util/format";
import { PortalTabs } from "./tabs";

export function PortalHeader({ user, home = "/portaal" }: { user: User; home?: string }) {
  return (
    <header className="border-b border-ink-100 bg-white">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo href={home} />
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-ink-600 sm:inline">{user.name}</span>
          <form action="/uitloggen" method="post"><button className="btn btn-ghost btn-sm"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Uitloggen</span></button></form>
        </div>
      </div>
    </header>
  );
}

export function DossierHeader({ view, side, pct }: { view: DossierView; side: Side; pct: number }) {
  const d = view.data;
  const lev = d.transaction.leveringsdatum;
  const days = lev ? daysBetween(todayIso(), lev) : undefined;
  return (
    <div className="border-b border-ink-100 bg-white">
      <div className="container-page py-7" data-tour="portal-header">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={side === "koper" ? "koper" : "verkoper"}>{side === "koper" ? "Koper" : "Verkoper"}</Badge>
              <Badge>{side === "verkoper" && d.service !== "koopovereenkomst" ? "Leveringsakte (verkoop)" : SERVICES[d.service].name}</Badge>
              <span className="font-mono text-xs text-ink-400">{view.dossier.reference}</span>
            </div>
            <h1 className="mt-3 flex items-start gap-2 font-serif text-2xl font-semibold text-ink-900 sm:items-center sm:text-3xl"><Home className="mt-1 h-6 w-6 shrink-0 text-ink-300 sm:mt-0" />{propertyLine(d.property) || (side === "koper" ? "Je nieuwe woning" : "Je woning")}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-600">
              {lev && <span className="flex items-start gap-1.5"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /><span>Overdracht {dateNl(lev, { weekday: true })}{days !== undefined && days > 0 && !d.gepasseerdOp && <> · <strong className="whitespace-nowrap text-ink-900">nog {days} {days === 1 ? "dag" : "dagen"}</strong></>}{days === 0 && <> · <strong className="text-ink-900">vandaag</strong></>}</span></span>}
              {d.property.kadastraal?.perceel && d.property.kadastraal.gemeente && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0 text-ink-400" />{d.property.kadastraal.gemeente} {d.property.kadastraal.sectie} {d.property.kadastraal.perceel}</span>}
            </p>
          </div>
          <div className="w-full shrink-0 lg:w-72">
            <div className="flex justify-between text-sm"><span className="font-medium text-ink-700">Jouw voortgang</span><span className="font-semibold text-ink-900 tabular">{pct}%</span></div>
            <ProgressBar className="mt-2" pct={pct} tone={side === "koper" ? "koper" : "verkoper"} />
          </div>
        </div>
        <PortalTabs base={`/portaal/${view.dossier.id}`} />
      </div>
    </div>
  );
}
