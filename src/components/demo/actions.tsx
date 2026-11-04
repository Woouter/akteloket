import { FlaskConical, Building2, CalendarClock, FileText, Landmark, Play, UserCheck, Users } from "lucide-react";
import { simAflosnota, simBankinstructie, simDatum14, simKoperKlaar, simVerkoperKlaar, simVolmachtAfgerond, simCron } from "@/app/demo/actions";

/** Zwevend paneel met demo-simulaties: laat gebeurtenissen van buitenaf plaatsvinden. */
export function DemoActions({ dossierId, context, back }: { dossierId: string; context: "koper" | "verkoper" | "notaris" | "beheer"; back?: string }) {
  const b = back ?? (context === "notaris" ? `/notaris/dossiers/${dossierId}` : context === "beheer" ? `/beheer/dossiers/${dossierId}` : `/portaal/${dossierId}`);
  const items = [
    { fn: simKoperKlaar, icon: Users, label: "Koper(s) ronden alle stappen af" },
    { fn: simVerkoperKlaar, icon: UserCheck, label: "Verkoper(s) ronden alle stappen af" },
    { fn: simVolmachtAfgerond, icon: FileText, label: "Volmachtafspraken afgerond" },
    { fn: simBankinstructie, icon: Landmark, label: "Bankinstructie ontvangen (via notaris)" },
    { fn: simAflosnota, icon: Building2, label: "Aflosnota ontvangen" },
    { fn: simDatum14, icon: CalendarClock, label: "Spoel door naar 14 dagen vóór overdracht" },
  ];
  return (
    <details className="no-print group fixed bottom-4 right-4 z-[60]">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-notaris-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-notaris-700"><FlaskConical className="h-4 w-4" />Demo-acties</summary>
      <div className="absolute bottom-14 right-0 w-80 rounded-2xl bg-white p-3 shadow-lift ring-1 ring-ink-900/10">
        <p className="px-2 pb-2 text-xs text-ink-500">Simuleer gebeurtenissen van buitenaf. De automatisering reageert direct, net als in productie.</p>
        {items.map((i) => (
          <form key={i.label} action={i.fn.bind(null, dossierId, b)}>
            <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-ink-800 hover:bg-ink-50"><i.icon className="h-4 w-4 shrink-0 text-notaris-600" />{i.label}</button>
          </form>
        ))}
        <form action={simCron.bind(null, b)} className="mt-1 border-t border-ink-100 pt-1"><button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-ink-800 hover:bg-ink-50"><Play className="h-4 w-4 shrink-0 text-platform-600" />Draai termijnbewaking (cron) nu</button></form>
      </div>
    </details>
  );
}
