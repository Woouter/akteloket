import Link from "next/link";
import { ChevronRight, Cpu } from "lucide-react";
import { StateChip, StateIcon } from "@/components/ui";
import type { Step } from "@/lib/workflow/steps";
import { cn } from "@/lib/util/format";

export function StepsList({ steps, base, side }: { steps: Step[]; base: string; side: "koper" | "verkoper" }) {
  return (
    <ol className="card divide-y divide-ink-100 overflow-hidden p-0" data-tour="portal-steps">
      {steps.map((s, i) => {
        const clickable = s.state !== "locked" && s.state !== "na" && (s.owner === "klant" || s.state !== "waiting" || side === "koper");
        const Inner = (
          <div className={cn("grid gap-3 p-4 sm:grid-cols-[auto_1fr_minmax(0,16rem)] sm:items-center sm:gap-5 sm:p-5", clickable && "transition hover:bg-ink-50/60")}>
            <div className="flex items-center gap-3">
              <StateIcon state={s.state} />
              <span className={cn("font-mono text-xs font-semibold sm:hidden", side === "koper" ? "text-koper-600" : "text-verkoper-700")}>{s.nr}</span>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-ink-900"><span className={cn("hidden font-mono text-xs sm:inline", side === "koper" ? "text-koper-600" : "text-verkoper-700")}>{s.nr}</span>{s.title}{s.owner === "platform" && <span className="chip bg-platform-50 text-platform-600"><Cpu className="h-3 w-3" />Automatisch</span>}</p>
              <p className="mt-0.5 text-sm text-ink-500">{s.description}</p>
              {s.perPerson && s.perPerson.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">{s.perPerson.map((pp) => <span key={pp.partyId} className="inline-flex items-center gap-1.5 text-xs text-ink-600"><StateIcon state={pp.state} size="sm" />{pp.name.split(" ")[0]}: {pp.label}</span>)}</div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <StateChip state={s.state} label={s.label} />
              {clickable && <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />}
            </div>
          </div>
        );
        return <li key={s.key} id={`stap-${s.key}`} style={{ animationDelay: `${i * 30}ms` }}>{clickable ? <Link href={`${base}/stap/${s.key}`} className="block">{Inner}</Link> : Inner}</li>;
      })}
    </ol>
  );
}
